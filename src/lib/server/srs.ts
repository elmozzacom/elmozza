import type { D1Database } from '@cloudflare/workers-types';

/** SM-2 with small, honest intervals. Quality is 0–5. */
export function sm2(ease: number, interval: number, repetitions: number, quality: number) {
	const q = Math.max(0, Math.min(5, quality));
	let nextEase = ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
	if (nextEase < 1.3) nextEase = 1.3;
	let nextReps = repetitions;
	let nextInterval = interval;
	if (q < 3) {
		nextReps = 0;
		nextInterval = 1;
	} else {
		nextReps += 1;
		if (nextReps === 1) nextInterval = 1;
		else if (nextReps === 2) nextInterval = 6;
		else nextInterval = Math.round(interval * nextEase);
	}
	const due = new Date(Date.now() + nextInterval * 86_400_000).toISOString();
	return { ease: nextEase, interval: nextInterval, repetitions: nextReps, due_at: due };
}

export async function reviewItem(db: D1Database, userId: number, itemKey: string, quality: number) {
	const row = await db
		.prepare('SELECT ease, interval_days, repetitions FROM user_item_strength WHERE user_id = ? AND item_key = ?')
		.bind(userId, itemKey)
		.first<{ ease: number; interval_days: number; repetitions: number }>();
	const next = sm2(row?.ease ?? 2.5, row?.interval_days ?? 0, row?.repetitions ?? 0, quality);
	await db
		.prepare(
			`INSERT INTO user_item_strength (user_id, item_key, ease, interval_days, repetitions, due_at)
			 VALUES (?, ?, ?, ?, ?, ?)
			 ON CONFLICT(user_id, item_key) DO UPDATE SET
			   ease = excluded.ease,
			   interval_days = excluded.interval_days,
			   repetitions = excluded.repetitions,
			   due_at = excluded.due_at`
		)
		.bind(userId, itemKey, next.ease, next.interval, next.repetitions, next.due_at)
		.run();
	return next;
}

export async function meetItem(db: D1Database, userId: number, itemKey: string) {
	await db
		.prepare(
			`INSERT OR IGNORE INTO user_item_strength (user_id, item_key, ease, interval_days, repetitions, due_at)
			 VALUES (?, ?, 2.5, 0, 0, datetime('now'))`
		)
		.bind(userId, itemKey)
		.run();
}

export async function dueItems(db: D1Database, userId: number, limit = 8) {
	const { results } = await db
		.prepare(
			`SELECT s.item_key, i.kind, i.prompt, i.answer
			 FROM user_item_strength s
			 JOIN srs_items i ON i.item_key = s.item_key
			 WHERE s.user_id = ? AND s.due_at <= datetime('now')
			 ORDER BY s.due_at
			 LIMIT ?`
		)
		.bind(userId, limit)
		.all<{ item_key: string; kind: string; prompt: string; answer: string }>();
	return results ?? [];
}
