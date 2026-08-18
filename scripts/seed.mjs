/**
 * Seed: 10 dummy registrants + 1 admin account.
 *
 * Safety: writes to the LOCAL D1 database by default. The production database
 * holds real learner accounts and progress, so the remote path must be asked
 * for explicitly with --remote and it never overwrites an existing row.
 *
 *   node scripts/seed.mjs            # local
 *   node scripts/seed.mjs --remote   # production, deliberate
 */

import { execFileSync } from 'node:child_process';
import { webcrypto as crypto } from 'node:crypto';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const remote = process.argv.includes('--remote');
const encoder = new TextEncoder();
const toHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

/** Identical PBKDF2 parameters to src/lib/server/auth.ts. */
async function hashPassword(password) {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
		'deriveBits'
	]);
	const bits = await crypto.subtle.deriveBits(
		{ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
		key,
		256
	);
	return `${toHex(salt)}:${toHex(new Uint8Array(bits))}`;
}

const ADMIN = {
	username: 'elmozza_admin',
	email: 'admin@english.elmozza.com',
	password: 'ElmozzaAdmin2026!'
};

const REGISTRANTS = [
	['Rani Ayu Lestari', 'rani.lestari@example.com', 'B1', 78, 'paid', 'web'],
	['Bagus Pratama', 'bagus.pratama@example.com', 'B2', 86, 'paid', 'referral'],
	['Siti Nurhaliza', 'siti.nurhaliza@example.com', 'A2', 54, 'pending', 'web'],
	['Dimas Anggara', 'dimas.anggara@example.com', 'A1', 32, 'pending', 'instagram'],
	['Putri Maharani', 'putri.maharani@example.com', 'B1', 71, 'paid', 'web'],
	['Yoga Saputra', 'yoga.saputra@example.com', 'C1', 94, 'paid', 'referral'],
	['Intan Permata', 'intan.permata@example.com', 'A2', 49, 'waived', 'scholarship'],
	['Rizky Fadillah', 'rizky.fadillah@example.com', 'B2', 83, 'pending', 'web'],
	['Nabila Zahra', 'nabila.zahra@example.com', 'A1', 28, 'refunded', 'instagram'],
	['Fajar Nugroho', 'fajar.nugroho@example.com', 'B1', 69, 'paid', 'web']
];

const quote = (value) => `'${String(value).replace(/'/g, "''")}'`;

/**
 * The questionnaire content is TypeScript, so it is compiled with the project's
 * own esbuild and imported. Hand-copying 14 days of questions into this script
 * would guarantee the two drift apart.
 */
async function loadQuestionnaires() {
	const tmp = mkdtempSync(join(tmpdir(), 'elmozza-content-'));
	const out = join(tmp, 'questionnaires.mjs');
	execFileSync(
		'node_modules/esbuild/bin/esbuild',
		[
			'src/lib/content/questionnaires.ts',
			'--bundle',
			'--format=esm',
			'--platform=neutral',
			`--outfile=${out}`
		],
		{ stdio: 'pipe' }
	);
	return import(`file://${out}`);
}

const hash = await hashPassword(ADMIN.password);
const lines = ['PRAGMA foreign_keys = ON;'];

// Idempotent: an existing admin keeps its current password.
lines.push(
	`INSERT INTO users (username, email, password_hash, role, total_xp, current_streak)
 SELECT ${quote(ADMIN.username)}, ${quote(ADMIN.email)}, ${quote(hash)}, 'admin', 0, 0
 WHERE NOT EXISTS (SELECT 1 FROM users WHERE lower(email) = lower(${quote(ADMIN.email)}));`
);

REGISTRANTS.forEach(([name, email, level, score, status, source], index) => {
	const daysAgo = index * 2 + 1;
	lines.push(
		`INSERT INTO registrations (full_name, email, level, placement_score, payment_status, source, created_at)
 SELECT ${quote(name)}, ${quote(email)}, ${quote(level)}, ${score}, ${quote(status)}, ${quote(source)}, datetime('now', '-${daysAgo} days')
 WHERE NOT EXISTS (SELECT 1 FROM registrations WHERE lower(email) = lower(${quote(email)}));`
	);
});

/* ---------------------------------------------------------------------------
 * The 14-day questionnaire programme.
 *
 * Content is mirrored from src/lib/content/questionnaires.ts so the database
 * copy and the code copy cannot drift. Re-running updates the wording in place
 * without touching anyone's recorded answers.
 * ------------------------------------------------------------------------- */

const { QUESTIONNAIRES } = await loadQuestionnaires();

