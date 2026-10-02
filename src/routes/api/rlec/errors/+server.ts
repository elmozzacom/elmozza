import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateErrorEvent } from '$lib/server/rlec/core';
import { readJson, recordErrorEvent, requireApiUser } from '$lib/server/rlec/db';

/** Record one corrected error: event row + learner-error upsert (mastery, SM-2 next review). */
export const POST: RequestHandler = async ({ locals, request }) => {
	const { user, db } = requireApiUser(locals);
	const parsed = validateErrorEvent(await readJson(request));
	if (!parsed.ok) return json({ ok: false, errors: parsed.errors }, { status: 400 });
	const learner_error = await recordErrorEvent(db, user.id, parsed.value, new Date());
	return json({ ok: true, learner_error }, { status: 201 });
};
