import { isBrandHost } from '$lib/hosts';
import type { PageServerLoad } from './$types';
import { env as dyn } from '$env/dynamic/private';
import { siteFlag, weeklyBoard } from '$lib/server/board';
import { redirect } from '@sveltejs/kit';

/** Cookie that records the visitor has already seen the gate page. */
const GATE_COOKIE = 'seen_board_gate';

export const load: PageServerLoad = async ({ url, locals, platform, cookies }) => {
	const brand = isBrandHost(url.hostname);

	/*
	 * First arrival on the English surface goes through /start — the live board
	 * and the quiz button — before the landing page. Once seen, the cookie makes
	 * every later visit land straight on the landing page. `?gate=skip` is the
	 * escape hatch the gate page itself links to.
	 */
	if (!brand && !cookies.get(GATE_COOKIE)) {
		if (url.searchParams.get('gate') === 'skip') {
			cookies.set(GATE_COOKIE, '1', { path: '/', maxAge: 60 * 60 * 24 * 180, sameSite: 'lax' });
		} else {
			throw redirect(303, '/start');
		}
	}

	const db = locals.db;
	let teaser: Array<{ nickname: string; avgPct: number }> = [];
	let showTeaser = false;
	let showTelegram = false;
	if (db) {
		try {
			showTeaser = await siteFlag(db, 'show_leaderboard_teaser', '1');
			showTelegram = await siteFlag(db, 'show_telegram_card', '1');
			if (showTeaser) {
				const weekly = await weeklyBoard(db);
				teaser = weekly.slice(0, 3).map((row) => ({ nickname: row.nickname, avgPct: row.avgPct }));
			}
		} catch {
			showTeaser = false;
		}
	}
	const telegramUrl = String(platform?.env?.TELEGRAM_BOT_URL ?? dyn.TELEGRAM_BOT_URL ?? '').trim();
	return {
		surface: brand ? 'brand' : 'english',
		user: locals.user ? { username: locals.user.username, role: locals.user.role } : null,
		board: { showTeaser, teaser, showTelegram, telegramUrl }
	};
};
