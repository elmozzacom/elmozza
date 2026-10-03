// Tomorrow Mode steps 2-3: intent, provider, retrieval (bank + ECW fixture),
// credits (0012), and the pipeline with a mocked Workers AI binding.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { migratedDb, d1 } from './helpers/rlec-d1-shim.mjs';
import { loadRlec } from './helpers/rlec-load.mjs';

const root = new URL('..', import.meta.url);
const read = (p) => fs.readFileSync(new URL(p, root), 'utf8');
const intentMod = await loadRlec('tomorrow/intent');
const provider = await loadRlec('tomorrow/provider');
const credits = await loadRlec('tomorrow/credits');
const pipeline = await loadRlec('tomorrow/pipeline');

const NOW = new Date('2026-10-03T05:00:00Z'); // 12:00 WIB
const TOMORROW = new Date('2026-10-04T05:00:00Z');

function seeded() {
	const raw = migratedDb(root);
	raw.exec(`INSERT INTO users(id, username, email) VALUES (1, 'ani', 'ani@contoh.test'), (2, 'budi', 'budi@contoh.test');`);
	return { raw, db: d1(raw) };
}

function ecwFixture() {
	const raw = new DatabaseSync(':memory:');
	raw.exec(read('tests/fixtures/ecw-mini.sql'));
	return { raw, db: d1(raw) };
}

/** A valid A2 ICU procedure-explanation card body (model reply). */
const icuCard = () => ({
	title: 'Explaining an ICU procedure to the family',
	situation: 'Procedure explanation',
	opener: "Hello, I'm one of the ICU doctors.",
	phrases: [
		'We need to do a small procedure today.',
		'It helps him breathe more easily.',
		'It takes about thirty minutes.',
		'You can wait in the family room.',
		'I will come back and update you.'
	],
	ready_answers: [
		{ question: 'Is it dangerous?', answer: 'Every procedure has some risk, but we watch him closely.' },
		{ question: 'Can I see him after?', answer: 'Yes, after about one hour.' },
		{ question: 'Who will do it?', answer: 'An experienced ICU doctor will do it.' }
	],
	traps: [
		{ trap: 'Using medical words the family does not know.', fix: 'Say: "In simple words, it is a small tube."' },
		{ trap: 'The family asks for a promise.', fix: 'Say: "I can not promise, but we will do our best."' }
	],
	safety_note: 'Language practice only. Follow your local protocol.'
});

function mockAi(replies) {
	const calls = [];
	return {
		calls,
		run: async (model, input) => {
			calls.push({ model, input });
			const next = replies.shift();
			if (next instanceof Error) throw next;
			if (model.includes('bge')) return { data: [new Array(768).fill(0.01)] };
			return { response: next, usage: { prompt_tokens: 1200, completion_tokens: 400 } };
		}
	};
}

const deps = (db, extra = {}) => ({ db, now: NOW, pilot: true, ...extra });

// ---------------------------------------------------------------- intent

test('rule intent: ID + EN keywords -> domain/place/situation/counterpart/stakes/date/level', () => {
	const a = intentMod.ruleIntent('Besok operan pasien ICU dengan dokter asing dari Australia');
	assert.equal(a.domain_id, 'D04');
	assert.equal(a.place, 'ICU');
	assert.equal(a.situation, 'Handover');
	assert.equal(a.counterpart, 'foreign doctor');
	assert.equal(a.stakes, 'high');
	assert.equal(a.date, 'tomorrow');
	const b = intentMod.ruleIntent('Tomorrow online meeting, I must give a short update to my manager. Level A2');
	assert.equal(b.domain_id, 'D03');
	assert.equal(b.place, 'Meeting room');
	assert.equal(b.situation, 'Task status update');
	assert.equal(b.counterpart, 'manager');
	assert.equal(b.level_hint, 'A2');
	const c = intentMod.ruleIntent('Lusa negosiasi harga dengan vendor alat ICU');
	assert.equal(c.domain_id, 'D17', 'who you talk to (vendor negotiation) wins over the ICU keyword');
	assert.equal(c.date, 'day_after_tomorrow');
	const d = intentMod.ruleIntent('Besok makan siang di kafe dengan tamu');
	assert.equal(d.domain_id, 'D05');
	assert.equal(d.place, 'Café');
	assert.equal(d.stakes, 'low');
	const e = intentMod.ruleIntent('hmm entahlah', 'B1');
	assert.equal(e.domain_id, null);
	assert.equal(e.level_hint, 'B1');
	assert.equal(e.confidence, 0);
});

