import { dev } from '$app/environment';
import type { Handle } from '@sveltejs/kit';
import { SESSION_COOKIE, safeUser } from '$lib/server/auth';

const SECURITY_HEADERS = {
	'content-security-policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
	'x-content-type-options': 'nosniff',
	'referrer-policy': 'strict-origin-when-cross-origin',
	'permissions-policy': 'camera=(), microphone=(), geolocation=()'
};

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.db = event.platform?.env?.DB ?? null;
	event.locals.user = null;

	const sessionId = event.cookies.get(SESSION_COOKIE); // elmozza_session
	const db = event.locals.db;

	if (db && Math.random() < 0.01) await db.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')").run();

	if (sessionId && db) {
		try {
			const row = await db
				.prepare(
					`SELECT users.id, users.username, users.email, users.role, users.total_xp, users.current_streak
					 FROM sessions
					 JOIN users ON users.id = sessions.user_id
					 WHERE sessions.id = ? AND sessions.expires_at > datetime('now')`
				)
				.bind(sessionId)
				.first();

			event.locals.user = safeUser(row);
			if (!event.locals.user) event.cookies.delete(SESSION_COOKIE, { path: '/' });
		} catch {
			event.locals.user = null;
		}
	}

	const response = await resolve(event);
	for (const [key, value] of Object.entries(SECURITY_HEADERS)) response.headers.set(key, value);
	if (!dev) response.headers.set('strict-transport-security', 'max-age=31536000; includeSubDomains');
	return response;
};
