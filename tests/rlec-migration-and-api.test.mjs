// RLEC Phase 1: migration 0009 (additive, idempotent, after 0001..0008) and
// the DB layer behind /api/rlec/* run against in-memory SQLite.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { migratedDb, d1 } from './helpers/rlec-d1-shim.mjs';
import { loadRlec } from './helpers/rlec-load.mjs';

const root = new URL('..', import.meta.url);
const read = (p) => fs.readFileSync(new URL(p, root), 'utf8');
const MIGRATION = 'migrations/0009_rlec_core.sql';
const TABLES = [
	'rlec_ai_usage',
	'rlec_error_events',
	'rlec_error_patterns',
	'rlec_identity_links',
	'rlec_learner_errors',
	'rlec_learner_profiles',
	'rlec_scenarios',
	'rlec_session_turns',
	'rlec_sessions'
];
const PATTERNS = [
	'PAST_TENSE_OMISSION', 'ARTICLE_OMISSION', 'SV_AGREEMENT', 'PREPOSITION_CONFUSION', 'PLURAL_S_OMISSION',
	'WORD_ORDER_QUESTION', 'TRANSLATION_STYLE', 'LIMITED_VOCAB', 'OVERUSE_VERY', 'HESITATION_LONG_PAUSE',
	'PRON_TH', 'PRON_FINAL_CONSONANT', 'WORD_STRESS', 'REGISTER_TOO_CASUAL'
];

test('rlec migration is additive only: no ALTER/DROP, only rlec_* objects', () => {
	const sql = read(MIGRATION).replace(/--.*$/gm, '');
	assert.doesNotMatch(sql, /\bALTER\s+TABLE\b/i);
	assert.doesNotMatch(sql, /\bDROP\b/i);
	assert.doesNotMatch(sql, /\b(UPDATE|DELETE\s+FROM)\b/i);
	for (const m of sql.matchAll(/CREATE\s+(?:UNIQUE\s+)?(?:TABLE|INDEX)\s+IF NOT EXISTS\s+(\w+)/gi)) {
		assert.match(m[1], /^(rlec_|idx_rlec_)/, m[1]);
	}
	const creates = sql.match(/CREATE\s+(?:UNIQUE\s+)?(?:TABLE|INDEX)\s+/gi) ?? [];
	const guarded = sql.match(/CREATE\s+(?:UNIQUE\s+)?(?:TABLE|INDEX)\s+IF NOT EXISTS/gi) ?? [];
	assert.equal(creates.length, guarded.length, 'every CREATE uses IF NOT EXISTS');
	const numbers = fs.readdirSync(new URL('migrations/', root)).filter((n) => /^\d{4}_/.test(n)).map((n) => n.slice(0, 4));
	assert.equal(new Set(numbers).size, numbers.length, 'migration numbers unique');
});

test('rlec migration applies after 0001..0008 and re-applies cleanly (twice)', () => {
	const db = migratedDb(root);
	const before = db.prepare("SELECT name, sql FROM sqlite_master WHERE name NOT LIKE 'rlec_%' AND name NOT LIKE 'idx_rlec_%' ORDER BY name").all();
	db.exec(read(MIGRATION));
	db.exec(read(MIGRATION));
	const after = db.prepare("SELECT name, sql FROM sqlite_master WHERE name NOT LIKE 'rlec_%' AND name NOT LIKE 'idx_rlec_%' ORDER BY name").all();
	assert.deepEqual(after, before, 'existing schema untouched');
	const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'rlec_%' ORDER BY name").all().map((r) => r.name);
	assert.deepEqual(tables, TABLES);
	const codes = db.prepare('SELECT code FROM rlec_error_patterns').all().map((r) => r.code);
	assert.deepEqual(codes.sort(), [...PATTERNS].sort());
	assert.equal(db.prepare('PRAGMA foreign_key_check').all().length, 0);
	const cols = (t) => db.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name);
	for (const c of ['model_route', 'cost_estimate_usd']) assert.ok(cols('rlec_sessions').includes(c), c);
	assert.deepEqual(cols('rlec_ai_usage'), ['id', 'user_id', 'session_id', 'provider', 'model', 'input_tokens', 'output_tokens', 'cost_idr', 'created_at']);
});

test('rlec schema enforces constraints (FK, CHECK, UNIQUE)', () => {
	const db = migratedDb(root);
	db.exec("INSERT INTO users(id, username, email) VALUES (1, 'a', 'a@contoh.test')");
	const rejects = (sql) => assert.throws(() => db.exec(sql), /constraint|FOREIGN KEY/i, sql);
	rejects("INSERT INTO rlec_learner_profiles(user_id) VALUES (999)");
	rejects("INSERT INTO rlec_learner_profiles(user_id, tier) VALUES (1, 'gold')");
	rejects("INSERT INTO rlec_sessions(user_id, mode) VALUES (1, 'chat')");
	rejects("INSERT INTO rlec_learner_errors(user_id, pattern_code) VALUES (1, 'NOT_A_PATTERN')");
	rejects("INSERT INTO rlec_learner_errors(user_id, pattern_code, mastery_score) VALUES (1, 'PRON_TH', 1.5)");
	db.exec("INSERT INTO rlec_identity_links(user_id, channel, external_id) VALUES (1, 'telegram', '555')");
	rejects("INSERT INTO rlec_identity_links(user_id, channel, external_id) VALUES (1, 'telegram', '555')");
	db.exec("INSERT INTO rlec_scenarios(source_kind, source_ref, title, domain) VALUES ('ecw', 'S1', 't', 'healthcare')");
	rejects("INSERT INTO rlec_scenarios(source_kind, source_ref, title, domain) VALUES ('ecw', 'S1', 't2', 'healthcare')");
	rejects("INSERT INTO rlec_ai_usage(provider, model, cost_idr) VALUES ('x', 'y', -1)");
});

