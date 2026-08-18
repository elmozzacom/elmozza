import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = new URL('..', import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8');

const dir = mkdtempSync(join(tmpdir(), 'voice-'));
const entry = join(dir, 'audio.ts');
const out = join(dir, 'audio.mjs');
writeFileSync(
	entry,
	read('src/lib/utils/audio.ts').replace("import { browser } from '$app/environment';", 'const browser = false;'),
	'utf8'
);
execFileSync(
	new URL('../node_modules/esbuild/bin/esbuild', import.meta.url).pathname,
	[entry, '--bundle', '--format=esm', '--platform=neutral', `--outfile=${out}`],
	{ stdio: 'pipe' }
);
const audio = await import(`file://${out}`);

test('voice picker prefers an English female name over a male one', () => {
	const voices = [
		{ name: 'Microsoft David', lang: 'en-US' },
		{ name: 'Microsoft Zira', lang: 'en-US' },
		{ name: 'Google Deutsch', lang: 'de-DE' }
	];
	const female = audio.pickVoice(voices, { kind: 'female' });
	const male = audio.pickVoice(voices, { kind: 'male' });
	assert.equal(female.name, 'Microsoft Zira');
	assert.equal(male.name, 'Microsoft David');
});

test('recordings stay on the device: no upload path exists', () => {
	const shadow = read('src/lib/components/ShadowPractice.svelte');
	assert.match(shadow, /createObjectURL/);
	assert.match(shadow, /revokeObjectURL/);
	assert.match(shadow, /getUserMedia/);
	assert.doesNotMatch(shadow, /fetch\(|FormData|XMLHttpRequest/);
	assert.match(shadow, /never uploaded|Nothing leaves this phone|stays on this device/i);
});

test('demo lesson speaks the dialogue, the words, and a shadow line', () => {
	const demo = read('src/routes/demo/+page.svelte');
	assert.match(demo, /DialoguePlayer/);
	assert.match(demo, /SpeakButton/);
	assert.match(demo, /ShadowPractice/);
	assert.match(demo, /Hear the sentence/);
	const player = read('src/lib/components/DialoguePlayer.svelte');
	assert.match(player, /Play dialogue/);
});

test('daily coach reuses the same voice components', () => {
	const page = read('src/routes/daily-coach/+page.svelte');
	assert.match(page, /DialoguePlayer/);
	assert.match(page, /SpeakButton/);
	assert.match(page, /ShadowPractice/);
});

test('the signature diagram is still not an AOS animation', () => {
	const exploded = read('src/lib/components/ExplodedSentence.svelte');
	assert.doesNotMatch(exploded, /data-aos/);
});

test('microphone is allowed on this origin only, and blob audio is allowed', () => {
	const hooks = read('src/hooks.server.ts');
	assert.match(hooks, /microphone=\(self\)/);
	assert.match(hooks, /media-src 'self' blob:/);
	assert.match(hooks, /camera=\(\)/);
});
