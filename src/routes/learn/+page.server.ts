import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { dbOrError, requireUser } from '$lib/server/auth';
import { copyFor, ensureGame, todaysQuests } from '$lib/server/game';
import { loadPath } from '$lib/server/path';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireUser(locals.user);
	const db = dbOrError(locals.db ?? undefined);
	const game = await ensureGame(db, user.id);
	if (!game.onboarded_at) throw redirect(303, '/onboarding');
	const path = await loadPath(db, user.id);
	const quests = await todaysQuests(db, user.id, game.age_band);
	return {
		user: { username: user.username, role: user.role, current_streak: user.current_streak, total_xp: user.total_xp },
		game: {
			hearts: game.hearts,
			gems: game.gems,
			daily_goal: game.daily_goal,
			age_band: game.age_band,
			freeze_bank: game.freeze_bank
		},
		copy: copyFor(game.age_band),
		quests,
		nodes: path.nodes
	};
};
