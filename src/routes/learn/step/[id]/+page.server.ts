import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { dbOrError, requireUser } from '$lib/server/auth';
import { ensureGame } from '$lib/server/game';
import { loadPath, loadStep } from '$lib/server/path';
import { finishStep, loseHeart, speakingOk } from '$lib/server/complete';

export const load: PageServerLoad = async ({ locals, params }) => {
	const user = requireUser(locals.user);
	const db = dbOrError(locals.db ?? undefined);
	const game = await ensureGame(db, user.id);
	if (!game.onboarded_at) throw redirect(303, '/onboarding');

	const id = Number(params.id);
	const step = await loadStep(db, id);
	if (!step) throw error(404, 'Step not found.');

	const path = await loadPath(db, user.id);
	const node = path.nodes.find((item) => item.kind === 'step' && item.id === id);
	if (node?.status === 'locked') throw error(403, 'This step is still locked.');

	const already = await db
		.prepare('SELECT 1 AS n FROM user_step_progress WHERE user_id = ? AND step_id = ?')
		.bind(user.id, id)
		.first();

	return {
		user: { username: user.username, role: user.role, current_streak: user.current_streak },
		game: { hearts: game.hearts, gems: game.gems },
		step: {
			id: step.id,
			type: step.type,
			title: step.title,
			xp: step.xp,
			unit: step.unit_title,
			intro: step.intro_sentence,
			payload: JSON.parse(step.payload) as Record<string, unknown>
		},
		already: Boolean(already),
		blocked: step.type === 'checkpoint' && game.hearts <= 0 && !already
	};
};

export const actions: Actions = {
	answer: async ({ request, locals, params }) => {
		const user = requireUser(locals.user);
		const db = dbOrError(locals.db ?? undefined);
		const step = await loadStep(db, Number(params.id));
		if (!step) return fail(404, { error: 'Missing step.' });
		const payload = JSON.parse(step.payload) as Record<string, unknown>;
		const form = await request.formData();
		const game = await ensureGame(db, user.id);

		const done = await db
			.prepare('SELECT 1 AS n FROM user_step_progress WHERE user_id = ? AND step_id = ?')
			.bind(user.id, step.id)
			.first();

		let correct = false;
		if (step.type === 'vocab_match') {
			const pairs = payload.pairs as Array<{ en: string; id: string }>;
			correct = pairs.every((pair, index) => String(form.get(`m${index}`) ?? '') === pair.en);
		} else if (step.type === 'listening' || step.type === 'fill_gap' || step.type === 'story_dialogue') {
			correct = Number(form.get('choice')) === Number(payload.answer);
		} else if (step.type === 'sentence_builder') {
			const built = String(form.get('built') ?? '')
				.trim()
				.replace(/\s+/g, ' ');
			correct = built.toLowerCase() === String(payload.correct).toLowerCase();
		} else if (step.type === 'speaking') {
			const heard = String(form.get('heard') ?? '');
			correct = speakingOk(String(payload.target), heard);
		} else if (step.type === 'checkpoint') {
			if (game.hearts <= 0 && !done) return fail(409, { error: 'No hearts left. Review to refill.' });
			const questions = payload.questions as Array<{ answer: number }>;
			const misses = questions.filter((q, index) => Number(form.get(`q${index}`)) !== q.answer).length;
			if (misses > 0 && !done) {
				await loseHeart(db, user.id);
				return fail(422, { error: `${misses} missed. A heart is spent. Try again.` });
			}
			correct = misses === 0;
		}

		if (!correct) {
			if (step.type === 'checkpoint') return fail(422, { error: 'Not yet.' });
			return fail(422, { error: 'Not quite. Try once more — practice is free.' });
		}

		const result = await finishStep(db, user.id, step, { perfect: true, already: Boolean(done) });
		throw redirect(303, `/learn?done=${step.id}&xp=${result.xp}`);
	}
};
