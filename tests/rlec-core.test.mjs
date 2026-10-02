// RLEC Phase 1: pure logic (profile defaults, validation, mastery/SM-2, review ordering, budget).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRlec } from './helpers/rlec-load.mjs';

const core = await loadRlec('core');
const budget = await loadRlec('budget');
const NOW = new Date('2026-10-03T08:00:00Z');

test('rlec: default profile is guided/beginner/free, 10 minutes, native id', () => {
	const p = core.defaultProfile(7);
	assert.deepEqual(p, {
		user_id: 7,
		cefr_self: null,
		cefr_estimated: null,
		native_lang: 'id',
		goals: [],
		domains: [],
		preferred_mode: 'guided',
		correction_style: 'beginner',
		session_minutes_default: 10,
		tier: 'free'
	});
	const row = core.profileFromRow({ user_id: 7, goals_json: '["bicara dengan pasien"]', domains_json: 'not json', tier: 'hacker', cefr_self: 'B1' });
	assert.deepEqual(row.goals, ['bicara dengan pasien']);
	assert.deepEqual(row.domains, []);
	assert.equal(row.tier, 'free');
	assert.equal(row.cefr_self, 'B1');
});

test('rlec: profile patch accepts learner fields and rejects tier/cefr_estimated/bad values', () => {
	const ok = core.validateProfilePatch({ cefr_self: 'A2', domains: ['healthcare', 'travel', 'travel'], session_minutes_default: 15 });
	assert.equal(ok.ok, true);
	assert.deepEqual(ok.value.domains, ['healthcare', 'travel']);
	for (const bad of [{ tier: 'coach' }, { cefr_estimated: 'C2' }, { cefr_self: 'Z9' }, { session_minutes_default: 2 }, { domains: ['Health Care'] }, { goals: Array(6).fill('x') }, {}, null, []]) {
		assert.equal(core.validateProfilePatch(bad).ok, false, JSON.stringify(bad));
	}
	assert.equal(core.validateProfilePatch({ cefr_self: null }).ok, true);
});

test('rlec: scenario filters validate and LIKE input is escaped', () => {
	const f = core.parseScenarioFilters(new URLSearchParams('domain=healthcare&cefr=b1&q=50%_off'));
	assert.equal(f.ok, true);
	assert.equal(f.value.cefr, 'B1');
	assert.equal(f.value.limit, 20);
	assert.equal(core.likePattern('50%_off\\'), '%50\\%\\_off\\\\%');
	assert.equal(core.parseScenarioFilters(new URLSearchParams('cefr=Z1')).ok, false);
	assert.equal(core.parseScenarioFilters(new URLSearchParams('limit=500')).ok, false);
	assert.equal(core.parseScenarioFilters(new URLSearchParams("domain=x' OR 1=1")).ok, false);
});

test('rlec: session start/complete validation and id parsing', () => {
	assert.equal(core.validateSessionStart({ mode: 'tomorrow', scenario_id: 3, planned_minutes: 10, confidence_before: 2 }).ok, true);
	assert.equal(core.validateSessionStart({ mode: 'chat' }).ok, false);
	assert.equal(core.validateSessionStart({ mode: 'guided', planned_minutes: 0 }).ok, false);
	assert.equal(core.validateSessionStart({ mode: 'guided', scenario_id: '3' }).ok, false);
	assert.deepEqual(core.validateSessionComplete(null), { ok: true, value: { confidence_after: null, want_continue: null, notes: null } });
	assert.equal(core.validateSessionComplete({ confidence_after: 6 }).ok, false);
	assert.equal(core.validateSessionComplete({ want_continue: 'yes' }).ok, false);
	assert.equal(core.validateSessionComplete({ notes: 'x'.repeat(1001) }).ok, false);
	assert.equal(core.parseId('12'), 12);
	for (const bad of ['0', '-1', '1.5', 'abc', '01', undefined, '99999999999999999']) assert.equal(core.parseId(bad), null, String(bad));
});

test('rlec: error event validation', () => {
	const ok = core.validateErrorEvent({ pattern_code: 'PAST_TENSE_OMISSION', wrong_text: ' Yesterday I go ', fixed_text: 'Yesterday I went', retry_success: true });
	assert.equal(ok.ok, true);
	assert.equal(ok.value.wrong_text, 'Yesterday I go');
	assert.equal(ok.value.session_id, null);
	assert.equal(core.validateErrorEvent({ pattern_code: 'past', retry_success: true }).ok, false);
	assert.equal(core.validateErrorEvent({ pattern_code: 'SV_AGREEMENT' }).ok, false, 'retry_success required');
	assert.equal(core.validateErrorEvent({ pattern_code: 'SV_AGREEMENT', retry_success: false, turn_id: 4 }).ok, false, 'turn needs session');
	assert.equal(core.validateErrorEvent({ pattern_code: 'SV_AGREEMENT', retry_success: false, severity: 4 }).ok, false);
	assert.equal(core.validateErrorEvent({ pattern_code: 'SV_AGREEMENT', retry_success: false, wrong_text: 'x'.repeat(501) }).ok, false);
});

