import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateByoImport } from '$lib/server/rlec/core';
import { parseSessionReport } from '$lib/server/rlec/byo';
import { importSessionReport, readJson, requireApiUser } from '$lib/server/rlec/db';
import { pilotAccess } from '$lib/server/rlec/env';

/** Pasted SESSION REPORT (source 'byo_paste') -> Error Memory + Learning Memory. */
export const POST: RequestHandler = async ({ locals, request, platform }) => {
	const { user, db } = requireApiUser(locals);
	const parsed = validateByoImport(await readJson(request));
	if (!parsed.ok) return json({ ok: false, errors: parsed.errors }, { status: 400 });
	const report = parseSessionReport(parsed.value.text, 'byo_paste');
	const summary = await importSessionReport(
		db,
		user.id,
		report,
		{ session_id: parsed.value.session_id, scenario_id: parsed.value.scenario_id },
		new Date(),
		pilotAccess(platform, user)
	);
	return json({ ok: true, ...summary }, { status: 201 });
};
