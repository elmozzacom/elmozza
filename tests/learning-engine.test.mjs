import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = new URL('..', import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8');

test('the ladder has two sections, eight units, and at least sixty real steps', async () => {
	const dir = mkdtempSync(join(tmpdir(), 'ladder-'));
	const out = join(dir, 'ladder.mjs');
	execFileSync(
		new URL('../node_modules/esbuild/bin/esbuild', import.meta.url).pathname,
		[
			new URL('../src/lib/content/ladder.ts', import.meta.url).pathname,
			'--bundle',
			'--format=esm',
			'--platform=neutral',
			`--outfile=${out}`
		],
		{ stdio: 'pipe' }
	);
	const { SECTIONS, countLadder, LADDER_UNITS } = await import(`file://${out}`);
	const { units, steps } = countLadder();
	assert.equal(SECTIONS.length, 2);
	assert.ok(units >= 8, `units ${units}`);
	assert.ok(steps >= 60, `steps ${steps}`);
	assert.ok(LADDER_UNITS.every((u) => u.steps.some((s) => s.type === 'checkpoint')));
	assert.doesNotMatch(JSON.stringify(LADDER_UNITS), /lorem ipsum/i);
});

test('speaking helper is present and tolerant in source', () => {
	const src = read('src/lib/server/complete.ts');
	assert.match(src, /export function speakingOk/);
	assert.match(src, /export function levenshtein/);
	assert.match(src, /target\.length \* 0\.28/);
});

test('new habit routes exist and stay server-guarded', () => {
	for (const file of [
		'src/routes/learn/+page.server.ts',
		'src/routes/learn/step/[id]/+page.server.ts',
		'src/routes/practice/+page.server.ts',
		'src/routes/practice/conversation/+page.server.ts',
		'src/routes/onboarding/+page.server.ts',
		'src/routes/profile/+page.server.ts',
		'src/routes/settings/+page.server.ts',
		'src/routes/settings/notifications/+page.server.ts',
		'src/routes/superadmin/notifications/+page.server.ts',
		'static/manifest.webmanifest',
		'static/sw.js',
		'migrations/0005_learning_engine.sql',
		'workers/elmozza-push/src/index.js'
	]) {
		assert.ok(fs.existsSync(new URL(file, root)), file);
	}
	assert.match(read('src/routes/learn/+page.server.ts'), /requireUser/);
	assert.match(read('src/routes/learn/step/[id]/+page.server.ts'), /checkpoint/);
	assert.match(read('migrations/0005_learning_engine.sql'), /user_item_strength/);
	assert.match(read('static/manifest.webmanifest'), /standalone/);
	assert.match(read('src/routes/practice/conversation/+page.server.ts'), /AI_CONVERSATION/);
	assert.match(read('workers/elmozza-push/wrangler.toml'), /0 \* \* \* \*/);
	assert.doesNotMatch(read('migrations/0005_learning_engine.sql'), /DROP TABLE users/i);
});
