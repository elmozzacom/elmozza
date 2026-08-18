/**
 * Reminder worker. Every 5 minutes it:
 *   1. delivers any queued broadcasts
 *   2. sends due daily / streak / review notices
 *
 * Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
 */
import { buildPushPayload } from '@block65/webcrypto-web-push';

const ORIGIN = 'https://english.elmozza.com';

const COPY = {
	daily_reminder: {
		title: 'Elmozza English',
		body: 'Your 5-minute lesson is ready. Keep the streak alive.',
		path: '/learn'
	},
	streak_risk: {
		title: 'Elmozza English',
		body: 'A short lesson will keep today’s streak.',
		path: '/learn'
	},
	review_digest: {
		title: 'Elmozza English',
		body: 'A few words are waiting to be reviewed.',
		path: '/practice'
	}
};

export default {
	async scheduled(controller, env, ctx) {
		ctx.waitUntil(tick(env));
		void controller;
	},

	async fetch() {
		return new Response(JSON.stringify({ ok: true, worker: 'elmozza-push', cron: '*/5 * * * *' }), {
			headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
		});
	}
};

async function tick(env) {
	const hour = new Date(Date.now() + 7 * 60 * 60_000).getUTCHours();
	const today = new Date(Date.now() + 7 * 60 * 60_000).toISOString().slice(0, 10);
	const vapid = vapidFrom(env);
	const drained = await drainQueue(env, vapid);
	const fresh = vapid ? await sendDue(env, vapid, hour, today) : { sent: 0, failed: 0, skipped: 0 };
	return { hour, drained, fresh };
}

function vapidFrom(env) {
	const publicKey = String(env.VAPID_PUBLIC_KEY ?? '').trim();
	const privateKey = String(env.VAPID_PRIVATE_KEY ?? '').trim();
	const subject = String(env.VAPID_SUBJECT ?? 'mailto:klinikelmozza@gmail.com').trim();
	if (!publicKey || !privateKey) return null;
	return { subject, publicKey, privateKey };
}

async function drainQueue(env, vapid) {
	const listing = await env.DB.prepare(
		`SELECT l.id, l.user_id, l.kind, l.payload, s.endpoint, s.keys_json
		 FROM notification_log l
		 JOIN push_subscriptions s ON s.user_id = l.user_id
		 WHERE l.status = 'queued'
		 ORDER BY l.id
		 LIMIT 200`
	).all();
	let sent = 0;
	let failed = 0;
	for (const row of listing.results ?? []) {
		const message = messageFrom(row.kind, row.payload);
		const result = vapid ? await deliver(env, vapid, row, message) : { status: 'failed' };
		await env.DB.prepare('UPDATE notification_log SET status = ? WHERE id = ?').bind(result.status, row.id).run();
		if (result.status === 'sent') sent += 1;
		else failed += 1;
	}
	return { sent, failed, seen: (listing.results ?? []).length };
}

