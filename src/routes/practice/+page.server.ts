import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { dbOrError, requireUser } from '$lib/server/auth';
import { ensureGame } from '$lib/server/game';
import { dueItems } from '$lib/server/srs';
import { markReview, refillHeartsByReview } from '$lib/server/complete';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireUser(locals.user);
	const db = dbOrError(locals.db ?? undefined);
	const game = await ensureGame(db, user.id);
	if (!game.onboarded_at) throw redirect(303, '/onboarding');
	const items = await dueItems(db, user.id, 8);
	return {
		user: { username: user.username, role: user.role, current_streak: user.current_streak },
		game: { hearts: game.hearts, gems: game.gems },
		items
	};
};

export const actions: Actions = {
	grade: async ({ request, locals }) => {
		const user = requireUser(locals.user);
		const db = dbOrError(locals.db ?? undefined);
		const form = await request.formData();
		const key = String(form.get('key') ?? '');
		const quality = Number(form.get('quality'));
		if (!key || Number.isNaN(quality)) return fail(400, { error: 'Missing grade.' });
		await markReview(db, user.id, key, quality);
		try {
			const { recordQuizResult } = await import('$lib/server/board');
			await recordQuizResult(db, {
				userId: user.id,
				quizId: `practice-${key}`,
				source: 'practice',
				total: 1,
				correct: quality >= 3 ? 1 : 0
			});
		} catch {
			/* ignore */
		}
		const left = await dueItems(db, user.id, 1);
		if (left.length === 0) await refillHeartsByReview(db, user.id);
		throw redirect(303, '/practice?ok=1');
	}
};
