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

// The dashboard was rebuilt as a bright editorial spread. The dark floating dock
// it used to carry is gone on purpose: the design language now forbids dark
// surfaces, so these tests assert the replacement rather than the old shell.
test('dashboard is a bright editorial spread built on real member stats', () => {
  const source = read('src/routes/dashboard/+page.svelte');
  assert.match(source, /SiteShell/);
  assert.match(source, /running-head/);
  assert.match(source, /total_xp/i);
  assert.match(source, /current_streak/i);
  assert.match(source, /data\.upcoming/);
  assert.match(source, /data\.skills/);
  assert.match(source, /prefers-reduced-motion/);
  // No dark section anywhere in the new language.
  assert.doesNotMatch(source, /fly-dock|#11150f|rgba\(14, 18, 13/i);
  assert.doesNotMatch(source, /Cloudflare|Workers|D1|SvelteKit|wrangler/i);
});

test('dashboard carries one dominant resume card and four skill rings', () => {
  const source = read('src/routes/dashboard/+page.svelte');
  assert.match(source, /class="resume"/);
  assert.match(source, /grid-template-columns:\s*2fr 1fr/);
  assert.match(source, /stroke-dasharray=\{RING\}/);
  assert.match(source, /stroke-dashoffset=/);
  assert.match(source, /Continue|Begin/);
});

test('site shell provides header navigation, a mobile sheet, and a skip link', () => {
  const shell = read('src/lib/components/SiteShell.svelte');
  assert.match(shell, /class="skip"/);
  assert.match(shell, /class="masthead"/);
  assert.match(shell, /class="sheet"/);
  assert.match(shell, /aria-expanded=\{open\}/);
  assert.match(shell, /aria-label="Primary"/);
});

test('dashboard load reports whether a lesson was completed today', () => {
  const source = read('src/routes/dashboard/+page.server.ts');
  assert.match(source, /doneToday/);
  assert.match(source, /date\(completed_at\) = date\('now'\)/);
});

test('grammar labels ship in the server HTML, not only after measurement', () => {
  const source = read('src/lib/components/ExplodedSentence.svelte');
  // Labels must never be gated behind a measured position: a screen reader and
  // a crawler have to receive the teaching without running any script.
  assert.match(source, /sr-breakdown/);
  assert.match(source, /clip-path: inset\(50%\)/);
  assert.doesNotMatch(source, /\{#if places\[index\]\}/);
  assert.match(source, /class:unplaced=\{!places\[index\]\}/);
});

test('the signature sentence is the landing page h1', () => {
  const component = read('src/lib/components/ExplodedSentence.svelte');
  const landing = read('src/lib/components/EnglishLanding.svelte');
  // The hero sentence is the page's real heading; shipping the landing page
  // with no h1 at all is an accessibility and SEO defect.
  assert.match(component, /svelte:element this=\{heading \? 'h1' : 'p'\}/);
  assert.match(landing, /mode="scroll"[^>]*heading/);
});