test('LLM intent JSON is validated against the taxonomy', () => {
	const base = intentMod.ruleIntent('xyz');
	assert.equal(intentMod.parseLlmIntent('{"domain_id":"D99"}', base), null);
	assert.equal(intentMod.parseLlmIntent('not json', base), null);
	const ok = intentMod.parseLlmIntent({ domain_id: 'd04', place: 'icu', situation: 'Handover', counterpart: 'nurse', stakes: 'high' }, base);
	assert.equal(ok.domain_id, 'D04');
	assert.equal(ok.place, 'ICU');
	assert.equal(ok.source, 'llm');
	assert.equal(intentMod.parseLlmIntent({ domain_id: 'D04', place: 'Moon base', situation: 'x', counterpart: 'Robert; DROP', stakes: 'x' }, base).place, null);
});

// ---------------------------------------------------------------- provider

test('Workers AI provider: env.AI.run shape, tokens, JSON schema, cost in Rupiah', async () => {
	const ai = mockAi([{ a: 1 }]);
	const p = provider.workersAiProvider(ai);
	assert.equal(p.model, '@cf/meta/llama-3.3-70b-instruct-fp8-fast');
	const r = await p.complete([{ role: 'user', content: 'hi' }], { maxTokens: 50, jsonSchema: { type: 'object' } });
	assert.equal(r.text, '{"a":1}');
	assert.equal(r.input_tokens, 1200);
	assert.equal(r.output_tokens, 400);
	assert.equal(ai.calls[0].input.max_tokens, 50);
	assert.equal(ai.calls[0].input.response_format.type, 'json_schema');
	assert.equal(provider.estimateCostUsd(p.model, 1_000_000, 0), 0.293);
	assert.equal(provider.estimateCostUsd(p.model, 0, 1_000_000), 2.253);
	// 1200 in + 400 out = $0.0012528 -> Rp20.67 at 16,500
	assert.equal(provider.usdToIdr(provider.estimateCostUsd(p.model, 1200, 400)), 20.67);
	assert.deepEqual(provider.extractJson('```json\n{"x":2}\n```'), { x: 2 });
	assert.deepEqual(provider.extractJson('Here: {"x":3} ok'), { x: 3 });
	assert.equal(provider.extractJson('nope'), null);
});

// ---------------------------------------------------------------- 0012 + credits

test('0012 is additive and idempotent; config seeds free_daily_tomorrow=1 and price placeholders', () => {
	const sql = read('migrations/0012_rlec_tomorrow_credits.sql').replace(/--.*$/gm, '').replace(/'(?:[^']|'')*'/g, "''").replace(/ON DELETE (CASCADE|SET NULL)/gi, '');
	assert.doesNotMatch(sql, /\b(ALTER|DROP|UPDATE|DELETE)\b/i);
	for (const m of sql.matchAll(/CREATE\s+(UNIQUE\s+)?(TABLE|INDEX)\s+(?!IF NOT EXISTS)/gi)) assert.fail(`unguarded: ${m[0]}`);
	const { raw } = seeded();
	raw.exec(read('migrations/0012_rlec_tomorrow_credits.sql'));
	const cfg = Object.fromEntries(raw.prepare('SELECT key, value FROM rlec_config').all().map((r) => [r.key, r.value]));
	assert.equal(cfg.free_daily_tomorrow, '1');
	assert.equal(cfg.tomorrow_model, '@cf/meta/llama-3.3-70b-instruct-fp8-fast');
	assert.ok('credit_pack_5_price_idr' in cfg);
	assert.equal(fs.existsSync(new URL('migrations/0011_rlec_tomorrow_credits.sql', root)), false, '0011 stays reserved');
});

