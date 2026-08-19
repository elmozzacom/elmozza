import type { D1Database } from '@cloudflare/workers-types';
import { applyStreak, awardXp, ensureGame } from '$lib/server/game';
import { jakartaDate } from '$lib/server/journey';
import { meetItem, reviewItem } from '$lib/server/srs';

export function levenshtein(a: string, b: string) {
	const s = a.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
	const t = b.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
	const m = s.length;
	const n = t.length;
	if (!m) return n;
	if (!n) return m;
	const row = Array.from({ length: n + 1 }, (_, i) => i);
	for (let i = 1; i <= m; i++) {
		let prev = i - 1;
		row[0] = i;
		for (let j = 1; j <= n; j++) {
			const tmp = row[j];
			row[j] = s[i - 1] === t[j - 1] ? prev : 1 + Math.min(prev, row[j], row[j - 1]);
			prev = tmp;
		}
	}
	return row[n];
}

export function speakingOk(target: string, heard: string) {
	const distance = levenshtein(target, heard);
	const allow = Math.max(2, Math.ceil(target.length * 0.28));
	return distance <= allow;
}

export async function finishStep(
	db: D1Database,
	userId: number,
	step: { id: number; type: string; xp: number; srs_item_key: string | null },
	opts: { perfect: boolean; already: boolean; total?: number; correct?: number }
) {
	if (opts.already) return { xp: 0, first: false };
	const bonus = opts.perfect ? Math.round(step.xp * 0.25) : 0;
	const xp = step.xp + bonus;
	await db
		.prepare(
			`INSERT INTO user_step_progress (user_id, step_id, status, score, perfect, completed_at)
			 VALUES (?, ?, 'completed', ?, ?, datetime('now'))`
		)
		.bind(userId, step.id, opts.perfect ? 100 : 70, opts.perfect ? 1 : 0)
		.run();
	await awardXp(db, userId, xp, {
		perfect: opts.perfect,
		kind: step.type === 'listening' ? 'listening' : step.type === 'speaking' ? 'speaking' : 'step'
	});
	if (step.srs_item_key) await meetItem(db, userId, step.srs_item_key);
	try {
		const { recordQuizResult } = await import('$lib/server/board');
		await recordQuizResult(db, {
			userId,
			quizId: `step-${step.id}`,
			source: step.type === 'checkpoint' ? 'checkpoint' : 'path_step',
			total: opts.total ?? 1,
			correct: opts.correct ?? (opts.perfect ? 1 : 0)
		});
	} catch {
		/* never block the lesson */
	}

	const today = jakartaDate();
	const game = await ensureGame(db, userId);
	if (game.last_xp_on !== today) {
		const user = await db.prepare('SELECT current_streak FROM users WHERE id = ?').bind(userId).first<{ current_streak: number }>();
		const next = (user?.current_streak ?? 0) + 1;
		await db.prepare('UPDATE users SET current_streak = ? WHERE id = ?').bind(next, userId).run();
		await applyStreak(db, userId, next);
	}
	return { xp, first: true };
}

export async function loseHeart(db: D1Database, userId: number) {
	const game = await ensureGame(db, userId);
	if (game.hearts <= 0) return 0;
	const hearts = game.hearts - 1;
	await db
		.prepare("UPDATE user_game SET hearts = ?, hearts_at = datetime('now') WHERE user_id = ?")
		.bind(hearts, userId)
		.run();
	return hearts;
}

export async function refillHeartsByReview(db: D1Database, userId: number) {
	await db.prepare('UPDATE user_game SET hearts = 5, hearts_at = datetime(\'now\') WHERE user_id = ?').bind(userId).run();
}

export async function markReview(db: D1Database, userId: number, itemKey: string, quality: number) {
	await reviewItem(db, userId, itemKey, quality);
	await awardXp(db, userId, 5, { kind: 'review' });
}
