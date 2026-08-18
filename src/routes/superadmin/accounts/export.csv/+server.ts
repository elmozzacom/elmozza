import { requireSuperadmin } from '$lib/server/superadmin';
import { dbOrError } from '$lib/server/auth';
import type { RequestHandler } from './$types';

function cell(value: unknown) {
	const text = String(value ?? '');
	const guarded = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
	return `"${guarded.replace(/"/g, '""')}"`;
}

export const GET: RequestHandler = async ({ locals, url }) => {
	requireSuperadmin(locals.user);
	const db = dbOrError(locals.db ?? undefined);
	const search = (url.searchParams.get('q') ?? '').trim().slice(0, 80);
	const binds: string[] = [];
	let clause = '';
	if (search) {
		clause = 'WHERE lower(u.username) LIKE ? OR lower(u.email) LIKE ?';
		binds.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`);
	}

	const listing = await db
		.prepare(
			`SELECT u.username, u.email, u.google_id, u.created_at, u.last_login,
			        COALESCE((SELECT COUNT(*) FROM questionnaire_responses r WHERE r.user_id = u.id), 0) AS done_days
			 FROM users u ${clause}
			 ORDER BY u.created_at DESC
			 LIMIT 5000`
		)
		.bind(...binds)
		.all<Record<string, unknown>>();

	const header = ['Username', 'Email', 'Auth', 'Registered', 'Last login', 'Days done'];
	const body = (listing.results ?? []).map((row) =>
		[
			row.username,
			row.email,
			row.google_id ? 'Google' : 'Email',
			row.created_at,
			row.last_login,
			row.done_days
		]
			.map(cell)
			.join(',')
	);

	const stamp = new Date().toISOString().slice(0, 10);
	return new Response(`\uFEFF${[header.map(cell).join(','), ...body].join('\r\n')}`, {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': `attachment; filename="elmozza-accounts-${stamp}.csv"`,
			'cache-control': 'no-store'
		}
	});
};
