// Tomorrow Card deterministic QC gate. Pure (no I/O). Every LLM card must pass
// this before it is saved or shown; bank cards pass it too.
import { CARD_LEVELS, type CardLevel, type TomorrowCard, type TomorrowIntent, type ValidationResult } from './types';
import { FOREIGN_PLACE_WORDS, RELATED_DOMAINS, domainById, hasKeyword } from './taxonomy';

export const CARD_COUNTS = { phrases: 5, ready_answers: 3, traps: 2 } as const;

/** Max words per learner line by level (warning above, error above 1.5x). */
export const LEVEL_MAX_WORDS: Record<CardLevel, number> = { A1: 10, A2: 12, B1: 18, B2: 24, C1: 30 };

// Indonesian function words that should never appear in English content fields.
const ID_WORDS = new Set(
	'yang dengan untuk saya tidak dan akan sudah bisa kamu anda besok mau ini itu dari ke pada adalah karena tapi juga belum harus kami kita mereka sangat sekali tolong terima kasih bapak ibu silakan apa bagaimana kenapa dimana kapan siapa nggak gak aja dong deh sih kok'.split(
		' '
	)
);

// ---------------------------------------------------------------- PII / patient data

export type PiiHit = { kind: 'phone' | 'email' | 'mrn' | 'dob' | 'nik' | 'person_name'; match: string };

