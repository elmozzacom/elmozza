// RLEC Phase 2 (no AI): 0010 pilot seed + Learning Memory, pilot visibility,
// BYO Level-0 package + report import, Telegram link codes, /coach door flag.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { migratedDb, d1 } from './helpers/rlec-d1-shim.mjs';
import { loadRlec } from './helpers/rlec-load.mjs';

const root = new URL('..', import.meta.url);
const read = (p) => fs.readFileSync(new URL(p, root), 'utf8');
const MIGRATION = 'migrations/0010_rlec_seed_pilot.sql';
const rlec = await loadRlec('db');
const core = await loadRlec('core');
const byo = await loadRlec('byo');
const learning = await loadRlec('learning');
const status = async (p) => {
	try {
		await p;
		return 'ok';
	} catch (e) {
		return e.status ?? e.message;
	}
};
const filters = (o = {}) => ({ domain: null, cefr: null, q: null, limit: 50, offset: 0, source_kind: null, ...o });
const PILOT = { pilot: true };

function seeded() {
	const raw = migratedDb(root);
	raw.exec(`INSERT INTO users(id, username, email) VALUES (1, 'ani', 'ani@contoh.test'), (2, 'budi', 'budi@contoh.test');
	  INSERT INTO rlec_scenarios(id, source_kind, source_ref, title, domain, cefr, status) VALUES
	   (101, 'ecw', 'E1', 'Active clinic', 'healthcare', 'A2', 'active'),
	   (102, 'comic_page', 'C01/p12', 'Comic page', 'daily_life', 'A2', 'qc_passed'),
	   (103, 'pcr_chapter', 'B52/CH03', 'Novel chapter', 'daily_life', 'B1', 'qc_passed');`);
	return { raw, db: d1(raw) };
}

// ---------------------------------------------------------------- migration 0010

test('0010 is additive and idempotent: no ALTER/DROP/UPDATE/DELETE, guarded CREATEs, re-apply keeps 10 scenarios', () => {
	const sql = read(MIGRATION).replace(/--.*$/gm, '').replace(/'(?:[^']|'')*'/g, "''");
	assert.doesNotMatch(sql, /\bALTER\s+TABLE\b|\bDROP\b|\bUPDATE\b|\bDELETE\s+FROM\b/i);
	const creates = sql.match(/CREATE\s+(?:UNIQUE\s+)?(?:TABLE|INDEX)\s+/gi) ?? [];
	const guarded = sql.match(/CREATE\s+(?:UNIQUE\s+)?(?:TABLE|INDEX)\s+IF NOT EXISTS/gi) ?? [];
	assert.equal(creates.length, guarded.length);
	const inserts = sql.match(/INSERT\s+INTO/gi) ?? [];
	assert.equal(inserts.length, 0, 'only INSERT OR IGNORE');
	const db = migratedDb(root);
	db.exec(read(MIGRATION));
	db.exec(read(MIGRATION));
	assert.equal(db.prepare("SELECT COUNT(*) n FROM rlec_scenarios WHERE source_ref LIKE 'RLEC-PILOT-%'").get().n, 10);
	assert.equal(db.prepare('SELECT COUNT(*) n FROM rlec_skills').get().n, 8);
	assert.equal(db.prepare('PRAGMA foreign_key_check').all().length, 0);
});

test('0009 CHECKs: pilot status, hermes creator, and all official source kinds incl. comic_page/pcr_chapter', () => {
	const db = migratedDb(root);
	for (const kind of ['ecw', 'gcw', 'ecc', 'tomorrow', 'manual', 'comic_page', 'pcr_chapter'])
		db.exec(`INSERT INTO rlec_scenarios(source_kind, source_ref, title, domain, status, created_by) VALUES ('${kind}', 'x-${kind}', 't', 'd', 'pilot', 'hermes')`);
	assert.throws(() => db.exec("INSERT INTO rlec_scenarios(source_kind, title, domain) VALUES ('blog', 't', 'd')"), /constraint/i);
	assert.throws(() => db.exec("INSERT INTO rlec_scenarios(source_kind, title, domain, status) VALUES ('manual', 't', 'd', 'live')"), /constraint/i);
});

