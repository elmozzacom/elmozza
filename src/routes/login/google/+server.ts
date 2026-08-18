import { dev } from '$app/environment';
import { redirect } from '@sveltejs/kit';
import { generateState, generateCodeVerifier } from 'arctic';
import type { RequestHandler } from './$types';
import { safeRedirect } from '$lib/server/auth';
import {
	GOOGLE_NEXT_COOKIE,
	GOOGLE_STATE_COOKIE,
	GOOGLE_VERIFIER_COOKIE,
	googleClient
} from '$lib/server/google';

/** Ten minutes is ample for a consent screen and short enough to limit replay. */
const TEN_MINUTES = 600;

export const GET: RequestHandler = async (event) => {
	if (event.locals.user) throw redirect(303, '/dashboard');

	const google = googleClient(event);
	const state = generateState();
	const codeVerifier = generateCodeVerifier();

	const url = google.createAuthorizationURL(state, codeVerifier, ['openid', 'profile', 'email']);

	const options = {
		path: '/',
		httpOnly: true,
		secure: !dev,
		sameSite: 'lax' as const,
		maxAge: TEN_MINUTES
	};

	// State guards against CSRF; the PKCE verifier guards the code exchange.
	event.cookies.set(GOOGLE_STATE_COOKIE, state, options);
	event.cookies.set(GOOGLE_VERIFIER_COOKIE, codeVerifier, options);
	event.cookies.set(
		GOOGLE_NEXT_COOKIE,
		safeRedirect(event.url.searchParams.get('next')),
		options
	);

	throw redirect(302, url.toString());
};
