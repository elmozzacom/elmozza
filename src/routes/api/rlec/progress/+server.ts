import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { learningProgress, requireApiUser } from '$lib/server/rlec/db';

/** Learning Memory: recent wins first, then improvements, skill strengths, due reviews. */
export const GET: RequestHandler = async ({ locals }) => {
	const { user, db } = requireApiUser(locals);
	return json({ ok: true, ...(await learningProgress(db, user.id, new Date())) });
};
