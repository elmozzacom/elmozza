/**
 * Seed honor-board dummy students across two weeks.
 * Additive. Local by default; --remote for production.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const remote = process.argv.includes('--remote');
const quote = (v) => `'${String(v).replace(/'/g, "''")}'`;

// This week = Monday 00:00 Jakarta onward. Use timestamps relative to "now"
// via datetime() so the seed stays current.
const students = [
	{ email: 'board.budi@example.com', nick: 'BudiSantoso', scores: [80, 100, 100], dur: 20 },
	{ email: 'board.siti@example.com', nick: 'SitiLestari', scores: [80, 100, 100], dur: 40 },
	{ email: 'board.andi@example.com', nick: 'AndiWijaya', scores: [100, 100], dur: 10 },
	{ email: 'board.rina@example.com', nick: 'RinaPutri', scores: [60, 60, 60, 60, 60, 60], dur: 25 },
	{ email: 'board.eko@example.com', nick: 'EkoPrasetyo', scores: [70, 80, 80], dur: 15 },
	{ email: 'board.ghost@example.com', nick: null, scores: [100, 100, 100], dur: 12 }
];

const lines = [];
let i = 0;
for (const student of students) {
	i += 1;
	const user = `board_user_${i}`;
	lines.push(
		`INSERT OR IGNORE INTO users (username, email, password_hash, role)
		 VALUES (${quote(user)}, ${quote(student.email)}, 'x', 'learner');`
	);
	if (student.nick) {
		lines.push(
			`UPDATE users SET board_nickname = ${quote(student.nick)}, board_nickname_set_at = datetime('now')
			 WHERE email = ${quote(student.email)} AND board_nickname IS NULL;`
		);
	}
	student.scores.forEach((pct, index) => {
		const when = `datetime('now', '-${index} hours')`;
		const correct = Math.round((pct / 100) * 5);
		lines.push(
			`INSERT OR IGNORE INTO quiz_results (user_id, quiz_id, source, total_questions, correct_answers, percentage, duration_seconds, completed_at)
			 SELECT id, ${quote(`seed-${i}-${index}`)}, 'path_step', 5, ${correct}, ${pct}, ${student.dur}, ${when}
			 FROM users WHERE email = ${quote(student.email)};`
		);
	});
}

// One extra last-week result so the week filter is visible.
lines.push(`
INSERT OR IGNORE INTO quiz_results (user_id, quiz_id, source, total_questions, correct_answers, percentage, duration_seconds, completed_at)
SELECT id, 'seed-last-week', 'path_step', 5, 5, 100, 20, datetime('now', '-8 days')
FROM users WHERE email = 'board.budi@example.com';
`);
lines.push(`
INSERT OR IGNORE INTO quiz_results (user_id, quiz_id, source, total_questions, correct_answers, percentage, duration_seconds, completed_at)
SELECT p.user_id, 'backfill-step-' || p.step_id, CASE WHEN s.type = 'checkpoint' THEN 'checkpoint' ELSE 'path_step' END,
       1, CASE WHEN p.perfect = 1 THEN 1 ELSE 0 END, p.score, NULL, p.completed_at
FROM user_step_progress p
LEFT JOIN path_steps s ON s.id = p.step_id;
`);
lines.push(`
INSERT OR IGNORE INTO quiz_results (user_id, quiz_id, source, total_questions, correct_answers, percentage, duration_seconds, completed_at)
SELECT user_id, 'backfill-q-' || day_number, 'daily_questionnaire', 5, 0, 0, NULL, completed_at
FROM questionnaire_responses;
`);

const tmp = mkdtempSync(join(tmpdir(), 'elmozza-board-'));
const file = join(tmp, 'seed.sql');
writeFileSync(file, lines.join('\n\n'), 'utf8');
const flag = remote ? '--remote' : '--local';
console.log(`Seeding honor board ${remote ? 'REMOTE' : 'local'} …`);
execFileSync(
	process.execPath,
	['node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'elmozza-db', flag, `--file=${file}`, '-y'],
	{ stdio: 'inherit' }
);
console.log(`Seeded ${students.length} board students.`);
