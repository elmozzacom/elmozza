import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { secureEqual, validateQuizPackage } from '$lib/server/omnichannel-quiz-core';

type PollAnswerUpdate = {
	poll_answer?: {
		poll_id?: string;
		option_ids?: number[];
		user?: { id?: number; first_name?: string; last_name?: string; username?: string };
	};
};

function displayName(user: NonNullable<NonNullable<PollAnswerUpdate['poll_answer']>['user']>) {
	const full = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
	return (full || user.username || 'Telegram learner').slice(0, 80);
}

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!secureEqual(request.headers.get('x-elmozza-quiz-secret'), platform?.env?.TELEGRAM_INGEST_SECRET)) {
		return json({ ok: false }, { status: 401 });
	}
	if (!locals.db) return json({ ok: false }, { status: 503 });
	let update: PollAnswerUpdate;
	try { update = (await request.json()) as PollAnswerUpdate; }
	catch { return json({ ok: false }, { status: 400 }); }
	const answer = update.poll_answer;
	if (!answer?.poll_id || !answer.user?.id || !Array.isArray(answer.option_ids)) {
		return json({ ok: true, ignored: true });
	}
	const publication = await locals.db.prepare(
		`SELECT p.id, p.question_index, s.package_json
		 FROM quiz_publications p JOIN quiz_sessions s ON s.id = p.session_id
		 WHERE p.external_poll_id = ? AND p.channel = 'telegram' AND p.status = 'sent' AND s.status = 'open'`
	).bind(answer.poll_id).first<{ id: number; question_index: number; package_json: string }>();
	if (!publication) return json({ ok: true, ignored: true });
	let quiz;
	try { quiz = validateQuizPackage(JSON.parse(publication.package_json)); }
	catch { return json({ ok: false }, { status: 503 }); }
	const externalUserId = String(answer.user.id);
	await locals.db.prepare(
		`INSERT INTO quiz_players (platform, external_user_id, display_name, created_at, updated_at)
		 VALUES ('telegram', ?, ?, datetime('now'), datetime('now'))
		 ON CONFLICT (platform, external_user_id)
		 DO UPDATE SET display_name = excluded.display_name, updated_at = datetime('now')`
	).bind(externalUserId, displayName(answer.user)).run();
	const player = await locals.db.prepare(
		`SELECT id FROM quiz_players WHERE platform = 'telegram' AND external_user_id = ?`
	).bind(externalUserId).first<{ id: number }>();
	if (!player) return json({ ok: false }, { status: 503 });
	if (answer.option_ids.length === 0) {
		await locals.db.prepare('DELETE FROM quiz_answers WHERE publication_id = ? AND player_id = ?')
			.bind(publication.id, player.id).run();
		return json({ ok: true, retracted: true });
	}
	const selected = answer.option_ids[0];
	const question = quiz.questions[publication.question_index];
	if (!question || !Number.isInteger(selected) || selected < 0 || selected >= question.choices.length) {
		return json({ ok: true, ignored: true });
	}
	await locals.db.prepare(
		`INSERT INTO quiz_answers (publication_id, player_id, selected_option, is_correct, answered_at)
		 VALUES (?, ?, ?, ?, datetime('now'))
		 ON CONFLICT (publication_id, player_id)
		 DO UPDATE SET selected_option = excluded.selected_option,
		               is_correct = excluded.is_correct,
		               answered_at = datetime('now')`
	).bind(publication.id, player.id, selected, selected === question.correctIndex ? 1 : 0).run();
	return json({ ok: true });
};
