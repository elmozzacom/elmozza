import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('..', import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8');

test('legacy lesson route cannot award XP without a server-side quiz attempt', () => {
  const source = read('src/routes/lesson/[id]/+page.server.ts');
  assert.match(source, /FROM lessons\s+WHERE id = \?/i, 'load must reject nonexistent lessons');
  assert.doesNotMatch(source, /complete\s*:/, 'standalone complete action must be disabled without attempt state');
  assert.doesNotMatch(source, /INSERT INTO lesson_progress/i);
});

test('Daily Coach completion is atomic and replay-safe with derived XP and distinct-day streak', () => {
  const source = read('src/routes/daily-coach/+page.server.ts');
  assert.match(source, /\.batch\s*\(/);
  assert.match(source, /SUM\s*\(xp_awarded\)/i);
  assert.match(source, /COUNT\s*\(DISTINCT\s+date\s*\(completed_at\)\)/i);
  assert.doesNotMatch(source, /current_streak\s*=\s*current_streak\s*\+\s*1/i);
});

test('migration commands explicitly use the incremental migration, not fresh schema', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.match(pkg.scripts['d1:migrate:local'] ?? '', /--local.*migrations\/0001_auth_dashboard\.sql/);
  assert.match(pkg.scripts['d1:migrate:remote'] ?? '', /--remote.*migrations\/0001_auth_dashboard\.sql/);
  assert.match(pkg.scripts['d1:fresh:local'] ?? '', /--local.*schema\.sql/);
});

test('schema and migration enforce case-insensitive username/email uniqueness with collision preflight', () => {
  const schema = read('schema.sql');
  const migration = read('migrations/0001_auth_dashboard.sql');
  for (const source of [schema, migration]) {
    assert.match(source, /UNIQUE INDEX[^;]+lower\s*\(username\)/is);
    assert.match(source, /UNIQUE INDEX[^;]+lower\s*\(email\)/is);
  }
  assert.match(migration, /migration_identity_guard/i);
  assert.match(migration, /lower\s*\(trim\s*\(username\)\)/i);
  assert.match(migration, /lower\s*\(trim\s*\(email\)\)/i);
});

test('registration is rate-limited before PBKDF2 and login checks IP plus identifier', () => {
  const register = read('src/routes/register/+page.server.ts');
  const login = read('src/routes/login/+page.server.ts');
  assert.ok(register.indexOf('login_attempts') !== -1 && register.indexOf('login_attempts') < register.indexOf('hashPassword(password)'), 'register limiter must precede PBKDF2');
  assert.match(login, /ipKey/);
  assert.match(login, /identifierKey/);
  assert.match(login, /attempt_key IN \(\?, \?\)/i);
});

test('password whitespace is preserved and important response hardening is present', () => {
  const auth = read('src/lib/server/auth.ts');
  const register = read('src/routes/register/+page.server.ts');
  const login = read('src/routes/login/+page.server.ts');
  const hooks = read('src/hooks.server.ts');
  assert.match(auth, /rawFormValue/);
  assert.match(register, /rawFormValue\(form\.get\('password'\)\)/);
  assert.match(login, /rawFormValue\(form\.get\('password'\)\)/);
  assert.doesNotMatch(hooks, /if \(db\) await db\.prepare\("DELETE FROM sessions/);
  assert.match(hooks, /Math\.random\(\)/);
  assert.match(hooks, /strict-transport-security/i);
  assert.match(hooks, /permissions-policy/i);
});
