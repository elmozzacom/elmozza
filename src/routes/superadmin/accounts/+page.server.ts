import { dbOrError } from '$lib/server/auth';
import { TOTAL_DAYS } from '$lib/content/questionnaires';
import type { PageServerLoad } from './$types';

const PAGE = 25;
const FILTERS = ['all', 'completed', 'in-progress', 'not-started', 'stalled'] as const;
const SORTS = ['progress', 'registered'] as const;

export const load: PageServerLoad = async ({ locals, url }) => {
	const db = dbOrError(locals.db ?? undefined);
	const search = (url.searchParams.get('q') ?? '').trim().slice(0, 80);
	const filterParam = url.searchParams.get('filter') ?? 'all';
	const sortParam = url.searchParams.get('sort') ?? 'registered';
	const filter = (FILTERS as readonly string[]).includes(filterParam) ? filterParam : 'all';
	const sort = (SORTS as readonly string[]).includes(sortParam) ? sortParam : 'registered';
	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const offset = (page - 1) * PAGE;

	const where: string[] = [];
	const binds: (string | number)[] = [];

	if (search) {
		where.push('(lower(username) LIKE ? OR lower(email) LIKE ?)');
		binds.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`);
	}
	if (filter === 'completed') where.push('done_days >= 14');
	if (filter === 'in-progress') where.push('done_days BETWEEN 1 AND 13');
	if (filter === 'not-started') where.push('done_days = 0');
	if (filter === 'stalled') {
		where.push("done_days < 14 AND COALESCE(last_checkin, last_login, created_at) <= datetime('now', '-3 days')");
	}

	const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
	const order = sort === 'progress' ? 'done_days DESC, created_at DESC' : 'created_at DESC';

	const inner = `SELECT u.id, u.username, u.email, u.role, u.google_id, u.created_at, u.last_login,
		COALESCE((SELECT COUNT(*) FROM questionnaire_responses r WHERE r.user_id = u.id), 0) AS done_days,
		(SELECT MAX(r.completed_at) FROM questionnaire_responses r WHERE r.user_id = u.id) AS last_checkin
		FROM users u`;

	const totalRow = await db
		.prepare(`SELECT COUNT(*) AS n FROM (${inner}) x ${clause}`)
		.bind(...binds)
		.first<{ n: number }>();
	const total = Number(totalRow?.n ?? 0);

	const listing = await db
		.prepare(`SELECT * FROM (${inner}) x ${clause} ORDER BY ${order} LIMIT ${PAGE} OFFSET ${offset}`)
		.bind(...binds)
		.all<{
			id: number;
			username: string;
			email: string;
			role: string;
			google_id: string | null;
			created_at: string;
			last_login: string | null;
			done_days: number;
			last_checkin: string | null;
		}>();

	const rows = listing.results ?? [];
	const ids = rows.map((row) => row.id);
	const dayMap = new Map<number, Set<number>>();
	if (ids.length > 0) {
		const placeholders = ids.map(() => '?').join(',');
		const days = await db
			.prepare(`SELECT user_id, day_number FROM questionnaire_responses WHERE user_id IN (${placeholders})`)
			.bind(...ids)
			.all<{ user_id: number; day_number: number }>();
		for (const row of days.results ?? []) {
			if (!dayMap.has(row.user_id)) dayMap.set(row.user_id, new Set());
			dayMap.get(row.user_id)!.add(row.day_number);
		}
	}

	return {
		filters: { search, filter, sort, page },
		filterOptions: FILTERS,
		total,
		pages: Math.max(1, Math.ceil(total / PAGE)),
		rows: rows.map((row) => {
			const done = dayMap.get(row.id) ?? new Set();
			return {
				id: row.id,
				username: row.username,
				email: row.email,
				role: row.role,
				auth: row.google_id ? 'Google' : 'Email',
				registered: (row.created_at ?? '').slice(0, 10),
				lastActive: (row.last_checkin || row.last_login || row.created_at || '').slice(0, 10),
				doneDays: Number(row.done_days),
				current: Number(row.done_days) >= TOTAL_DAYS ? null : Number(row.done_days) + 1,
				days: Array.from({ length: TOTAL_DAYS }, (_, index) => ({
					day: index + 1,
					done: done.has(index + 1)
				}))
			};
		})
	};
};
