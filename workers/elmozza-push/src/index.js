/**
 * Hourly reminder worker. Shares D1 with the Pages app.
 * Schedule: 0 * * * * (every hour).
 *
 * wrangler deploy --config workers/elmozza-push/wrangler.toml
 */
export default {
	async scheduled(controller, env, ctx) {
		ctx.waitUntil(tick(env));
		void controller;
	}
};

async function tick(env) {
	const hour = new Date(Date.now() + 7 * 60 * 60_000).getUTCHours();
	const today = new Date(Date.now() + 7 * 60 * 60_000).toISOString().slice(0, 10);

	const daily = await env.DB.prepare(
		`SELECT s.user_id, s.endpoint
		 FROM push_subscriptions s
		 JOIN user_game g ON g.user_id = s.user_id
		 LEFT JOIN notification_prefs p ON p.user_id = s.user_id
		 WHERE g.reminder_hour = ?
		   AND COALESCE(p.daily_reminder, 1) = 1
		   AND COALESCE(g.last_xp_on, '') != ?`
	)
		.bind(hour, today)
		.all();

	const risk =
		hour === 21
			? await env.DB.prepare(
					`SELECT s.user_id, s.endpoint
					 FROM push_subscriptions s
					 JOIN user_game g ON g.user_id = s.user_id
					 LEFT JOIN notification_prefs p ON p.user_id = s.user_id
					 WHERE COALESCE(p.streak_risk, 1) = 1
					   AND COALESCE(g.last_xp_on, '') != ?`
				)
					.bind(today)
					.all()
			: { results: [] };

	const review =
		hour === 9
			? await env.DB.prepare(
					`SELECT DISTINCT s.user_id, s.endpoint
					 FROM push_subscriptions s
					 JOIN user_item_strength i ON i.user_id = s.user_id
					 LEFT JOIN notification_prefs p ON p.user_id = s.user_id
					 WHERE i.due_at <= datetime('now')
					   AND COALESCE(p.review_digest, 1) = 1`
				)
					.all()
			: { results: [] };

	const jobs = [
		...((daily.results ?? []).map((row) => ({ ...row, kind: 'daily_reminder', url: '/learn' }))),
		...((risk.results ?? []).map((row) => ({ ...row, kind: 'streak_risk', url: '/learn' }))),
		...((review.results ?? []).map((row) => ({ ...row, kind: 'review_digest', url: '/practice' })))
	];

	for (const job of jobs) {
		await env.DB.prepare(
			`INSERT INTO notification_log (user_id, kind, status, created_at)
			 VALUES (?, ?, 'queued', datetime('now'))`
		)
			.bind(job.user_id, job.kind)
			.run();
	}

	return { queued: jobs.length, hour };
}
