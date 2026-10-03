import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readJson, requireApiUser } from '$lib/server/rlec/db';
import { coachAccessFor } from '$lib/server/rlec/env';
import { runTomorrow } from '$lib/server/rlec/tomorrow/pipeline';
import { isAiBinding, workersAiProvider } from '$lib/server/rlec/tomorrow/provider';
import type { VectorizeLike } from '$lib/server/rlec/tomorrow/retrieval';
import { publicResult, tomorrowState, validateTomorrowRequest } from '$lib/server/rlec/tomorrow/api';

/** Credits + the user's last Tomorrow card + pending day-two check-in. */
export const GET: RequestHandler = async ({ locals, platform }) => {
	const { user, db } = requireApiUser(locals);
	if (!coachAccessFor(platform, user).enabled) throw error(404, 'Not found');
	return json({ ok: true, ...(await tomorrowState(db, user.id, new Date())) });
};

/** Tomorrow Pack: free-text plan -> bank / own / generated card (or bank-only fallback). */
export const POST: RequestHandler = async ({ locals, request, platform }) => {
	const { user, db } = requireApiUser(locals);
	const access = coachAccessFor(platform, user);
	if (!access.enabled) throw error(404, 'Not found');
	const parsed = validateTomorrowRequest(await readJson(request));
	if (!parsed.ok) return json({ ok: false, errors: parsed.errors }, { status: 400 });
	const env = platform?.env;
	const ai = isAiBinding(env?.AI) ? env.AI : null;
	const result = await runTomorrow(
		{
			db,
			now: new Date(),
			pilot: access.pilot,
			provider: ai ? workersAiProvider(ai) : null,
			ai,
			ecwDb: env?.ECW_DB ?? null,
			vec: (env?.ECW_VEC as unknown as VectorizeLike | undefined) ?? null
		},
		user.id,
		parsed.value.text,
		parsed.value.level
	);
	return json(publicResult(result));
};
