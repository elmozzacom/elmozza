import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createSession, dbOrError, normalize, rateLimitKey, rawFormValue, safeRedirect, safeUser, verifyPassword } from '$lib/server/auth';

const GENERIC_ERROR = 'Email atau password tidak valid.';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) throw redirect(303, '/dashboard');
	return { next: safeRedirect(url.searchParams.get('next')) };
};

export const actions: Actions = {
	default: async ({ request, locals, cookies, getClientAddress }) => {
		const form = await request.formData();
		const identifier = normalize(form.get('identifier')).toLowerCase();
		const password = rawFormValue(form.get('password'));
		const next = safeRedirect(form.get('next'));
		const errors: Record<string, string> = {};
		if (!identifier) errors.identifier = 'Email atau username wajib diisi.';
		if (!password) errors.password = 'Password wajib diisi.';
		if (Object.keys(errors).length > 0) return fail(400, { errors, identifier, next });

		const db = dbOrError(locals.db ?? undefined);
		const ip = getClientAddress();
		const ipKey = await rateLimitKey('login-ip', ip);
		const identifierKey = await rateLimitKey('login-identifier', ip, identifier);
		const throttle = await db.prepare(
			"SELECT 1 FROM login_attempts WHERE attempt_key IN (?, ?) AND blocked_until > datetime('now') LIMIT 1"
		).bind(ipKey, identifierKey).first();
		if (throttle) return fail(429, { error: GENERIC_ERROR, identifier, next });

		const row = await db.prepare(
			`SELECT id, username, email, role, total_xp, current_streak, password_hash
			 FROM users WHERE lower(email) = ? OR lower(username) = ?`
		).bind(identifier, identifier).first<Record<string, unknown>>();
		const user = safeUser(row);
		const isValid = await verifyPassword(password, typeof row?.password_hash === 'string' ? row.password_hash : null);

		if (!user || !isValid) {
			const attempt = (key: string, threshold: number) => db.prepare(
				`INSERT INTO login_attempts (attempt_key, failed_count, blocked_until, updated_at)
				 VALUES (?, 1, NULL, datetime('now'))
				 ON CONFLICT(attempt_key) DO UPDATE SET
				 failed_count = CASE WHEN blocked_until IS NOT NULL AND blocked_until <= datetime('now') THEN 1 ELSE failed_count + 1 END,
				 blocked_until = CASE
				   WHEN blocked_until IS NOT NULL AND blocked_until <= datetime('now') THEN NULL
				   WHEN failed_count + 1 >= ? THEN datetime('now', '+15 minutes')
				   ELSE NULL
				 END,
				 updated_at = datetime('now')`
			).bind(key, threshold);
			await db.batch([attempt(identifierKey, 5), attempt(ipKey, 20)]);
			return fail(401, { error: GENERIC_ERROR, identifier, next });
		}

		await db.batch([
			db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").bind(user.id),
			db.prepare('DELETE FROM login_attempts WHERE attempt_key = ?').bind(identifierKey)
		]);
		await createSession(db, user.id, cookies);
		throw redirect(303, next);
	}
};
