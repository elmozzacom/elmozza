import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { reviewDue, requireApiUser } from '$lib/server/rlec/db';

/** Learner errors with next_review_at <= now, ordered by severity × frequency. */
export const GET: RequestHandler = async ({ locals, url }) => {
	const { user, db } = requireApiUser(locals);
	const raw = Number(url.searchParams.get('limit') ?? 10);
	const limit = Number.isInteger(raw) && raw >= 1 && raw <= 50 ? raw : 10;
	const due = await reviewDue(db, user.id, new Date(), limit);
	return json({ ok: true, ...due });
};
