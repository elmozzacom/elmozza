import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	publicationKey,
	secureEqual,
	telegramPollPayloads,
	validateQuizPackage
} from '$lib/server/omnichannel-quiz-core';

function bearer(header: string | null) {
	return header?.startsWith('Bearer ') ? header.slice(7) : '';
}

type TelegramResult = { ok?: boolean; result?: { message_id?: number; poll?: { id?: string } } };

async function telegram(fetcher: typeof fetch, token: string, method: string, body: Record<string, unknown>) {
	const response = await fetcher(`https://api.telegram.org/bot${token}/${method}`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
	let payload: TelegramResult = {};
	try { payload = (await response.json()) as TelegramResult; } catch { payload = {}; }
	return { response, payload };
}

export const POST: RequestHandler = async ({ request, locals, platform, fetch }) => {
	const env = platform?.env;
	if (!env || !secureEqual(bearer(request.headers.get('authorization')), env.QUIZ_PUBLISH_SECRET)) {
		return json({ ok: false, error: 'unauthorized' }, { status: 401 });
	}
	if (!locals.db) return json({ ok: false, error: 'database_unavailable' }, { status: 503 });
	if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_QUIZ_CHAT_ID) {
		return json({ ok: false, error: 'telegram_not_configured' }, { status: 503 });
	}

	let quiz;
	try { quiz = validateQuizPackage(await request.json()); }
	catch { return json({ ok: false, error: 'invalid_package' }, { status: 400 }); }

	// A new scheduled run ends the previous run automatically. No manual /stop command.
	const old = await locals.db.prepare(
		`SELECT p.external_message_id
		 FROM quiz_publications p JOIN quiz_sessions s ON s.id = p.session_id
		 WHERE s.status = 'open' AND s.run_id <> ? AND p.channel = 'telegram'
		   AND p.status = 'sent' AND p.external_message_id IS NOT NULL`
	).bind(quiz.runId).all<{ external_message_id: string }>();
	for (const row of old.results ?? []) {
		await telegram(fetch, env.TELEGRAM_BOT_TOKEN, 'stopPoll', {
			chat_id: env.TELEGRAM_QUIZ_CHAT_ID,
			message_id: Number(row.external_message_id)
		}).catch(() => undefined);
	}
	await locals.db.prepare(
		`UPDATE quiz_sessions SET status = 'closed', closed_at = datetime('now'), updated_at = datetime('now')
		 WHERE status = 'open' AND run_id <> ?`
	).bind(quiz.runId).run();

	await locals.db.prepare(
		`INSERT OR IGNORE INTO quiz_sessions
		 (run_id, package_id, title, source, package_json, status, opened_at, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, 'open', datetime('now'), datetime('now'), datetime('now'))`
	).bind(quiz.runId, quiz.id, quiz.title, quiz.source, JSON.stringify(quiz)).run();
	const session = await locals.db.prepare(
		'SELECT id, status FROM quiz_sessions WHERE run_id = ?'
	).bind(quiz.runId).first<{ id: number; status: string }>();
	if (!session || session.status !== 'open') return json({ ok: false, error: 'session_unavailable' }, { status: 409 });

	const payloads = telegramPollPayloads(quiz, env.TELEGRAM_QUIZ_CHAT_ID);
	const published: Array<{ index: number; poll_id: string }> = [];
	for (let index = 0; index < quiz.questions.length; index += 1) {
		const question = quiz.questions[index];
		const key = publicationKey('telegram', quiz.runId, index, env.TELEGRAM_QUIZ_CHAT_ID);
		await locals.db.prepare(
			`INSERT OR IGNORE INTO quiz_publications
			 (session_id, publication_key, question_id, question_index, channel, status, created_at, updated_at)
			 VALUES (?, ?, ?, ?, 'telegram', 'sending', datetime('now'), datetime('now'))`
		).bind(session.id, key, question.id, index).run();
		const existing = await locals.db.prepare(
			'SELECT id, status, external_poll_id FROM quiz_publications WHERE publication_key = ?'
		).bind(key).first<{ id: number; status: string; external_poll_id: string | null }>();
		if (!existing) return json({ ok: false, error: 'publication_unavailable' }, { status: 503 });
		if (existing.status === 'sent' && existing.external_poll_id) {
			published.push({ index, poll_id: existing.external_poll_id });
			continue;
		}
		await locals.db.prepare(
			`UPDATE quiz_publications SET status = 'sending', error_code = NULL, updated_at = datetime('now') WHERE id = ?`
		).bind(existing.id).run();
		let sent;
		try { sent = await telegram(fetch, env.TELEGRAM_BOT_TOKEN, 'sendPoll', payloads[index]); }
		catch { sent = null; }
		const pollId = sent?.payload.result?.poll?.id;
		if (!sent?.response.ok || sent.payload.ok !== true || !pollId) {
			await locals.db.prepare(
				`UPDATE quiz_publications SET status = 'failed', error_code = 'telegram_rejected', updated_at = datetime('now') WHERE id = ?`
			).bind(existing.id).run();
			return json({ ok: false, error: 'telegram_rejected', sent: published.length }, { status: 502 });
		}
		await locals.db.prepare(
			`UPDATE quiz_publications SET status = 'sent', external_poll_id = ?, external_message_id = ?,
			 published_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
		).bind(pollId, String(sent.payload.result?.message_id ?? ''), existing.id).run();
		published.push({ index, poll_id: pollId });
	}

	for (let index = 0; index < quiz.questions.length; index += 1) {
		await locals.db.prepare(
			`INSERT OR IGNORE INTO quiz_publications
			 (session_id, publication_key, question_id, question_index, channel, status, published_at, created_at, updated_at)
			 VALUES (?, ?, ?, ?, 'web', 'sent', datetime('now'), datetime('now'), datetime('now'))`
		).bind(session.id, publicationKey('web', quiz.runId, index, 'english.elmozza.com'), quiz.questions[index].id, index).run();
	}

	return json({
		ok: true,
		run_id: quiz.runId,
		telegram_polls: published.length,
		web_url: `https://english.elmozza.com/quiz/session/${encodeURIComponent(quiz.runId)}`
	});
};
