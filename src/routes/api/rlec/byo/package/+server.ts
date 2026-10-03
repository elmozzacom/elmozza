import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateByoPackage } from '$lib/server/rlec/core';
import { byoPackage, readJson, requireApiUser } from '$lib/server/rlec/db';
import { pilotAccess } from '$lib/server/rlec/env';

/** Level 0 BYO: copy-paste prompt for ChatGPT/Gemini/Claude. No AI call on our side. */
export const POST: RequestHandler = async ({ locals, request, platform }) => {
	const { user, db } = requireApiUser(locals);
	const parsed = validateByoPackage(await readJson(request));
	if (!parsed.ok) return json({ ok: false, errors: parsed.errors }, { status: 400 });
	const pkg = await byoPackage(db, user, parsed.value.scenario_id, parsed.value.minutes, pilotAccess(platform, user));
	return json({ ok: true, ...pkg });
};
