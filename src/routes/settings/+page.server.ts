import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { dbOrError, requireUser } from '$lib/server/auth';
import { ensureGame } from '$lib/server/game';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireUser(locals.user);
	const db = dbOrError(locals.db ?? undefined);
	const game = await ensureGame(db, user.id);
	if (!game.onboarded_at) throw redirect(303, '/onboarding');
	return {
		user: { username: user.username, role: user.role, current_streak: user.current_streak },
		game: {
			gems: game.gems,
			hearts: game.hearts,
			daily_goal: game.daily_goal,
			league_opt_out: game.league_opt_out,
			reminder_hour: game.reminder_hour,
			freeze_bank: game.freeze_bank
		}
	};
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const user = requireUser(locals.user);
		const db = dbOrError(locals.db ?? undefined);
		const form = await request.formData();
		const goal = Number(form.get('goal'));
		const hour = Number(form.get('hour'));
		const opt = form.get('league') === 'off' ? 1 : 0;
		if (![10, 20, 40].includes(goal)) return fail(400, { error: 'Invalid goal.' });
		if (hour < 0 || hour > 23) return fail(400, { error: 'Invalid hour.' });
		await db
			.prepare('UPDATE user_game SET daily_goal = ?, reminder_hour = ?, league_opt_out = ? WHERE user_id = ?')
			.bind(goal, hour, opt, user.id)
			.run();
		return { ok: true };
	}
};
