import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createLinkCode, requireApiUser } from '$lib/server/rlec/db';

/** Logged-in user gets a one-time 6-digit code (10 min) to send to the Telegram bot. */
export const POST: RequestHandler = async ({ locals }) => {
	const { user, db } = requireApiUser(locals);
	const code = await createLinkCode(db, user.id, new Date());
	return json({ ok: true, ...code }, { status: 201, headers: { 'cache-control': 'no-store' } });
};
