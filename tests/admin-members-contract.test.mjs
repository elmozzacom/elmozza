import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('..', import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8');

const serverPath = 'src/routes/dashboard/admin/members/+page.server.ts';
const pagePath = 'src/routes/dashboard/admin/members/+page.svelte';

test('member list is protected by the server-side admin guard', () => {
  assert.equal(fs.existsSync(new URL(serverPath, root)), true, `${serverPath} must exist`);
  const server = read(serverPath);
  assert.match(server, /requireAdmin\(locals\.user\)/);
  assert.doesNotMatch(server, /requireUser\(locals\.user\)/);

  const auth = read('src/lib/server/auth.ts');
  assert.match(auth, /requireAdmin[\s\S]*requireUser\(user\)/);
  assert.match(auth, /\['owner', 'admin'\]\.includes\(member\.role\)/);
  assert.match(auth, /error\(403/);
  assert.match(auth, /requireUser[\s\S]*redirect\(303, '\/login'\)/);
});

test('member query minimizes returned data and calculates progress count', () => {
  const server = read(serverPath);
  assert.match(server, /SELECT\s+u\.id,\s*u\.username,\s*u\.email,\s*u\.role,\s*u\.created_at,\s*u\.total_xp,\s*u\.current_streak/is);
  assert.match(server, /COUNT\(lp\.id\)\s+AS\s+progress_count/i);
  assert.doesNotMatch(server, /SELECT\s+(u\.)?\*/i);
  assert.doesNotMatch(server, /password_hash|sessions?\.id/i);
});

test('search and pagination use bound SQL parameters rather than interpolation', () => {
  const server = read(serverPath);
  assert.match(server, /lower\(u\.username\) LIKE \?[\s\S]*OR lower\(u\.email\) LIKE \?/i);
  assert.match(server, /LIMIT \? OFFSET \?/i);
  assert.match(server, /\.bind\([^)]*searchPattern[^)]*searchPattern/is);
  assert.match(server, /\.bind\([^)]*PAGE_SIZE[^)]*offset/is);
  assert.doesNotMatch(server, /\$\{search(?:Pattern)?\}/i);
});

test('read-only page renders required member fields and labels owner as Super Admin', () => {
  assert.equal(fs.existsSync(new URL(pagePath, root)), true, `${pagePath} must exist`);
  const page = read(pagePath);
  for (const field of ['username', 'email', 'created_at', 'total_xp', 'current_streak', 'progress_count']) {
    assert.match(page, new RegExp(`member\\.${field}`));
  }
  assert.match(page, /role[^\n]*owner[^\n]*Super Admin/is);
  assert.doesNotMatch(page, /method=["']POST["']|action=|ubah role|hapus member/i);
});

test('dashboard exposes the admin entry only for owner and admin roles', () => {
  const dashboard = read('src/routes/dashboard/+page.svelte');
  assert.match(dashboard, /data\.user\.role\s*===\s*['"]owner['"]/);
  assert.match(dashboard, /data\.user\.role\s*===\s*['"]admin['"]/);
  assert.match(dashboard, /href=["']\/dashboard\/admin\/members["']/);
});

test('privilege is role-based without hardcoded email or registration promotion', () => {
  const server = read(serverPath);
  const register = read('src/routes/register/+page.server.ts');
  assert.doesNotMatch(server, /@[a-z0-9.-]+\.[a-z]{2,}/i);
  assert.match(register, /['"]learner['"]/);
  assert.doesNotMatch(register, /['"](?:owner|admin)['"]/);
});
