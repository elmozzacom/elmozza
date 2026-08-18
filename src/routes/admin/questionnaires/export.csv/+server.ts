import { requireAdmin, dbOrError } from '$lib/server/auth';
import { QUESTIONNAIRES, TOTAL_DAYS } from '$lib/content/questionnaires';
import { jakartaDateOf } from '$lib/server/journey';
import type { RequestHandler } from './$types';

/** RFC 4180 escaping, plus a leading quote guard against spreadsheet formula injection. */
function cell(value: unknown) {
	const text = String(value ?? '');
	const guarded = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
	return `"${guarded.replace(/"/g, '""')}"`;
}

/** Free text is exported one row per response so reflections stay readable. */
export const GET: RequestHandler = async ({ locals, url }) => {
	requireAdmin(locals.user);
	const db = dbOrError(locals.db ?? undefined);

	const search = (url.searchParams.get('q') ?? '').trim().slice(0, 80);
	const binds: (string | number)[] = [];
	let clause = '';
	if (search) {
		clause = 'WHERE (lower(u.username) LIKE ?1 OR lower(u.email) LIKE ?1)';
		binds.push(`%${search.toLowerCase()}%`);
	}

	const listing = await db
		.prepare(
			`SELECT u.username, u.email, r.day_number, r.self_rating, r.answers, r.completed_at
			 FROM questionnaire_responses r
			 JOIN users u ON u.id = r.user_id
			 ${clause}
			 ORDER BY u.username, r.day_number
			 LIMIT 5000`
		)
		.bind(...binds)
		.all<{
			username: string;
			email: string;
			day_number: number;
			self_rating: number | null;
			answers: string;
			completed_at: string;
		}>();

	const textIdsByDay = new Map(
		QUESTIONNAIRES.map((item) => [
			item.day,
			item.questions.filter((question) => question.type === 'text').map((question) => question.id)
		])
	);

	const header = ['Student', 'Email', 'Day', 'Title', 'Self rating', 'Vocabulary correct', 'Reflection', 'Completed'];

	const body = (listing.results ?? []).map((row) => {
		let parsed: Record<string, unknown> = {};
		try {
			parsed = JSON.parse(row.answers);
		} catch {
			parsed = {};
		}

		const questionnaire = QUESTIONNAIRES.find((item) => item.day === row.day_number);
		const choices = (questionnaire?.questions ?? []).filter(
			(question): question is Extract<(typeof question), { type: 'choice' }> => question.type === 'choice'
		);
		const correct = choices.filter((question) => Number(parsed[question.id]) === question.answer).length;

		const reflection = (textIdsByDay.get(row.day_number) ?? [])
			.map((id) => (typeof parsed[id] === 'string' ? (parsed[id] as string) : ''))
			.filter(Boolean)
			.join(' | ');

		return [
			row.username,
			row.email,
			row.day_number,
			questionnaire?.title ?? '',
			row.self_rating ?? '',
			choices.length > 0 ? `${correct}/${choices.length}` : '',
			reflection,
			jakartaDateOf(row.completed_at)
		]
			.map(cell)
			.join(',');
	});

	const stamp = new Date().toISOString().slice(0, 10);
	return new Response(`\uFEFF${[header.map(cell).join(','), ...body].join('\r\n')}`, {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': `attachment; filename="elmozza-questionnaires-${stamp}.csv"`,
			'cache-control': 'no-store'
		}
	});
};

export const prerender = false;
export const _totalDays = TOTAL_DAYS;