const PII_PATTERNS: { kind: PiiHit['kind']; re: RegExp }[] = [
	{ kind: 'email', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
	{ kind: 'nik', re: /(?<!\d)\d{16}(?!\d)/g },
	{ kind: 'mrn', re: /\b(?:MRN|No\.?\s*RM|RM|rekam medis|medical record(?: number| no\.?)?)\s*[:#.]?\s*[A-Z]{0,3}[-\s]?\d{4,}/gi },
	{ kind: 'phone', re: /(?:\+62|\b62|\b0)8\d{1,3}[-\s]?\d{3,4}[-\s]?\d{3,5}\b|\+\d{1,3}[-\s]?\d{2,4}[-\s]?\d{3,4}[-\s]?\d{3,4}\b/g },
	{ kind: 'dob', re: /\b(?:DOB|date of birth|born on|tanggal lahir|tgl\.? lahir|lahir tanggal)\b[^.\n]{0,25}|\b(?:0?[1-9]|[12]\d|3[01])[/-](?:0?[1-9]|1[0-2])[/-](?:19|20)\d{2}\b/gi },
	// Indonesian patient-style honorifics + capitalised name (Tn. Budi, Ny. Sari, Bapak Ahmad, Ibu Rina, An. Dewi).
	{ kind: 'person_name', re: /\b(?:Tn|Ny|Nn|An|Sdr|Sdri|By)\.\s*[A-Z][a-z]{2,}|\b(?:Bapak|Ibu|Pak|Bu)\s+[A-Z][a-z]{2,}/g }
];

export function findPii(text: string): PiiHit[] {
	const hits: PiiHit[] = [];
	for (const { kind, re } of PII_PATTERNS) {
		for (const m of text.matchAll(re)) hits.push({ kind, match: m[0] });
	}
	return hits;
}

/** Replace PII with neutral placeholders before any text leaves the server (e.g. to an LLM). */
export function redactPii(text: string): string {
	let out = text;
	for (const { kind, re } of PII_PATTERNS) out = out.replace(re, kind === 'person_name' ? '[name]' : `[${kind}]`);
	return out;
}

// ---------------------------------------------------------------- helpers

const words = (s: string) => s.toLowerCase().match(/[\p{L}']+/gu) ?? [];
const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

function indonesianHits(s: string): number {
	return words(s).filter((w) => ID_WORDS.has(w)).length;
}

/** English-only check: >=2 Indonesian function words, or >20% of words. */
export function looksIndonesian(s: string): boolean {
	const w = words(s);
	if (!w.length) return false;
	const hits = indonesianHits(s);
	return hits >= 2 || (hits >= 1 && hits / w.length > 0.2);
}

/** Learner/counterpart content lines (not role labels or metadata). */
export function contentLines(card: TomorrowCard): { field: string; text: string; learner: boolean }[] {
	const out: { field: string; text: string; learner: boolean }[] = [];
	const push = (field: string, text: unknown, learner: boolean) => {
		if (typeof text === 'string') out.push({ field, text, learner });
	};
	push('title', card.title, false);
	push('situation', card.situation, false);
	push('opener', card.opener, true);
	(card.phrases ?? []).forEach((p, i) => push(`phrases[${i}]`, p, true));
	(card.ready_answers ?? []).forEach((r, i) => {
		push(`ready_answers[${i}].question`, r?.question, false);
		push(`ready_answers[${i}].answer`, r?.answer, true);
	});
	(card.traps ?? []).forEach((t, i) => {
		push(`traps[${i}].trap`, t?.trap, false);
		push(`traps[${i}].fix`, t?.fix, true);
	});
	if (card.safety_note) push('safety_note', card.safety_note, false);
	return out;
}

const DOSE_RE = /\b\d+(?:[.,]\d+)?\s?(?:mg|mcg|µg|ml|mL|cc|units?|IU|tablets?|tabs?)\b/;
const CLINICAL_ADVICE_RE = /\b(?:you should (?:take|stop|increase|decrease)|increase the dose|stop (?:taking|the) (?:medicine|medication|drug)|take \d+|double the dose|no need to see a doctor)\b/i;
// Coaching verbs that may precede a colon without being a speaker label ("Say: ...").
const NOT_SPEAKERS = new Set(['say', 'try', 'use', 'ask', 'tip', 'fix', 'instead', 'better', 'note', 'answer', 'reply', 'you can say']);
const CLINICAL_DOMAINS = new Set(['D04', 'D19']);

// ---------------------------------------------------------------- main gate

export function validateCard(card: unknown, intent: Pick<TomorrowIntent, 'domain_id' | 'place' | 'counterpart'> & { level: CardLevel }): ValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];
	const flags = { clinical: false, pii: false };
	if (!card || typeof card !== 'object' || Array.isArray(card)) {
		return { ok: false, errors: ['card: object required'], warnings, flags };
	}
	const c = card as TomorrowCard;

	// 1. required fields and exact counts
	for (const k of ['title', 'place', 'situation', 'learner_role', 'counterpart_role', 'opener', 'domain_id'] as const) {
		if (!nonEmpty(c[k])) errors.push(`${k}: required`);
	}
	if (!Array.isArray(c.phrases) || c.phrases.length !== CARD_COUNTS.phrases || !c.phrases.every(nonEmpty)) errors.push('phrases: exactly 5 non-empty strings');
	if (!Array.isArray(c.ready_answers) || c.ready_answers.length !== CARD_COUNTS.ready_answers || !c.ready_answers.every((r) => r && nonEmpty(r.question) && nonEmpty(r.answer)))
		errors.push('ready_answers: exactly 3 {question, answer}');
	if (!Array.isArray(c.traps) || c.traps.length !== CARD_COUNTS.traps || !c.traps.every((t) => t && nonEmpty(t.trap) && nonEmpty(t.fix))) errors.push('traps: exactly 2 {trap, fix}');
	if (errors.length) return { ok: false, errors, warnings, flags };

	// 2. two fixed roles + role consistency
	const lr = c.learner_role.trim().toLowerCase();
	const cr = c.counterpart_role.trim().toLowerCase();
	if (lr === cr) errors.push('roles: learner_role and counterpart_role must differ');
	const speakerLabel = /^\s*([A-Za-z .'-]{2,40}):\s/;
	for (const line of contentLines(c)) {
		const m = line.text.match(speakerLabel);
		if (m && line.learner) {
			const label = m[1].trim().toLowerCase();
			if (NOT_SPEAKERS.has(label)) continue;
			// Coaching instructions such as 'Stay calm and say:' / 'Then ask:' are not speaker labels.
			if (/\b(say|ask|answer|reply|tell (him|her|them))$/.test(label)) continue;
			if (!lr.includes(label) && !label.includes('you')) errors.push(`role: ${line.field} is spoken by "${m[1]}", not the learner`);
		}
	}
	if (c.ready_answers.some((r) => r.question.trim() === r.answer.trim())) errors.push('ready_answers: answer repeats the question');
	if (intent.counterpart) {
		const want = intent.counterpart.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
		if (want.length && !want.some((w) => cr.includes(w))) warnings.push(`role: counterpart "${c.counterpart_role}" does not mention "${intent.counterpart}"`);
	}

	// 3. level match
	if (!CARD_LEVELS.includes(c.level)) errors.push('level: A1..C1 required');
	else if (c.level !== intent.level) errors.push(`level: card is ${c.level}, requested ${intent.level}`);
	else {
		const max = LEVEL_MAX_WORDS[c.level];
		for (const line of contentLines(c).filter((l) => l.learner)) {
			const n = words(line.text).length;
			if (n > Math.ceil(max * 1.5)) errors.push(`level: ${line.field} has ${n} words (max ${max} for ${c.level})`);
			else if (n > max) warnings.push(`level: ${line.field} has ${n} words (target <= ${max})`);
		}
	}

	// 4. situation/domain fence
	if (intent.domain_id && c.domain_id !== intent.domain_id) errors.push(`fence: domain ${c.domain_id} != requested ${intent.domain_id}`);
	if (intent.place && c.place.trim().toLowerCase() !== intent.place.toLowerCase()) {
		const d = domainById(intent.domain_id);
		const sameDomainPlace = d?.places.some((p) => p.name.toLowerCase() === c.place.trim().toLowerCase());
		if (sameDomainPlace) warnings.push(`fence: place "${c.place}" differs from requested "${intent.place}" (same domain)`);
		else if (!c.place.toLowerCase().includes(intent.place.toLowerCase())) errors.push(`fence: place "${c.place}" is outside requested "${intent.place}"`);
	}
	if (intent.domain_id) {
		const allowed = new Set([intent.domain_id, ...(RELATED_DOMAINS[intent.domain_id] ?? [])]);
		const frame = `${c.title} | ${c.place} | ${c.situation}`;
		for (const [dom, ws] of Object.entries(FOREIGN_PLACE_WORDS)) {
			if (allowed.has(dom)) continue;
			const hit = ws.find((w) => hasKeyword(frame, w));
			if (hit) errors.push(`fence: "${hit}" belongs to ${dom}, not ${intent.domain_id}`);
		}
	}

	// 5. English-only content
	for (const line of contentLines(c)) {
		if (looksIndonesian(line.text)) errors.push(`english: ${line.field} is not English`);
	}

	// 6. PII / patient data
	for (const line of [...contentLines(c), { field: 'learner_role', text: c.learner_role }, { field: 'counterpart_role', text: c.counterpart_role }]) {
		const hits = findPii(line.text);
		if (hits.length) {
			flags.pii = true;
			errors.push(`pii: ${line.field} contains ${[...new Set(hits.map((h) => h.kind))].join(', ')}`);
		}
	}

	// 7. clinical safety
	if (CLINICAL_DOMAINS.has(c.domain_id) || CLINICAL_DOMAINS.has(intent.domain_id ?? '')) {
		flags.clinical = true;
		if (!nonEmpty(c.safety_note)) warnings.push('clinical: add a safety_note (language practice only, follow local protocol)');
	}
	for (const line of contentLines(c)) {
		if (DOSE_RE.test(line.text)) {
			flags.clinical = true;
			errors.push(`clinical: ${line.field} contains a drug dose`);
		}
		if (CLINICAL_ADVICE_RE.test(line.text)) {
			flags.clinical = true;
			errors.push(`clinical: ${line.field} gives treatment advice`);
		}
	}

	// 8. duplicates
	const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
	if (new Set(c.phrases.map(norm)).size !== c.phrases.length) errors.push('phrases: duplicates');

	return { ok: errors.length === 0, errors, warnings, flags };
}
