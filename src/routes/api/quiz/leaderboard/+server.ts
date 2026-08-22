import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { safeLeaderboardLimit } from '$lib/server/omnichannel-quiz-core';
import { MIN_QUIZZES, weekStartJakarta } from '$lib/server/board-rank';

export const GET: RequestHandler = async ({ locals, url, setHeaders }) => {
	if (!locals.db) return json({ available: false, board: [] });
	const limit = safeLeaderboardLimit(url.searchParams.get('limit'));
	const since = weekStartJakarta().toISOString();
	const listing = await locals.db.prepare(
		`WITH attempts AS (
		   SELECT p.id AS player_id, p.display_name, p.platform, s.id AS session_id,
		          100.0 * SUM(a.is_correct) / COUNT(a.id) AS percentage,
		          COUNT(a.id) AS answered, MAX(a.answered_at) AS completed_at
		   FROM quiz_answers a
		   JOIN quiz_players p ON p.id = a.player_id
		   JOIN quiz_publications q ON q.id = a.publication_id
		   JOIN quiz_sessions s ON s.id = q.session_id
		   WHERE p.leaderboard_opt_in = 1 AND a.answered_at >= ?
		   GROUP BY p.id, p.display_name, p.platform, s.id
		   HAVING COUNT(a.id) = 5
		 )
		 SELECT display_name, platform, AVG(percentage) AS avg_pct,
		        COUNT(session_id) AS quizzes, SUM(answered) AS answered
		 FROM attempts
		 GROUP BY player_id, display_name, platform
		 HAVING COUNT(session_id) >= ?
		 ORDER BY avg_pct DESC, answered DESC, lower(display_name) ASC
		 LIMIT ?`
	).bind(since, MIN_QUIZZES, limit).all<{
		display_name: string; platform: 'telegram' | 'web'; avg_pct: number; quizzes: number; answered: number;
	}>();
	setHeaders({ 'cache-control': 'public, max-age=15' });
	return json({
		available: true,
		board: (listing.results ?? []).map((row, index) => ({
			rank: index + 1,
			display_name: row.display_name,
			platform: row.platform,
			avg_pct: Number(row.avg_pct),
			quizzes: Number(row.quizzes),
			answered: Number(row.answered)
		}))
	});
};
