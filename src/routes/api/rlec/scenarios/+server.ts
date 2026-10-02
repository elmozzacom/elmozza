import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { parseScenarioFilters } from '$lib/server/rlec/core';
import { listScenarios, requireApiUser } from '$lib/server/rlec/db';

/** Servable scenarios (active/qc_passed) plus the learner's own personal ones. */
export const GET: RequestHandler = async ({ locals, url }) => {
	const { user, db } = requireApiUser(locals);
	const parsed = parseScenarioFilters(url.searchParams);
	if (!parsed.ok) return json({ ok: false, errors: parsed.errors }, { status: 400 });
	const result = await listScenarios(db, user.id, parsed.value);
	return json({ ok: true, ...result, limit: parsed.value.limit, offset: parsed.value.offset });
};
