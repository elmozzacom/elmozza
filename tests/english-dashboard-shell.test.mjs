import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('..', import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8');

test('dashboard load builds a 14-day English Daily Coach track from server progress', () => {
  const source = read('src/routes/dashboard/+page.server.ts');
  assert.match(source, /requireUser\(locals\.user\)/);
  assert.match(source, /dailyCoachLessons/);
  assert.match(source, /lesson_progress/);
  assert.match(source, /ENG-A1-D%/);
  assert.match(source, /nextTitle/);
  assert.doesNotMatch(source, /question\.answer|correct_answer/);
});

test('dashboard shell is a professional English command center with real member stats', () => {
  const source = read('src/routes/dashboard/+page.svelte');
  assert.match(source, /English Daily Coach/);
  assert.match(source, /command-center|dashboard-shell/);
  assert.match(source, /total_xp/i);
  assert.match(source, /current_streak/i);
  assert.match(source, /data\.lessons/);
  assert.match(source, /Day \{lesson\.day\}/);
  assert.match(source, /progress-ring/);
  assert.match(source, /journey-strip/);
  assert.match(source, /prefers-reduced-motion/);
  assert.match(source, /overflow-x:\s*hidden/i);
  assert.match(source, /min-width:\s*0/i);
  assert.doesNotMatch(source, /Cloudflare|Workers|D1|SvelteKit|wrangler/i);
});

test('dashboard has header menu, mobile sidebar, and floating dock', () => {
  const page = read('src/routes/dashboard/+page.svelte');
  const shell = read('src/lib/components/EnglishAppShell.svelte');
  assert.match(page, /EnglishAppShell/);
  assert.match(page, /alertStreak/);
  assert.match(shell, /topbar/);
  assert.match(shell, /sidebar/);
  assert.match(shell, /fly-dock/);
  assert.match(shell, /prefers-reduced-motion/);
});

test('floating dock auto-hides, respects safe area, and shows a streak badge', () => {
  const shell = read('src/lib/components/EnglishAppShell.svelte');
  assert.match(shell, /tucked/);
  assert.match(shell, /env\(safe-area-inset-bottom/);
  assert.match(shell, /\.dot::after/);
  assert.match(shell, /scale\(0\.94\)/);
  assert.match(shell, /<svg viewBox="0 0 24 24">/);
  assert.match(shell, /requestAnimationFrame/);
  assert.match(shell, /removeEventListener\('scroll'/);
});

test('dashboard load reports whether a lesson was completed today', () => {
  const source = read('src/routes/dashboard/+page.server.ts');
  assert.match(source, /doneToday/);
  assert.match(source, /date\(completed_at\) = date\('now'\)/);
});
