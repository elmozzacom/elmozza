import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('..', import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8');

test('auth schema and migration store sessions, validated roles, progress, and login throttling', () => {
  for (const path of ['schema.sql', 'migrations/0001_auth_dashboard.sql']) {
    const source = read(path);
    assert.match(source, /password_hash/i);
    assert.match(source, /CREATE TABLE IF NOT EXISTS sessions/i);
    assert.match(source, /lesson_progress/i);
    assert.match(source, /login_attempts/i);
    assert.match(source, /owner.*admin.*editor.*reviewer.*learner/is);
    assert.doesNotMatch(source, /password\s+TEXT/i);
  }
});

test('register, login, logout, dashboard, and Daily Coach server routes exist', () => {
  for (const path of [
    'src/routes/register/+page.server.ts',
    'src/routes/register/+page.svelte',
    'src/routes/login/+page.server.ts',
    'src/routes/login/+page.svelte',
    'src/routes/logout/+server.ts',
    'src/routes/dashboard/+page.server.ts',
    'src/routes/dashboard/+page.svelte',
    'src/routes/daily-coach/+page.server.ts'
  ]) assert.equal(fs.existsSync(new URL(path, root)), true, `${path} must exist`);
});

test('server hook resolves and expires sessions and applies security headers', () => {
  const source = read('src/hooks.server.ts');
  assert.match(source, /SESSION_COOKIE|elmozza_session/);
  assert.match(source, /locals\.user/);
  assert.match(source, /DELETE FROM sessions/i);
  assert.match(source, /content-security-policy/i);
  assert.match(source, /x-content-type-options/i);
});

test('PBKDF2 iteration count stays within Cloudflare Workers Web Crypto limit', () => {
  const auth = read('src/lib/server/auth.ts');
  const match = auth.match(/iterations:\s*(\d[\d_]*)/);
  assert.ok(match, 'PBKDF2 iteration count must be explicit');
  const iterations = Number(match[1].replaceAll('_', ''));
  assert.ok(iterations >= 100000, 'PBKDF2 must use at least 100,000 iterations');
  assert.ok(iterations <= 100000, 'Cloudflare Workers rejects PBKDF2 above 100,000 iterations');
});

test('auth uses secure cookies, generic login errors, internal redirects, and D1 backoff', () => {
  const auth = read('src/lib/server/auth.ts');
  const login = read('src/routes/login/+page.server.ts');
  assert.match(auth, /httpOnly:\s*true/);
  assert.match(auth, /sameSite:\s*'lax'/);
  assert.match(auth, /secure:\s*!dev/);
  assert.match(auth, /safeRedirect/);
  assert.match(login, /login_attempts/);
  assert.match(login, /Email atau password tidak valid/);
  assert.doesNotMatch(login, /user not found|email not found/i);
});

test('dashboard and learning actions trust locals user and calculate XP server-side idempotently', () => {
  const dashboard = read('src/routes/dashboard/+page.server.ts');
  const coach = read('src/routes/daily-coach/+page.server.ts');
  const lesson = read('src/routes/lesson/[id]/+page.server.ts');
  assert.match(dashboard, /requireUser\(locals\.user\)/);
  const dashboardPage = read('src/routes/dashboard/+page.svelte');
  assert.match(dashboardPage, /total_xp/i);
  assert.match(dashboardPage, /current_streak/i);
  assert.match(dashboard, /lesson_progress/i);
  assert.match(coach, /locals\.user/);
  assert.match(coach, /ON CONFLICT\s*\(user_id, lesson_code\)/i);
  assert.match(lesson, /locals\.user/);
  assert.doesNotMatch(lesson, /form\.get\(['"]userId['"]\)/);
  assert.doesNotMatch(lesson, /form\.get\(['"]xp(Earned)?['"]\)/);
  assert.match(lesson, /FROM lessons\s+WHERE id = \?/i);
  assert.doesNotMatch(lesson, /complete\s*:/i);
});
