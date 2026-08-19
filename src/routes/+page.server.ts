import { isBrandHost } from '$lib/hosts';
import type { PageServerLoad } from './$types';
import { env as dyn } from '$env/dynamic/private';
import { siteFlag, weeklyBoard } from '$lib/server/board';

export const load: PageServerLoad = async ({ url, locals, platform }) => {
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
		surface: isBrandHost(url.hostname) ? 'brand' : 'english',
		user: locals.user ? { username: locals.user.username, role: locals.user.role } : null,
		board: { showTeaser, teaser, showTelegram, telegramUrl }
	};
};
