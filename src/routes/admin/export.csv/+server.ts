import { requireAdmin, dbOrError } from '$lib/server/auth';
import { LEVEL_CODES, PAYMENT_STATES } from '$lib/server/schema';
import type { RequestHandler } from './$types';

/** RFC 4180 escaping, plus a leading quote guard against spreadsheet formula injection. */
function cell(value: unknown) {
	const text = String(value ?? '');
	const guarded = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
	return `"${guarded.replace(/"/g, '""')}"`;
}

export const GET: RequestHandler = async ({ locals, url }) => {
	requireAdmin(locals.user);
	const db = dbOrError(locals.db ?? undefined);

	const search = (url.searchParams.get('q') ?? '').trim().slice(0, 80);
	const levelParam = url.searchParams.get('level') ?? '';
	const statusParam = url.searchParams.get('status') ?? '';
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
			`SELECT full_name, email, level, placement_score, payment_status, source, created_at
			 FROM registrations ${clause} ORDER BY created_at DESC LIMIT 5000`
		)
		.bind(...binds)
		.all<Record<string, unknown>>();

	const header = ['Name', 'Email', 'Level', 'Placement score', 'Payment status', 'Source', 'Registered'];
	const body = (listing.results ?? []).map((row) =>
		[
			row.full_name,
			row.email,
			row.level,
			row.placement_score,
			row.payment_status,
			row.source,
			row.created_at
		]
			.map(cell)
			.join(',')
	);

	const stamp = new Date().toISOString().slice(0, 10);
	return new Response(`\uFEFF${[header.map(cell).join(','), ...body].join('\r\n')}`, {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': `attachment; filename="elmozza-registrants-${stamp}.csv"`,
			'cache-control': 'no-store'
		}
	});
};
