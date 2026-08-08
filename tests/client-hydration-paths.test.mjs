import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('SvelteKit uses root-relative asset paths so interactive routes hydrate on nested URLs', () => {
  const path = new URL('../svelte.config.js', import.meta.url);
  const source = fs.readFileSync(path, 'utf8');
  assert.match(source, /paths:\s*\{\s*relative:\s*false\s*\}/);
});

// Regression context: when assets are emitted as ./_app on /daily-coach,
// browsers request /daily-coach/_app/... and Svelte never hydrates button handlers.
