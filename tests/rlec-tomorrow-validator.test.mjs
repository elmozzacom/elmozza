// Tomorrow Mode step 1: deterministic Tomorrow Card validator.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRlec } from './helpers/rlec-load.mjs';

const v = await loadRlec('tomorrow/validator');

export const goodCard = () => ({
	title: 'ICU handover to a visiting night doctor',
	level: 'B1',
	domain_id: 'D04',
	place: 'ICU',
	situation: 'Handover',
	learner_role: 'Day-shift ICU doctor',
	counterpart_role: 'Night doctor visiting from Australia',
	opener: "Hi, I'm the day doctor. Shall we start the handover?",
	phrases: [
		'Let me start with the stable patient in bed two.',
		'He has been stable all day.',
		'The patient in bed five needs close watching.',
		'Please call me if her blood pressure drops.',
		'Do you have any questions before I go?'
	],
	ready_answers: [
		{ question: 'Any allergies I should know about?', answer: 'Yes, she is allergic to penicillin.' },
		{ question: 'What is the plan for tonight?', answer: 'Keep watching her and repeat the labs at midnight.' },
		{ question: 'Who is the family contact?', answer: 'Her daughter. The number is in the chart.' }
	],
	traps: [
		{ trap: 'Saying "the patient is good" when you mean stable.', fix: 'Say: "The patient is stable."' },
		{ trap: 'The doctor speaks fast and you miss a question.', fix: 'Say: "Sorry, could you say that again more slowly?"' }
	],
	safety_note: 'Language practice only. Follow your hospital protocol.'
});
const intent = { domain_id: 'D04', place: 'ICU', counterpart: 'foreign doctor', level: 'B1' };

test('good card passes with clinical flag and no errors', () => {
	const r = v.validateCard(goodCard(), intent);
	assert.deepEqual(r.errors, []);
	assert.equal(r.ok, true);
	assert.equal(r.flags.clinical, true);
});

test('missing / wrong counts are rejected', () => {
	const c = goodCard();
	c.phrases = c.phrases.slice(0, 4);
	c.traps = [c.traps[0]];
	delete c.opener;
	const r = v.validateCard(c, intent);
	assert.equal(r.ok, false);
	assert.ok(r.errors.some((e) => e.startsWith('phrases')));
	assert.ok(r.errors.some((e) => e.startsWith('traps')));
	assert.ok(r.errors.some((e) => e.startsWith('opener')));
	assert.equal(v.validateCard(null, intent).ok, false);
});

test('roles must be two distinct fixed roles; learner lines cannot be spoken by the counterpart', () => {
	const c = goodCard();
	c.counterpart_role = c.learner_role;
	assert.ok(v.validateCard(c, intent).errors.some((e) => e.startsWith('roles')));
	const d = goodCard();
	d.phrases[0] = 'Night doctor: Tell me about bed two.';
	assert.ok(v.validateCard(d, intent).errors.some((e) => e.startsWith('role:')));
});

test('level must match and long lines fail for A1/A2', () => {
	assert.ok(v.validateCard(goodCard(), { ...intent, level: 'A2' }).errors.some((e) => e.includes('requested A2')));
	const c = { ...goodCard(), level: 'A1' };
	c.phrases[1] = 'He has been completely stable for the whole day shift and nothing unusual happened during my rounds today.';
	const r = v.validateCard(c, { ...intent, level: 'A1' });
	assert.ok(r.errors.some((e) => e.startsWith('level: phrases[1]')));
});

test('domain / place fence rejects a different place or domain', () => {
	assert.ok(v.validateCard({ ...goodCard(), domain_id: 'D05' }, intent).errors.some((e) => e.startsWith('fence: domain')));
	assert.ok(v.validateCard({ ...goodCard(), place: 'Hotel lobby' }, intent).errors.some((e) => e.startsWith('fence')));
	assert.ok(v.validateCard({ ...goodCard(), title: 'Ordering lunch at a restaurant' }, intent).errors.some((e) => e.includes('restaurant')));
	// same-domain place drift is only a warning
	const w = v.validateCard({ ...goodCard(), place: 'Inpatient ward' }, intent);
	assert.equal(w.ok, true);
	assert.ok(w.warnings.some((x) => x.startsWith('fence')));
});

test('English-only content', () => {
	const c = goodCard();
	c.phrases[2] = 'Pasien di bed lima harus dipantau dengan ketat ya';
	assert.ok(v.validateCard(c, intent).errors.some((e) => e === 'english: phrases[2] is not English'));
	assert.equal(v.looksIndonesian('Could you say that again, please?'), false);
	assert.equal(v.looksIndonesian('saya mau rapat besok'), true);
});

test('PII / patient data patterns are caught and redacted', () => {
	const samples = {
		phone: 'Call me at 0812-3456-7890.',
		email: 'Send it to rina.s@rsud.go.id',
		mrn: 'His MRN: 00123456 is in the chart.',
		nik: 'ID 3174012345678901 on file.',
		dob: 'Date of birth 12/03/1961.',
		person_name: 'Tn. Budiman in bed five is stable.'
	};
	for (const [kind, text] of Object.entries(samples)) {
		assert.ok(v.findPii(text).some((h) => h.kind === kind), kind);
		const c = goodCard();
		c.phrases[0] = text;
		const r = v.validateCard(c, intent);
		assert.equal(r.flags.pii, true, kind);
		assert.ok(r.errors.some((e) => e.startsWith('pii: phrases[0]')), kind);
	}
	assert.equal(v.redactPii('Pasien Tn. Budiman, RM 1234567, HP 081234567890'), 'Pasien [name], [mrn], HP [phone]');
	assert.deepEqual(v.findPii('Good morning, Dr. Martins. The patient is stable.'), []);
});

test('clinical-safety: doses and treatment advice are rejected', () => {
	const c = goodCard();
	c.ready_answers[1].answer = 'Give 5 mg morphine every four hours.';
	c.phrases[4] = 'You should stop taking the medicine.';
	const r = v.validateCard(c, intent);
	assert.ok(r.errors.some((e) => e.includes('drug dose')));
	assert.ok(r.errors.some((e) => e.includes('treatment advice')));
	const n = goodCard();
	delete n.safety_note;
	assert.ok(v.validateCard(n, intent).warnings.some((w) => w.startsWith('clinical')));
});