const REQUIRED_TEXT = ['title', 'domain', 'place', 'situation', 'cefr', 'role_a', 'role_b', 'goal', 'context_brief', 'unexpected_challenge', 'model_instructions', 'correction_policy', 'safety_notes', 'cultural_notes'];
const JSON_COUNTS = { expected_vocab_json: [8, 10], useful_phrases_json: [6, 8], grammar_targets_json: [2, 3], likely_questions_json: [5, 5], likely_problems_json: [2, 3] };
// English-only fields must not carry Indonesian (gloss lives in cultural_notes).
const ENGLISH_FIELDS = ['title', 'place', 'situation', 'role_a', 'role_b', 'goal', 'context_brief', 'unexpected_challenge', 'model_instructions', 'safety_notes'];
const INDONESIAN = /\b(besok|saya|dengan|tidak|yang|untuk|bisa|tolong|sudah|belum|karena|pasien)\b/i;

test('seeded pilot scenarios: all fields non-empty, valid JSON lists of the right size, pilot/hermes/manual, A2|B1, English only', () => {
	const db = migratedDb(root);
	const rows = db.prepare("SELECT * FROM rlec_scenarios WHERE source_ref LIKE 'RLEC-PILOT-%' ORDER BY source_ref").all();
	assert.equal(rows.length, 10);
	for (const r of rows) {
		assert.equal(r.status, 'pilot', r.source_ref);
		assert.equal(r.created_by, 'hermes');
		assert.equal(r.source_kind, 'manual');
		assert.ok(['A2', 'B1'].includes(r.cefr), r.source_ref);
		assert.equal(r.correction_policy, r.cefr === 'A2' ? 'beginner' : 'intermediate');
		assert.equal(r.owner_user_id, null);
		for (const f of REQUIRED_TEXT) assert.ok(typeof r[f] === 'string' && r[f].trim().length > 0, `${r.source_ref}.${f}`);
		for (const [f, [min, max]] of Object.entries(JSON_COUNTS)) {
			const list = JSON.parse(r[f]);
			assert.ok(Array.isArray(list) && list.length >= min && list.length <= max, `${r.source_ref}.${f} size ${list.length}`);
			for (const item of list) assert.ok(typeof item === 'string' && item.trim().length > 1, `${r.source_ref}.${f}`);
		}
		for (const f of ENGLISH_FIELDS) assert.doesNotMatch(r[f], INDONESIAN, `${r.source_ref}.${f}`);
		for (const f of ['expected_vocab_json', 'useful_phrases_json', 'likely_questions_json']) assert.doesNotMatch(r[f], INDONESIAN, `${r.source_ref}.${f}`);
		assert.match(r.role_a, /^.+ — .+$/, 'named partner "Name — description"');
		assert.match(r.role_b, /^.+ — .+$/, 'named learner role');
		assert.match(r.model_instructions, /ROLE:.*SCENARIO:.*LEVEL:/s);
	}
	const titles = rows.map((r) => `${r.title} (${r.cefr})`);
	assert.match(titles[0], /ICU shift handover.*\(B1\)/);
	assert.match(titles[5], /Airport.*\(A2\)/);
	const medical = rows.filter((r) => r.domain === 'healthcare');
	assert.equal(medical.length, 2);
	for (const r of medical) assert.match(r.safety_notes + r.context_brief, /fictional/i, 'medical content is fictional');
});

// ---------------------------------------------------------------- pilot visibility

test('pilot scenarios: only RLEC_PILOT_USER_IDS or superadmin see them; others see only active/qc_passed', async () => {
	assert.equal(core.isPilotUser({ id: 7, role: 'learner' }, '3, 7,9'), true);
	assert.equal(core.isPilotUser({ id: 8, role: 'learner' }, '3,7'), false);
	assert.equal(core.isPilotUser({ id: 8, role: 'superadmin' }, ''), true);
	assert.equal(core.isPilotUser({ id: 8, role: 'admin' }, undefined), false);
	assert.equal(core.isPilotUser(null, '1'), false);
	assert.deepEqual([...core.parseIdList('1, x, 0, 22 ;3')], [1, 22]);

	const { db } = seeded();
	const normal = (await rlec.listScenarios(db, 1, filters())).items;
	assert.deepEqual(normal.map((s) => s.id), [101, 102, 103]);
	const pilot = (await rlec.listScenarios(db, 1, filters(), PILOT)).items;
	assert.equal(pilot.length, 13);
	assert.equal(pilot.filter((s) => s.status === 'pilot').length, 10);
	const pilotId = pilot.find((s) => s.status === 'pilot').id;
	assert.equal(await status(rlec.startSession(db, 1, { mode: 'guided', scenario_id: pilotId, level: null, planned_minutes: null, confidence_before: null })), 404);
	assert.equal(await status(rlec.startSession(db, 1, { mode: 'guided', scenario_id: pilotId, level: null, planned_minutes: null, confidence_before: null }, PILOT)), 'ok');
	assert.equal(await status(rlec.byoPackage(db, { id: 1, username: 'ani' }, pilotId, 10)), 404, 'no package for non-pilot');
});

