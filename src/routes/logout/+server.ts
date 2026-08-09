import { redirect } from '@sveltejs/kit';
import { destroySession, SESSION_COOKIE } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, cookies }) => {
	if (locals.db) await destroySession(locals.db, cookies);
	else cookies.delete(SESSION_COOKIE, { path: '/' });
	throw redirect(303, '/');
};
