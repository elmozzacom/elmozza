// Tomorrow Mode credits. D1 only, no $lib aliases (bundled in tests).
// Rule: bank hits are free; spend exactly 1 credit only when the LLM is called;
// free daily quota (rlec_config.free_daily_tomorrow, WIB day) is used first,
// then the paid/admin balance; refund (same source) when generation fails.
import type { D1Database } from '@cloudflare/workers-types';
import { toSqliteDate } from '../core';

const WIB_MS = 7 * 3600_000;

/** [start, end) of the current WIB calendar day, as SQLite UTC timestamps. */
export function wibDayWindow(now: Date): [string, string] {
	const local = new Date(now.getTime() + WIB_MS);
	const startLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
	const start = new Date(startLocal - WIB_MS);
	return [toSqliteDate(start), toSqliteDate(new Date(start.getTime() + 86_400_000))];
}

export async function getConfig(db: D1Database, key: string, fallback: string): Promise<string> {
	try {
		const row = await db.prepare('SELECT value FROM rlec_config WHERE key = ?').bind(key).first<{ value: string }>();
		return row?.value ?? fallback;
	} catch {
		return fallback; // table missing (0012 not applied) -> defaults
	}
}

export async function getConfigNumber(db: D1Database, key: string, fallback: number): Promise<number> {
	const n = Number(await getConfig(db, key, String(fallback)));
	return Number.isFinite(n) ? n : fallback;
}

export type CreditStatus = { free_daily: number; free_used_today: number; free_left: number; balance: number };

export async function creditStatus(db: D1Database, userId: number, now: Date): Promise<CreditStatus> {
	const freeDaily = Math.max(0, Math.floor(await getConfigNumber(db, 'free_daily_tomorrow', 1)));
	const [from, to] = wibDayWindow(now);
	const used = await db
		.prepare(
			`SELECT COALESCE(SUM(CASE kind WHEN 'spend' THEN amount WHEN 'refund' THEN -amount ELSE 0 END), 0) AS n
			 FROM rlec_credit_ledger WHERE user_id = ? AND source = 'free_daily' AND created_at >= ? AND created_at < ?`
		)
		.bind(userId, from, to)
		.first<{ n: number }>();
	const bal = await db.prepare('SELECT balance FROM rlec_credit_balance WHERE user_id = ?').bind(userId).first<{ balance: number }>();
	const usedN = Math.max(0, Number(used?.n ?? 0));
	return { free_daily: freeDaily, free_used_today: usedN, free_left: Math.max(0, freeDaily - usedN), balance: Number(bal?.balance ?? 0) };
}

export type SpendResult = { ok: true; source: 'free_daily' | 'paid' } | { ok: false; reason: 'no_credit' | 'duplicate' };

/** Spend 1 credit for `ref` (e.g. "tomorrow:note:12"). Call only right before the LLM call. */
export async function spendCredit(db: D1Database, userId: number, ref: string, now: Date): Promise<SpendResult> {
	const dup = await db.prepare("SELECT id FROM rlec_credit_ledger WHERE user_id = ? AND kind = 'spend' AND ref = ?").bind(userId, ref).first();
	if (dup) return { ok: false, reason: 'duplicate' };
	const ts = toSqliteDate(now);
	const status = await creditStatus(db, userId, now);
	if (status.free_left > 0) {
		await db
			.prepare("INSERT INTO rlec_credit_ledger (user_id, kind, source, amount, ref, created_at) VALUES (?, 'spend', 'free_daily', 1, ?, ?)")
			.bind(userId, ref, ts)
			.run();
		return { ok: true, source: 'free_daily' };
	}
	// Conditional decrement: never goes below zero even under concurrency.
	const dec = await db
		.prepare('UPDATE rlec_credit_balance SET balance = balance - 1, updated_at = ? WHERE user_id = ? AND balance >= 1')
		.bind(ts, userId)
		.run();
	if (!dec.meta?.changes) return { ok: false, reason: 'no_credit' };
	await db
		.prepare("INSERT INTO rlec_credit_ledger (user_id, kind, source, amount, ref, created_at) VALUES (?, 'spend', 'paid', 1, ?, ?)")
		.bind(userId, ref, ts)
		.run();
	return { ok: true, source: 'paid' };
}

/** Refund the spend for `ref` once, to the same source it came from. */
export async function refundCredit(db: D1Database, userId: number, ref: string, now: Date, note = 'generation failed'): Promise<boolean> {
	const spend = await db
		.prepare("SELECT source, created_at FROM rlec_credit_ledger WHERE user_id = ? AND kind = 'spend' AND ref = ?")
		.bind(userId, ref)
		.first<{ source: string; created_at: string }>();
	if (!spend) return false;
	const done = await db.prepare("SELECT id FROM rlec_credit_ledger WHERE user_id = ? AND kind = 'refund' AND ref = ?").bind(userId, ref).first();
	if (done) return false;
	// Free-daily refunds are dated like the spend so they restore that same WIB day.
	const ts = spend.source === 'free_daily' ? spend.created_at : toSqliteDate(now);
	await db
		.prepare("INSERT INTO rlec_credit_ledger (user_id, kind, source, amount, ref, note, created_at) VALUES (?, 'refund', ?, 1, ?, ?, ?)")
		.bind(userId, spend.source, ref, note, ts)
		.run();
	if (spend.source !== 'free_daily') {
		await db
			.prepare(
				`INSERT INTO rlec_credit_balance (user_id, balance, updated_at) VALUES (?, 1, ?)
				 ON CONFLICT(user_id) DO UPDATE SET balance = balance + 1, updated_at = excluded.updated_at`
			)
			.bind(userId, toSqliteDate(now))
			.run();
	}
	return true;
}

/** Admin/paid grant (no payment flow yet — prices are placeholders in rlec_config). */
export async function grantCredits(db: D1Database, userId: number, amount: number, source: 'paid' | 'admin' | 'promo', ref: string | null, now: Date, note: string | null = null) {
	if (!Number.isInteger(amount) || amount <= 0) throw new Error('amount must be a positive integer');
	const ts = toSqliteDate(now);
	await db.batch([
		db.prepare("INSERT INTO rlec_credit_ledger (user_id, kind, source, amount, ref, note, created_at) VALUES (?, 'grant', ?, ?, ?, ?, ?)").bind(userId, source, amount, ref, note, ts),
		db
			.prepare(
				`INSERT INTO rlec_credit_balance (user_id, balance, updated_at) VALUES (?, ?, ?)
				 ON CONFLICT(user_id) DO UPDATE SET balance = balance + excluded.balance, updated_at = excluded.updated_at`
			)
			.bind(userId, amount, ts)
	]);
}
