import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readJson, requireApiUser } from '$lib/server/rlec/db';
import { coachAccessFor } from '$lib/server/rlec/env';
import { recordOutcome, validateOutcome } from '$lib/server/rlec/tomorrow/api';

/** Day-two check-in: how did the real-life situation go? Session owner only. */
export const POST: RequestHandler = async ({ locals, request, platform }) => {
	const { user, db } = requireApiUser(locals);
	if (!coachAccessFor(platform, user).enabled) throw error(404, 'Not found');
	const parsed = validateOutcome(await readJson(request));
	if (!parsed.ok) return json({ ok: false, errors: parsed.errors }, { status: 400 });
	const saved = await recordOutcome(db, user.id, parsed.value, new Date());
	if (!saved.ok) return json({ ok: false, message: saved.message }, { status: saved.status });
	return json({ ok: true, session_id: parsed.value.session_id, real_world_outcome: saved.outcome });
};