async function sendDue(env, vapid, hour, today) {
	const daily = await env.DB.prepare(
		`SELECT s.user_id, s.endpoint, s.keys_json
		 FROM push_subscriptions s
		 JOIN user_game g ON g.user_id = s.user_id
		 LEFT JOIN notification_prefs p ON p.user_id = s.user_id
		 WHERE g.reminder_hour = ?
		   AND COALESCE(p.daily_reminder, 1) = 1
		   AND COALESCE(g.last_xp_on, '') != ?
		   AND NOT EXISTS (
		     SELECT 1 FROM notification_log l
		     WHERE l.user_id = s.user_id AND l.kind = 'daily_reminder'
		       AND date(l.created_at, '+7 hours') = ?
		       AND l.status IN ('sent', 'queued')
		   )`
	)
		.bind(hour, today, today)
		.all();

	const risk =
		hour === 21
			? await env.DB.prepare(
					`SELECT s.user_id, s.endpoint, s.keys_json
					 FROM push_subscriptions s
					 JOIN user_game g ON g.user_id = s.user_id
					 LEFT JOIN notification_prefs p ON p.user_id = s.user_id
					 WHERE COALESCE(p.streak_risk, 1) = 1
					   AND COALESCE(g.last_xp_on, '') != ?
					   AND NOT EXISTS (
					     SELECT 1 FROM notification_log l
					     WHERE l.user_id = s.user_id AND l.kind = 'streak_risk'
					       AND date(l.created_at, '+7 hours') = ?
					       AND l.status IN ('sent', 'queued')
					   )`
				)
					.bind(today, today)
					.all()
			: { results: [] };

	const review =
		hour === 9
			? await env.DB.prepare(
					`SELECT DISTINCT s.user_id, s.endpoint, s.keys_json
					 FROM push_subscriptions s
					 JOIN user_item_strength i ON i.user_id = s.user_id
					 LEFT JOIN notification_prefs p ON p.user_id = s.user_id
					 WHERE i.due_at <= datetime('now')
					   AND COALESCE(p.review_digest, 1) = 1
					   AND NOT EXISTS (
					     SELECT 1 FROM notification_log l
					     WHERE l.user_id = s.user_id AND l.kind = 'review_digest'
					       AND date(l.created_at, '+7 hours') = ?
					       AND l.status IN ('sent', 'queued')
					   )`
				)
					.bind(today)
					.all()
			: { results: [] };

	const jobs = [
		...((daily.results ?? []).map((row) => ({ ...row, kind: 'daily_reminder' }))),
		...((risk.results ?? []).map((row) => ({ ...row, kind: 'streak_risk' }))),
		...((review.results ?? []).map((row) => ({ ...row, kind: 'review_digest' })))
	];

	let sent = 0;
	let failed = 0;
	for (const job of jobs) {
		const message = messageFrom(job.kind, null);
		const result = await deliver(env, vapid, job, message);
		await env.DB.prepare(
			`INSERT INTO notification_log (user_id, kind, status, created_at, payload)
			 VALUES (?, ?, ?, datetime('now'), ?)`
		)
			.bind(job.user_id, job.kind, result.status, JSON.stringify(message))
			.run();
		if (result.status === 'sent') sent += 1;
		else failed += 1;
	}
	return { sent, failed, skipped: 0, considered: jobs.length };
}

function messageFrom(kind, rawPayload) {
	if (rawPayload) {
		try {
			const parsed = JSON.parse(rawPayload);
			if (parsed.title && parsed.body) {
				const path = String(parsed.url || '/learn');
				return {
					title: String(parsed.title).slice(0, 80),
					body: String(parsed.body).slice(0, 180),
					url: path.startsWith('http') ? path : `${ORIGIN}${path.startsWith('/') ? path : `/${path}`}`
				};
			}
		} catch {
			/* fall through */
		}
	}
	const fallback = COPY[kind] ?? COPY.daily_reminder;
	return { title: fallback.title, body: fallback.body, url: `${ORIGIN}${fallback.path}` };
}

async function deliver(env, vapid, row, message) {
	let keys;
	try {
		keys = typeof row.keys_json === 'string' ? JSON.parse(row.keys_json) : row.keys_json;
	} catch {
		return { status: 'failed' };
	}
	if (!row.endpoint || !keys?.p256dh || !keys?.auth) return { status: 'failed' };

	try {
		const payload = await buildPushPayload(
			{ data: JSON.stringify(message), options: { ttl: 60 * 60 * 12, urgency: 'normal' } },
			{ endpoint: row.endpoint, expirationTime: null, keys: { p256dh: keys.p256dh, auth: keys.auth } },
			vapid
		);
		const res = await fetch(row.endpoint, payload);
		if (res.status === 201 || res.status === 200) return { status: 'sent' };
		if (res.status === 404 || res.status === 410) {
			await env.DB.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').bind(row.endpoint).run();
			return { status: 'gone' };
		}
		return { status: 'failed' };
	} catch {
		return { status: 'failed' };
	}
}
