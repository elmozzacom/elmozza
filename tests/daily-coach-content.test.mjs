import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Daily Coach catalog provides the approved 14-day pilot', () => {
  const path = new URL('../src/lib/content/daily-coach.ts', import.meta.url);
  assert.equal(fs.existsSync(path), true, 'Daily Coach content catalog must exist');
  const source = fs.readFileSync(path, 'utf8');
  assert.match(source, /export const dailyCoachLessons/);
  assert.match(source, /makeLesson\(1,/);
  assert.match(source, /makeLesson\(14,/);
  assert.equal((source.match(/makeLesson\(\d+,/g) ?? []).length, 14);
});

test('Daily Coach preview route is available', () => {
  const path = new URL('../src/routes/daily-coach/+page.svelte', import.meta.url);
  assert.equal(fs.existsSync(path), true, 'Daily Coach preview page must exist');
  const source = fs.readFileSync(path, 'utf8');
  assert.match(source, /English Daily Coach/);
  assert.match(source, /14 Hari/);
});
