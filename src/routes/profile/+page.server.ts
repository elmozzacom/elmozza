import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { dbOrError, requireUser } from '$lib/server/auth';
import { ensureGame, LEAGUES } from '$lib/server/game';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireUser(locals.user);
	const db = dbOrError(locals.db ?? undefined);
	const game = await ensureGame(db, user.id);
	if (!game.onboarded_at) throw redirect(303, '/onboarding');
	const badges = await db
		.prepare(
			`SELECT b.id, b.title, b.description, ub.earned_at
			 FROM badges b
			 LEFT JOIN user_badges ub ON ub.badge_id = b.id AND ub.user_id = ?
			 ORDER BY b.title`
		)
		.bind(user.id)
		.all<{ id: string; title: string; description: string; earned_at: string | null }>();
	return {
		user: { username: user.username, role: user.role, current_streak: user.current_streak, total_xp: user.total_xp },
		game: {
			gems: game.gems,
			hearts: game.hearts,
			age_band: game.age_band,
			league: game.league_opt_out ? 'Off' : LEAGUES[game.league_tier] ?? 'Quartz',
			weekly_xp: game.weekly_xp
		},
		badges: badges.results ?? []
	};
};
