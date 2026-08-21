import type { PageServerLoad } from './$types';
import { weeklyBoard } from '$lib/server/board';

/**
 * The public gate page. It is deliberately readable while signed out: the
 * board is the honor roll, so the top five are public exactly as they are on
 * /leaderboard. Ranking is NOT recomputed here — `weeklyBoard` is the same
 * locked ruleset (average percentage, ≥3 scored quizzes, Monday 00:00 Jakarta).
 */
export const load: PageServerLoad = async ({ locals }) => {
	const db = locals.db;
	let top: Array<{ rank: number; nickname: string; avgPct: number; quizzes: number; questions: number }> = [];
	let available = false;

	if (db) {
		try {
			const weekly = await weeklyBoard(db);
			available = true;
			top = weekly.slice(0, 5).map((row) => ({
				rank: row.rank,
				nickname: row.nickname,
				avgPct: row.avgPct,
				quizzes: row.quizzes,
				questions: row.questions
			}));
		} catch {
			available = false;
		}
	}

	return {
		user: locals.user ? { username: locals.user.username, role: locals.user.role } : null,
		top,
		available
	};
};
