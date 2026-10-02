import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { parseId, validateSessionComplete } from '$lib/server/rlec/core';
import { completeSession, readJson, requireApiUser } from '$lib/server/rlec/db';

export const POST: RequestHandler = async ({ locals, request, params }) => {
	const { user, db } = requireApiUser(locals);
	const sessionId = parseId(params.id);
	if (sessionId === null) return json({ ok: false, errors: { id: 'positive integer' } }, { status: 400 });
	const parsed = validateSessionComplete(await readJson(request));
	if (!parsed.ok) return json({ ok: false, errors: parsed.errors }, { status: 400 });
	const summary = await completeSession(db, user.id, sessionId, parsed.value, new Date());
	return json({ ok: true, summary });
};
