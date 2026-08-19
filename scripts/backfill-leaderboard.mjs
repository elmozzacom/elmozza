/**
 * Additive backfill of quiz_results from existing scored work.
 * Does not create dummy students. Safe for production.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const remote = process.argv.includes('--remote');
const flag = remote ? '--remote' : '--local';
const sql = `
INSERT OR IGNORE INTO quiz_results (user_id, quiz_id, source, total_questions, correct_answers, percentage, duration_seconds, completed_at)
SELECT p.user_id,
       'backfill-step-' || p.step_id,
       CASE WHEN s.type = 'checkpoint' THEN 'checkpoint' ELSE 'path_step' END,
       1,
       CASE WHEN p.perfect = 1 THEN 1 ELSE 0 END,
       COALESCE(p.score, CASE WHEN p.perfect = 1 THEN 100 ELSE 70 END),
       NULL,
       p.completed_at
FROM user_step_progress p
LEFT JOIN path_steps s ON s.id = p.step_id
WHERE p.status = 'completed';

INSERT OR IGNORE INTO quiz_results (user_id, quiz_id, source, total_questions, correct_answers, percentage, duration_seconds, completed_at)
SELECT r.user_id,
       'backfill-q-' || r.day_number,
       'daily_questionnaire',
       5,
       CASE
         WHEN r.self_rating IS NOT NULL AND r.self_rating BETWEEN 0 AND 5 THEN r.self_rating
         ELSE 0
       END,
       CASE
         WHEN r.self_rating IS NOT NULL AND r.self_rating BETWEEN 0 AND 5 THEN (r.self_rating * 20.0)
         ELSE 0
       END,
       NULL,
       r.completed_at
FROM questionnaire_responses r;
`;

const tmp = mkdtempSync(join(tmpdir(), 'elmozza-backfill-'));
const file = join(tmp, 'backfill.sql');
writeFileSync(file, sql, 'utf8');
console.log(`Backfilling honor board ${remote ? 'REMOTE' : 'local'} …`);
execFileSync(
	process.execPath,
	['node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'elmozza-db', flag, `--file=${file}`, '-y'],
	{ stdio: 'inherit' }
);
console.log('Backfill finished.');
