import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireUser } from '$lib/server/auth';

type QuestionRow = {
	id: number;
	lesson_id: number;
	type: 'multiple_choice' | 'translate' | 'word_order';
	question_text: string;
	prompt: string | null;
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

const shuffleArray = <T>(input: T[]): T[] => {
	const arr = [...input];
	for (let i = arr.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
	return arr;
};

export const load: PageServerLoad = async ({ params, platform, locals }) => {
	const user = requireUser(locals.user);
	const lessonId = Number(params.id);

	if (Number.isNaN(lessonId)) {
		throw error(400, 'Invalid lesson id');
	}

	const db = platform?.env?.DB;
	if (!db) {
		if (dev) {
			return { lessonId, questions: [], user: locals.user };
		}
		throw error(500, 'Database binding (DB) is missing on platform.env');
	}

	const lesson = await db.prepare('SELECT id FROM lessons WHERE id = ?').bind(lessonId).first<{ id: number }>();
	if (!lesson) throw error(404, 'Lesson tidak ditemukan.');

	const { results } = await db
		.prepare(
			`SELECT id, lesson_id, type, question_text, prompt, options
			 FROM questions
			 WHERE lesson_id = ?
			 ORDER BY id`
		)
		.bind(lessonId)
		.all<QuestionRow>();

	const questions =
		results?.map((row) => {
			const optionList = parseJsonArray(row.options);

			return {
				id: row.id,
				lesson_id: row.lesson_id,
				type: row.type,
				question_text: row.question_text,
				prompt: row.prompt,
				shuffledOptions: shuffleArray(optionList)
			};
		}) ?? [];

	return {
		lessonId,
		questions,
		user: locals.user
	};
};
