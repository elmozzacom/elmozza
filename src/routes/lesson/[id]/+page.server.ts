import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

type QuestionRow = {
	id: number;
	lesson_id: number;
	type: 'multiple_choice' | 'translate' | 'word_order';
	question_text: string;
	prompt: string | null;
	correct_answer: string;
	options: string | null;
};

const parseJsonArray = (value: string | null) => {
	if (!value) return [];
	try {
		const parsed = JSON.parse(value);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
};

const tryParseJson = (value: string) => {
	try {
		return JSON.parse(value);
	} catch {
		return value;
	}
};

const shuffleArray = <T>(input: T[]): T[] => {
	const arr = [...input];
	for (let i = arr.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
	return arr;
};

export const load: PageServerLoad = async ({ params, platform }) => {
	const lessonId = Number(params.id);

	if (Number.isNaN(lessonId)) {
		throw error(400, 'Invalid lesson id');
	}

	const db = platform?.env?.DB;
	if (!db) {
		throw error(500, 'Database binding (DB) is missing on platform.env');
	}

	const { results } = await db
		.prepare(
			`SELECT id, lesson_id, type, question_text, prompt, correct_answer, options
			 FROM questions
			 WHERE lesson_id = ?
			 ORDER BY id`
		)
		.bind(lessonId)
		.all<QuestionRow>();

	const questions =
		results?.map((row) => {
			const optionList = parseJsonArray(row.options);
			const optionsWithCorrect = optionList.includes(row.correct_answer)
				? optionList
				: [row.correct_answer, ...optionList];

			return {
				...row,
				shuffledOptions: shuffleArray(optionsWithCorrect),
				parsedCorrectAnswer: tryParseJson(row.correct_answer)
			};
		}) ?? [];

	return {
		lessonId,
		questions
	};
};

export const actions: Actions = {
	complete: async ({ request, platform }) => {
		const db = platform?.env?.DB;
		if (!db) {
			throw error(500, 'Database binding (DB) is missing on platform.env');
		}

		const form = await request.formData();
		const userId = Number(form.get('userId'));
		const xpFromForm = Number(form.get('xp') ?? form.get('xpEarned') ?? 0);

		if (Number.isNaN(userId)) {
			return fail(400, { message: 'A valid userId is required' });
		}

		const xp = Number.isFinite(xpFromForm) && xpFromForm > 0 ? xpFromForm : 0;

		const result = await db
			.prepare(
				`UPDATE users
				 SET total_xp = total_xp + ?,
				     current_streak = current_streak + 1,
				     last_login = datetime('now')
				 WHERE id = ?`
			)
			.bind(xp, userId)
			.run();

		if (!result.success) {
			return fail(500, { message: 'Failed to update XP/streak' });
		}

		const updatedUser = await db
			.prepare(
				`SELECT id, username, current_streak, total_xp, last_login
				 FROM users
				 WHERE id = ?`
			)
			.bind(userId)
			.first();

		return {
			success: true,
			user: updatedUser
		};
	}
};
