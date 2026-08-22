import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = new URL('..', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const dir = mkdtempSync(join(tmpdir(), 'omnichannel-quiz-'));
const out = join(dir, 'core.mjs');

execFileSync(new URL('../node_modules/esbuild/bin/esbuild', import.meta.url).pathname, [
  new URL('../src/lib/server/omnichannel-quiz-core.ts', import.meta.url).pathname,
  '--bundle', '--format=esm', '--platform=neutral', `--outfile=${out}`
]);
const core = await import(`file://${out}`);

const packageInput = {
  id: 'edc-med-012',
  run_id: 'edc-med-012-20260822t1000z',
  title: 'English Daily Coach — Going home',
  source: 'hermes-cron',
  questions: Array.from({ length: 5 }, (_, index) => ({
    id: `EDC-MED-012-Q0${index + 1}`,
    prompt: `Question ${index + 1}`,
    choices: ['Answer A', 'Answer B', 'Answer C', 'Answer D'],
    correct_index: index % 4,
    explanation: `Explanation ${index + 1}`
  }))
};

test('approved Hermes package validates as exactly five questions and public form hides keys', () => {
  const parsed = core.validateQuizPackage(packageInput);
  assert.equal(parsed.questions.length, 5);
  assert.equal(parsed.runId, packageInput.run_id);
  const visible = core.publicQuizPackage(parsed);
  assert.equal(visible.questions.length, 5);
  assert.equal('correctIndex' in visible.questions[0], false);
  assert.equal('explanation' in visible.questions[0], false);
});

test('invalid, incomplete, and oversized packages fail closed', () => {
  assert.throws(() => core.validateQuizPackage({ ...packageInput, questions: packageInput.questions.slice(0, 4) }));
  assert.throws(() => core.validateQuizPackage({ ...packageInput, questions: packageInput.questions.map((q, i) => i ? q : { ...q, correct_index: 9 }) }));
  assert.throws(() => core.validateQuizPackage({ ...packageInput, title: 'x'.repeat(301) }));
});

test('Telegram payloads are five non-anonymous native quizzes with server-side keys', () => {
  const parsed = core.validateQuizPackage(packageInput);
  const payloads = core.telegramPollPayloads(parsed, 'synthetic-chat');
  assert.equal(payloads.length, 5);
  payloads.forEach((payload, index) => {
    assert.equal(payload.type, 'quiz');
    assert.equal(payload.is_anonymous, false);
    assert.equal(payload.chat_id, 'synthetic-chat');
    assert.equal(payload.correct_option_id, index % 4);
    assert.match(payload.question, new RegExp(`Question ${index + 1}`));
  });
});

test('grading uses the persisted trusted package and supports a deterministic 5-question score', () => {
  const parsed = core.validateQuizPackage(packageInput);
  const answers = [0, 1, 2, 3, 0];
  assert.deepEqual(core.gradeQuiz(parsed, answers), { correct: 5, total: 5, percentage: 100 });
  assert.deepEqual(core.gradeQuiz(parsed, [1, 1, 2, 3, 0]), { correct: 4, total: 5, percentage: 80 });
});

test('secrets fail closed and publication keys never contain raw destinations', () => {
  assert.equal(core.secureEqual('', ''), false);
  assert.equal(core.secureEqual('alpha', 'alpha'), true);
  assert.equal(core.secureEqual('alpha', 'beta'), false);
  const key = core.publicationKey('telegram', packageInput.run_id, 2, 'private-chat-id');
  assert.equal(key.includes('private-chat-id'), false);
  assert.equal(key, core.publicationKey('telegram', packageInput.run_id, 2, 'private-chat-id'));
});

test('migration models five-question sessions, per-question publications, players, and idempotent answers', () => {
  const sql = read('migrations/0008_omnichannel_quiz.sql');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS quiz_sessions/i);
  assert.match(sql, /run_id TEXT NOT NULL UNIQUE/i);
  assert.match(sql, /package_json TEXT NOT NULL/i);
  assert.match(sql, /status TEXT NOT NULL DEFAULT 'open'/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS quiz_publications/i);
  assert.match(sql, /UNIQUE\s*\(session_id, channel, question_index\)/i);
  assert.match(sql, /external_poll_id TEXT UNIQUE/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS quiz_players/i);
  assert.match(sql, /UNIQUE\s*\(platform, external_user_id\)/i);
  assert.match(sql, /leaderboard_opt_in INTEGER NOT NULL DEFAULT 0/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS quiz_answers/i);
  assert.match(sql, /UNIQUE\s*\(publication_id, player_id\)/i);
  assert.doesNotMatch(sql, /\bDROP\b/i);
});

