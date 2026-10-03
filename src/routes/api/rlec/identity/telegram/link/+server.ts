import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { secretMatches, validateTelegramLink } from '$lib/server/rlec/core';
import { linkTelegram, readJson } from '$lib/server/rlec/db';
import { rlecEnv } from '$lib/server/rlec/env';

/** Server-to-server (Telegram bot -> web): header x-rlec-link-secret must equal RLEC_TELEGRAM_LINK_SECRET. */
export const POST: RequestHandler = async ({ locals, request, platform }) => {
	if (!secretMatches(request.headers.get('x-rlec-link-secret'), rlecEnv(platform, 'RLEC_TELEGRAM_LINK_SECRET'))) {
		return json({ ok: false }, { status: 401 });
	}
	if (!locals.db) return json({ ok: false }, { status: 503 });
	const parsed = validateTelegramLink(await readJson(request));
	if (!parsed.ok) return json({ ok: false, errors: parsed.errors }, { status: 400 });
	const linked = await linkTelegram(locals.db, parsed.value.code, parsed.value.telegram_user_id, new Date());
	return json({ ok: true, ...linked });
};
