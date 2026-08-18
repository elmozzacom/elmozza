/**
 * Seed the learning ladder, badges, and SRS items.
 * Idempotent. Local by default; --remote for production.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const remote = process.argv.includes('--remote');
const tmp = mkdtempSync(join(tmpdir(), 'elmozza-ladder-'));
const out = join(tmp, 'ladder.mjs');

execFileSync(
	'node_modules/esbuild/bin/esbuild',
	['src/lib/content/ladder.ts', '--bundle', '--format=esm', '--platform=neutral', `--outfile=${out}`],
	{ stdio: 'pipe' }
);

const { LADDER_UNITS, SECTIONS, BADGE_SEED } = await import(`file://${out}`);
const quote = (value) => `'${String(value).replace(/'/g, "''")}'`;
const lines = ['PRAGMA foreign_keys = ON;'];

for (const section of SECTIONS) {
	lines.push(
		`INSERT INTO path_sections (code, title, sort)
		 SELECT ${quote(section.code)}, ${quote(section.title)}, ${section.sort}
		 WHERE NOT EXISTS (SELECT 1 FROM path_sections WHERE code = ${quote(section.code)});`
	);
}

let unitSort = 0;
for (const unit of LADDER_UNITS) {
	unitSort += 1;
	lines.push(
		`INSERT INTO path_units (section_id, slug, title, theme, intro_sentence, sort)
		 SELECT s.id, ${quote(unit.slug)}, ${quote(unit.title)}, ${quote(unit.theme)}, ${quote(unit.intro)}, ${unitSort}
		 FROM path_sections s WHERE s.code = ${quote(unit.section)}
		 AND NOT EXISTS (SELECT 1 FROM path_units WHERE slug = ${quote(unit.slug)});`
	);
	for (const step of unit.steps) {
		const payload = JSON.stringify(step.payload);
		const srsKey = step.srs ? quote(step.srs.key) : 'NULL';
		lines.push(
			`INSERT INTO path_steps (unit_id, sort, type, title, xp, payload, srs_item_key)
			 SELECT u.id, ${step.sort}, ${quote(step.type)}, ${quote(step.title)}, ${step.xp}, ${quote(payload)}, ${step.srs ? srsKey : 'NULL'}
			 FROM path_units u WHERE u.slug = ${quote(unit.slug)}
			 AND NOT EXISTS (SELECT 1 FROM path_steps s JOIN path_units x ON x.id = s.unit_id WHERE x.slug = ${quote(unit.slug)} AND s.sort = ${step.sort});`
		);
		if (step.srs) {
			lines.push(
				`INSERT OR IGNORE INTO srs_items (item_key, kind, prompt, answer)
				 VALUES (${quote(step.srs.key)}, ${quote(step.srs.kind)}, ${quote(step.srs.prompt)}, ${quote(step.srs.answer)});`
			);
		}
	}
}

for (const [id, title, description] of BADGE_SEED) {
	lines.push(
		`INSERT OR IGNORE INTO badges (id, title, description) VALUES (${quote(id)}, ${quote(title)}, ${quote(description)});`
	);
}

const file = join(tmp, 'seed.sql');
writeFileSync(file, lines.join('\n\n'), 'utf8');
const flag = remote ? '--remote' : '--local';
console.log(`Seeding ladder ${remote ? 'REMOTE' : 'local'} …`);
execFileSync(
	process.execPath,
	['node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'elmozza-db', flag, `--file=${file}`, '-y'],
	{ stdio: 'inherit' }
);
const steps = LADDER_UNITS.reduce((n, u) => n + u.steps.length, 0);
console.log(`Seeded ${SECTIONS.length} sections, ${LADDER_UNITS.length} units, ${steps} steps, ${BADGE_SEED.length} badges.`);
