import { dbOrError } from '$lib/server/auth';
import { TOTAL_DAYS } from '$lib/content/questionnaires';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const db = dbOrError(locals.db ?? undefined);

	const stats = await db
		.prepare(
			`SELECT
			   (SELECT COUNT(*) FROM users) AS total,
			   (SELECT COUNT(*) FROM users WHERE last_login >= datetime('now', '-7 days')) AS active_week,
			   (SELECT COUNT(DISTINCT user_id) FROM questionnaire_responses) AS started,
			   (SELECT COUNT(*) FROM (
			      SELECT user_id FROM questionnaire_responses GROUP BY user_id HAVING COUNT(*) >= 14
			   )) AS finished`
		)
		.first<{ total: number; active_week: number; started: number; finished: number }>();

	const total = Number(stats?.total ?? 0);
	const started = Number(stats?.started ?? 0);
	const finished = Number(stats?.finished ?? 0);

	const funnelRows = await db
		.prepare(
			`SELECT day_number, COUNT(*) AS total
			 FROM questionnaire_responses
			 GROUP BY day_number`
		)
		.all<{ day_number: number; total: number }>();
	const byDay = new Map((funnelRows.results ?? []).map((row) => [row.day_number, Number(row.total)]));
	const funnel = Array.from({ length: TOTAL_DAYS }, (_, index) => ({
		day: index + 1,
		count: byDay.get(index + 1) ?? 0
	}));

	const trendRows = await db
		.prepare(
			`SELECT date(created_at) AS day, COUNT(*) AS total
			 FROM users
			 WHERE created_at >= datetime('now', '-30 days')
			 GROUP BY date(created_at)
			 ORDER BY day`
		)
		.all<{ day: string; total: number }>();

	return {
		stats: {
			total,
			activeWeek: Number(stats?.active_week ?? 0),
			started,
			finished,
			completion: started > 0 ? Math.round((finished / started) * 100) : 0
		},
		funnel,
		trend: trendRows.results ?? []
	};
};
