/**
 * Compiles the TypeScript questionnaire content with the project's own esbuild
 * so tests assert against the real data rather than a copy that can drift.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));
const out = join(mkdtempSync(join(tmpdir(), 'elmozza-q-')), 'questionnaires.mjs');

execFileSync(
	join(root, 'node_modules/esbuild/bin/esbuild'),
	[
		join(root, 'src/lib/content/questionnaires.ts'),
		'--bundle',
		'--format=esm',
		'--platform=neutral',
		`--outfile=${out}`
	],
	{ stdio: 'pipe' }
);

export const { QUESTIONNAIRES, TOTAL_DAYS, getQuestionnaire } = await import(`file://${out}`);