test('rlec: mastery rises on successful retry, falls on failed retry, clamped 0..1', () => {
	const first = core.applyErrorEvent(null, { retry_success: true, severity: 2 }, NOW);
	assert.equal(first.frequency, 1);
	assert.equal(first.mastery_score, 0.15);
	const fail = core.applyErrorEvent(first, { retry_success: false, severity: 2 }, NOW);
	assert.equal(fail.frequency, 2);
	assert.equal(fail.mastery_score, 0);
	let s = null;
	for (let i = 0; i < 10; i += 1) s = core.applyErrorEvent(s, { retry_success: true, severity: 1 }, NOW);
	assert.equal(s.mastery_score, 1);
	assert.equal(s.frequency, 10);
});

test('rlec: scheduling reuses srs.ts SM-2 (1 day, 6 days, then ease-scaled; failure resets)', () => {
	const a = core.applyErrorEvent(null, { retry_success: true, severity: 2 }, NOW);
	assert.equal(a.interval_days, 1);
	assert.equal(a.repetitions, 1);
	assert.equal(a.next_review_at, '2026-10-04 08:00:00');
	const b = core.applyErrorEvent(a, { retry_success: true, severity: 2 }, NOW);
	assert.equal(b.interval_days, 6);
	assert.equal(b.next_review_at, '2026-10-09 08:00:00');
	const c = core.applyErrorEvent(b, { retry_success: true, severity: 2 }, NOW);
	assert.equal(c.interval_days, Math.round(6 * c.ease));
	const d = core.applyErrorEvent(c, { retry_success: false, severity: 2 }, NOW);
	assert.equal(d.repetitions, 0);
	assert.equal(d.interval_days, 1);
	assert.ok(d.ease < c.ease);
	assert.ok(d.ease >= 1.3);
});

test('rlec: review ordering is severity×frequency, then most overdue, then lowest mastery', () => {
	const rows = [
		{ pattern_code: 'ARTICLE_OMISSION', severity: 1, frequency: 5, mastery_score: 0.2, next_review_at: '2026-10-01 00:00:00' },
		{ pattern_code: 'TRANSLATION_STYLE', severity: 3, frequency: 2, mastery_score: 0.5, next_review_at: '2026-10-02 00:00:00' },
		{ pattern_code: 'SV_AGREEMENT', severity: 2, frequency: 3, mastery_score: 0.1, next_review_at: '2026-09-30 00:00:00' },
		{ pattern_code: 'PRON_TH', severity: 1, frequency: 9, mastery_score: 0, next_review_at: '2026-12-01 00:00:00' }
	];
	assert.deepEqual(core.rankErrors(rows).map((r) => [r.pattern_code, r.priority]), [
		['PRON_TH', 9],
		['SV_AGREEMENT', 6],
		['TRANSLATION_STYLE', 6],
		['ARTICLE_OMISSION', 5]
	]);
	const due = core.dueErrors(rows, NOW);
	assert.deepEqual(due.map((r) => r.pattern_code), ['SV_AGREEMENT', 'TRANSLATION_STYLE', 'ARTICLE_OMISSION'], 'not-yet-due PRON_TH excluded');
	assert.equal(core.dueErrors(rows, NOW, 1).length, 1);
});

test('rlec: session summary counts errors, retry rate, confidence delta, duration', () => {
	const s = core.buildSessionSummary({
		session: { id: 9, mode: 'guided', started_at: '2026-10-03 07:48:00', planned_minutes: 10, confidence_before: 2 },
		endedAt: NOW,
		complete: { confidence_after: 4, want_continue: true, notes: null },
		turns: 6,
		events: [
			{ pattern_code: 'SV_AGREEMENT', retry_success: 1 },
			{ pattern_code: 'SV_AGREEMENT', retry_success: 0 },
			{ pattern_code: 'PRON_TH', retry_success: 1 }
		],
		reviewDue: 2
	});
	assert.equal(s.duration_minutes, 12);
	assert.equal(s.confidence_delta, 2);
	assert.equal(s.errors_logged, 3);
	assert.equal(s.retry_success_rate, 0.67);
	assert.deepEqual(s.patterns, [{ code: 'SV_AGREEMENT', count: 2 }, { code: 'PRON_TH', count: 1 }]);
});

test('rlec: AI budget alerts at Rp2/5/8 juta of a Rp10 juta cap', () => {
	assert.equal(budget.BUDGET_CAP_IDR, 10_000_000);
	assert.deepEqual([...budget.BUDGET_ALERT_THRESHOLDS_IDR], [2_000_000, 5_000_000, 8_000_000]);
	const s = budget.budgetStatus(5_400_000);
	assert.deepEqual(s.crossed_thresholds, [2_000_000, 5_000_000]);
	assert.equal(s.next_threshold, 8_000_000);
	assert.equal(s.remaining_idr, 4_600_000);
	assert.equal(s.cap_reached, false);
	assert.equal(budget.budgetStatus(10_000_000).cap_reached, true);
	assert.deepEqual(budget.newlyCrossedThresholds(1_900_000, 5_100_000), [2_000_000, 5_000_000]);
	assert.deepEqual(budget.newlyCrossedThresholds(5_100_000, 5_200_000), []);
	assert.deepEqual(budget.budgetStatus(-5).crossed_thresholds, []);
});
