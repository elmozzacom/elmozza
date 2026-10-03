// Tomorrow Mode HTTP layer: request validation, response shaping, GET state
// (credits, last card, day-two check-in), outcome ownership, route gating and bindings.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { migratedDb, d1 } from './helpers/rlec-d1-shim.mjs';
import { loadRlec } from './helpers/rlec-load.mjs';

const root = new URL('..', import.meta.url);
const read = (p) => fs.readFileSync(new URL(p, root), 'utf8');
const api = await loadRlec('tomorrow/api');

const NOW = new Date('2026-10-03T05:00:00Z'); // 12:00 WIB; WIB day starts 2026-10-02 17:00 UTC

function seeded() {
	const raw = migratedDb(root);
	raw.exec(`INSERT INTO users(id, username, email) VALUES (1, 'ani', 'ani@contoh.test'), (2, 'budi', 'budi@contoh.test');`);
	return { raw, db: d1(raw) };
}

const CARD = {
	title: 'Dentist check-up',
	level: 'A2',
	domain_id: 'D04',
	place: 'Dental clinic',
	situation: 'Check-up',
	learner_role: 'Patient (you)',
	counterpart_role: 'Dentist',
	opener: 'Hello, I have an appointment at ten.',
	phrases: ['a', 'b', 'c', 'd', 'e'],
	ready_answers: [{ question: 'q1', answer: 'a1' }, { question: 'q2', answer: 'a2' }, { question: 'q3', answer: 'a3' }],
	traps: [{ trap: 't1', fix: 'f1' }, { trap: 't2', fix: 'f2' }],
	safety_note: null
};

function addSession(raw, userId, startedAt, { mode = 'tomorrow', card = true } = {}) {
	const { id } = raw.prepare(`INSERT INTO rlec_sessions (user_id, mode, level, planned_minutes, started_at) VALUES (?, ?, 'A2', 10, ?) RETURNING id`).get(userId, mode, startedAt);
	if (card) raw.prepare(`INSERT INTO rlec_tomorrow_cards (user_id, session_id, source, coverage, level, card_json) VALUES (?, ?, 'bank', 'FULL', 'A2', ?)`).run(userId, id, JSON.stringify(CARD));
	return Number(id);
}

test('validateTomorrowRequest: text 1..1000 (trimmed), optional CEFR level', () => {
	assert.equal(api.validateTomorrowRequest(null).ok, false);
	assert.equal(api.validateTomorrowRequest({ text: '   ' }).ok, false);
	assert.equal(api.validateTomorrowRequest({ text: 'x'.repeat(1001) }).ok, false);
	assert.equal(api.validateTomorrowRequest({ text: 42 }).ok, false);
	assert.deepEqual(api.validateTomorrowRequest({ text: '  Besok ke dokter gigi ' }).value, { text: 'Besok ke dokter gigi', level: null });
	assert.deepEqual(api.validateTomorrowRequest({ text: 'x'.repeat(1000), level: 'b1' }).value.level, 'B1');
	assert.equal(api.validateTomorrowRequest({ text: 'ok', level: 'C2' }).ok, false);
	assert.equal(api.validateTomorrowRequest({ text: 'ok', level: null }).ok, true);
});

test('validateOutcome: session_id int, 4 outcomes, note <= 500', () => {
	assert.deepEqual(api.OUTCOMES, ['went_well', 'mixed', 'hard', 'did_not_happen']);
	assert.equal(api.validateOutcome({ session_id: 1, outcome: 'great' }).ok, false);
	assert.equal(api.validateOutcome({ session_id: '1', outcome: 'hard' }).ok, false);
	assert.equal(api.validateOutcome({ session_id: 0, outcome: 'hard' }).ok, false);
	assert.equal(api.validateOutcome({ session_id: 1, outcome: 'hard', note: 'x'.repeat(501) }).ok, false);
	assert.equal(api.validateOutcome({ session_id: 1, outcome: 'hard', note: 7 }).ok, false);
	assert.deepEqual(api.validateOutcome({ session_id: 3, outcome: 'mixed', note: ' ok ' }).value, { session_id: 3, outcome: 'mixed', note: 'ok' });
	assert.equal(api.validateOutcome({ session_id: 3, outcome: 'did_not_happen' }).value.note, null);
});

test('publicResult keeps taxonomy ids only (no counterpart/date/confidence)', () => {
	const out = api.publicResult({
		ok: true, status: 'bank', reason: null, charged: false, card: CARD, card_id: 1, scenario_id: 2, session_id: 3, note_id: 4,
		intent: { domain_id: 'D04', place: 'Dental clinic', situation: 'Check-up', counterpart: 'drg. Siti', stakes: 'low', date: 'tomorrow', level_hint: 'A2', confidence: 0.9, source: 'rules' },
		level: 'A2', coverage: 'FULL', qc: null, anchors: [], suggestions: [], credits: { free_daily: 3, free_used_today: 0, free_left: 3, balance: 0 }, budget_alerts: [], attempts: 0
	});
	assert.deepEqual(out.intent, { domain_id: 'D04', place: 'Dental clinic', situation: 'Check-up', stakes: 'low', level_hint: 'A2' });
	assert.equal(out.session_id, 3);
	assert.ok(!JSON.stringify(out).includes('Siti'));
});

