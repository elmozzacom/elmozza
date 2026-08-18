import { env as dynamicEnv } from '$env/dynamic/private';
import { error, redirect } from '@sveltejs/kit';
import type { D1Database } from '@cloudflare/workers-types';
import type { RequestEvent } from '@sveltejs/kit';
import type { AuthUser } from '$lib/server/auth';
import { requireUser } from '$lib/server/auth';

/**
 * The bound mailbox is server-only. A default exists so the seat cannot be
 * locked out if the env var is missing; the env var still wins when set.
 */
const FALLBACK_EMAIL = 'hendrychristiono2022@gmail.com';

export function superadminEmail(event?: Pick<RequestEvent, 'platform'>): string {
	const platform = (event?.platform?.env ?? {}) as { SUPERADMIN_EMAIL?: string };
	const raw =
		platform.SUPERADMIN_EMAIL?.trim() ||
		dynamicEnv.SUPERADMIN_EMAIL?.trim() ||
		(typeof process !== 'undefined' ? process.env.SUPERADMIN_EMAIL?.trim() : '') ||
		FALLBACK_EMAIL;
	return raw.toLowerCase();
}

export function isSuperadminEmail(email: string, event?: Pick<RequestEvent, 'platform'>) {
	return email.trim().toLowerCase() === superadminEmail(event);
}

export function requireSuperadmin(user: AuthUser | null) {
	const member = requireUser(user);
	if (member.role !== 'superadmin') {
		throw redirect(303, '/dashboard?notice=superadmin');
	}
	return member;
}

export async function ensureSuperadminSeat(
	db: D1Database,
	user: { id: number; email: string; role: string },
	event?: Pick<RequestEvent, 'platform'>
): Promise<boolean> {
	if (!isSuperadminEmail(user.email, event)) return false;
	if (user.role === 'superadmin') return false;
	await db.prepare("UPDATE users SET role = 'superadmin' WHERE id = ?").bind(user.id).run();
	await writeAudit(db, {
		actorId: user.id,
		action: 'auto_promote_superadmin',
		targetId: user.id,
		detail: { source: 'login_or_session' }
	});
	return true;
}

export async function writeAudit(
	db: D1Database,
	entry: { actorId: number | null; action: string; targetId?: number | null; detail?: unknown }
) {
	await db
		.prepare(
			`INSERT INTO audit_logs (actor_id, action, target_id, detail, created_at)
			 VALUES (?, ?, ?, ?, datetime('now'))`
		)
		.bind(
			entry.actorId,
			entry.action,
			entry.targetId ?? null,
			entry.detail == null ? null : JSON.stringify(entry.detail)
		)
		.run();
}

export function forbidRoleChangeOfSeat(targetEmail: string, event?: Pick<RequestEvent, 'platform'>) {
	if (isSuperadminEmail(targetEmail, event)) {
		throw error(403, 'The bound superadmin seat cannot be demoted.');
	}
}
