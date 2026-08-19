import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { dbOrError } from '$lib/server/auth';
import { setSiteFlag, siteFlag } from '$lib/server/board';

export const load: PageServerLoad = async ({ locals }) => {
	const db = dbOrError(locals.db ?? undefined);
	return {
		showTelegram: await siteFlag(db, 'show_telegram_card', '1'),
		showTeaser: await siteFlag(db, 'show_leaderboard_teaser', '1')
	};
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const db = dbOrError(locals.db ?? undefined);
		const form = await request.formData();
		await setSiteFlag(db, 'show_telegram_card', form.get('telegram') === 'on');
		await setSiteFlag(db, 'show_leaderboard_teaser', form.get('teaser') === 'on');
		return { ok: true };
	}
};
