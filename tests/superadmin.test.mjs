import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('..', import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8');

test('the bound mailbox is never shipped to the browser', () => {
	const mailbox = 'hendrychristiono2022@gmail.com';
	const clientish = [
		'src/lib/components/SiteShell.svelte',
		'src/lib/components/SuperDesk.svelte',
		'src/routes/superadmin/+page.svelte',
		'src/routes/superadmin/accounts/+page.svelte',
		'src/routes/login/+page.svelte',
		'src/routes/register/+page.svelte'
	];
	for (const file of clientish) {
		assert.doesNotMatch(read(file), new RegExp(mailbox.replace('.', '\\.')), file);
	}
	assert.match(read('src/lib/server/superadmin.ts'), /SUPERADMIN_EMAIL/);
	assert.match(read('src/lib/server/superadmin.ts'), /FALLBACK_EMAIL/);
});

test('superadmin is a first-class role and sits above admin', () => {
	const auth = read('src/lib/server/auth.ts');
	assert.match(auth, /'superadmin'/);
	assert.match(auth, /\['superadmin', 'owner', 'admin'\]/);
	const seat = read('src/lib/server/superadmin.ts');
	assert.match(seat, /role !== 'superadmin'/);
	assert.match(seat, /ensureSuperadminSeat/);
});

test('login and Google both promote the bound seat', () => {
	assert.match(read('src/routes/login/+page.server.ts'), /ensureSuperadminSeat/);
	assert.match(read('src/routes/login/google/callback/+server.ts'), /ensureSuperadminSeat/);
	assert.match(read('src/hooks.server.ts'), /ensureSuperadminSeat/);
});

test('superadmin routes exist and are layout-guarded', () => {
	const layout = read('src/routes/superadmin/+layout.server.ts');
	assert.match(layout, /requireSuperadmin/);
	for (const file of [
		'src/routes/superadmin/+page.server.ts',
		'src/routes/superadmin/accounts/+page.server.ts',
		'src/routes/superadmin/accounts/[id]/+page.server.ts',
		'src/routes/superadmin/logs/+page.server.ts',
		'src/routes/superadmin/accounts/export.csv/+server.ts'
	]) {
		assert.ok(fs.existsSync(new URL(file, root)), file);
	}
	assert.match(read('src/routes/superadmin/accounts/export.csv/+server.ts'), /requireSuperadmin/);
	assert.match(read('src/routes/superadmin/accounts/[id]/+page.server.ts'), /reset_day|mercy_unlock|set_role/);
});

test('the migration is additive and widens the role trigger', () => {
	const sql = read('migrations/0004_superadmin.sql');
	assert.match(sql, /CREATE TABLE IF NOT EXISTS audit_logs/);
	assert.match(sql, /CREATE TABLE IF NOT EXISTS mercy_unlocks/);
	assert.match(sql, /superadmin/);
	assert.doesNotMatch(sql, /DROP TABLE users|DELETE FROM users/i);
});
