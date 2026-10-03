// RLEC Learning Memory — pure logic (no I/O). Positive evidence (wins) and
// negative evidence (errors) move a per-skill strength 0..1; mastery is derived.
import { toSqliteDate } from './core';

export const SKILLS = [
	'FLUENCY',
	'VOCAB_RANGE',
	'GRAMMAR_ACCURACY',
	'PRONUNCIATION',
	'LISTENING',
	'INTERACTION',
	'PROFESSIONAL_REGISTER',
	'CONFIDENCE'
] as const;
export type SkillCode = (typeof SKILLS)[number];
export const SUCCESS_KINDS = ['retry_success', 'correct_use', 'phrase_used', 'scenario_completed'] as const;
export type SuccessKind = (typeof SUCCESS_KINDS)[number];
export type MasteryLevel = 'emerging' | 'developing' | 'secure' | 'mastered';

/** Error pattern -> the skill it weakens (and that its retry success strengthens). */
export const PATTERN_SKILL: Record<string, SkillCode> = {
	PAST_TENSE_OMISSION: 'GRAMMAR_ACCURACY',
	ARTICLE_OMISSION: 'GRAMMAR_ACCURACY',
	SV_AGREEMENT: 'GRAMMAR_ACCURACY',
	PREPOSITION_CONFUSION: 'GRAMMAR_ACCURACY',
	PLURAL_S_OMISSION: 'GRAMMAR_ACCURACY',
	WORD_ORDER_QUESTION: 'GRAMMAR_ACCURACY',
	TRANSLATION_STYLE: 'INTERACTION',
	LIMITED_VOCAB: 'VOCAB_RANGE',
	OVERUSE_VERY: 'VOCAB_RANGE',
	HESITATION_LONG_PAUSE: 'FLUENCY',
	PRON_TH: 'PRONUNCIATION',
	PRON_FINAL_CONSONANT: 'PRONUNCIATION',
	WORD_STRESS: 'PRONUNCIATION',
	REGISTER_TOO_CASUAL: 'PROFESSIONAL_REGISTER'
};
export const skillForPattern = (code: string): SkillCode | null => PATTERN_SKILL[code] ?? null;

export const STRENGTH_START = 0.3;
const GAIN: Record<SuccessKind, number> = { retry_success: 0.12, correct_use: 0.1, phrase_used: 0.06, scenario_completed: 0.08 };
const LOSS_PER_SEVERITY = 0.05; // severity 1..3 -> lose 5..15% of current strength
const WEEK_MS = 7 * 86_400_000;
const r3 = (n: number) => Math.round(n * 1000) / 1000;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function masteryLevel(strength: number, evidenceCount: number): MasteryLevel {
	if (strength >= 0.85 && evidenceCount >= 8) return 'mastered';
	if (strength >= 0.6) return 'secure';
	if (strength >= 0.35) return 'developing';
	return 'emerging';
}

export type SkillState = {
	strength: number;
	evidence_count: number;
	positive_count: number;
	negative_count: number;
	baseline_strength: number;
	baseline_at: string;
};

export type Evidence = { positive: true; kind: SuccessKind } | { positive: false; severity: number };

/**
 * Apply one piece of evidence. Gains are diminishing (x(1-s)), losses proportional (x s),
 * so strength stays in 0..1 and one bad turn never wipes out a week of wins.
 * The 7-day baseline rolls forward when it is older than a week; trend_delta is
 * "how much stronger than about a week ago".
 */
export function applyEvidence(prev: SkillState | null, ev: Evidence, now: Date) {
	const ts = toSqliteDate(now);
	const base: SkillState = prev ?? {
		strength: STRENGTH_START,
		evidence_count: 0,
		positive_count: 0,
		negative_count: 0,
		baseline_strength: STRENGTH_START,
		baseline_at: ts
	};
	let baselineStrength = base.baseline_strength;
	let baselineAt = base.baseline_at;
	const baselineTime = new Date(`${base.baseline_at.replace(' ', 'T')}Z`).getTime();
	if (!Number.isNaN(baselineTime) && now.getTime() - baselineTime >= WEEK_MS) {
		baselineStrength = base.strength;
		baselineAt = ts;
	}
	const s = base.strength;
	const next = ev.positive
		? s + GAIN[ev.kind] * (1 - s)
		: s - LOSS_PER_SEVERITY * Math.min(3, Math.max(1, ev.severity)) * s;
	const strength = r3(clamp01(next));
	const evidence_count = base.evidence_count + 1;
	return {
		strength,
		evidence_count,
		positive_count: base.positive_count + (ev.positive ? 1 : 0),
		negative_count: base.negative_count + (ev.positive ? 0 : 1),
		baseline_strength: r3(baselineStrength),
		baseline_at: baselineAt,
		trend_delta: r3(strength - baselineStrength),
		mastery_level: masteryLevel(strength, evidence_count),
		last_evidence_at: ts
	};
}

/** Guess the skill a free-text "win" is evidence for. Defaults to INTERACTION. */
export function skillForWin(text: string): SkillCode {
	const t = text.toLowerCase();
	if (/pronunciation|pronounc|sound|stress|intonation|\bth\b/.test(t)) return 'PRONUNCIATION';
	if (/polite|formal|professional|tone|register|empath|respectful/.test(t)) return 'PROFESSIONAL_REGISTER';
	if (/tense|grammar|article|agreement|preposition|plural|sentence structure|word order/.test(t)) return 'GRAMMAR_ACCURACY';
	if (/fluen|smooth|without pause|kept going|natural flow|filler/.test(t)) return 'FLUENCY';
	if (/understood|listen|followed|caught/.test(t)) return 'LISTENING';
	if (/confiden|handled the (delay|challenge|problem)|stayed calm|did not give up|finished/.test(t)) return 'CONFIDENCE';
	if (/phrase|vocabular|word choice|expression|idiom/.test(t)) return 'VOCAB_RANGE';
	return 'INTERACTION';
}
