import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Daily Coach preview has an Elmozza brand header and navigation menu', () => {
  const path = new URL('../src/routes/daily-coach/+page.svelte', import.meta.url);
  const source = fs.readFileSync(path, 'utf8');

  assert.match(source, /class="site-header"/);
  assert.match(source, /class="brand-logo"/);
  assert.match(source, /El mozza/);
  assert.match(source, /Beranda/);
  assert.match(source, /Daily Coach/);
  assert.match(source, /Dashboard/);
  assert.match(source, /Tentang/);
});
