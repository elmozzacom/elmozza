import { env as dyn } from '$env/dynamic/private';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { dbOrError, requireUser } from '$lib/server/auth';
import { ensureGame } from '$lib/server/game';
import { jakartaDate } from '$lib/server/journey';

const SCENES = [
	{ id: 'airport', title: 'At the airport', prompt: 'You are checking in for a flight to Singapore.' },
	{ id: 'friend', title: 'Meeting a new friend', prompt: 'You have just been introduced at a community event.' },
	{ id: 'clinic', title: 'At a clinic desk', prompt: 'You are booking a morning appointment politely.' }
];

const DAILY_CAP = 12;

function flagOn(event: { platform?: App.Platform }) {
	const raw = String(event.platform?.env?.AI_CONVERSATION ?? dyn.AI_CONVERSATION ?? '').trim();
	return raw === '1' || raw.toLowerCase() === 'true';
}

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event.locals.user);
	const db = dbOrError(event.locals.db ?? undefined);
	const game = await ensureGame(db, user.id);
	if (!game.onboarded_at) throw redirect(303, '/onboarding');
	const day = jakartaDate();
	const used = await db
		.prepare('SELECT turns FROM ai_turns WHERE user_id = ? AND day = ?')
		.bind(user.id, day)
		.first<{ turns: number }>();
	return {
		user: { username: user.username, role: user.role, current_streak: user.current_streak },
		game: { hearts: game.hearts, gems: game.gems },
		enabled: flagOn(event),
		scenes: SCENES,
		left: Math.max(0, DAILY_CAP - Number(used?.turns ?? 0))
	};
};

export const actions: Actions = {
	chat: async (event) => {
		const user = requireUser(event.locals.user);
		const db = dbOrError(event.locals.db ?? undefined);
		if (!flagOn(event)) return fail(503, { error: 'Conversation practice is switched off.' });
		const form = await event.request.formData();
		const scene = SCENES.find((item) => item.id === String(form.get('scene')));
		const message = String(form.get('message') ?? '').trim().slice(0, 400);
		if (!scene || !message) return fail(400, { error: 'Choose a scene and write a line.' });
		const day = jakartaDate();
		const used = await db
			.prepare('SELECT turns FROM ai_turns WHERE user_id = ? AND day = ?')
			.bind(user.id, day)
			.first<{ turns: number }>();
		if (Number(used?.turns ?? 0) >= DAILY_CAP) return fail(429, { error: 'That is enough talk for today.' });

		const ai = (event.platform?.env as { AI?: { run: Function } } | undefined)?.AI;
		let reply = 'Good. Could you say that a little more slowly? I am listening.';
		if (ai?.run) {
			try {
				const out = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
					messages: [
						{
							role: 'system',
							content:
								`Stay in this roleplay: ${scene.prompt} Use CEFR A2 English. One short reply. Gently correct at most one error.`
						},
						{ role: 'user', content: message }
					]
				});
				reply = String(out?.response ?? out?.result ?? reply).slice(0, 500);
			} catch {
				reply = 'I heard you. Let us try that line once more, a little clearer.';
			}
		}

		await db
			.prepare(
				`INSERT INTO ai_turns (user_id, day, turns) VALUES (?, ?, 1)
				 ON CONFLICT(user_id, day) DO UPDATE SET turns = turns + 1`
			)
			.bind(user.id, day)
			.run();
		return { reply, you: message, scene: scene.title };
	}
};