test('credits: free daily first, then balance; refund to the same source; no double spend/refund; WIB day reset', async () => {
	const { db } = seeded();
	let s = await credits.creditStatus(db, 1, NOW);
	assert.deepEqual(s, { free_daily: 1, free_used_today: 0, free_left: 1, balance: 0 });
	assert.deepEqual(await credits.spendCredit(db, 1, 'r1', NOW), { ok: true, source: 'free_daily' });
	assert.deepEqual(await credits.spendCredit(db, 1, 'r1', NOW), { ok: false, reason: 'duplicate' });
	assert.deepEqual(await credits.spendCredit(db, 1, 'r2', NOW), { ok: false, reason: 'no_credit' });
	await credits.grantCredits(db, 1, 2, 'admin', 'g1', NOW, 'pilot');
	assert.deepEqual(await credits.spendCredit(db, 1, 'r3', NOW), { ok: true, source: 'paid' });
	s = await credits.creditStatus(db, 1, NOW);
	assert.equal(s.balance, 1);
	assert.equal(s.free_left, 0);
	assert.equal(await credits.refundCredit(db, 1, 'r3', NOW), true);
	assert.equal(await credits.refundCredit(db, 1, 'r3', NOW), false, 'refund once');
	assert.equal((await credits.creditStatus(db, 1, NOW)).balance, 2);
	assert.equal(await credits.refundCredit(db, 1, 'r1', NOW), true);
	assert.equal((await credits.creditStatus(db, 1, NOW)).free_left, 1, 'free refund restores today quota');
	assert.equal(await credits.refundCredit(db, 1, 'nope', NOW), false);
	await credits.spendCredit(db, 1, 'r4', NOW);
	assert.equal((await credits.creditStatus(db, 1, NOW)).free_left, 0);
	assert.equal((await credits.creditStatus(db, 1, TOMORROW)).free_left, 1, 'new WIB day');
	// 23:30 WIB (16:30Z) is still the same WIB day as 12:00 WIB
	assert.equal((await credits.creditStatus(db, 1, new Date('2026-10-03T16:30:00Z'))).free_left, 0);
	assert.equal((await credits.creditStatus(db, 2, NOW)).free_left, 1, 'per user');
	await assert.rejects(credits.grantCredits(db, 1, 0, 'admin', null, NOW));
});

// ---------------------------------------------------------------- pipeline

test('FULL: pilot bank scenario -> card without AI and without credit', async () => {
	const { db, raw } = seeded();
	const ai = mockAi([]);
	const r = await pipeline.runTomorrow(deps(db, { provider: provider.workersAiProvider(ai) }), 1, 'Besok operan pasien ICU dengan dokter asing dari Australia', 'B1');
	assert.equal(r.status, 'bank');
	assert.equal(r.coverage, 'FULL');
	assert.equal(r.charged, false);
	assert.equal(ai.calls.length, 0);
	assert.equal(r.card.phrases.length, 5);
	assert.equal(r.card.ready_answers.length, 3);
	assert.equal(r.card.traps.length, 2);
	assert.equal(r.credits.free_left, 1);
	assert.equal(raw.prepare('SELECT COUNT(*) n FROM rlec_ai_usage').get().n, 0);
	assert.equal(raw.prepare('SELECT COUNT(*) n FROM rlec_credit_ledger').get().n, 0);
	const sess = raw.prepare('SELECT mode, scenario_id, model_route FROM rlec_sessions WHERE id = ?').get(r.session_id);
	assert.equal(sess.mode, 'tomorrow');
	assert.equal(sess.model_route, 'bank');
	// non-pilot cannot see 'pilot' scenarios -> no FULL from them; without AI -> bank-only fallback
	const np = await pipeline.runTomorrow({ db, now: NOW, pilot: false }, 2, 'Besok operan pasien ICU dengan dokter asing', 'B1');
	assert.equal(np.status, 'fallback');
	assert.equal(np.reason, 'no_ai');
});

