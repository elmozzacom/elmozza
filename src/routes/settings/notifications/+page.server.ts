import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { dbOrError, requireUser } from '$lib/server/auth';
import { ensureGame } from '$lib/server/game';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireUser(locals.user);
	const db = dbOrError(locals.db ?? undefined);
	const game = await ensureGame(db, user.id);
	if (!game.onboarded_at) throw redirect(303, '/onboarding');
	const prefs = await db
		.prepare('SELECT * FROM notification_prefs WHERE user_id = ?')
		.bind(user.id)
		.first<{ daily_reminder: number; streak_risk: number; league_result: number; review_digest: number }>();
	return {
		user: { username: user.username, role: user.role, current_streak: user.current_streak },
		game: { gems: game.gems, hearts: game.hearts },
		prefs: prefs ?? { daily_reminder: 1, streak_risk: 1, league_result: 1, review_digest: 1 }
	};
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const user = requireUser(locals.user);
		const db = dbOrError(locals.db ?? undefined);
		const form = await request.formData();
		const on = (name: string) => (form.get(name) === 'on' ? 1 : 0);
		await db
			.prepare(
				`INSERT INTO notification_prefs (user_id, daily_reminder, streak_risk, league_result, review_digest)
				 VALUES (?, ?, ?, ?, ?)
				 ON CONFLICT(user_id) DO UPDATE SET
				   daily_reminder = excluded.daily_reminder,
				   streak_risk = excluded.streak_risk,
				   league_result = excluded.league_result,
				   review_digest = excluded.review_digest`
			)
			.bind(user.id, on('daily_reminder'), on('streak_risk'), on('league_result'), on('review_digest'))
			.run();
		return { ok: true };
	}
};
