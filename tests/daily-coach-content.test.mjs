import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { dailyCoachLessons, verifyDailyCoachAnswer } from '../src/lib/content/daily-coach.ts';

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

test('Daily Coach verifier rejects no answer, wrong answer, and invalid day', () => {
  assert.deepEqual(verifyDailyCoachAnswer('1', null), { error: 'Jawaban wajib dipilih.' });
  assert.deepEqual(verifyDailyCoachAnswer('1', '1'), { error: 'Jawaban belum tepat.' });
  assert.deepEqual(verifyDailyCoachAnswer('999', '0'), { error: 'Lesson tidak valid.' });
});

test('Daily Coach verifier accepts the official catalog answer', () => {
  const lesson = dailyCoachLessons[0];
  assert.deepEqual(verifyDailyCoachAnswer(String(lesson.day), String(lesson.question.answer)), {
    day: lesson.day,
    lesson
  });
});
