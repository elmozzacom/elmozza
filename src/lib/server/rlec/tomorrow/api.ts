// Tomorrow Mode HTTP layer helpers: request validation, response shaping,
// GET state (credits + last card + day-two check-in) and real-world outcome.
// D1 only, no $lib aliases (bundled in tests). Route files stay thin.
import type { D1Database } from '@cloudflare/workers-types';
import { CARD_LEVELS, type CardLevel, type TomorrowCard } from './types';
import { creditStatus, wibDayWindow, type CreditStatus } from './credits';
import type { TomorrowResponse } from './pipeline';

export const TOMORROW_TEXT_MAX = 1000;
export const OUTCOME_NOTE_MAX = 500;
export const OUTCOMES = ['went_well', 'mixed', 'hard', 'did_not_happen'] as const;
export type Outcome = (typeof OUTCOMES)[number];

type Invalid = { ok: false; errors: Record<string, string> };
const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

export function validateTomorrowRequest(body: unknown): { ok: true; value: { text: string; level: CardLevel | null } } | Invalid {
	if (!isObject(body)) return { ok: false, errors: { body: 'JSON object required' } };
	const errors: Record<string, string> = {};
	const text = typeof body.text === 'string' ? body.text.trim() : '';
	if (text.length < 1 || text.length > TOMORROW_TEXT_MAX) errors.text = `1..${TOMORROW_TEXT_MAX} chars`;
	let level: CardLevel | null = null;
	if (body.level !== undefined && body.level !== null && body.level !== '') {
		const l = typeof body.level === 'string' ? body.level.toUpperCase() : '';
		if ((CARD_LEVELS as readonly string[]).includes(l)) level = l as CardLevel;
		else errors.level = CARD_LEVELS.join('|');
	}
	if (Object.keys(errors).length) return { ok: false, errors };
	return { ok: true, value: { text, level } };
}

export function validateOutcome(body: unknown): { ok: true; value: { session_id: number; outcome: Outcome; note: string | null } } | Invalid {
	if (!isObject(body)) return { ok: false, errors: { body: 'JSON object required' } };
	const errors: Record<string, string> = {};
	const sid = body.session_id;
	if (typeof sid !== 'number' || !Number.isInteger(sid) || sid < 1) errors.session_id = 'positive integer';
	if (!(OUTCOMES as readonly unknown[]).includes(body.outcome)) errors.outcome = OUTCOMES.join('|');
	let note: string | null = null;
	if (body.note !== undefined && body.note !== null) {
		if (typeof body.note !== 'string' || body.note.trim().length > OUTCOME_NOTE_MAX) errors.note = `string <= ${OUTCOME_NOTE_MAX} chars`;
		else note = body.note.trim() || null;
	}
	if (Object.keys(errors).length) return { ok: false, errors };
	return { ok: true, value: { session_id: sid as number, outcome: body.outcome as Outcome, note } };
}

/** Pipeline result for the browser: the intent is reduced to taxonomy ids (no counterpart/date/raw-text derived fields). */
export function publicResult(r: TomorrowResponse) {
	const { intent, ...rest } = r;
	return {
		...rest,
		intent: { domain_id: intent.domain_id, place: intent.place, situation: intent.situation, stakes: intent.stakes, level_hint: intent.level_hint }
	};
}

export type LastCard = { id: number; session_id: number | null; source: 'bank' | 'own' | 'llm'; level: string | null; card: TomorrowCard; created_at: string };
export type PendingOutcome = { session_id: number; title: string | null; started_at: string };

const parseCard = (s: unknown): TomorrowCard | null => {
	try {
		const v = JSON.parse(String(s));
		return isObject(v) ? (v as TomorrowCard) : null;
	} catch {
		return null;
	}
};

export async function lastTomorrowCard(db: D1Database, userId: number): Promise<LastCard | null> {
	const row = await db
		.prepare('SELECT id, session_id, source, level, card_json, created_at FROM rlec_tomorrow_cards WHERE user_id = ? ORDER BY id DESC LIMIT 1')
		.bind(userId)
		.first<{ id: number; session_id: number | null; source: LastCard['source']; level: string | null; card_json: string; created_at: string }>();
	if (!row) return null;
	const card = parseCard(row.card_json);
	if (!card) return null;
	return { id: Number(row.id), session_id: row.session_id == null ? null : Number(row.session_id), source: row.source, level: row.level, card, created_at: row.created_at };
}

/** Day two: the user's latest tomorrow session, if it started before today (WIB) and has no outcome yet. */
export async function pendingOutcome(db: D1Database, userId: number, now: Date): Promise<PendingOutcome | null> {
	const row = await db
		.prepare(
			`SELECT s.id, s.started_at, s.real_world_outcome, (SELECT c.card_json FROM rlec_tomorrow_cards c WHERE c.session_id = s.id ORDER BY c.id DESC LIMIT 1) AS card_json
			 FROM rlec_sessions s WHERE s.user_id = ? AND s.mode = 'tomorrow' ORDER BY s.id DESC LIMIT 1`
		)
		.bind(userId)
		.first<{ id: number; started_at: string; real_world_outcome: string | null; card_json: string | null }>();
	if (!row || row.real_world_outcome) return null;
	const [todayStart] = wibDayWindow(now);
	if (!(String(row.started_at) < todayStart)) return null;
	return { session_id: Number(row.id), title: parseCard(row.card_json)?.title ?? null, started_at: row.started_at };
}

export async function tomorrowState(db: D1Database, userId: number, now: Date): Promise<{ credits: CreditStatus; last_card: LastCard | null; pending_outcome: PendingOutcome | null }> {
	return { credits: await creditStatus(db, userId, now), last_card: await lastTomorrowCard(db, userId), pending_outcome: await pendingOutcome(db, userId, now) };
}

/** Owner-only write of rlec_sessions.real_world_outcome. Other users' sessions look like missing ones. */
export async function recordOutcome(
	db: D1Database,
	userId: number,
	v: { session_id: number; outcome: Outcome; note: string | null },
	now: Date
): Promise<{ ok: true; outcome: { outcome: Outcome; note: string | null; at: string } } | { ok: false; status: 404 | 400; message: string }> {
	const row = await db.prepare('SELECT id, user_id, mode FROM rlec_sessions WHERE id = ?').bind(v.session_id).first<{ id: number; user_id: number; mode: string }>();
	if (!row || Number(row.user_id) !== userId) return { ok: false, status: 404, message: 'Sesi tidak ditemukan.' };
	if (row.mode !== 'tomorrow') return { ok: false, status: 400, message: 'Bukan sesi Tomorrow.' };
	const outcome = { outcome: v.outcome, note: v.note, at: now.toISOString() };
	await db.prepare('UPDATE rlec_sessions SET real_world_outcome = ? WHERE id = ? AND user_id = ?').bind(JSON.stringify(outcome), v.session_id, userId).run();
	return { ok: true, outcome };
}