test('PARTIAL: ECW anchors + Workers AI -> validated personal card, 1 credit, usage logged in Rupiah, warehouse untouched', async () => {
	const { db, raw } = seeded();
	const ecw = ecwFixture();
	const before = ecw.raw.prepare('SELECT COUNT(*) n FROM scenarios').get().n;
	const ai = mockAi([icuCard()]);
	const text = 'Besok saya harus jelaskan prosedur ke keluarga pasien di ICU. HP saya 081234567890';
	const r = await pipeline.runTomorrow(deps(db, { provider: provider.workersAiProvider(ai), ecwDb: ecw.db }), 1, text, 'A2');
	assert.equal(r.status, 'generated', JSON.stringify(r));
	assert.equal(r.coverage, 'PARTIAL');
	assert.equal(r.charged, true);
	assert.equal(r.attempts, 1);
	assert.ok(r.anchors.some((a) => a.ref === 'ECW-01307'), 'ICU Procedure explanation A2 anchor');
	assert.equal(r.credits.free_left, 0);
	const prompt = ai.calls[0].input.messages.map((m) => m.content).join('\n');
	assert.match(prompt, /ROLE LOCK/);
	assert.match(prompt, /SCENARIO LOCK: domain D04/);
	assert.match(prompt, /LEVEL LOCK: CEFR A2/);
	assert.match(prompt, /ECW-01307/);
	assert.doesNotMatch(prompt, /081234567890/, 'PII redacted before leaving the server');
	assert.equal(r.card.counterpart_role, "Patient's family member");
	const usage = raw.prepare('SELECT provider, model, input_tokens, output_tokens, cost_idr, session_id FROM rlec_ai_usage').all();
	assert.equal(usage.length, 1);
	assert.equal(usage[0].provider, 'workers-ai');
	assert.equal(usage[0].cost_idr, 20.67);
	assert.equal(usage[0].session_id, r.session_id);
	const sc = raw.prepare('SELECT source_kind, owner_user_id, status, created_by, cefr, domain FROM rlec_scenarios WHERE id = ?').get(r.scenario_id);
	assert.deepEqual({ ...sc }, { source_kind: 'tomorrow', owner_user_id: 1, status: 'qc_passed', created_by: 'llm', cefr: 'A2', domain: 'healthcare' });
	// raw text only in the learner's own note
	assert.equal(raw.prepare('SELECT text FROM rlec_tomorrow_notes WHERE id = ?').get(r.note_id).text, text);
	const leaked = raw.prepare("SELECT COUNT(*) n FROM rlec_scenarios WHERE title LIKE '%keluarga%' OR goal LIKE '%Besok%' OR model_instructions LIKE '%Besok%'").get().n;
	assert.equal(leaked, 0);
	assert.equal(raw.prepare('SELECT COUNT(*) n FROM rlec_tomorrow_cards WHERE card_json LIKE ?').get('%0812%').n, 0);
	assert.equal(ecw.raw.prepare('SELECT COUNT(*) n FROM scenarios').get().n, before);
	// other users cannot see the personal scenario
	const db2 = await loadRlec('db');
	const { items } = await db2.listScenarios(db, 2, { domain: null, cefr: null, q: null, limit: 50, offset: 0, source_kind: 'tomorrow' }, { pilot: true });
	assert.equal(items.length, 0);

	// same fence + level again -> own card, free, no AI call
	await credits.grantCredits(db, 1, 1, 'admin', null, NOW);
	const again = await pipeline.runTomorrow(deps(db, { provider: provider.workersAiProvider(ai), ecwDb: ecw.db }), 1, 'Besok jelaskan prosedur lagi ke keluarga pasien ICU', 'A2');
	assert.equal(again.status, 'own');
	assert.equal(again.charged, false);
	assert.equal(ai.calls.length, 1);
	assert.equal(again.credits.balance, 1);
});