test('publisher accepts one package, closes old sessions automatically, and sends every native poll idempotently', () => {
  const publisher = read('src/routes/api/quiz/publish/telegram/+server.ts');
  assert.match(publisher, /validateQuizPackage/);
  assert.match(publisher, /QUIZ_PUBLISH_SECRET/);
  assert.match(publisher, /UPDATE quiz_sessions SET status = 'closed'/i);
  assert.match(publisher, /telegramPollPayloads/);
  assert.match(publisher, /sendPoll/);
  assert.match(publisher, /UNIQUE|INSERT OR IGNORE/i);
});

test('Telegram ingestion is a forward-only endpoint and never competes for the bot webhook', () => {
  const webhook = read('src/routes/api/telegram/quiz-answer/+server.ts');
  assert.match(webhook, /x-elmozza-quiz-secret/i);
  assert.match(webhook, /TELEGRAM_INGEST_SECRET/);
  assert.match(webhook, /poll_answer/);
  assert.match(webhook, /ON CONFLICT\s*\(publication_id, player_id\)/i);
  assert.doesNotMatch(webhook, /setWebhook|getUpdates|console\.(log|error)\s*\(/i);
});

test('website session route serves and grades the same stored five-question package', () => {
  const server = read('src/routes/quiz/session/[runId]/+page.server.ts');
  const page = read('src/routes/quiz/session/[runId]/+page.svelte');
  assert.match(server, /package_json/);
  assert.match(server, /validateQuizPackage/);
  assert.match(server, /gradeQuiz/);
  assert.match(server, /recordQuizResult/);
  assert.match(page, /Question \{index \+ 1\} of \{data\.quiz\.questions\.length\}/);
  assert.doesNotMatch(page, /correctIndex|correct_index|\.answer\b/);
});

test('omnichannel leaderboard exposes names and platforms but never external identifiers', () => {
  const leaderboard = read('src/routes/api/quiz/leaderboard/+server.ts');
  const board = read('src/lib/server/board.ts');
  assert.match(leaderboard, /display_name/);
  assert.match(leaderboard, /platform/);
  assert.match(leaderboard, /leaderboard_opt_in/);
  assert.doesNotMatch(leaderboard, /external_user_id/);
  assert.match(board, /quiz_sessions/);
  assert.match(board, /leaderboard_opt_in/);
});

test('Hermes bridge forwards native poll answers and cron publisher sends the approved package without LLM', () => {
  const bridge = read('../edc-conversation-engine/scripts/forward_telegram_poll_answer.py');
  const publisher = read('../edc-conversation-engine/scripts/publish_omnichannel_quiz.py');
  assert.match(bridge, /poll_answer/);
  assert.match(bridge, /X-Elmozza-Quiz-Secret/i);
  assert.match(publisher, /review_status/);
  assert.match(publisher, /APPROVED/);
  assert.match(publisher, /run_id/);
  assert.doesNotMatch(publisher, /^\s*(?:from|import)\s+(?:openai|anthropic|llm)/im);
  const adapter = read('../../../../.hermes/hermes-agent/plugins/platforms/telegram/adapter.py');
  assert.match(adapter, /_handle_omnichannel_poll_answer/);
  assert.match(adapter, /ELMOZZA_QUIZ_INGEST_URL/);
});
