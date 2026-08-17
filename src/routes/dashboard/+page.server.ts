import { requireUser } from '$lib/server/auth';
import { dailyCoachLessons } from '$lib/content/daily-coach';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireUser(locals.user);
	const db = locals.db;
	const total_xp = user.total_xp;
	let completedDays: number[] = [];

	if (db) {
		const { results } = await db
			.prepare(
				"SELECT lesson_code FROM lesson_progress WHERE user_id = ? AND status = 'completed' AND lesson_code LIKE 'ENG-A1-D%'"
			)
			.bind(user.id)
			.all<{ lesson_code: string }>();
		completedDays = (results ?? [])
			.map((row) => Number(row.lesson_code.slice(-2)))
			.filter(Number.isFinite);
	}

	const completedSet = new Set(completedDays);
	const completed = completedDays.length;
	const nextLesson = dailyCoachLessons.find((lesson) => !completedSet.has(lesson.day))?.day ?? 14;
	const lessons = dailyCoachLessons.map((lesson) => ({
		day: lesson.day,
		title: lesson.title,
		durationMinutes: lesson.durationMinutes,
		objective: lesson.objective,
		status: completedSet.has(lesson.day)
			? 'completed'
			: lesson.day === nextLesson
				? 'current'
				: 'upcoming'
	}));
	const next = lessons.find((lesson) => lesson.day === nextLesson);

	return {
		user: { ...user, total_xp },
		completed,
		progress: Math.round((completed / 14) * 100),
		nextLesson,
		nextTitle: next?.title ?? 'Greeting and Introduction',
		lessons
	};
};