// ---------------------------------------------------------------- DB layer behind the routes

const rlec = await loadRlec('db');

function seeded() {
	const raw = migratedDb(root);
	raw.exec(`
		INSERT INTO users(id, username, email) VALUES (1, 'ani', 'ani@contoh.test'), (2, 'budi', 'budi@contoh.test');
		INSERT INTO rlec_scenarios(id, source_kind, source_ref, title, domain, cefr, difficulty, situation, status, owner_user_id) VALUES
		 (1, 'ecw', 'E1', 'Check in at the clinic', 'healthcare', 'A2', 1, 'front desk', 'active', NULL),
		 (2, 'ecw', 'E2', 'Explain 100% refund', 'travel', 'B1', 2, 'airport', 'qc_passed', NULL),
		 (3, 'ecw', 'E3', 'Draft scenario', 'healthcare', 'A2', 1, NULL, 'draft', NULL),
		 (4, 'tomorrow', 'T1', 'Ani tomorrow: pharmacy', 'healthcare', 'A2', 1, NULL, 'draft', 1),
		 (5, 'tomorrow', 'T2', 'Budi tomorrow: bank', 'finance', 'A2', 1, NULL, 'draft', 2),
		 (6, 'ecw', 'E6', 'Archived', 'healthcare', 'A2', 1, NULL, 'archived', NULL);
	`);
	return { raw, db: d1(raw) };
}
const filters = (o = {}) => ({ domain: null, cefr: null, q: null, limit: 20, offset: 0, ...o });
const status = async (p) => {
	try {
		await p;
		return 'ok';
	} catch (e) {
		return e.status;
	}
};

test('rlec api: requireApiUser rejects anonymous with 401 (not a login redirect)', async () => {
	assert.equal(await status(Promise.resolve().then(() => rlec.requireApiUser({ user: null, db: {} }))), 401);
	const req = (type, body) => new Request('http://x/', { method: 'POST', headers: { 'content-type': type }, body });
	assert.equal(await status(rlec.readJson(req('text/plain', '{}'))), 415);
	assert.equal(await status(rlec.readJson(req('application/json', '{bad'))), 400);
});

test('rlec api: GET/PATCH me creates default profile once and updates only own row', async () => {
	const { raw, db } = seeded();
	const p = await rlec.getOrCreateProfile(db, 1);
	assert.equal(p.tier, 'free');
	await rlec.getOrCreateProfile(db, 1);
	assert.equal(raw.prepare('SELECT COUNT(*) n FROM rlec_learner_profiles').get().n, 1);
	const updated = await rlec.updateProfile(db, 1, { cefr_self: 'B1', domains: ['healthcare'], goals: ['ngobrol dengan pasien'] });
	assert.equal(updated.cefr_self, 'B1');
	assert.deepEqual(updated.domains, ['healthcare']);
	assert.equal((await rlec.getOrCreateProfile(db, 2)).cefr_self, null);
	assert.deepEqual(await rlec.topErrors(db, 1), []);
});

test('rlec api: scenarios list only servable + own personal, with filters', async () => {
	const { db } = seeded();
	const ids = async (uid, f) => (await rlec.listScenarios(db, uid, filters(f))).items.map((s) => s.id);
	assert.deepEqual(await ids(1), [1, 4, 2]);
	assert.deepEqual(await ids(2), [1, 5, 2]);
	assert.deepEqual(await ids(1, { domain: 'healthcare' }), [1, 4]);
	assert.deepEqual(await ids(1, { cefr: 'B1' }), [2]);
	assert.deepEqual(await ids(1, { q: '100%' }), [2]);
	assert.deepEqual(await ids(1, { q: '%' }), [2], 'wildcard escaped');
	const page = await rlec.listScenarios(db, 1, filters({ limit: 2 }));
	assert.equal(page.items.length, 2);
	assert.equal(page.has_more, true);
});