test('tomorrowState: credits, last card, day-two pending only for yesterday (WIB) sessions without outcome', async () => {
	const { raw, db } = seeded();
	let st = await api.tomorrowState(db, 1, NOW);
	assert.equal(st.last_card, null);
	assert.equal(st.pending_outcome, null);
	assert.equal(typeof st.credits.free_left, 'number');

	const yesterday = addSession(raw, 1, '2026-10-02 10:00:00'); // 17:00 WIB on 2 Oct
	st = await api.tomorrowState(db, 1, NOW);
	assert.equal(st.last_card.card.title, 'Dentist check-up');
	assert.equal(st.last_card.session_id, yesterday);
	assert.deepEqual([st.pending_outcome.session_id, st.pending_outcome.title], [yesterday, 'Dentist check-up']);
	assert.equal((await api.tomorrowState(db, 2, NOW)).pending_outcome, null, 'other user sees nothing');

	addSession(raw, 1, '2026-10-02 18:00:00'); // 01:00 WIB on 3 Oct = today
	assert.equal((await api.pendingOutcome(db, 1, NOW)), null, 'latest session is from today');
});

test('recordOutcome: owner only, tomorrow sessions only, stores JSON', async () => {
	const { raw, db } = seeded();
	const sid = addSession(raw, 1, '2026-10-02 10:00:00');
	const other = await api.recordOutcome(db, 2, { session_id: sid, outcome: 'hard', note: null }, NOW);
	assert.deepEqual([other.ok, other.status], [false, 404]);
	assert.equal(raw.prepare('SELECT real_world_outcome FROM rlec_sessions WHERE id = ?').get(sid).real_world_outcome, null);
	assert.equal((await api.recordOutcome(db, 1, { session_id: 9999, outcome: 'hard', note: null }, NOW)).status, 404);
	const guided = addSession(raw, 1, '2026-10-02 10:00:00', { mode: 'guided', card: false });
	assert.equal((await api.recordOutcome(db, 1, { session_id: guided, outcome: 'hard', note: null }, NOW)).status, 400);

	const ok = await api.recordOutcome(db, 1, { session_id: sid, outcome: 'went_well', note: 'lancar' }, NOW);
	assert.equal(ok.ok, true);
	const stored = JSON.parse(raw.prepare('SELECT real_world_outcome FROM rlec_sessions WHERE id = ?').get(sid).real_world_outcome);
	assert.deepEqual(stored, { outcome: 'went_well', note: 'lancar', at: NOW.toISOString() });
	assert.equal(await api.pendingOutcome(db, 1, NOW), null, 'answered sessions are not asked again');
});

test('routes: auth + coach gating + validation wired; AI only when bound; bindings declared', () => {
	const main = read('src/routes/api/rlec/tomorrow/+server.ts');
	const outcome = read('src/routes/api/rlec/tomorrow/outcome/+server.ts');
	for (const [src, methods] of [[main, ['GET', 'POST']], [outcome, ['POST']]]) {
		for (const m of methods) assert.match(src, new RegExp(`export const ${m}: RequestHandler`));
		assert.match(src, /requireApiUser\(locals\)/);
		assert.match(src, /coachAccessFor\(platform, user\)/);
		assert.match(src, /throw error\(404, 'Not found'\)/);
		assert.match(src, /user\.id/);
	}
	assert.match(main, /validateTomorrowRequest\(await readJson\(request\)\)/);
	assert.match(main, /provider: ai \? workersAiProvider\(ai\) : null/);
	assert.match(main, /pilot: access\.pilot/);
	assert.match(main, /json\(publicResult\(result\)\)/);
	assert.match(outcome, /validateOutcome\(await readJson\(request\)\)/);
	assert.match(outcome, /recordOutcome\(db, user\.id/);

	const wr = read('wrangler.toml');
	assert.match(wr, /\[ai\]\s*\r?\nbinding = "AI"/);
	assert.match(wr, /binding = "ECW_DB"\s*\r?\ndatabase_name = "ecw-warehouse-db"\s*\r?\ndatabase_id = "b8e1317b-9d0b-4059-89b3-3cd8fd76f7e0"/);
	assert.match(wr, /\[\[vectorize\]\]\s*\r?\nbinding = "ECW_VEC"\s*\r?\nindex_name = "ecw-warehouse-g2-dev"/);
	const types = read('src/app.d.ts');
	for (const k of ['AI?: Ai;', 'ECW_DB?: D1Database;', 'ECW_VEC?: VectorizeIndex;']) assert.ok(types.includes(k), k);

	const page = read('src/routes/coach/+page.svelte');
	for (const s of ['Tomorrow Pack', '>Free<', 'placeholder="Besok mau ngapain?"', 'Dari bank skenario', 'Kartu kamu sebelumnya', 'Dibuat khusus untukmu', 'Bagaimana kemarin?', '/api/rlec/tomorrow/outcome']) {
		assert.ok(page.includes(s), s);
	}
	for (const r of ['no_credit', 'budget_cap', 'ai_error', 'qc_failed', 'unclear', 'llm_disabled', 'no_ai']) assert.match(page, new RegExp(`\\b${r}: '`), r);
	for (const o of ['went_well', 'mixed', 'hard', 'did_not_happen']) assert.ok(page.includes(`id: '${o}'`), o);
});
