import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { dbOrError, requireUser } from '$lib/server/auth';
import { getQuestionnaire, TOTAL_DAYS } from '$lib/content/questionnaires';
import {
	buildJourney,
	jakartaDate,
	loadResponses,
	scoreChoices,
	validateAnswers
} from '$lib/server/journey';

export const load: PageServerLoad = async ({ locals, params }) => {
	const user = requireUser(locals.user);
	const db = dbOrError(locals.db ?? undefined);

	const day = Number(params.day);
	if (!Number.isInteger(day) || day < 1 || day > TOTAL_DAYS) throw error(404, 'Day not found.');

	const questionnaire = getQuestionnaire(day);
	if (!questionnaire) throw error(404, 'Day not found.');

	const rows = await loadResponses(db, user.id);
	const journey = buildJourney(rows, jakartaDate());
	const existing = rows.find((row) => row.day_number === day);

	// A completed day is readable but never re-answerable; a locked day is not
	// reachable by typing the URL either.
	if (!existing && journey.currentDay !== day) {
		throw redirect(303, '/dashboard');
	}

	let answers: Record<string, string | number> | null = null;
	if (existing) {
		const stored = await db
			.prepare('SELECT answers FROM questionnaire_responses WHERE user_id = ? AND day_number = ?')
			.bind(user.id, day)
			.first<{ answers: string }>();
		try {
			answers = stored ? JSON.parse(stored.answers) : null;
		} catch {
			answers = null;
		}
	}

	return {
		user: { username: user.username, role: user.role },
		day,
		questionnaire,
		alreadyDone: Boolean(existing),
		answers,
		journey
	};
};

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		const user = requireUser(locals.user);
		const db = dbOrError(locals.db ?? undefined);

		const day = Number(params.day);
		const questionnaire = getQuestionnaire(day);
		if (!questionnaire) throw error(404, 'Day not found.');

		// The unlock rule is re-checked on submit. Loading the page is not
		// permission to write: a form left open overnight, or a replayed POST,
		// must not slip past the gate.
		const rows = await loadResponses(db, user.id);
		const journey = buildJourney(rows, jakartaDate());
		if (journey.currentDay !== day) {
			return fail(409, { locked: true, message: 'This day is not open right now.' });
		}

		const form = await request.formData();
		const values = new Map<string, string>();
		for (const question of questionnaire.questions) {
			const raw = form.get(question.id);
			values.set(question.id, typeof raw === 'string' ? raw : '');
		}

		const { errors, answers, selfRating } = validateAnswers(questionnaire.questions, values);
		if (Object.keys(errors).length > 0) {
			return fail(400, { errors, values: Object.fromEntries(values) });
		}

		try {
			await db
				.prepare(
					`INSERT INTO questionnaire_responses (user_id, day_number, answers, self_rating, completed_at)
					 VALUES (?, ?, ?, ?, datetime('now'))`
				)
				.bind(user.id, day, JSON.stringify(answers), selfRating)
				.run();
		} catch {
			// The unique index is the real guard against a double submit.
			return fail(409, { locked: true, message: 'Today is already recorded.' });
		}

		// The check-in feeds the existing streak counter the dashboard shows.
		const fresh = await loadResponses(db, user.id);
		const updated = buildJourney(fresh, jakartaDate());
		await db
			.prepare('UPDATE users SET current_streak = ? WHERE id = ?')
			.bind(updated.streak, user.id)
			.run();

		const score = scoreChoices(questionnaire.questions, answers);
		throw redirect(303, `/dashboard?checked=${day}&correct=${score.correct}&of=${score.total}`);
	}
};
