import { dbOrError, requireAdmin } from '$lib/server/auth';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 20;
const MAX_SEARCH_LENGTH = 100;

type MemberRow = {
	id: number;
	username: string;
	email: string;
	role: 'owner' | 'admin' | 'editor' | 'reviewer' | 'learner';
	created_at: string;
	total_xp: number;
	current_streak: number;
	progress_count: number;
};

const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

export const load: PageServerLoad = async ({ locals, url }) => {
	const admin = requireAdmin(locals.user);
	const db = dbOrError(locals.db ?? undefined);
	const search = (url.searchParams.get('q') ?? '').trim().slice(0, MAX_SEARCH_LENGTH);
	const searchPattern = `%${escapeLike(search.toLowerCase())}%`;
	const requestedPage = Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
	const where = search ? "WHERE (lower(u.username) LIKE ? ESCAPE '\\' OR lower(u.email) LIKE ? ESCAPE '\\')" : '';

	const countStatement = db.prepare(`SELECT COUNT(*) AS total FROM users u ${where}`);
	const totalRow = search
		? await countStatement.bind(searchPattern, searchPattern).first<{ total: number }>()
		: await countStatement.first<{ total: number }>();
	const total = Number(totalRow?.total ?? 0);
	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const page = Math.min(requestedPage, totalPages);
	const offset = (page - 1) * PAGE_SIZE;

	const query = db.prepare(
		`SELECT u.id, u.username, u.email, u.role, u.created_at, u.total_xp, u.current_streak,
		        COUNT(lp.id) AS progress_count
		 FROM users u
		 LEFT JOIN lesson_progress lp ON lp.user_id = u.id
		 ${where}
		 GROUP BY u.id, u.username, u.email, u.role, u.created_at, u.total_xp, u.current_streak
		 ORDER BY u.created_at DESC, u.id DESC
		 LIMIT ? OFFSET ?`
	);
	const result = search
		? await query.bind(searchPattern, searchPattern, PAGE_SIZE, offset).all<MemberRow>()
		: await query.bind(PAGE_SIZE, offset).all<MemberRow>();

	return {
		admin,
		members: result.results ?? [],
		pagination: { page, totalPages, total, pageSize: PAGE_SIZE },
		search
	};
};