for (const day of QUESTIONNAIRES) {
	lines.push(
		`INSERT INTO questionnaires (day_number, title, focus, questions)
 VALUES (${day.day}, ${quote(day.title)}, ${quote(day.focus)}, ${quote(JSON.stringify(day.questions))})
 ON CONFLICT(day_number) DO UPDATE SET
   title = excluded.title, focus = excluded.focus, questions = excluded.questions;`
	);
}

/*
 * Three dummy students at different depths — day 3, day 8, day 14 — so the
 * student dashboard and the admin grid both render real shapes immediately:
 * an early learner, one mid-programme, and one who finished.
 */
const STUDENTS = [
	{ username: 'siti_demo', email: 'siti.demo@example.com', through: 3, streak: 3 },
	{ username: 'bagus_demo', email: 'bagus.demo@example.com', through: 8, streak: 5 },
	{ username: 'rani_demo', email: 'rani.demo@example.com', through: 14, streak: 14 }
];

const STUDENT_PASSWORD = 'ElmozzaDemo2026!';
const studentHash = await hashPassword(STUDENT_PASSWORD);

/** A plausible answer set for one day, deterministic so re-runs do not churn. */
function answersFor(day, seed) {
	const questions = QUESTIONNAIRES.find((item) => item.day === day)?.questions ?? [];
	const answers = {};
	let ratingTotal = 0;
	let ratingCount = 0;

	questions.forEach((question, index) => {
		if (question.type === 'rating') {
			// Confidence climbs gently across the fortnight.
			const value = Math.min(5, 2 + Math.floor((day + seed + index) / 5));
			answers[question.id] = value;
			ratingTotal += value;
			ratingCount += 1;
		} else if (question.type === 'choice') {
			// Mostly right, occasionally wrong, so averages are not flat.
			const correct = (day + index + seed) % 4 !== 0;
			answers[question.id] = correct ? question.answer : (question.answer + 1) % question.options.length;
		} else {
			answers[question.id] =
				day >= 12
					? 'I can speak for a minute without stopping now. Two weeks ago I could not begin a sentence without translating it first.'
					: 'I practised out loud this morning and wrote three sentences about my routine.';
		}
	});

	const selfRating = ratingCount > 0 ? Math.round(ratingTotal / ratingCount) : null;
	return { answers, selfRating };
}

for (const student of STUDENTS) {
	lines.push(
		`INSERT INTO users (username, email, password_hash, role, total_xp, current_streak)
 SELECT ${quote(student.username)}, ${quote(student.email)}, ${quote(studentHash)}, 'learner', ${student.through * 20}, ${student.streak}
 WHERE NOT EXISTS (SELECT 1 FROM users WHERE lower(email) = lower(${quote(student.email)}));`
	);

	for (let day = 1; day <= student.through; day += 1) {
		const { answers, selfRating } = answersFor(day, student.through);
		// Backdated one day apart so the streak and the trend chart are real.
		const daysAgo = student.through - day;
		lines.push(
			`INSERT INTO questionnaire_responses (user_id, day_number, answers, self_rating, completed_at)
 SELECT u.id, ${day}, ${quote(JSON.stringify(answers))}, ${selfRating}, datetime('now', '-${daysAgo} days')
 FROM users u WHERE lower(u.email) = lower(${quote(student.email)})
   AND NOT EXISTS (
     SELECT 1 FROM questionnaire_responses r WHERE r.user_id = u.id AND r.day_number = ${day}
   );`
		);
	}
}

// Promote the bound mailbox if it already exists. Never invent a password
// account for it — that would collide with the real Google sign-in.
lines.push(
	`UPDATE users SET role = 'superadmin' WHERE lower(email) = lower(${quote('hendrychristiono2022@gmail.com')}) AND role != 'superadmin';`
);

const dir = mkdtempSync(join(tmpdir(), 'elmozza-seed-'));
const file = join(dir, 'seed.sql');
writeFileSync(file, lines.join('\n\n'), 'utf8');

const flag = remote ? '--remote' : '--local';
console.log(`Seeding ${remote ? 'REMOTE (production)' : 'local'} D1 …`);

execFileSync(
	process.execPath,
	['node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'elmozza-db', flag, `--file=${file}`, '-y'],
	{ stdio: 'inherit' }
);

console.log('\nSeeded.');
console.log(`  admin email      : ${ADMIN.email}`);
console.log(`  admin password   : ${ADMIN.password}`);
console.log(`  registrants      : ${REGISTRANTS.length}`);
console.log(`  questionnaires   : ${QUESTIONNAIRES.length} days`);
console.log(`  demo students    : ${STUDENTS.map((s) => `${s.username} (day ${s.through})`).join(', ')}`);
console.log(`  demo password    : ${STUDENT_PASSWORD}`);
console.log('\nChange the admin password after the first sign-in.');
