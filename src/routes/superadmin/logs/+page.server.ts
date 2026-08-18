import { dbOrError } from '$lib/server/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const db = dbOrError(locals.db ?? undefined);
	const action = (url.searchParams.get('action') ?? '').trim().slice(0, 40);
	const binds: string[] = [];
	let clause = '';
	if (action) {
		clause = 'WHERE a.action = ?';
		binds.push(action);
	}

	const listing = await db
		.prepare(
			`SELECT a.id, a.actor_id, u.username AS actor, a.action, a.target_id, a.detail, a.created_at
			 FROM audit_logs a
			 LEFT JOIN users u ON u.id = a.actor_id
			 ${clause}
			 ORDER BY a.created_at DESC
			 LIMIT 200`
		)
		.bind(...binds)
		.all<{
			id: number;
			actor_id: number | null;
			actor: string | null;
			action: string;
			target_id: number | null;
			detail: string | null;
			created_at: string;
		}>();

	return {
		action,
		rows: (listing.results ?? []).map((row) => ({
			...row,
			detail: row.detail ?? ''
		}))
	};
};