test('rlec api: session start → error events → complete summary; ownership enforced', async () => {
	const { raw, db } = seeded();
	await rlec.updateProfile(db, 1, { session_minutes_default: 15 });
	assert.equal(await status(rlec.startSession(db, 1, { mode: 'guided', scenario_id: 5, level: null, planned_minutes: null, confidence_before: null })), 404, "other user's personal scenario");
	assert.equal(await status(rlec.startSession(db, 1, { mode: 'guided', scenario_id: 3, level: null, planned_minutes: null, confidence_before: null })), 404, 'draft scenario');
	const s = await rlec.startSession(db, 1, { mode: 'guided', scenario_id: 1, level: null, planned_minutes: null, confidence_before: 2 });
	assert.equal(s.level, 'A2');
	assert.equal(s.planned_minutes, 15);

	const now = new Date();
	const ev = (o) => ({ pattern_code: 'SV_AGREEMENT', wrong_text: 'She have', fixed_text: 'She has', retry_success: true, session_id: s.id, turn_id: null, severity: null, ...o });
	const e1 = await rlec.recordErrorEvent(db, 1, ev(), now);
	assert.equal(e1.frequency, 1);
	assert.equal(e1.severity, 2, 'pattern default severity');
	const e2 = await rlec.recordErrorEvent(db, 1, ev({ retry_success: false, wrong_text: null }), now);
	assert.equal(e2.frequency, 2);
	assert.equal(e2.mastery_score, 0);
	await rlec.recordErrorEvent(db, 1, ev({ pattern_code: 'TRANSLATION_STYLE' }), now);
	const row = raw.prepare("SELECT * FROM rlec_learner_errors WHERE user_id = 1 AND pattern_code = 'SV_AGREEMENT'").get();
	assert.equal(row.example_wrong, 'She have', 'null wrong_text keeps previous example');
	assert.equal(row.repetitions, 0);
	assert.equal(raw.prepare('SELECT COUNT(*) n FROM rlec_error_events WHERE user_id = 1').get().n, 3);

	assert.equal(await status(rlec.recordErrorEvent(db, 2, ev(), now)), 404, "cannot log into another user's session");
	assert.equal(await status(rlec.recordErrorEvent(db, 1, ev({ pattern_code: 'NOT_A_PATTERN' }), now)), 400);
	assert.equal(await status(rlec.recordErrorEvent(db, 1, ev({ turn_id: 999 }), now)), 404);

	assert.equal(await status(rlec.completeSession(db, 2, s.id, { confidence_after: 4, want_continue: true, notes: null }, now)), 404);
	const summary = await rlec.completeSession(db, 1, s.id, { confidence_after: 4, want_continue: true, notes: 'ok' }, new Date(now.getTime() + 60_000));
	assert.equal(summary.errors_logged, 3);
	assert.equal(summary.confidence_delta, 2);
	assert.deepEqual(summary.patterns[0], { code: 'SV_AGREEMENT', count: 2 });
	assert.equal(raw.prepare('SELECT completed, want_continue, notes FROM rlec_sessions WHERE id = ?').get(s.id).want_continue, 1);
	assert.equal(await status(rlec.completeSession(db, 1, s.id, { confidence_after: null, want_continue: null, notes: null }, now)), 409);
});

test('rlec api: review/due returns only own due errors ordered by severity×frequency', async () => {
	const { raw, db } = seeded();
	raw.exec(`
		INSERT INTO rlec_learner_errors(user_id, pattern_code, frequency, severity, next_review_at) VALUES
		 (1, 'ARTICLE_OMISSION', 5, 1, '2026-01-01 00:00:00'),
		 (1, 'TRANSLATION_STYLE', 3, 3, '2026-01-02 00:00:00'),
		 (1, 'PRON_TH', 50, 1, '2999-01-01 00:00:00'),
		 (2, 'LIMITED_VOCAB', 99, 3, '2026-01-01 00:00:00');
	`);
	const due = await rlec.reviewDue(db, 1, new Date('2026-10-03T00:00:00Z'));
	assert.equal(due.total, 2);
	assert.deepEqual(due.items.map((r) => [r.pattern_code, r.priority]), [['TRANSLATION_STYLE', 9], ['ARTICLE_OMISSION', 5]]);
	assert.ok(due.items[0].label);
	assert.deepEqual((await rlec.topErrors(db, 1)).map((r) => r.pattern_code), ['PRON_TH', 'TRANSLATION_STYLE', 'ARTICLE_OMISSION']);
});

test('rlec api: route files exist, require auth, and scope by user', () => {
	const routes = {
		'src/routes/api/rlec/me/+server.ts': ['GET', 'PATCH'],
		'src/routes/api/rlec/scenarios/+server.ts': ['GET'],
		'src/routes/api/rlec/session/+server.ts': ['POST'],
		'src/routes/api/rlec/session/[id]/complete/+server.ts': ['POST'],
		'src/routes/api/rlec/review/due/+server.ts': ['GET'],
		'src/routes/api/rlec/errors/+server.ts': ['POST']
	};
	for (const [file, methods] of Object.entries(routes)) {
		const src = read(file);
		for (const m of methods) assert.match(src, new RegExp(`export const ${m}: RequestHandler`), `${file} ${m}`);
		assert.match(src, /requireApiUser\(locals\)/, file);
		assert.match(src, /user\.id/, file);
	}
	const dbSrc = read('src/lib/server/rlec/db.ts');
	assert.doesNotMatch(dbSrc, /fetch\(|openai|gemini|anthropic/i, 'Phase 1 makes no AI calls');
});
