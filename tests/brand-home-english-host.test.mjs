import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('..', import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8');

test('brand host is separated from the English learning host', () => {
  const hosts = read('src/lib/hosts.ts');
  const hooks = read('src/hooks.server.ts');
  const home = read('src/routes/+page.server.ts');
  assert.match(hosts, /english\.elmozza\.com/);
  assert.match(hosts, /elmozza\.com/);
  assert.match(home, /isBrandHost/);
  assert.match(hooks, /isBrandHost|english\.elmozza\.com/);
});

test('main Elmozza home has a limited chat quiz that points to English Daily Coach', () => {
  const source = read('src/lib/components/BrandHome.svelte');
  assert.match(source, /Kuis ini hanya contoh/);
  assert.match(source, /englishUrl\('\/daily-coach'\)|english\.elmozza\.com/);
  assert.match(source, /prefers-reduced-motion/);
  assert.match(source, /demo\.length/);
  assert.doesNotMatch(source, /Cloudflare|Workers|D1/i);
});
