import { requireAdmin, dbOrError } from '$lib/server/auth';
import { LEVEL_CODES, PAYMENT_STATES } from '$lib/server/schema';
import type { PageServerLoad } from './$types';

type Row = {
	id: number;
	full_name: string;
	email: string;
	level: string;
	placement_score: number;
	payment_status: string;
	source: string;
	created_at: string;
};

export const load: PageServerLoad = async ({ locals, url }) => {
	const admin = requireAdmin(locals.user);
	const db = dbOrError(locals.db ?? undefined);

	const search = (url.searchParams.get('q') ?? '').trim().slice(0, 80);
	const levelParam = url.searchParams.get('level') ?? '';
	const statusParam = url.searchParams.get('status') ?? '';

	// Only values from the known allow-lists ever reach the query.
	const level = (LEVEL_CODES as readonly string[]).includes(levelParam) ? levelParam : '';
	const status = (PAYMENT_STATES as readonly string[]).includes(statusParam) ? statusParam : '';

	const where: string[] = [];
	const binds: (string | number)[] = [];

	if (search) {
		where.push('(lower(full_name) LIKE ?1 OR lower(email) LIKE ?1)');
		binds.push(`%${search.toLowerCase()}%`);
	}
	if (level) {
		where.push(`level = ?${binds.length + 1}`);
		binds.push(level);
	}
	if (status) {
		where.push(`payment_status = ?${binds.length + 1}`);
		binds.push(status);
	}

	const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

	const listing = await db
		.prepare(
			`SELECT id, full_name, email, level, placement_score, payment_status, source, created_at
			 FROM registrations ${clause}
			 ORDER BY created_at DESC
			 LIMIT 200`
		)
		.bind(...binds)
		.all<Row>();

	const stats = await db
		.prepare(
			`SELECT
			   COUNT(*) AS total,
			   SUM(CASE WHEN created_at >= datetime('now', '-7 days') THEN 1 ELSE 0 END) AS new_week,
			   SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) AS paid
			 FROM registrations`
		)
		.first<{ total: number; new_week: number; paid: number }>();

	const total = Number(stats?.total ?? 0);
	const paid = Number(stats?.paid ?? 0);

	return {
		admin: { username: admin.username, role: admin.role },
		rows: listing.results ?? [],
		filters: { search, level, status },
		levels: LEVEL_CODES,
		statuses: PAYMENT_STATES,
		stats: {
			total,
			newWeek: Number(stats?.new_week ?? 0),
			paid,
			conversion: total > 0 ? Math.round((paid / total) * 100) : 0
		}
	};
};
