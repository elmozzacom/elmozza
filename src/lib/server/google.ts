import { Google } from 'arctic';
import type { RequestEvent } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';

/**
 * Google sign-in.
 *
 * Arctic is the OAuth companion to the Lucia session pattern this project
 * already implements in `src/lib/server/auth.ts`: opaque session id in the
 * database, httpOnly cookie, no third-party session state. Arctic handles the
 * protocol; the session it produces is created by our own `createSession`.
 *
 * Credentials come from the platform env (Cloudflare Pages variables, or
 * `.dev.vars` locally) and are never imported from `$env/static`, which would
 * bake them into the build.
 */

export const GOOGLE_STATE_COOKIE = 'elmozza_google_state';
export const GOOGLE_VERIFIER_COOKIE = 'elmozza_google_verifier';
export const GOOGLE_NEXT_COOKIE = 'elmozza_google_next';

export type GoogleEnv = {
	GOOGLE_CLIENT_ID?: string;
	GOOGLE_CLIENT_SECRET?: string;
};

export function googleRedirectUri(url: URL) {
	return `${url.origin}/login/google/callback`;
}

/**
 * Returns null when the credentials are absent, so the button can be hidden
 * rather than offering a broken journey.
 */
export function googleConfigured(event: Pick<RequestEvent, 'platform'>) {
	const env = (event.platform?.env ?? {}) as GoogleEnv;
	return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

export function googleClient(event: Pick<RequestEvent, 'platform' | 'url'>) {
	const env = (event.platform?.env ?? {}) as GoogleEnv;
	if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
		throw error(503, 'Google sign-in is not configured on this deployment.');
	}
	return new Google(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, googleRedirectUri(event.url));
}

export type GoogleProfile = {
	sub: string;
	email: string;
	email_verified: boolean;
	name?: string;
	given_name?: string;
};

export async function fetchGoogleProfile(accessToken: string): Promise<GoogleProfile> {
	const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
		headers: { Authorization: `Bearer ${accessToken}` }
	});
	if (!response.ok) throw error(502, 'Google did not return a profile.');
	const profile = (await response.json()) as GoogleProfile;
	if (!profile.sub || !profile.email) throw error(502, 'Google returned an incomplete profile.');
	return profile;
}

/**
 * Derive a username that satisfies the existing validation rule
 * (3–32 chars of letters, digits, underscore, hyphen) and does not collide.
 */
export function baseUsername(profile: GoogleProfile) {
	const source = profile.given_name || profile.name || profile.email.split('@')[0];
	const cleaned = source
		.normalize('NFKD')
		.replace(/[^a-zA-Z0-9_-]/g, '')
		.slice(0, 24);
	return cleaned.length >= 3 ? cleaned : `learner${profile.sub.slice(-6)}`;
}
