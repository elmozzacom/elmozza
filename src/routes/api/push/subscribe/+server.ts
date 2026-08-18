import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbOrError, requireUser } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = requireUser(locals.user);
	const db = dbOrError(locals.db ?? undefined);
	const body = (await request.json()) as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
	if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
		return json({ ok: false }, { status: 400 });
	}
	await db
		.prepare(
			`INSERT INTO push_subscriptions (user_id, endpoint, keys_json, created_at)
			 VALUES (?, ?, ?, datetime('now'))
			 ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, keys_json = excluded.keys_json`
		)
		.bind(user.id, body.endpoint, JSON.stringify(body.keys))
		.run();
	return json({ ok: true });
};
