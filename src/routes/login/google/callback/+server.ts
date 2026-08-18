import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSession, dbOrError, safeRedirect } from '$lib/server/auth';
import {
	GOOGLE_NEXT_COOKIE,
	GOOGLE_STATE_COOKIE,
	GOOGLE_VERIFIER_COOKIE,
	baseUsername,
	fetchGoogleProfile,
	googleClient
} from '$lib/server/google';

export const GET: RequestHandler = async (event) => {
	const { url, cookies, locals } = event;

	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const storedState = cookies.get(GOOGLE_STATE_COOKIE);
	const verifier = cookies.get(GOOGLE_VERIFIER_COOKIE);
	const next = safeRedirect(cookies.get(GOOGLE_NEXT_COOKIE) ?? null);

	// Single-use: clear them before anything can go wrong, so a replayed
	// callback cannot reuse the same state.
	for (const name of [GOOGLE_STATE_COOKIE, GOOGLE_VERIFIER_COOKIE, GOOGLE_NEXT_COOKIE]) {
		cookies.delete(name, { path: '/' });
	}

	if (url.searchParams.get('error')) throw redirect(303, '/login?google=cancelled');
	if (!code || !state || !storedState || !verifier || state !== storedState) {
		throw redirect(303, '/login?google=failed');
	}

	const db = dbOrError(locals.db ?? undefined);
	const google = googleClient(event);

	let accessToken: string;
	try {
		const tokens = await google.validateAuthorizationCode(code, verifier);
		accessToken = tokens.accessToken();
	} catch {
		throw redirect(303, '/login?google=failed');
	}

	const profile = await fetchGoogleProfile(accessToken);

	/*
	 * An unverified Google address must never link to an existing account.
	 * Google can hold an address the person has not proven they own, and
	 * matching on it would hand over someone else's password account.
	 */
	if (!profile.email_verified) {
		throw redirect(303, '/login?google=unverified');
	}

	const email = profile.email.toLowerCase();

	// 1. Already linked by google_id.
	const linked = await db
		.prepare('SELECT id FROM users WHERE google_id = ?')
		.bind(profile.sub)
		.first<{ id: number }>();

	let userId = linked?.id ?? null;

	// 2. Same verified email as an existing account: link, never duplicate.
	if (!userId) {
		const existing = await db
			.prepare('SELECT id, google_id FROM users WHERE lower(email) = ?')
			.bind(email)
			.first<{ id: number; google_id: string | null }>();

		if (existing) {
			if (existing.google_id && existing.google_id !== profile.sub) {
				// The account is already tied to a different Google identity.
				throw redirect(303, '/login?google=conflict');
			}
			await db
				.prepare(
					"UPDATE users SET google_id = ?, email_verified_at = COALESCE(email_verified_at, datetime('now')) WHERE id = ?"
				)
				.bind(profile.sub, existing.id)
				.run();
			userId = existing.id;
		}
	}

	// 3. Otherwise create a new learner, resolving username collisions.
	if (!userId) {
		const base = baseUsername(profile);
		let username = base;
		for (let attempt = 0; attempt < 8 && !userId; attempt += 1) {
			try {
				await db
					.prepare(
						`INSERT INTO users (username, email, password_hash, role, google_id, email_verified_at, last_login)
						 VALUES (?, ?, NULL, 'learner', ?, datetime('now'), datetime('now'))`
					)
					.bind(username, email, profile.sub)
					.run();
				const created = await db
					.prepare('SELECT id FROM users WHERE google_id = ?')
					.bind(profile.sub)
					.first<{ id: number }>();
				userId = created?.id ?? null;
			} catch {
				// Username taken: try a suffixed variant before giving up.
				username = `${base.slice(0, 26)}${Math.floor(Math.random() * 9000) + 1000}`;
			}
		}
	}

	if (!userId) throw error(500, 'Could not complete Google sign-in.');

	await db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").bind(userId).run();
	await createSession(db, userId, cookies);

	throw redirect(303, next);
};
