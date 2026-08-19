import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'board-'));
const out = join(dir, 'rank.mjs');
execFileSync(new URL('../node_modules/esbuild/bin/esbuild', import.meta.url).pathname, [
	new URL('../src/lib/server/board-rank.ts', import.meta.url).pathname,
	'--bundle',
	'--format=esm',
	'--platform=neutral',
	`--outfile=${out}`
]);
const R = await import(`file://${out}`);

const row = (userId, nickname, percentage, questions, duration, completedAt) => ({
	userId,
	nickname,
	percentage,
	questions,
	duration,
	completedAt
});

test('category order includes both tie-breaks', () => {
	const now = '2026-08-18T10:00:00.000Z';
	const rows = [
		row('1', 'BudiSantoso', 80, 5, 20, now),
		row('1', 'BudiSantoso', 100, 5, 20, now),
		row('1', 'BudiSantoso', 100, 5, 20, now),
		row('2', 'SitiLestari', 80, 5, 40, now),
		row('2', 'SitiLestari', 100, 5, 40, now),
		row('2', 'SitiLestari', 100, 5, 40, now),
		row('3', 'AndiWijaya', 100, 5, 10, now),
		row('3', 'AndiWijaya', 100, 5, 10, now),
		row('4', 'RinaPutri', 60, 5, 25, now),
		row('4', 'RinaPutri', 60, 5, 25, now),
		row('4', 'RinaPutri', 60, 5, 25, now),
		row('4', 'RinaPutri', 60, 5, 25, now)
	];
	const weekly = R.aggregate(rows, 3);
	assert.equal(weekly[0].nickname, 'BudiSantoso');
	assert.equal(weekly[1].nickname, 'SitiLestari');
	assert.ok(!weekly.some((r) => r.nickname === 'AndiWijaya'));
	const moreQs = [
		...rows,
		row('4', 'RinaPutri', 60, 5, 25, now),
		row('4', 'RinaPutri', 60, 5, 25, now)
	];
	const active = R.rankActive(moreQs);
	assert.equal(active[0].nickname, 'RinaPutri');
});

test('week boundary Sunday 23:59 vs Monday 00:01 Jakarta', () => {
	const monday = new Date('2026-08-16T17:01:00.000Z'); // Mon 00:01 WIB
	assert.equal(R.weekStartJakarta(monday).toISOString(), '2026-08-16T17:00:00.000Z');
	assert.equal(R.inCurrentWeek('2026-08-16T16:59:00.000Z', monday), false); // Sun 23:59
	assert.equal(R.inCurrentWeek('2026-08-16T17:01:00.000Z', monday), true);
});

test('nickname rules hide anonymous and reject collisions/profanity', () => {
	assert.equal(R.validateNickname('ab').ok, false);
	assert.equal(R.validateNickname('fuck you').ok, false);
	assert.equal(R.validateNickname('Alpha One').ok, true);
	const rows = [row('9', null, 100, 5, 10, '2026-08-18T10:00:00.000Z')];
	assert.deepEqual(R.aggregate(rows, 1), []);
});

test('empty board copy exists in the page', async () => {
	const fs = await import('node:fs');
	const page = fs.readFileSync(new URL('../src/routes/leaderboard/+page.svelte', import.meta.url), 'utf8');
	assert.match(page, /The board is still quiet/);
	assert.match(page, /Your position/);
	const sql = fs.readFileSync(new URL('../migrations/0007_leaderboard.sql', import.meta.url), 'utf8');
	assert.match(sql, /board_nickname/);
	assert.match(sql, /CREATE TABLE IF NOT EXISTS quiz_results/);
	assert.doesNotMatch(sql, /\bDROP\b/i);
});
