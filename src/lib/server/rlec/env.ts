// RLEC env access: Pages secrets land on platform.env; local dev uses $env/dynamic/private.
import { env as dyn } from '$env/dynamic/private';
import type { AuthUser } from '$lib/server/auth';
import { coachAccess, isPilotUser } from './core';
import type { Access } from './db';

export function rlecEnv(platform: App.Platform | undefined, key: 'RLEC_PILOT_USER_IDS' | 'RLEC_COACH_ENABLED' | 'RLEC_TELEGRAM_LINK_SECRET'): string {
	const fromPlatform = (platform?.env as Record<string, unknown> | undefined)?.[key];
	return String(fromPlatform ?? dyn[key] ?? '').trim();
}

export function pilotAccess(platform: App.Platform | undefined, user: AuthUser): Access {
	return { pilot: isPilotUser(user, rlecEnv(platform, 'RLEC_PILOT_USER_IDS')) };
}

export function coachAccessFor(platform: App.Platform | undefined, user: AuthUser | null) {
	return coachAccess(user, rlecEnv(platform, 'RLEC_COACH_ENABLED'), rlecEnv(platform, 'RLEC_PILOT_USER_IDS'));
}
