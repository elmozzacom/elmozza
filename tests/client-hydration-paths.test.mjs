import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('..', import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8');

test('SvelteKit uses root-relative asset paths so interactive routes hydrate on nested URLs', () => {
  const path = new URL('../svelte.config.js', import.meta.url);
  const source = fs.readFileSync(path, 'utf8');
  assert.match(source, /paths:\s*\{\s*relative:\s*false\s*\}/);
});

test('public learning pages prevent horizontal overflow on mobile', () => {
  for (const path of ['src/routes/+page.svelte', 'src/routes/daily-coach/+page.svelte']) {
    const source = read(path);
    assert.match(source, /overflow-x:\s*hidden/i, `${path} must contain horizontal overflow`);
    assert.match(source, /min-width:\s*0/i, `${path} grid and flex children must be shrinkable`);
  }
});

// Regression context: when assets are emitted as ./_app on /daily-coach,
// browsers request /daily-coach/_app/... and Svelte never hydrates button handlers.
