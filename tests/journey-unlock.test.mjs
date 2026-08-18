import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = new URL('..', import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8');

/**
 * journey.ts is TypeScript, so it is compiled with the project's own esbuild and
 * imported for real. These are the rules the whole programme rests on; asserting
 * on the source text alone would prove nothing about behaviour.
 */
const dir = mkdtempSync(join(tmpdir(), 'journey-'));
const entry = join(dir, 'entry.ts');
const out = join(dir, 'journey.mjs');

// The module imports the day list and D1 types; only the day list matters here.
const stub = join(dir, 'questionnaires.ts');
writeFileSync(
	stub,
	`export const TOTAL_DAYS = 14;
export const QUESTIONNAIRES = Array.from({ length: 14 }, (_, i) => ({ day: i + 1, title: 'Day ' + (i + 1) }));
export type Question = any;
`,
	'utf8'
);
writeFileSync(
	entry,
	read('src/lib/server/journey.ts')
		.replace("from '$lib/content/questionnaires'", "from './questionnaires'")
		.replace(/import type \{ D1Database \} from '@cloudflare\/workers-types';\n/, 'type D1Database = any;\n'),
	'utf8'
);

execFileSync(
	new URL('../node_modules/esbuild/bin/esbuild', import.meta.url).pathname,
	[entry, '--bundle', '--format=esm', '--platform=neutral', `--outfile=${out}`],
	{ stdio: 'pipe' }
);

const J = await import(`file://${out}`);

test('jakarta date rolls over at 17:00 UTC, not at midnight UTC', () => {
	// 23:30 WIB on 3 March is 16:30 UTC the same day.
	assert.equal(J.jakartaDate(new Date('2026-03-03T16:30:00Z')), '2026-03-03');
	// 00:30 WIB on 4 March is 17:30 UTC on 3 March — a new Jakarta day.
	assert.equal(J.jakartaDate(new Date('2026-03-03T17:30:00Z')), '2026-03-04');
});

test('a late-evening answer is dated to its own Jakarta day', () => {
	// Stored as UTC by SQLite; 16:30 UTC is 23:30 WIB, still the 3rd in Jakarta.
	assert.equal(J.jakartaDateOf('2026-03-03 16:30:00'), '2026-03-03');
	// 18:00 UTC is 01:00 WIB on the 4th.
	assert.equal(J.jakartaDateOf('2026-03-03 18:00:00'), '2026-03-04');
});

test('day 1 is open for a learner who has never answered', () => {
	const journey = J.buildJourney([], '2026-03-03');
	assert.equal(journey.currentDay, 1);
	assert.equal(journey.completedCount, 0);
	assert.equal(journey.days[0].status, 'available');
	assert.equal(journey.days[1].status, 'locked');
});

test('answering today locks the next day until tomorrow', () => {
	const rows = [{ day_number: 1, completed_at: '2026-03-03 02:00:00', self_rating: 4 }];
	const journey = J.buildJourney(rows, '2026-03-03');
	assert.equal(journey.currentDay, null, 'no day may be answered twice in one Jakarta day');
	assert.equal(journey.waitingForTomorrow, true);
	assert.equal(journey.days[1].status, 'locked');
});

test('the next day opens once the Jakarta date moves on', () => {
	const rows = [{ day_number: 1, completed_at: '2026-03-03 02:00:00', self_rating: 4 }];
	const journey = J.buildJourney(rows, '2026-03-04');
	assert.equal(journey.currentDay, 2);
	assert.equal(journey.days[1].status, 'available');
});

test('no skipping ahead: only the lowest unanswered day is ever available', () => {
	const rows = [
		{ day_number: 1, completed_at: '2026-03-01 02:00:00', self_rating: 3 },
		{ day_number: 2, completed_at: '2026-03-02 02:00:00', self_rating: 4 }
	];
	const journey = J.buildJourney(rows, '2026-03-05');
	assert.equal(journey.currentDay, 3);
	const available = journey.days.filter((d) => d.status === 'available');
	assert.equal(available.length, 1);
	assert.equal(available[0].day, 3);
});

test('a missed day can be filled the next day but the streak resets', () => {
	// Answered the 1st and 2nd, missed the 3rd, returns on the 4th.
	const rows = [
		{ day_number: 1, completed_at: '2026-03-01 02:00:00', self_rating: 3 },
		{ day_number: 2, completed_at: '2026-03-02 02:00:00', self_rating: 4 }
	];
	const journey = J.buildJourney(rows, '2026-03-04');
	assert.equal(journey.currentDay, 3, 'day 3 is still owed, not skipped');
	assert.equal(journey.streak, 0, 'the gap on 3 March broke the streak');
});

test('consecutive days build a streak; today still pending keeps yesterday alive', () => {
	const rows = [
		{ day_number: 1, completed_at: '2026-03-01 02:00:00', self_rating: 3 },
		{ day_number: 2, completed_at: '2026-03-02 02:00:00', self_rating: 4 },
		{ day_number: 3, completed_at: '2026-03-03 02:00:00', self_rating: 5 }
	];
	assert.equal(J.streakFrom(rows, '2026-03-03'), 3);
	assert.equal(J.streakFrom(rows, '2026-03-04'), 3, 'today not yet done is not a break');
	assert.equal(J.streakFrom(rows, '2026-03-05'), 0, 'a whole missed day resets it');
});

test('finishing all fourteen days ends the programme', () => {
	const rows = Array.from({ length: 14 }, (_, i) => ({
		day_number: i + 1,
		completed_at: `2026-03-${String(i + 1).padStart(2, '0')} 02:00:00`,
		self_rating: 4
	}));
	const journey = J.buildJourney(rows, '2026-03-15');
	assert.equal(journey.finished, true);
	assert.equal(journey.currentDay, null);
	assert.equal(journey.completedCount, 14);
	assert.ok(journey.days.every((d) => d.status === 'completed'));
});

test('answers are validated by type and free text has a word floor', () => {
	const questions = [
		{ id: 'r', type: 'rating', prompt: '', low: '', high: '' },
		{ id: 'c', type: 'choice', prompt: '', options: ['a', 'b'], answer: 0 },
		{ id: 't', type: 'text', prompt: '', hint: '', minWords: 5 }
	];

	const bad = J.validateAnswers(questions, new Map([['r', '9'], ['c', '7'], ['t', 'too short']]));
	assert.equal(Object.keys(bad.errors).length, 3);

	const good = J.validateAnswers(
		questions,
		new Map([['r', '4'], ['c', '0'], ['t', 'I woke up early and practised speaking']])
	);
	assert.deepEqual(good.errors, {});
	assert.equal(good.answers.r, 4);
	assert.equal(good.selfRating, 4);
	assert.equal(J.scoreChoices(questions, good.answers).correct, 1);
});

test('free text is bounded so one paste cannot fill the row', () => {
	const questions = [{ id: 't', type: 'text', prompt: '', hint: '', minWords: 1 }];
	const huge = 'word '.repeat(5000);
	const out = J.validateAnswers(questions, new Map([['t', huge]]));
	assert.ok(String(out.answers.t).length <= 2000);
});

test('a mercy unlock opens the next day on the same Jakarta date', () => {
	const rows = [{ day_number: 1, completed_at: '2026-03-03 02:00:00', self_rating: 4 }];
	const locked = J.buildJourney(rows, '2026-03-03');
	assert.equal(locked.currentDay, null);
	const opened = J.buildJourney(rows, '2026-03-03', 2);
	assert.equal(opened.currentDay, 2);
	assert.equal(opened.days[1].status, 'available');
});
