import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createSession, dbOrError, hashPassword, normalize, rateLimitKey, rawFormValue, safeRedirect, validateCredentials } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) throw redirect(303, '/dashboard');
	return {};
};

export const actions: Actions = {
	default: async ({ request, locals, cookies, getClientAddress }) => {
		const form = await request.formData();
		const username = normalize(form.get('username'));
		const email = normalize(form.get('email')).toLowerCase();
		const password = rawFormValue(form.get('password'));
		const next = safeRedirect(form.get('next'));
		const errors = validateCredentials(username, email, password);
		if (Object.keys(errors).length > 0) return fail(400, { errors, values: { username, email } });

		const db = dbOrError(locals.db ?? undefined);
		const registerKey = await rateLimitKey('register-ip', getClientAddress());
		const blocked = await db.prepare(
			"SELECT 1 FROM login_attempts WHERE attempt_key = ? AND blocked_until > datetime('now')"
		).bind(registerKey).first();
		if (blocked) return fail(429, { errors: { account: 'Terlalu banyak percobaan. Coba lagi nanti.' }, values: { username, email } });
		await db.prepare(
			`INSERT INTO login_attempts (attempt_key, failed_count, blocked_until, updated_at)
			 VALUES (?, 1, NULL, datetime('now'))
			 ON CONFLICT(attempt_key) DO UPDATE SET
			 failed_count = CASE WHEN blocked_until IS NOT NULL AND blocked_until <= datetime('now') THEN 1 ELSE failed_count + 1 END,
			 blocked_until = CASE
			   WHEN blocked_until IS NOT NULL AND blocked_until <= datetime('now') THEN NULL
			   WHEN failed_count + 1 >= 5 THEN datetime('now', '+1 hour')
			   ELSE NULL
			 END,
			 updated_at = datetime('now')`
		).bind(registerKey).run();

		const passwordHash = await hashPassword(password);
		try {
			await db.prepare(
				"INSERT INTO users (username, email, password_hash, role, last_login) VALUES (?, ?, ?, 'learner', datetime('now'))"
			).bind(username, email, passwordHash).run();
		} catch {
			return fail(409, { errors: { account: 'Username atau email sudah terdaftar.' }, values: { username, email } });
		}

		const user = await db.prepare('SELECT id FROM users WHERE lower(username) = lower(?)').bind(username).first<{ id: number }>();
		if (!user) return fail(500, { errors: { account: 'Akun dibuat tetapi sesi gagal dimulai.' } });

		await createSession(db, user.id, cookies);
		throw redirect(303, next);
	}
};