test('validator gate: 1 retry with errors fed back; second failure refunds and falls back', async () => {
	const { db, raw } = seeded();
	const bad = icuCard();
	bad.phrases[0] = 'Kami akan melakukan prosedur kecil untuk bapak';
	const ai = mockAi([bad, icuCard()]);
	const r = await pipeline.runTomorrow(deps(db, { provider: provider.workersAiProvider(ai) }), 1, 'Besok jelaskan prosedur ke keluarga pasien di ICU', 'A2');
	assert.equal(r.status, 'generated');
	assert.equal(r.attempts, 2);
	assert.match(ai.calls[1].input.messages[1].content, /english: phrases\[0\]/);
	assert.equal(raw.prepare('SELECT COUNT(*) n FROM rlec_ai_usage').get().n, 2);

	const { db: dbB, raw: rawB } = seeded();
	const dose = icuCard();
	dose.phrases[1] = 'We give 5 mg of morphine now.';
	const ai2 = mockAi([dose, 'not json at all']);
	const f = await pipeline.runTomorrow(deps(dbB, { provider: provider.workersAiProvider(ai2) }), 1, 'Besok jelaskan prosedur ke keluarga pasien di ICU', 'A2');
	assert.equal(f.status, 'fallback');
	assert.equal(f.reason, 'qc_failed');
	assert.equal(f.credits.free_left, 1, 'refunded');
	assert.equal(rawB.prepare("SELECT COUNT(*) n FROM rlec_credit_ledger WHERE kind = 'refund'").get().n, 1);
	assert.equal(rawB.prepare('SELECT COUNT(*) n FROM rlec_ai_usage').get().n, 2, 'cost is still logged');
	assert.equal(rawB.prepare("SELECT COUNT(*) n FROM rlec_scenarios WHERE source_kind = 'tomorrow'").get().n, 0);
	assert.ok(f.suggestions.length >= 1, 'bank-only suggestions in the fence');
});

test('AI error, budget cap, no credit, unclear intent -> bank-only fallback', async () => {
	const { db, raw } = seeded();
	const err = await pipeline.runTomorrow(deps(db, { provider: provider.workersAiProvider(mockAi([new Error('3040: capacity')])) }), 1, 'Besok jelaskan prosedur ke keluarga pasien di ICU', 'A2');
	assert.equal(err.reason, 'ai_error');
	assert.equal(err.credits.free_left, 1);

	raw.exec("INSERT INTO rlec_ai_usage (provider, model, cost_idr) VALUES ('workers-ai', 'x', 10000000)");
	const ai = mockAi([icuCard()]);
	const cap = await pipeline.runTomorrow(deps(db, { provider: provider.workersAiProvider(ai) }), 1, 'Besok jelaskan prosedur ke keluarga pasien di ICU', 'A2');
	assert.equal(cap.reason, 'budget_cap');
	assert.equal(ai.calls.length, 0);
	assert.equal(raw.prepare("SELECT COUNT(*) n FROM rlec_credit_ledger WHERE ref LIKE 'tomorrow:%' AND kind='spend'").get().n, 1, 'only the ai_error attempt spent (and was refunded)');
	raw.exec('DELETE FROM rlec_ai_usage');

	// free quota used by a success, then no credit
	const ok = await pipeline.runTomorrow(deps(db, { provider: provider.workersAiProvider(mockAi([icuCard()])) }), 1, 'Besok jelaskan prosedur ke keluarga pasien di ICU', 'A2');
	assert.equal(ok.status, 'generated');
	const ai3 = mockAi([icuCard()]);
	const none = await pipeline.runTomorrow(deps(db, { provider: provider.workersAiProvider(ai3) }), 1, 'Besok makan siang di restoran dengan tamu', 'A2');
	assert.equal(none.reason, 'no_credit');
	assert.equal(ai3.calls.length, 0);

	// unclear text: LLM intent call returns junk -> refund, 'unclear'
	const ai4 = mockAi([{ domain_id: 'D99' }]);
	const u = await pipeline.runTomorrow(deps(db, { provider: provider.workersAiProvider(ai4), now: TOMORROW }), 2, 'hmm entahlah', 'A2');
	assert.equal(u.reason, 'unclear');
	assert.equal(u.credits.free_left, 1);

	// kill switch
	raw.exec("UPDATE rlec_config SET value = '0' WHERE key = 'tomorrow_llm_enabled'");
	const off = await pipeline.runTomorrow(deps(db, { provider: provider.workersAiProvider(mockAi([])), now: TOMORROW }), 2, 'Besok jelaskan prosedur ke keluarga pasien di ICU', 'A2');
	assert.equal(off.reason, 'llm_disabled');
});
