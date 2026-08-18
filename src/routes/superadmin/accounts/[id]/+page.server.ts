import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { dbOrError } from '$lib/server/auth';
import { forbidRoleChangeOfSeat, writeAudit } from '$lib/server/superadmin';
import { QUESTIONNAIRES, TOTAL_DAYS } from '$lib/content/questionnaires';
import { jakartaDateOf } from '$lib/server/journey';

export const load: PageServerLoad = async ({ locals, params }) => {
	const db = dbOrError(locals.db ?? undefined);
	const id = Number(params.id);
	if (!Number.isInteger(id)) throw error(404, 'Account not found.');

	const user = await db
		.prepare(
			`SELECT id, username, email, role, google_id, created_at, last_login, current_streak, total_xp
			 FROM users WHERE id = ?`
		)
		.bind(id)
		.first<{
			id: number;
			username: string;
			email: string;
			role: string;
			google_id: string | null;
			created_at: string;
			last_login: string | null;
			current_streak: number;
			total_xp: number;
		}>();
	if (!user) throw error(404, 'Account not found.');

	const responses = await db
		.prepare(
			`SELECT day_number, self_rating, answers, completed_at
			 FROM questionnaire_responses WHERE user_id = ? ORDER BY day_number`
		)
		.bind(id)
		.all<{ day_number: number; self_rating: number | null; answers: string; completed_at: string }>();

	const byDay = new Map((responses.results ?? []).map((row) => [row.day_number, row]));
	const days = QUESTIONNAIRES.map((item) => {
		const row = byDay.get(item.day);
		let reflection = '';
		let quiz = '';
		if (row) {
			let parsed: Record<string, unknown> = {};
			try {
				parsed = JSON.parse(row.answers);
			} catch {
				parsed = {};
			}
			const textQ = item.questions.filter((q) => q.type === 'text');
			reflection = textQ
				.map((q) => (typeof parsed[q.id] === 'string' ? (parsed[q.id] as string) : ''))
				.filter(Boolean)
				.join(' ');
			const choices = item.questions.filter((q) => q.type === 'choice');
			const correct = choices.filter((q) => Number(parsed[q.id]) === q.answer).length;
			quiz = choices.length ? `${correct}/${choices.length}` : '';
		}
		return {
			day: item.day,
			title: item.title,
			done: Boolean(row),
			rating: row?.self_rating ?? null,
			on: row ? jakartaDateOf(row.completed_at) : null,
			quiz,
			reflection
		};
	});

	return {
		account: {
			...user,
			auth: user.google_id ? 'Google' : 'Email',
			registered: (user.created_at ?? '').slice(0, 10)
		},
		days,
		ratings: days.map((day) => day.rating)
	};
};

export const actions: Actions = {
	resetDay: async ({ request, locals, params }) => {
		const actor = locals.user!;
		const db = dbOrError(locals.db ?? undefined);
		const target = Number(params.id);
		const form = await request.formData();
		const day = Number(form.get('day'));
		if (!Number.isInteger(day) || day < 1 || day > TOTAL_DAYS) return fail(400, { error: 'Invalid day.' });
		await db
			.prepare('DELETE FROM questionnaire_responses WHERE user_id = ? AND day_number = ?')
			.bind(target, day)
			.run();
		await writeAudit(db, { actorId: actor.id, action: 'reset_day', targetId: target, detail: { day } });
		return { ok: true, message: `Day ${day} reset.` };
	},

	mercy: async ({ locals, params }) => {
		const actor = locals.user!;
		const db = dbOrError(locals.db ?? undefined);
		const target = Number(params.id);
		const done = await db
			.prepare('SELECT day_number FROM questionnaire_responses WHERE user_id = ?')
			.bind(target)
			.all<{ day_number: number }>();
		const have = new Set((done.results ?? []).map((row) => row.day_number));
		let next = 1;
		while (next <= TOTAL_DAYS && have.has(next)) next += 1;
		if (next > TOTAL_DAYS) return fail(400, { error: 'This student has already finished.' });
		await db
			.prepare(
				`INSERT INTO mercy_unlocks (user_id, day_number, actor_id, granted_at)
				 VALUES (?, ?, ?, datetime('now'))
				 ON CONFLICT(user_id, day_number) DO NOTHING`
			)
			.bind(target, next, actor.id)
			.run();
		await writeAudit(db, { actorId: actor.id, action: 'mercy_unlock', targetId: target, detail: { day: next } });
		return { ok: true, message: `Day ${next} unlocked for today.` };
	},

	setRole: async (event) => {
		const actor = event.locals.user!;
		const db = dbOrError(event.locals.db ?? undefined);
		const target = Number(event.params.id);
		const form = await event.request.formData();
		const role = String(form.get('role') ?? '');
		if (!['admin', 'learner'].includes(role)) return fail(400, { error: 'Role must be admin or learner.' });
		const row = await db.prepare('SELECT email FROM users WHERE id = ?').bind(target).first<{ email: string }>();
		if (!row) return fail(404, { error: 'Account not found.' });
		forbidRoleChangeOfSeat(row.email, event);
		await db.prepare('UPDATE users SET role = ? WHERE id = ?').bind(role, target).run();
		await writeAudit(db, { actorId: actor.id, action: 'set_role', targetId: target, detail: { role } });
		return { ok: true, message: `Role is now ${role}.` };
	}
};
