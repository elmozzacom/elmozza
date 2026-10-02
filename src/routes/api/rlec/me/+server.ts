import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateProfilePatch } from '$lib/server/rlec/core';
import { getOrCreateProfile, readJson, requireApiUser, topErrors, updateProfile } from '$lib/server/rlec/db';

/** Profile (created with defaults on first GET) + tier + top-3 error patterns. */
export const GET: RequestHandler = async ({ locals }) => {
	const { user, db } = requireApiUser(locals);
	const profile = await getOrCreateProfile(db, user.id);
	const top_errors = await topErrors(db, user.id, 3);
	return json({ profile, tier: profile.tier, top_errors });
};

export const PATCH: RequestHandler = async ({ locals, request }) => {
	const { user, db } = requireApiUser(locals);
	const parsed = validateProfilePatch(await readJson(request));
	if (!parsed.ok) return json({ ok: false, errors: parsed.errors }, { status: 400 });
	const profile = await updateProfile(db, user.id, parsed.value);
	if (!profile) throw error(500, 'Profil gagal disimpan.');
	return json({ ok: true, profile });
};
