import type { LayoutServerLoad } from './$types';
import { env as dyn } from '$env/dynamic/private';

export const load: LayoutServerLoad = async ({ locals, platform }) => {
	const publicKey = String(platform?.env?.VAPID_PUBLIC_KEY ?? dyn.PUBLIC_VAPID_KEY ?? dyn.VAPID_PUBLIC_KEY ?? '').trim();
	let firstLesson = false;
	if (locals.user && locals.db) {
		try {
			const row = await locals.db
				.prepare('SELECT COUNT(*) AS n FROM user_step_progress WHERE user_id = ?')
				.bind(locals.user.id)
				.first<{ n: number }>();
			firstLesson = Number(row?.n ?? 0) >= 1;
		} catch {
			firstLesson = false;
		}
	}
	return {
		pwa: { vapidPublic: publicKey, firstLesson, signedIn: Boolean(locals.user) }
	};
};
