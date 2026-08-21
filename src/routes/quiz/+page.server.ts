import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { QUIZ_LENGTH, drawQuiz, todaySeed } from '$lib/content/quiz-bank';
import { recordQuizResult } from '$lib/server/board';

/**
 * The public quiz. Five questions drawn from the shared bank (every checkpoint
 * in the ladder + the placement set). Answers are graded on the server against
 * a re-derived paper, so the correct index never ships to the browser.
 *
 * A signed-in attempt is recorded through `recordQuizResult` — the same writer
 * the lessons use — so it counts toward the leaderboard under the locked rules.
 * A signed-out visitor still gets the score, it simply is not stored.
 */
export const load: PageServerLoad = async ({ locals }) => {
	const seed = todaySeed();
	const questions = drawQuiz(seed).map((question) => ({
		id: question.id,
		prompt: question.prompt,
		options: question.options,
		origin: question.origin
	}));

	return {
		user: locals.user ? { username: locals.user.username, role: locals.user.role } : null,
		seed,
		questions,
		length: QUIZ_LENGTH
	};
};

export const actions: Actions = {
	grade: async ({ request, locals }) => {
		const form = await request.formData();
		const seed = String(form.get('seed') ?? '');
		if (!seed) return fail(400, { error: 'Missing quiz.' });

		const paper = drawQuiz(seed);
		if (paper.length === 0) return fail(500, { error: 'Question bank is empty.' });

		const review = paper.map((question) => {
			const raw = form.get(`q-${question.id}`);
			const picked = raw === null ? null : Number(raw);
			return {
				id: question.id,
				prompt: question.prompt,
				options: question.options,
				origin: question.origin,
				picked: Number.isInteger(picked) ? picked : null,
				answer: question.answer,
				right: picked === question.answer
			};
		});

		const correct = review.filter((row) => row.right).length;
		const total = review.length;

		let recorded = false;
		const db = locals.db;
		if (db && locals.user) {
			try {
				await recordQuizResult(db, {
					userId: locals.user.id,
					quizId: `public-${seed}`,
					source: 'practice',
					total,
					correct
				});
				recorded = true;
			} catch {
				recorded = false;
			}
		}

		return { graded: true, correct, total, review, recorded, signedIn: Boolean(locals.user) };
	}
};
