import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('..', import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8');

test('admin route is role-protected on both the page and the export', () => {
  const page = read('src/routes/admin/+page.server.ts');
  const csv = read('src/routes/admin/export.csv/+server.ts');
  assert.match(page, /requireAdmin\(locals\.user\)/);
  assert.match(csv, /requireAdmin\(locals\.user\)/);
});

test('search and filter values are bound, never interpolated into SQL', () => {
  for (const file of ['src/routes/admin/+page.server.ts', 'src/routes/admin/export.csv/+server.ts']) {
    const source = read(file);
    // Filter values must come from the allow-lists before touching the query.
    assert.match(source, /LEVEL_CODES as readonly string\[\]\)\.includes/);
    assert.match(source, /PAYMENT_STATES as readonly string\[\]\)\.includes/);
    assert.match(source, /\.bind\(\.\.\.binds\)/);
    // No user string is ever concatenated into a WHERE clause.
    assert.doesNotMatch(source, /LIKE\s*'%\$\{/, `${file} must not interpolate search into SQL`);
    assert.doesNotMatch(source, /payment_status\s*=\s*'\$\{/, `${file} must not interpolate status`);
  }
});

test('CSV export is escaped and guarded against spreadsheet formula injection', () => {
  const csv = read('src/routes/admin/export.csv/+server.ts');
  assert.match(csv, /replace\(\/"\/g, '""'\)/);
  assert.match(csv, /\^\[=\+\\-@/, 'leading formula characters must be neutralised');
  assert.match(csv, /content-disposition/i);
  assert.match(csv, /text\/csv/);
});

test('admin dashboard shows the required stats row and columns', () => {
  const page = read('src/routes/admin/+page.svelte');
  for (const label of ['Total students', 'New this week', 'Conversion']) {
    assert.ok(page.includes(label), `stats row must include ${label}`);
  }
  for (const column of ['Name', 'Email', 'Level', 'Score', 'Payment', 'Registered']) {
    assert.ok(page.includes(column), `table must include ${column}`);
  }
  assert.match(page, /Export CSV/);
});

test('registrations migration is additive and never rewrites live learner rows', () => {
  const migration = read('migrations/0002_registrations.sql');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS registrations/);
  assert.match(migration, /CHECK \(payment_status IN/);
  assert.match(migration, /UNIQUE INDEX[^;]+lower\s*\(email\)/is);
  assert.doesNotMatch(migration, /DROP TABLE|DELETE FROM|TRUNCATE/i);
  assert.doesNotMatch(migration, /UPDATE users SET (username|email|password_hash|role)/i);
});

test('drizzle types the new registrations surface', () => {
  const schema = read('src/lib/server/schema.ts');
  assert.match(schema, /from 'drizzle-orm\/sqlite-core'/);
  assert.match(schema, /sqliteTable\('registrations'/);
  assert.match(schema, /payment_status/);
});

test('seed writes locally by default and cannot silently overwrite live rows', () => {
  const seed = read('scripts/seed.mjs');
  assert.match(seed, /--remote/);
  assert.match(seed, /const flag = remote \? '--remote' : '--local'/);
  assert.match(seed, /WHERE NOT EXISTS/);
  assert.doesNotMatch(seed, /DROP TABLE|DELETE FROM|TRUNCATE/i);
  // Seeded passwords use the same PBKDF2 parameters as the running auth code.
  assert.match(seed, /iterations: 100000/);
  assert.match(seed, /SHA-256/);
  // Ten registrants plus one admin.
  assert.equal((seed.match(/@example\.com/g) ?? []).length, 10);
  assert.match(seed, /'admin'/);
});

test('email verification is stubbed honestly, not faked as complete', () => {
  const migration = read('migrations/0002_registrations.sql');
  const register = read('src/routes/register/+page.svelte');
  assert.match(migration, /email_verified_at/);
  assert.match(migration, /stubbed/i);
  assert.match(register, /verification email once that step goes live/i);
});

test('student dashboard derives level and skills from real progress', () => {
  const server = read('src/routes/dashboard/+page.server.ts');
  const page = read('src/routes/dashboard/+page.svelte');
  assert.match(server, /SKILL_OF_DAY/);
  assert.match(server, /listening|speaking|reading|writing/);
  assert.match(server, /completed >= 12 \? 'A2'/);
  assert.match(page, /stroke-dashoffset/);
  assert.match(page, /aria-label="\{skill\.name\}: \{skill\.percent\}%"/);
});
