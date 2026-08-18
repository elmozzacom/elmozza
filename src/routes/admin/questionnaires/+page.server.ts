import { requireAdmin, dbOrError } from '$lib/server/auth';
import { QUESTIONNAIRES, TOTAL_DAYS } from '$lib/content/questionnaires';
import { jakartaDateOf } from '$lib/server/journey';
import type { PageServerLoad } from './$types';

type GridRow = { user_id: number; username: string; email: string; day_number: number; self_rating: number | null; completed_at: string };

export const load: PageServerLoad = async ({ locals, url }) => {
	const admin = requireAdmin(locals.user);
	const db = dbOrError(locals.db ?? undefined);

	const search = (url.searchParams.get('q') ?? '').trim().slice(0, 80);
	const focusDay = Number(url.searchParams.get('day'));
	const drilldown = Number.isInteger(focusDay) && focusDay >= 1 && focusDay <= TOTAL_DAYS ? focusDay : null;

	const binds: (string | number)[] = [];
	let clause = '';
	if (search) {
		clause = 'WHERE (lower(u.username) LIKE ?1 OR lower(u.email) LIKE ?1)';
		binds.push(`%${search.toLowerCase()}%`);
	}

	// Every response for every learner who has at least one, in one read.
	const grid = await db
		.prepare(
			`SELECT u.id AS user_id, u.username, u.email, r.day_number, r.self_rating, r.completed_at
			 FROM questionnaire_responses r
			 JOIN users u ON u.id = r.user_id
			 ${clause}
			 ORDER BY u.username, r.day_number
			 LIMIT 2000`
		)
		.bind(...binds)
		.all<GridRow>();

	const byStudent = new Map<
		number,
		{ id: number; username: string; email: string; days: Map<number, { rating: number | null; on: string }> }
	>();

	for (const row of grid.results ?? []) {
		let student = byStudent.get(row.user_id);
		if (!student) {
			student = { id: row.user_id, username: row.username, email: row.email, days: new Map() };
			byStudent.set(row.user_id, student);
		}
		student.days.set(row.day_number, {
			rating: row.self_rating,
			on: jakartaDateOf(row.completed_at)
		});
	}

	const students = [...byStudent.values()].map((student) => ({
		id: student.id,
		username: student.username,
		email: student.email,
		completed: student.days.size,
		days: Array.from({ length: TOTAL_DAYS }, (_, index) => {
			const entry = student.days.get(index + 1);
			return { day: index + 1, done: Boolean(entry), rating: entry?.rating ?? null, on: entry?.on ?? null };
		})
	}));

	// Average self-rating per day, across every learner who reached that day.
	const trend = await db
		.prepare(
			`SELECT day_number, COUNT(*) AS responses, AVG(self_rating) AS average
			 FROM questionnaire_responses
			 WHERE self_rating IS NOT NULL
			 GROUP BY day_number
			 ORDER BY day_number`
		)
		.all<{ day_number: number; responses: number; average: number }>();

	const trendByDay = new Map((trend.results ?? []).map((row) => [row.day_number, row]));
	const days = QUESTIONNAIRES.map((item) => {
		const row = trendByDay.get(item.day);
		return {
			day: item.day,
			title: item.title,
			focus: item.focus,
			responses: Number(row?.responses ?? 0),
			average: row?.average != null ? Math.round(Number(row.average) * 10) / 10 : null
		};
	});

	// Drill-down: the free-text reflections for one day, read in full.
	let reflections: Array<{ username: string; text: string; on: string }> = [];
	if (drilldown) {
		const questionnaire = QUESTIONNAIRES.find((item) => item.day === drilldown);
		const textIds = (questionnaire?.questions ?? [])
			.filter((question) => question.type === 'text')
			.map((question) => question.id);

		const rows = await db
			.prepare(
				`SELECT u.username, r.answers, r.completed_at
				 FROM questionnaire_responses r
				 JOIN users u ON u.id = r.user_id
				 WHERE r.day_number = ?
				 ORDER BY r.completed_at DESC
				 LIMIT 200`
			)
			.bind(drilldown)
			.all<{ username: string; answers: string; completed_at: string }>();

		for (const row of rows.results ?? []) {
			let parsed: Record<string, unknown> = {};
			try {
				parsed = JSON.parse(row.answers);
			} catch {
				continue;
			}
			for (const id of textIds) {
				const value = parsed[id];
				if (typeof value === 'string' && value.trim()) {
					reflections.push({
						username: row.username,
						text: value,
						on: jakartaDateOf(row.completed_at)
					});
				}
			}
		}
	}

	const totalResponses = (grid.results ?? []).length;

	return {
		admin: { username: admin.username, role: admin.role },
		students,
		days,
		reflections,
		drilldown,
		filters: { search },
		stats: {
			learners: students.length,
			responses: totalResponses,
			finished: students.filter((student) => student.completed >= TOTAL_DAYS).length
		}
	};
};
