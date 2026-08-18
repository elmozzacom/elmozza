import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { dbOrError, requireUser } from '$lib/server/auth';
import { ensureGame } from '$lib/server/game';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireUser(locals.user);
	const db = dbOrError(locals.db ?? undefined);
	const game = await ensureGame(db, user.id);
	if (game.onboarded_at) throw redirect(303, '/learn');
	return { user: { username: user.username, role: user.role } };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = requireUser(locals.user);
		const db = dbOrError(locals.db ?? undefined);
		const form = await request.formData();
		const age = String(form.get('age') ?? '');
		const goal = Number(form.get('goal'));
		const parental = String(form.get('parental') ?? '').trim();
		if (!['kids', 'teens', 'adults'].includes(age)) return fail(400, { error: 'Choose an age band.' });
		if (![10, 20, 40].includes(goal)) return fail(400, { error: 'Choose a daily goal.' });
		if (age === 'kids' && !/^\S+@\S+\.\S+$/.test(parental)) {
			return fail(400, { error: 'Kids accounts need a parent email.' });
		}
		await ensureGame(db, user.id);
		await db
			.prepare(
				`UPDATE user_game
				 SET age_band = ?, daily_goal = ?, parental_email = ?, onboarded_at = datetime('now'),
				     league_opt_out = CASE WHEN ? = 'kids' THEN 1 ELSE league_opt_out END
				 WHERE user_id = ?`
			)
			.bind(age, goal, age === 'kids' ? parental : null, age, user.id)
			.run();
		throw redirect(303, '/learn');
	}
};
