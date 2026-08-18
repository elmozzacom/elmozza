import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('..', import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8');

test('design tokens commit to one accent on warm paper with no dark surface', () => {
  const css = read('src/app.css');
  assert.match(css, /--color-paper:\s*#fbfaf7/i);
  assert.match(css, /--color-ink:\s*#1c1b18/i);
  assert.match(css, /--color-accent:\s*#1b36c4/i);
  // Typography does the heavy lifting: three real stacks, a real scale.
  assert.match(css, /--font-display:/);
  assert.match(css, /--font-body:/);
  assert.match(css, /--font-mono:/);
  assert.match(css, /--text-step-5:/);
  // Zero web fonts protects the performance budget.
  assert.doesNotMatch(css, /@import url\(|fonts\.googleapis|fonts\.gstatic/i);
  // No decorative gradients, no glassmorphism on surfaces.
  assert.doesNotMatch(css, /linear-gradient|radial-gradient/i);
});

test('keyboard focus is visible everywhere and never removed', () => {
  const css = read('src/app.css');
  assert.match(css, /:focus-visible\s*\{[^}]*outline:\s*2px solid/i);
  for (const file of [
    'src/app.css',
    'src/lib/components/SiteShell.svelte',
    'src/lib/components/ExplodedSentence.svelte',
    'src/routes/admin/+page.svelte',
    'src/routes/dashboard/+page.svelte'
  ]) {
    assert.doesNotMatch(read(file), /outline:\s*(none|0)\s*;/i, `${file} must not remove focus outline`);
  }
});

test('the exploded sentence is real selectable text driven by one scroll variable', () => {
  const source = read('src/lib/components/ExplodedSentence.svelte');
  // Pure SVG/CSS transforms — no canvas, no WebGL, no video.
  assert.doesNotMatch(source, /canvas|WebGL|<video/i);
  assert.match(source, /<svg class="leaders"/);
  // One rAF-throttled listener writing a single custom property.
  assert.match(source, /requestAnimationFrame/);
  assert.match(source, /--p:\s*\{p\}/);
  assert.match(source, /translate3d/);
  // Damped, no overshoot.
  assert.match(source, /t \* t \* \(3 - 2 \* t\)/);
  assert.doesNotMatch(source, /cubic-bezier\([^)]*,\s*-\d/, 'no overshoot easing');
  // Leader-line endpoints measured on resize, never per frame.
  assert.match(source, /ResizeObserver/);
  // Listeners are cleaned up.
  assert.match(source, /removeEventListener\('scroll'/);
});

test('reduced motion receives a static labeled diagram, not a frozen blank', () => {
  const source = read('src/lib/components/ExplodedSentence.svelte');
  assert.match(source, /prefers-reduced-motion: reduce/);
  assert.match(source, /if \(reduced\) p = 1/);
  assert.match(source, /if \(mode !== 'scroll' \|\| reduced/);
  assert.match(source, /class:static=\{reduced\}/);
});

test('the exploded pattern is reused as an in-lesson micro-interaction', () => {
  const component = read('src/lib/components/ExplodedSentence.svelte');
  const demo = read('src/routes/demo/+page.svelte');
  assert.match(component, /mode\?:\s*'scroll'\s*\|\s*'hover'/);
  // Hover mode must also open on tap and on keyboard focus.
  assert.match(component, /onclick=/);
  assert.match(component, /onfocus=/);
  assert.match(component, /aria-expanded=/);
  assert.match(demo, /mode="hover"/);
});

// Regression: these three ways in were once a single flag, and they cancelled
// each other. focus fires before click, so a mouse click opened on focus and the
// click toggled it shut — clicking did nothing. On touch, pointerenter fired
// before click and produced the same dead tap.
test('hover, keyboard focus, and click are independent so none cancels another', () => {
  const source = read('src/lib/components/ExplodedSentence.svelte');
  assert.match(source, /let hovering = \$state\(false\)/);
  assert.match(source, /let focused = \$state\(false\)/);
  assert.match(source, /let pinned = \$state\(false\)/);
  assert.match(source, /\$derived\(hovering \|\| focused \|\| pinned\)/);
  // Hover is mouse-only; touch must not be treated as hover.
  assert.match(source, /pointerType === 'mouse'/);
  // Only keyboard focus opens, so a mouse click cannot cancel itself.
  assert.match(source, /matches\(':focus-visible'\)/);
});

// Regression: fragment targets were read from offsetLeft/offsetTop, which are
// relative to the sentence paragraph rather than the stage. Every fragment
// landed in the wrong row, away from its own label.
test('fragment targets are measured in the stage coordinate space', () => {
  const source = read('src/lib/components/ExplodedSentence.svelte');
  assert.match(source, /function offsetWithinStage/);
  assert.match(source, /while \(node && node !== host\)/);
  assert.match(source, /node\.offsetParent/);
  assert.match(source, /offsetWithinStage\(el, host\)/);
});

// Regression: fixed rem offsets pushed fragments off a 390px screen —
// 135px of horizontal overflow, measured in a real browser.
test('the diagram cannot overflow horizontally on a phone', () => {
  const source = read('src/lib/components/ExplodedSentence.svelte');
  assert.match(source, /overflow-x: clip/);
  // Rows are exclusive and derived from the stage height, so fragments
  // cannot collide at any width.
  assert.match(source, /const rowGap = height \/ \(n \+ 0\.6\)/);
  assert.match(source, /const narrow = width < 620/);
});

test('grammar labels teach the tense rather than decorate it', () => {
  const grammar = read('src/lib/content/grammar.ts');
  assert.match(grammar, /She has been learning quietly, and now she speaks\./);
  assert.match(grammar, /Aux 2 · perfect aspect/);
  assert.match(grammar, /Main verb · ‑ing, continuous/);
  assert.match(grammar, /present perfect continuous/i);
});

test('landing page carries every required section', () => {
  const landing = read('src/lib/components/EnglishLanding.svelte');
  assert.match(landing, /ExplodedSentence/);
  assert.match(landing, /id="curriculum"/);
  assert.match(landing, /id="placement"/);
  assert.match(landing, /id="pricing"/);
  assert.match(landing, /Start free/);
  // Curriculum bands stay informative without their colour.
  const marketing = read('src/lib/content/marketing.ts');
  assert.match(marketing, /canDo/);
  assert.match(marketing, /A1/);
  assert.match(marketing, /C1/);
  // Testimonials are pull quotes: no avatars, no star ratings.
  const markup = landing.split('<style>')[0].replace(/<!--[\s\S]*?-->/g, '');
  assert.doesNotMatch(markup, /avatar|<img|★|rating/i);
  assert.match(markup, /<blockquote>/);
});

test('the demo lesson is public and complete', () => {
  const page = read('src/routes/demo/+page.svelte');
  const server = read('src/routes/demo/+page.server.ts');
  assert.doesNotMatch(server, /requireUser|requireAdmin/, 'demo must not require an account');
  assert.match(page, /01 — Listening/);
  assert.match(page, /02 — Vocabulary/);
  assert.match(page, /03 — Grammar/);
  assert.match(page, /04 — Five questions/);
  const quiz = read('src/lib/content/demo-lesson.ts');
  assert.equal((quiz.match(/\tid: 'q\d'/g) ?? []).length, 5, 'quiz must have five questions');
});

test('brand wordmark and domain appear in the interface', () => {
  const shell = read('src/lib/components/SiteShell.svelte');
  assert.match(shell, /Elmozza <em>English<\/em>/);
  assert.match(shell, /english\.elmozza\.com/);
});