test('scenarios list accepts source_kind filter incl. comic_page and pcr_chapter', async () => {
	for (const k of ['comic_page', 'pcr_chapter', 'ecw', 'gcw', 'ecc', 'tomorrow', 'manual'])
		assert.equal(core.parseScenarioFilters(new URLSearchParams({ source_kind: k })).ok, true, k);
	assert.equal(core.parseScenarioFilters(new URLSearchParams({ source_kind: 'blog' })).ok, false);
	const { db } = seeded();
	assert.deepEqual((await rlec.listScenarios(db, 1, filters({ source_kind: 'comic_page' }))).items.map((s) => s.id), [102]);
	assert.deepEqual((await rlec.listScenarios(db, 1, filters({ source_kind: 'pcr_chapter' }))).items.map((s) => s.id), [103]);
	assert.equal((await rlec.listScenarios(db, 1, filters({ source_kind: 'manual' }), PILOT)).items.length, 10);
});

test('/coach access + door flag: off by default (pilot/superadmin only), on for every logged-in user when flag set', () => {
	const learner = { id: 5, role: 'learner' };
	assert.deepEqual(core.coachAccess(learner, '', ''), { pilot: false, enabled: false });
	assert.deepEqual(core.coachAccess(learner, undefined, '5'), { pilot: true, enabled: true });
	assert.deepEqual(core.coachAccess({ id: 1, role: 'superadmin' }, '0', ''), { pilot: true, enabled: true });
	assert.deepEqual(core.coachAccess(learner, 'true', ''), { pilot: false, enabled: true });
	assert.deepEqual(core.coachAccess(null, '1', '5'), { pilot: false, enabled: false });

	const landing = read('src/lib/components/EnglishLanding.svelte');
	assert.match(landing, /\{#if coach\}[\s\S]*href="\/coach"[\s\S]*\{\/if\}/, 'door is behind the coach prop');
	assert.ok(landing.indexOf('href="/coach"') < landing.indexOf('<ExplodedSentence'), 'door sits above the long hero (first 390x844 screen)');
	assert.match(landing, /coach = false/, 'door defaults off');
	const homeServer = read('src/routes/+page.server.ts');
	assert.match(homeServer, /coachAccessFor\(platform, locals\.user\)/);
	const coachServer = read('src/routes/coach/+page.server.ts');
	assert.match(coachServer, /redirect\(303, '\/login\?next=\/coach'\)/);
	assert.match(coachServer, /coachAccessFor/);
	const page = read('src/routes/coach/+page.svelte');
	for (const b of ['Tomorrow', 'Work', 'Healthcare', 'Travel', 'Read a Comic', 'Read a Story', 'Practice Conversation', 'Free Talk']) assert.ok(page.includes(`'${b}'`), b);
	assert.match(page, /What do you need English for\?/);
	assert.match(page, /Besok mau ngapain\?/);
	assert.match(page, /Tomorrow Pack/);
	assert.match(page, /EL' Mozza/);
	assert.doesNotMatch(page, /Elmozza/);
});

// ---------------------------------------------------------------- BYO package

const scenarioRow = (db, ref) => db.prepare('SELECT * FROM rlec_scenarios WHERE source_ref = ?').get(ref);

test('buildByoPackage: plan section 7 shape with locks, weak points, challenge turn, policy, commands, report block', () => {
	const db = migratedDb(root);
	const vendor = scenarioRow(db, 'RLEC-PILOT-03');
	const text = byo.buildByoPackage(vendor, { correction_style: 'beginner' }, [{ pattern_code: 'PAST_TENSE_OMISSION' }, { pattern_code: 'ARTICLE_OMISSION' }], { minutes: 10 });
	const lines = text.split('\n');
	assert.equal(lines[0], 'You are my English speaking partner. Follow these rules strictly.');
	const order = ['ROLE LOCK:', 'SCENARIO LOCK:', 'LEVEL LOCK:', 'GOAL:', 'TARGET PHRASES I should use:', 'MY KNOWN WEAK POINTS (force me to use them):', 'UNEXPECTED CHALLENGE', 'CORRECTION POLICY:', 'If I type RETRY', 'If I type REVIEW', 'END: When I type END', '=== SESSION REPORT ===', 'errors: [{pattern, wrong, fixed}]', 'wins:', 'new_phrases:', 'confidence_tip:', '=== END ===', 'Start now with your first line as'];
	let at = -1;
	for (const key of order) {
		const i = lines.findIndex((l, idx) => idx > at && l.startsWith(key));
		assert.ok(i > at, `${key} in order`);
		at = i;
	}
	assert.match(text, /ROLE LOCK: You are "Mr\. Daniel Tan", sales manager/);
	assert.match(text, /I am "Dr\. Hendry", hospital director.*Never switch roles\./);
	assert.match(text, /LEVEL LOCK: My level is B1\./);
	assert.match(text, /past tense \(went, had, was\), articles a\/an\/the\./);
	assert.match(text, /UNEXPECTED CHALLENGE \(use it around turn 6\): /);
	assert.match(text, /"Let's meet halfway\."/);
	assert.match(text, /Max 1 correction per turn/, 'B1 scenario -> intermediate policy');
	assert.match(text, /Start now with your first line as Mr\. Daniel Tan\.$/);
	assert.match(text, /about 10 minutes/);

	const cafe = scenarioRow(db, 'RLEC-PILOT-09');
	const t2 = byo.buildByoPackage(cafe, null, [], { minutes: 5, learnerName: 'Pak Dokter', partnerName: 'Sam' });
	assert.match(t2, /I am "Pak Dokter"/);
	assert.match(t2, /You are "Sam"/);
	assert.match(t2, /around turn 4\)/);
	assert.match(t2, /Max 2 corrections per turn/);
	assert.match(t2, /none recorded yet/);
	assert.match(byo.buildByoPackage({ ...cafe, correction_policy: 'advanced' }, null, [], { minutes: 20 }), /Do not correct me during the role-play[\s\S]*around turn 10\)|around turn 10\)[\s\S]*Do not correct me/);
	assert.doesNotMatch(t2, /undefined|null|\[object/);
});

// ---------------------------------------------------------------- report parsing

const CHATGPT = '```\n=== SESSION REPORT ===\nerrors: [\n  {pattern: "past tense", wrong: "Yesterday I go to the pharmacy", fixed: "Yesterday I went to the pharmacy"},\n  {pattern: "articles", wrong: "I need doctor", fixed: "I need a doctor"},\n  {pattern: "word order in questions", wrong: "Where you work?", fixed: "Where do you work?"}\n]\nwins: ["You confirmed the date clearly: \'Could you confirm the date?\'", "You stayed calm and handled the delay"]\nnew_phrases: ["Let\'s meet halfway", "Could you put that in writing?"]\nconfidence_tip: Slow down and breathe before you answer.\n=== END ===\n```';

const GEMINI = `Great job today! Here is your report:

**=== SESSION REPORT ===**

**errors:**
* **Past tense:** “I check the patient at 3 pm” → “I checked the patient at 3 p.m.”
* **Subject-verb agreement:** "She have a fever" → "She has a fever"
* **Word choice:** "The pressure is down very" -> "The pressure is quite low"

**wins:**
* You used polite, professional language with the family.
* Your pronunciation of "three" was clear.

**new_phrases:**
* "Does that make sense so far?"
* "I will update you again tomorrow morning."

**confidence_tip:** You know more than you think.

**=== END ===**`;

const CLAUDE = `Here's your session report.

=== SESSION REPORT ===
errors: [{"pattern": "PREPOSITION_CONFUSION", "wrong": "in Monday", "fixed": "on Monday"}, {"pattern": "too casual", "wrong": "Hey, give me the bill", "fixed": "Could we have the bill, please?"}, {"pattern": "idiom use", "wrong": "It is raining dogs", "fixed": "It is raining cats and dogs"}]
wins:
- You asked clear follow-up questions.
- You finished the scenario confidently.
new_phrases: []
confidence_tip: Keep using "Could we..." for polite requests.`;

const DRIFT = `Mistakes:
- you said: "I am agree" | better: "I agree"
- "I need doctor" → "I need a doctor"
Strengths:
1. Good use of the phrase "I'm afraid this isn't what I ordered"`;

test('parseSessionReport: ChatGPT-style fenced block with unquoted keys', () => {
	const r = byo.parseSessionReport(CHATGPT);
	assert.equal(r.source, 'byo_paste');
	assert.equal(r.found_block, true);
	assert.deepEqual(r.errors.map((e) => e.pattern_code), ['PAST_TENSE_OMISSION', 'ARTICLE_OMISSION', 'WORD_ORDER_QUESTION']);
	assert.deepEqual(r.errors[0], { pattern_text: 'past tense', pattern_code: 'PAST_TENSE_OMISSION', wrong: 'Yesterday I go to the pharmacy', fixed: 'Yesterday I went to the pharmacy' });
	assert.equal(r.wins.length, 2);
	assert.deepEqual(r.new_phrases, ["Let's meet halfway", 'Could you put that in writing?']);
	assert.equal(r.confidence_tip, 'Slow down and breathe before you answer.');
	assert.deepEqual(r.warnings, []);
});

test('parseSessionReport: Gemini-style markdown bullets, curly quotes, arrows', () => {
	const r = byo.parseSessionReport(GEMINI);
	assert.equal(r.found_block, true);
	assert.deepEqual(r.errors.map((e) => [e.pattern_code, e.wrong, e.fixed]), [
		['PAST_TENSE_OMISSION', 'I check the patient at 3 pm', 'I checked the patient at 3 p.m.'],
		['SV_AGREEMENT', 'She have a fever', 'She has a fever'],
		['LIMITED_VOCAB', 'The pressure is down very', 'The pressure is quite low']
	]);
	assert.equal(r.wins.length, 2);
	assert.deepEqual(r.wins.map(learning.skillForWin), ['PROFESSIONAL_REGISTER', 'PRONUNCIATION']);
	assert.deepEqual(r.new_phrases, ['Does that make sense so far?', 'I will update you again tomorrow morning.']);
	assert.equal(r.confidence_tip, 'You know more than you think.');
});

test('parseSessionReport: Claude-style JSON errors, no END marker, unknown pattern kept UNCLASSIFIED', () => {
	const r = byo.parseSessionReport(CLAUDE);
	assert.deepEqual(r.errors.map((e) => e.pattern_code), ['PREPOSITION_CONFUSION', 'REGISTER_TOO_CASUAL', 'UNCLASSIFIED']);
	assert.deepEqual(r.wins, ['You asked clear follow-up questions.', 'You finished the scenario confidently.']);
	assert.deepEqual(r.new_phrases, []);
	assert.ok(r.warnings.some((w) => /UNCLASSIFIED/.test(w)));
});

test('parseSessionReport: format drift (no block, other headings) and junk input', () => {
	const r = byo.parseSessionReport(DRIFT);
	assert.equal(r.found_block, false);
	assert.deepEqual(r.errors.map((e) => [e.pattern_code, e.wrong, e.fixed]), [
		['UNCLASSIFIED', 'I am agree', 'I agree'],
		['ARTICLE_OMISSION', 'I need doctor', 'I need a doctor']
	]);
	assert.equal(r.wins.length, 1);
	const junk = byo.parseSessionReport('hello there, thanks for the chat!');
	assert.deepEqual([junk.errors, junk.wins, junk.new_phrases], [[], [], []]);
	assert.ok(junk.warnings.length >= 1);
	assert.equal(byo.classifyPattern('SV agreement'), 'SV_AGREEMENT');
	assert.equal(byo.classifyPattern('pron th'), 'PRON_TH');
	assert.equal(byo.classifyPattern(null, 'two ticket', 'two tickets'), 'UNCLASSIFIED');
	const many = '=== SESSION REPORT ===\nerrors:\n' + Array.from({ length: 40 }, (_, i) => `- "bad ${i}" → "good ${i}"`).join('\n');
	assert.equal(byo.parseSessionReport(many).errors.length, 20, 'capped');
});

// ---------------------------------------------------------------- import + Learning Memory

test('importSessionReport: byo session, Error Memory for classified, UNCLASSIFIED event only, wins -> success events', async () => {
	const { raw, db } = seeded();
	const now = new Date('2026-10-03T08:00:00Z');
	const pilotId = raw.prepare("SELECT id FROM rlec_scenarios WHERE source_ref = 'RLEC-PILOT-09'").get().id;
	assert.equal(await status(rlec.importSessionReport(db, 1, byo.parseSessionReport(CLAUDE), { session_id: null, scenario_id: pilotId }, now)), 404, 'pilot scenario needs pilot access');
	const out = await rlec.importSessionReport(db, 1, byo.parseSessionReport(CLAUDE), { session_id: null, scenario_id: pilotId }, now, PILOT);
	assert.equal(raw.prepare('SELECT mode, user_id, scenario_id FROM rlec_sessions WHERE id = ?').get(out.session_id).mode, 'byo');
	assert.deepEqual(out.counts, { errors: 3, classified: 2, wins: 2 });
	assert.equal(raw.prepare('SELECT COUNT(*) n FROM rlec_error_events WHERE session_id = ?').get(out.session_id).n, 3);
	assert.equal(raw.prepare("SELECT COUNT(*) n FROM rlec_learner_errors WHERE user_id = 1 AND pattern_code = 'UNCLASSIFIED'").get().n, 0);
	assert.deepEqual(raw.prepare('SELECT pattern_code FROM rlec_learner_errors WHERE user_id = 1 ORDER BY pattern_code').all().map((r) => r.pattern_code), ['PREPOSITION_CONFUSION', 'REGISTER_TOO_CASUAL']);
	const succ = raw.prepare('SELECT kind, skill_code, source FROM rlec_success_events WHERE user_id = 1 ORDER BY id').all();
	assert.deepEqual(succ.map((s) => [s.kind, s.skill_code, s.source]), [['correct_use', 'INTERACTION', 'byo_paste'], ['correct_use', 'CONFIDENCE', 'byo_paste']]);
	const again = await rlec.importSessionReport(db, 1, byo.parseSessionReport(CHATGPT), { session_id: out.session_id, scenario_id: null }, now);
	assert.equal(again.session_id, out.session_id, 'reuses own session');
	assert.equal(again.wins.filter((w) => w.kind === 'phrase_used').length, 2);
	assert.equal(await status(rlec.importSessionReport(db, 2, byo.parseSessionReport(CHATGPT), { session_id: out.session_id, scenario_id: null }, now)), 404, "cannot import into another user's session");
	assert.equal(raw.prepare('SELECT COUNT(*) n FROM rlec_error_events WHERE user_id = 2').get().n, 0);
});

test('learning memory: evidence moves strength within 0..1, mastery derived, 7-day baseline trend', () => {
	const t0 = new Date('2026-10-01T00:00:00Z');
	let s = learning.applyEvidence(null, { positive: true, kind: 'correct_use' }, t0);
	assert.ok(s.strength > learning.STRENGTH_START && s.strength < 1);
	assert.equal(s.trend_delta, Math.round((s.strength - 0.3) * 1000) / 1000);
	const after = learning.applyEvidence(s, { positive: false, severity: 3 }, t0);
	assert.ok(after.strength < s.strength && after.strength > 0);
	let x = null;
	for (let i = 0; i < 40; i += 1) x = learning.applyEvidence(x, { positive: true, kind: 'retry_success' }, t0);
	assert.ok(x.strength <= 1 && x.strength >= 0.85);
	assert.equal(x.mastery_level, 'mastered');
	for (let i = 0; i < 80; i += 1) x = learning.applyEvidence(x, { positive: false, severity: 3 }, t0);
	assert.ok(x.strength >= 0 && x.strength < 0.35);
	assert.equal(x.mastery_level, 'emerging');
	assert.deepEqual(['emerging', 'developing', 'secure', 'secure', 'mastered'], [[0.2, 1], [0.4, 1], [0.7, 3], [0.9, 7], [0.9, 8]].map(([a, b]) => learning.masteryLevel(a, b)));
	const wk = learning.applyEvidence({ ...s, baseline_strength: 0.3, baseline_at: '2026-10-01 00:00:00' }, { positive: true, kind: 'correct_use' }, new Date('2026-10-09T00:00:00Z'));
	assert.equal(wk.baseline_strength, s.strength, 'baseline rolls to last week strength');
	assert.equal(wk.baseline_at, '2026-10-09 00:00:00');
	assert.equal(learning.skillForPattern('PRON_TH'), 'PRONUNCIATION');
	assert.equal(learning.skillForPattern('UNCLASSIFIED'), null);
});

test('learning memory: retry success writes a success event; errors lower strength; completion counts; progress puts wins first', async () => {
	const { raw, db } = seeded();
	const now = new Date();
	const s = await rlec.startSession(db, 1, { mode: 'guided', scenario_id: 101, level: null, planned_minutes: null, confidence_before: 2 });
	const ev = (o) => ({ pattern_code: 'PAST_TENSE_OMISSION', wrong_text: 'I go', fixed_text: 'I went', retry_success: false, session_id: s.id, turn_id: null, severity: null, ...o });
	await rlec.recordErrorEvent(db, 1, ev(), now);
	const low = raw.prepare("SELECT strength, negative_count FROM rlec_skill_strength WHERE user_id = 1 AND skill_code = 'GRAMMAR_ACCURACY'").get();
	assert.ok(low.strength < 0.3);
	assert.equal(low.negative_count, 1);
	await rlec.recordErrorEvent(db, 1, ev({ retry_success: true }), now);
	const ok = raw.prepare("SELECT kind, skill_code, pattern_code, evidence_text FROM rlec_success_events WHERE user_id = 1").get();
	assert.deepEqual({ ...ok }, { kind: 'retry_success', skill_code: 'GRAMMAR_ACCURACY', pattern_code: 'PAST_TENSE_OMISSION', evidence_text: 'I went' });
	await rlec.completeSession(db, 1, s.id, { confidence_after: 4, want_continue: true, notes: null }, now);
	assert.equal(raw.prepare("SELECT COUNT(*) n FROM rlec_success_events WHERE user_id = 1 AND kind = 'scenario_completed' AND skill_code = 'CONFIDENCE'").get().n, 1);

	const prog = await rlec.learningProgress(db, 1, new Date(now.getTime() + 2 * 86_400_000));
	assert.deepEqual(Object.keys(prog), ['recent_wins', 'improvements', 'strengths', 'due_reviews'], 'positive evidence first');
	assert.equal(prog.strengths.length, 8);
	assert.equal(prog.recent_wins.length, 2);
	assert.ok(prog.improvements.some((r) => r.skill_code === 'CONFIDENCE'));
	assert.ok(prog.due_reviews.total >= 1);
	const other = await rlec.learningProgress(db, 2, now);
	assert.equal(other.recent_wins.length, 0, 'scoped per user');
	assert.ok(other.strengths.every((r) => r.evidence_count === 0));
});

// ---------------------------------------------------------------- Telegram link

test('telegram link: 6-digit code stored hashed, 10-minute expiry, single use, retire old codes, no hijack', async () => {
	const { raw, db } = seeded();
	const t0 = new Date('2026-10-03T08:00:00Z');
	const c1 = await rlec.createLinkCode(db, 1, t0);
	assert.match(c1.code, /^\d{6}$/);
	assert.equal(c1.ttl_seconds, 600);
	const stored = raw.prepare('SELECT code_hash FROM rlec_link_codes WHERE user_id = 1').all();
	assert.ok(stored.every((r) => r.code_hash !== c1.code && /^[0-9a-f]{64}$/.test(r.code_hash)), 'hash only');

	assert.equal(await status(rlec.linkTelegram(db, c1.code, '5550001', new Date(t0.getTime() + 11 * 60_000))), 404, 'expired after 10 min');
	const c2 = await rlec.createLinkCode(db, 1, t0);
	const c3 = await rlec.createLinkCode(db, 1, t0);
	if (c2.code !== c3.code) assert.equal(await status(rlec.linkTelegram(db, c2.code, '5550001', t0)), 404, 'older code retired');
	const linked = await rlec.linkTelegram(db, c3.code, '5550001', new Date(t0.getTime() + 9 * 60_000));
	assert.deepEqual(linked, { user_id: 1, channel: 'telegram', external_id: '5550001', already_linked: false });
	assert.equal(await status(rlec.linkTelegram(db, c3.code, '5550001', t0)), 404, 'single use');
	assert.equal(raw.prepare("SELECT user_id FROM rlec_identity_links WHERE channel = 'telegram' AND external_id = '5550001'").get().user_id, 1);

	const b = await rlec.createLinkCode(db, 2, t0);
	assert.equal(await status(rlec.linkTelegram(db, b.code, '5550001', t0)), 409, 'telegram id already linked to another user');
	assert.equal(raw.prepare('SELECT COUNT(*) n FROM rlec_identity_links').get().n, 1);

	assert.equal(core.secretMatches('a'.repeat(32), 'a'.repeat(32)), true);
	assert.equal(core.secretMatches('a'.repeat(31), 'a'.repeat(32)), false);
	assert.equal(core.secretMatches('', ''), false, 'unset secret never matches');
	assert.equal(core.secretMatches('short', 'short'), false, 'too-short secret rejected');
	assert.equal(core.validateTelegramLink({ code: '012345', telegram_user_id: 777 }).ok, true);
	assert.equal(core.validateTelegramLink({ code: '12345', telegram_user_id: '777' }).ok, false);
	assert.equal(core.validateTelegramLink({ code: '123456', telegram_user_id: '-5' }).ok, false);
});

test('phase 2 validators', () => {
	assert.equal(core.validateByoPackage({ scenario_id: 3, minutes: 20 }).ok, true);
	assert.equal(core.validateByoPackage({ scenario_id: 3, minutes: 15 }).ok, false);
	assert.deepEqual(core.validateByoPackage({ scenario_id: 3 }).value, { scenario_id: 3, minutes: 10 });
	assert.equal(core.validateByoImport({ text: 'short' }).ok, false);
	assert.equal(core.validateByoImport({ text: CHATGPT, session_id: 'x' }).ok, false);
	assert.equal(core.validateByoImport({ text: CHATGPT }).ok, true);
	assert.equal(core.validateTomorrowNote('  Besok rapat dengan vendor  ').value, 'Besok rapat dengan vendor');
	assert.equal(core.validateTomorrowNote('a').ok, false);
});

test('phase 2 routes exist; user routes require auth, link route uses the shared secret; no AI calls', () => {
	const user = {
		'src/routes/api/rlec/byo/package/+server.ts': 'POST',
		'src/routes/api/rlec/byo/import/+server.ts': 'POST',
		'src/routes/api/rlec/identity/telegram/code/+server.ts': 'POST',
		'src/routes/api/rlec/progress/+server.ts': 'GET'
	};
	for (const [file, m] of Object.entries(user)) {
		const src = read(file);
		assert.match(src, new RegExp(`export const ${m}: RequestHandler`), file);
		assert.match(src, /requireApiUser\(locals\)/, file);
		assert.match(src, /user\.id|user,/, file);
	}
	const link = read('src/routes/api/rlec/identity/telegram/link/+server.ts');
	assert.match(link, /secretMatches\(request\.headers\.get\('x-rlec-link-secret'\), rlecEnv\(platform, 'RLEC_TELEGRAM_LINK_SECRET'\)\)/);
	assert.match(link, /status: 401/);
	for (const f of ['byo', 'db', 'learning', 'core', 'env']) assert.doesNotMatch(read(`src/lib/server/rlec/${f}.ts`), /fetch\(|openai|gemini\.|anthropic|AI\.run/i, f);
	assert.match(read('src/lib/server/rlec/byo.ts'), /SessionReportSource = 'byo_paste' \| 'internal_tutor'/);
});

test('BYO package contains every owner-required section (3 Okt 2026 MVP checklist)', () => {
	const db = migratedDb(root);
	const s = scenarioRow(db, 'RLEC-PILOT-03');
	const text = byo.buildByoPackage(s, { correction_style: 'beginner' }, [], { minutes: 10 });
	for (const key of ['ROLE LOCK:', 'SCENARIO LOCK:', 'LEVEL LOCK:', 'GOAL:', 'TARGET PHRASES', 'KEY VOCABULARY', 'GRAMMAR TARGET', 'UNEXPECTED CHALLENGE', 'CORRECTION POLICY:', 'RETRY', 'REVIEW', '=== SESSION REPORT ===', '=== END ===']) {
		assert.ok(text.includes(key), `missing ${key}`);
	}
	assert.match(text, /pattern = one of: PAST_TENSE_OMISSION/);
	assert.doesNotMatch(text, /\bnull\b|undefined/);
});
