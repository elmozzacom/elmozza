import { error, fail } from '@sveltejs/kit';
import type { D1Database } from '@cloudflare/workers-types';
import type { Actions, PageServerLoad } from './$types';
import {
	gradeQuiz,
	publicationKey,
	publicQuizPackage,
	validateQuizPackage
} from '$lib/server/omnichannel-quiz-core';
import { recordQuizResult } from '$lib/server/board';

type SessionRow = { id: number; run_id: string; package_json: string; status: string };

async function loadSession(db: D1Database, runId: string) {
	const row = await db
		.prepare('SELECT id, run_id, package_json, status FROM quiz_sessions WHERE run_id = ?')
		.bind(runId.toLowerCase())
		.first<SessionRow>();
	if (!row) throw error(404, 'Quiz session not found.');
	try {
		return { row, quiz: validateQuizPackage(JSON.parse(row.package_json)) };
	} catch {
		throw error(503, 'Quiz session is unavailable.');
	}
}

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.db) throw error(503, 'Database unavailable.');
	const { row, quiz } = await loadSession(locals.db, params.runId);
	return {
		quiz: publicQuizPackage(quiz),
		closed: row.status !== 'open',
		user: locals.user ? { username: locals.user.username, role: locals.user.role } : null
	};
};

export const actions: Actions = {
	grade: async ({ params, request, locals }) => {
		if (!locals.db) return fail(503, { error: 'Database unavailable.' });
		const { row, quiz } = await loadSession(locals.db, params.runId);
		if (row.status !== 'open') return fail(409, { error: 'This quiz session is closed.' });

		const form = await request.formData();
		const answers = quiz.questions.map((_, index) => Number(form.get(`q-${index}`)));
		let score;
		try {
			score = gradeQuiz(quiz, answers);
		} catch {
			return fail(400, { error: 'Please answer all five questions.' });
		}

		let recorded = false;
		if (locals.user) {
			const externalUserId = String(locals.user.id);
			await locals.db
				.prepare(
					`INSERT INTO quiz_players
					 (platform, external_user_id, display_name, linked_user_id, created_at, updated_at)
					 VALUES ('web', ?, ?, ?, datetime('now'), datetime('now'))
					 ON CONFLICT (platform, external_user_id)
					 DO UPDATE SET display_name = excluded.display_name,
					               linked_user_id = excluded.linked_user_id,
					               updated_at = datetime('now')`
				)
				.bind(externalUserId, locals.user.username.slice(0, 80), locals.user.id)
				.run();
			const player = await locals.db
				.prepare("SELECT id FROM quiz_players WHERE platform = 'web' AND external_user_id = ?")
				.bind(externalUserId)
				.first<{ id: number }>();

			if (player) {
				let inserted = 0;
				for (let index = 0; index < quiz.questions.length; index += 1) {
					const question = quiz.questions[index];
					const key = publicationKey('web', quiz.runId, index, 'english.elmozza.com');
					await locals.db
						.prepare(
							`INSERT OR IGNORE INTO quiz_publications
							 (session_id, publication_key, question_id, question_index, channel, status,
							  published_at, created_at, updated_at)
							 VALUES (?, ?, ?, ?, 'web', 'sent', datetime('now'), datetime('now'), datetime('now'))`
						)
						.bind(row.id, key, question.id, index)
						.run();
					const publication = await locals.db
						.prepare('SELECT id FROM quiz_publications WHERE session_id = ? AND channel = ? AND question_index = ?')
						.bind(row.id, 'web', index)
						.first<{ id: number }>();
					if (!publication) continue;
					const result = await locals.db
						.prepare(
							`INSERT OR IGNORE INTO quiz_answers
							 (publication_id, player_id, selected_option, is_correct, answered_at)
							 VALUES (?, ?, ?, ?, datetime('now'))`
						)
						.bind(publication.id, player.id, answers[index], answers[index] === question.correctIndex ? 1 : 0)
						.run();
					inserted += result.meta.changes ?? 0;
				}
				recorded = inserted > 0;
				if (recorded) {
					await recordQuizResult(locals.db, {
						userId: locals.user.id,
						quizId: `omni-${quiz.runId}`,
						source: 'practice',
						total: score.total,
						correct: score.correct
					});
				}
			}
		}

		return {
			graded: true,
			score,
			recorded,
			signedIn: Boolean(locals.user)
		};
	}
};
