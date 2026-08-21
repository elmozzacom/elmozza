import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { weeklyBoard } from '$lib/server/board';

/**
 * Live top-N feed for the gate page. Same ruleset as /leaderboard — it calls
 * the identical `weeklyBoard`, which is already cached for 60s, so polling
 * costs nothing extra.
 */
export const GET: RequestHandler = async ({ locals, url, setHeaders }) => {
	const limit = Math.min(10, Math.max(1, Number(url.searchParams.get('limit') ?? 5) || 5));
	const db = locals.db;
	if (!db) return json({ top: [], available: false });

	try {
		const weekly = await weeklyBoard(db);
		setHeaders({ 'cache-control': 'public, max-age=15' });
		return json({
			available: true,
			top: weekly.slice(0, limit).map((row) => ({
				rank: row.rank,
				nickname: row.nickname,
				avgPct: row.avgPct,
				quizzes: row.quizzes,
				questions: row.questions
			}))
		});
	} catch {
		return json({ top: [], available: false });
	}
};
