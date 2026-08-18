import { env as dynamicEnv } from '$env/dynamic/private';
import { Google } from 'arctic';
import type { RequestEvent } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';

/**
 * Google sign-in.
 *
 * Arctic is the OAuth companion to the Lucia session pattern this project
 * already implements in `src/lib/server/auth.ts`. Credentials are read at
 * request time from the platform binding first, then from SvelteKit's
 * dynamic private env. They are never imported from `$env/static`.
 */

export const GOOGLE_STATE_COOKIE = 'elmozza_google_state';
export const GOOGLE_VERIFIER_COOKIE = 'elmozza_google_verifier';
export const GOOGLE_NEXT_COOKIE = 'elmozza_google_next';

export type GoogleEnv = {
	GOOGLE_CLIENT_ID?: string;
	GOOGLE_CLIENT_SECRET?: string;
};

function firstPresent(...values: Array<string | undefined>) {
	for (const value of values) {
		const trimmed = value?.trim();
		if (trimmed) return trimmed;
	}
	return '';
}

/**
 * Pages secrets land on `platform.env` after a deploy. Local `.dev.vars` and
 * some Pages setups surface them through `$env/dynamic/private` instead.
 * Check both; never log the values.
 */
export function googleCredentials(event?: Pick<RequestEvent, 'platform'>): GoogleEnv {
	const platform = (event?.platform?.env ?? {}) as Record<string, unknown>;
	const fromPlatform: Record<string, string> = {};
	try {
		for (const [rawKey, value] of Object.entries(platform)) {
			if (typeof value === 'string' && value.trim()) fromPlatform[rawKey.trim()] = value.trim();
		}
	} catch {
		// platform.env may throw if enumerated in some runtimes; fall through.
	}

	return {
		GOOGLE_CLIENT_ID: firstPresent(
			fromPlatform.GOOGLE_CLIENT_ID,
			fromPlatform.GOOGLE_ID,
			fromPlatform.CLIENT_ID,
			dynamicEnv.GOOGLE_CLIENT_ID,
			typeof process !== 'undefined' ? process.env.GOOGLE_CLIENT_ID : undefined
		),
		GOOGLE_CLIENT_SECRET: firstPresent(
			fromPlatform.GOOGLE_CLIENT_SECRET,
			fromPlatform.GOOGLE_SECRET,
			fromPlatform.CLIENT_SECRET,
			dynamicEnv.GOOGLE_CLIENT_SECRET,
			typeof process !== 'undefined' ? process.env.GOOGLE_CLIENT_SECRET : undefined
		)
	};
}

export function googleRedirectUri(url: URL) {
	return `${url.origin}/login/google/callback`;
}

/**
 * Returns false when the credentials are absent, so the button can be hidden
 * rather than offering a broken journey.
 */
export function googleConfigured(event: Pick<RequestEvent, 'platform'>) {
	const env = googleCredentials(event);
	return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

export function googleClient(event: Pick<RequestEvent, 'platform' | 'url'>) {
	const env = googleCredentials(event);
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
