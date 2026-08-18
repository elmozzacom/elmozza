import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { googleCredentials } from '$lib/server/google';

/**
 * Runtime binding check. Reports only presence and shape — never secret values.
 * Used to confirm Pages environment variables actually reached the worker.
 */
export const GET: RequestHandler = async (event) => {
	const platform = (event.platform?.env ?? {}) as Record<string, unknown>;
	const creds = googleCredentials(event);
	const id = creds.GOOGLE_CLIENT_ID ?? '';
	const secret = creds.GOOGLE_CLIENT_SECRET ?? '';

	let keyCount = 0;
	try {
		keyCount = Object.keys(platform).length;
	} catch {
		keyCount = -1;
	}

	return json(
		{
			ok: true,
			hasPlatform: Boolean(event.platform),
			hasDb: Boolean(platform.DB),
			platformKeyCount: keyCount,
			google: {
				configured: Boolean(id && secret),
				hasId: Boolean(id),
				hasSecret: Boolean(secret),
				idLength: id.length,
				secretLength: secret.length,
				idLooksLikeGoogle: id.endsWith('.apps.googleusercontent.com')
			}
		},
		{ headers: { 'cache-control': 'no-store' } }
	);
};
