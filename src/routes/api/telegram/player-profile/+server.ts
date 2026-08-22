import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { secureEqual } from '$lib/server/omnichannel-quiz-core';
import { validateNickname } from '$lib/server/board-rank';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!secureEqual(request.headers.get('x-elmozza-quiz-secret'), platform?.env?.TELEGRAM_INGEST_SECRET)) {
		return json({ ok: false }, { status: 401 });
	}
	if (!locals.db) return json({ ok: false }, { status: 503 });
	let body: { user_id?: unknown; nickname?: unknown; opt_in?: unknown };
	try { body = await request.json(); } catch { return json({ ok: false }, { status: 400 }); }
	const userId = typeof body.user_id === 'string' ? body.user_id.trim() : '';
	const checked = validateNickname(typeof body.nickname === 'string' ? body.nickname : '');
	if (!/^\d{1,24}$/.test(userId) || !checked.ok) return json({ ok: false }, { status: 400 });
	await locals.db.prepare(
		`INSERT INTO quiz_players
		 (platform, external_user_id, display_name, leaderboard_opt_in, created_at, updated_at)
		 VALUES ('telegram', ?, ?, ?, datetime('now'), datetime('now'))
		 ON CONFLICT (platform, external_user_id)
		 DO UPDATE SET display_name = excluded.display_name,
		               leaderboard_opt_in = excluded.leaderboard_opt_in,
		               updated_at = datetime('now')`
	).bind(userId, checked.nickname, body.opt_in === false ? 0 : 1).run();
	return json({ ok: true });
};
