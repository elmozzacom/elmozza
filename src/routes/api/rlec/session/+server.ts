import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSessionStart } from '$lib/server/rlec/core';
import { readJson, requireApiUser, startSession } from '$lib/server/rlec/db';

export const POST: RequestHandler = async ({ locals, request }) => {
	const { user, db } = requireApiUser(locals);
	const parsed = validateSessionStart(await readJson(request));
	if (!parsed.ok) return json({ ok: false, errors: parsed.errors }, { status: 400 });
	const session = await startSession(db, user.id, parsed.value);
	return json({ ok: true, session }, { status: 201 });
};
