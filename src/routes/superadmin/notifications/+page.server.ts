import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { dbOrError } from '$lib/server/auth';
import { writeAudit } from '$lib/server/superadmin';

export const load: PageServerLoad = async ({ locals }) => {
	const db = dbOrError(locals.db ?? undefined);
	const subs = await db.prepare('SELECT COUNT(*) AS n FROM push_subscriptions').first<{ n: number }>();
	const stats = await db
		.prepare(
			`SELECT kind, status, COUNT(*) AS n
			 FROM notification_log
			 GROUP BY kind, status`
		)
		.all<{ kind: string; status: string; n: number }>();
	const recent = await db
		.prepare('SELECT id, kind, status, created_at FROM notification_log ORDER BY created_at DESC LIMIT 40')
		.all();
	return {
		subscriptions: Number(subs?.n ?? 0),
		stats: stats.results ?? [],
		recent: recent.results ?? []
	};
};

export const actions: Actions = {
	broadcast: async ({ request, locals }) => {
		const actor = locals.user!;
		const db = dbOrError(locals.db ?? undefined);
		const form = await request.formData();
		const title = String(form.get('title') ?? '').trim().slice(0, 80);
		const body = String(form.get('body') ?? '').trim().slice(0, 180);
		const url = String(form.get('url') ?? '/learn').trim().slice(0, 80) || '/learn';
		if (!title || !body) return fail(400, { error: 'Title and body are required.' });
		const listing = await db.prepare('SELECT user_id FROM push_subscriptions').all<{ user_id: number }>();
		const stmts = (listing.results ?? []).map((row) =>
			db
				.prepare(
					`INSERT INTO notification_log (user_id, kind, status, created_at)
					 VALUES (?, 'broadcast', 'queued', datetime('now'))`
				)
				.bind(row.user_id)
		);
		if (stmts.length) await db.batch(stmts);
		await writeAudit(db, {
			actorId: actor.id,
			action: 'broadcast',
			targetId: null,
			detail: { title, body, url, queued: stmts.length }
		});
		return { ok: true, queued: stmts.length };
	}
};
