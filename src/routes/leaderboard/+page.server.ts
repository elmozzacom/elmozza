import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { dbOrError, requireUser } from '$lib/server/auth';
import { ensureGame } from '$lib/server/game';
import { activeBoard, alltimeBoard, findSelf, weeklyBoard } from '$lib/server/board';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = requireUser(locals.user);
	const db = dbOrError(locals.db ?? undefined);
	const game = await ensureGame(db, user.id);
	if (!game.onboarded_at) throw redirect(303, '/onboarding');
	const tab = url.searchParams.get('tab') ?? 'week';
	const nick = await db
		.prepare('SELECT board_nickname FROM users WHERE id = ?')
		.bind(user.id)
		.first<{ board_nickname: string | null }>();
	const [weekly, alltime, active] = await Promise.all([weeklyBoard(db), alltimeBoard(db), activeBoard(db)]);
	return {
		user: { username: user.username, role: user.role, current_streak: user.current_streak },
		game: { hearts: game.hearts, gems: game.gems },
		nickname: nick?.board_nickname ?? '',
		tab: ['week', 'all', 'active'].includes(tab) ? tab : 'week',
		weekly,
		alltime,
		active,
		self: {
			week: findSelf(weekly, user.id),
			all: findSelf(alltime, user.id),
			active: findSelf(active, user.id),
			weekTotal: weekly.length,
			allTotal: alltime.length,
			activeTotal: active.length
		}
	};
};
