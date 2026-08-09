import { requireUser } from '$lib/server/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireUser(locals.user);
	const db = locals.db;
	const total_xp = user.total_xp;
	if (!db) return { user: { ...user, total_xp }, completed: 0, progress: 0, nextLesson: 1 };
	const summary = await db.prepare(
		"SELECT COUNT(*) AS completed FROM lesson_progress WHERE user_id = ? AND status = 'completed' AND lesson_code LIKE 'ENG-A1-D%'"
	).bind(user.id).first<{ completed: number }>();
	const completed = Number(summary?.completed ?? 0);
	return { user: { ...user, total_xp }, completed, progress: Math.round((completed / 14) * 100), nextLesson: Math.min(completed + 1, 14) };
};
