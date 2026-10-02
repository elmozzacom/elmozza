import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Bundle a src/lib/server/rlec module to ESM; @sveltejs/kit is replaced by a tiny shim. */
export async function loadRlec(name) {
	const dir = mkdtempSync(join(tmpdir(), 'rlec-'));
	const out = join(dir, `${name}.mjs`);
	execFileSync(
		new URL('../../node_modules/esbuild/bin/esbuild', import.meta.url).pathname,
		[
			new URL(`../../src/lib/server/rlec/${name}.ts`, import.meta.url).pathname,
			'--bundle',
			'--format=esm',
			'--platform=node',
			`--alias:@sveltejs/kit=${new URL('./rlec-kit-shim.mjs', import.meta.url).pathname}`,
			`--outfile=${out}`
		],
		{ stdio: 'pipe' }
	);
	return import(`file://${out}`);
}
