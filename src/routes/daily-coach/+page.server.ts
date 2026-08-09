import { fail } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth';
import { dailyCoachLessons } from '$lib/content/daily-coach';
import type { Actions, PageServerLoad } from './$types';

const XP_PER_LESSON = 10;

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || !locals.db) return { completedDays: [] as number[] };
	const user = requireUser(locals.user);
	const { results } = await locals.db.prepare(
		"SELECT lesson_code FROM lesson_progress WHERE user_id = ? AND status = 'completed' AND lesson_code LIKE 'ENG-A1-D%'"
	).bind(user.id).all<{ lesson_code: string }>();
	return { completedDays: (results ?? []).map((row) => Number(row.lesson_code.slice(-2))).filter(Number.isFinite) };
};

export const actions: Actions = {
	complete: async ({ request, locals }) => {
		const user = requireUser(locals.user);
		if (!locals.db) return fail(503, { error: 'Database belum tersedia.' });
		const form = await request.formData();
		const day = Number(form.get('day'));
		const lesson = dailyCoachLessons.find((item) => item.day === day);
		if (!lesson) return fail(400, { error: 'Lesson tidak valid.' });
		const answerValue = form.get('answer');
		if (answerValue === null || answerValue === '') return fail(400, { error: 'Jawaban wajib dipilih.' });
		const answer = Number(answerValue);
		if (!Number.isInteger(answer) || answer !== lesson.question.answer) return fail(400, { error: 'Jawaban belum tepat.' });

		const insert = locals.db.prepare(
			`INSERT INTO lesson_progress (user_id, lesson_code, status, score, xp_awarded, started_at, completed_at, updated_at)
			 VALUES (?, ?, 'completed', 100, ?, datetime('now'), datetime('now'), datetime('now'))
			 ON CONFLICT (user_id, lesson_code) DO NOTHING`
		).bind(user.id, lesson.id, XP_PER_LESSON);
		const reconcile = locals.db.prepare(
			`UPDATE users SET
			 total_xp = COALESCE((SELECT SUM(xp_awarded) FROM lesson_progress WHERE user_id = ? AND status = 'completed'), 0),
			 current_streak = (SELECT COUNT(DISTINCT date(completed_at)) FROM lesson_progress WHERE user_id = ? AND status = 'completed'),
			 last_login = datetime('now') WHERE id = ?`
		).bind(user.id, user.id, user.id);
		const [inserted] = await locals.db.batch([insert, reconcile]);
		return { success: true, day, xpAwarded: (inserted.meta.changes ?? 0) > 0 ? XP_PER_LESSON : 0 };
	}
};
