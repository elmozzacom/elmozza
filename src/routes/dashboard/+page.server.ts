import { requireUser } from '$lib/server/auth';
import { dailyCoachLessons } from '$lib/content/daily-coach';
import type { PageServerLoad } from './$types';

/**
 * Four skills, derived from real progress rather than invented.
 * Each lesson exercises a skill in rotation, so completed days map to skills.
 */
const SKILL_OF_DAY: Record<number, 'listening' | 'speaking' | 'reading' | 'writing'> = {
	1: 'listening', 2: 'speaking', 3: 'reading', 4: 'writing',
	5: 'listening', 6: 'speaking', 7: 'reading', 8: 'writing',
	9: 'listening', 10: 'speaking', 11: 'reading', 12: 'writing',
	13: 'listening', 14: 'speaking'
};

const SKILL_TOTALS = { listening: 4, speaking: 4, reading: 3, writing: 3 } as const;

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireUser(locals.user);
	const db = locals.db;
	const total_xp = user.total_xp;
	let completedDays: number[] = [];
	let doneToday = false;

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

		const today = await db
			.prepare(
				"SELECT COUNT(*) AS total FROM lesson_progress WHERE user_id = ? AND status = 'completed' AND date(completed_at) = date('now')"
			)
			.bind(user.id)
			.first<{ total: number }>();
		doneToday = Number(today?.total ?? 0) > 0;
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

	const earned = { listening: 0, speaking: 0, reading: 0, writing: 0 };
	for (const day of completedDays) {
		const skill = SKILL_OF_DAY[day];
		if (skill) earned[skill] += 1;
	}
	const skills = (Object.keys(SKILL_TOTALS) as (keyof typeof SKILL_TOTALS)[]).map((skill) => ({
		name: skill,
		done: earned[skill],
		total: SKILL_TOTALS[skill],
		percent: Math.round((earned[skill] / SKILL_TOTALS[skill]) * 100)
	}));

	// Level is derived from real completion, not stored decoration.
	const level = completed >= 12 ? 'A2' : completed >= 6 ? 'A1+' : 'A1';

	const upcoming = lessons.filter((lesson) => lesson.status !== 'completed').slice(0, 4);

	return {
		user: { ...user, total_xp },
		completed,
		doneToday,
		level,
		skills,
		upcoming,
		progress: Math.round((completed / 14) * 100),
		nextLesson,
		nextTitle: next?.title ?? 'Greeting and Introduction',
		nextObjective: next?.objective ?? '',
		nextDuration: next?.durationMinutes ?? 10,
		lessons
	};
};
