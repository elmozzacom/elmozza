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
console.log(`  admin email    : ${ADMIN.email}`);
console.log(`  admin password : ${ADMIN.password}`);
console.log(`  registrants    : ${REGISTRANTS.length}`);
console.log('\nChange the admin password after the first sign-in.');
