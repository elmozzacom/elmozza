import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { validateTomorrowNote } from '$lib/server/rlec/core';
import { lastTomorrowNote, listScenarios, saveTomorrowNote } from '$lib/server/rlec/db';
import { coachAccessFor } from '$lib/server/rlec/env';

/** Real-Life English Coach home. Login required; open to all once RLEC_COACH_ENABLED, else pilot users only. */
export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user) throw redirect(303, '/login?next=/coach');
	if (!locals.db) throw error(503, 'Database belum terhubung.');
	const access = coachAccessFor(platform, locals.user);
	if (!access.enabled) throw error(404, 'Not found');
	const { items } = await listScenarios(
		locals.db,
		locals.user.id,
		{ domain: null, cefr: null, q: null, limit: 50, offset: 0, source_kind: null },
		{ pilot: access.pilot }
	);
	const note = await lastTomorrowNote(locals.db, locals.user.id);
	return {
		user: { username: locals.user.username, role: locals.user.role },
		pilot: access.pilot,
		scenarios: items.map((s) => ({
			id: Number(s.id),
			title: String(s.title),
			domain: String(s.domain),
			source_kind: String(s.source_kind),
			cefr: (s.cefr as string | null) ?? null,
			place: (s.place as string | null) ?? null,
			goal: (s.goal as string | null) ?? null,
			status: String(s.status)
		})),
		lastNote: note?.text ?? null
	};
};

export const actions: Actions = {
	tomorrow: async ({ locals, request, platform }) => {
		if (!locals.user) throw redirect(303, '/login?next=/coach');
		if (!locals.db) return fail(503, { error: 'Database belum terhubung.' });
		if (!coachAccessFor(platform, locals.user).enabled) return fail(404, { error: 'Not found' });
		const form = await request.formData();
		const checked = validateTomorrowNote(form.get('text'));
		if (!checked.ok) return fail(400, { error: 'Tulis 3–500 karakter, misalnya: Besok rapat online dengan tim.' });
		const saved = await saveTomorrowNote(locals.db, locals.user.id, checked.value);
		return { saved: saved?.text ?? checked.value };
	}
};
