// Real-Life English Coach (RLEC) Phase 1 — pure logic, no I/O.
// Kept free of `$lib` aliases and DB access so tests can bundle it with esbuild.
import { sm2 } from '../srs';

export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export const SESSION_MODES = ['tomorrow', 'guided', 'free', 'comic', 'novel', 'byo', 'quiz'] as const;
export const PREFERRED_MODES = ['guided', 'free'] as const;
export const CORRECTION_STYLES = ['beginner', 'intermediate', 'advanced'] as const;
export const SERVABLE_SCENARIO_STATUSES = ['active', 'qc_passed'] as const;

export type Cefr = (typeof CEFR_LEVELS)[number];
export type SessionMode = (typeof SESSION_MODES)[number];

export type Result<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const oneOf = <T extends string>(list: readonly T[], v: unknown): v is T => typeof v === 'string' && (list as readonly string[]).includes(v);
const isInt = (v: unknown, min: number, max: number): v is number =>
	typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

/** SQLite `datetime('now')` format, so string comparison with CURRENT_TIMESTAMP works. */
export function toSqliteDate(date: Date): string {
	return date.toISOString().slice(0, 19).replace('T', ' ');
}

// ---------------------------------------------------------------- profile

export type LearnerProfile = {
	user_id: number;
	cefr_self: Cefr | null;
	cefr_estimated: Cefr | null;
	native_lang: string;
	goals: string[];
	domains: string[];
	preferred_mode: (typeof PREFERRED_MODES)[number];
	correction_style: (typeof CORRECTION_STYLES)[number];
	session_minutes_default: number;
	tier: 'free' | 'basic' | 'coach' | 'immersion';
};

export function defaultProfile(userId: number): LearnerProfile {
	return {
		user_id: userId,
		cefr_self: null,
		cefr_estimated: null,
		native_lang: 'id',
		goals: [],
		domains: [],
		preferred_mode: 'guided',
		correction_style: 'beginner',
		session_minutes_default: 10,
		tier: 'free'
	};
}

const parseJsonArray = (raw: unknown): string[] => {
	if (typeof raw !== 'string') return [];
	try {
		const v = JSON.parse(raw);
		return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
	} catch {
		return [];
	}
};

/** DB row (with *_json columns) -> API profile. */
export function profileFromRow(row: Record<string, unknown>): LearnerProfile {
	const base = defaultProfile(Number(row.user_id));
	return {
		...base,
		cefr_self: oneOf(CEFR_LEVELS, row.cefr_self) ? row.cefr_self : null,
		cefr_estimated: oneOf(CEFR_LEVELS, row.cefr_estimated) ? row.cefr_estimated : null,
		native_lang: typeof row.native_lang === 'string' ? row.native_lang : base.native_lang,
		goals: parseJsonArray(row.goals_json),
		domains: parseJsonArray(row.domains_json),
		preferred_mode: oneOf(PREFERRED_MODES, row.preferred_mode) ? row.preferred_mode : base.preferred_mode,
		correction_style: oneOf(CORRECTION_STYLES, row.correction_style) ? row.correction_style : base.correction_style,
		session_minutes_default: Number(row.session_minutes_default ?? base.session_minutes_default),
		tier: (['free', 'basic', 'coach', 'immersion'] as const).includes(row.tier as never)
			? (row.tier as LearnerProfile['tier'])
			: base.tier
	};
}

export type ProfilePatch = Partial<
	Pick<LearnerProfile, 'cefr_self' | 'native_lang' | 'goals' | 'domains' | 'preferred_mode' | 'correction_style' | 'session_minutes_default'>
>;

const DOMAIN_RE = /^[a-z][a-z0-9_]{1,31}$/;

/** Learner-editable fields only. `tier` and `cefr_estimated` are server-owned. */
export function validateProfilePatch(body: unknown): Result<ProfilePatch> {
	if (!isObject(body)) return { ok: false, errors: { body: 'JSON object required' } };
	const errors: Record<string, string> = {};
	const out: ProfilePatch = {};
	const allowed = new Set(['cefr_self', 'native_lang', 'goals', 'domains', 'preferred_mode', 'correction_style', 'session_minutes_default']);
	for (const key of Object.keys(body)) if (!allowed.has(key)) errors[key] = 'field not editable';

	if ('cefr_self' in body) {
		if (body.cefr_self === null || oneOf(CEFR_LEVELS, body.cefr_self)) out.cefr_self = body.cefr_self as Cefr | null;
		else errors.cefr_self = 'one of A1..C2 or null';
	}
	if ('native_lang' in body) {
		if (typeof body.native_lang === 'string' && /^[a-z]{2,3}$/.test(body.native_lang)) out.native_lang = body.native_lang;
		else errors.native_lang = '2-3 letter language code';
	}
	if ('goals' in body) {
		const g = body.goals;
		if (Array.isArray(g) && g.length <= 5 && g.every((x) => typeof x === 'string' && x.trim().length > 0 && x.length <= 120))
			out.goals = (g as string[]).map((x) => x.trim());
		else errors.goals = 'up to 5 non-empty strings, max 120 chars';
	}
	if ('domains' in body) {
		const d = body.domains;
		if (Array.isArray(d) && d.length <= 10 && d.every((x) => typeof x === 'string' && DOMAIN_RE.test(x)))
			out.domains = [...new Set(d as string[])];
		else errors.domains = 'up to 10 lowercase slugs';
	}
	if ('preferred_mode' in body) {
		if (oneOf(PREFERRED_MODES, body.preferred_mode)) out.preferred_mode = body.preferred_mode;
		else errors.preferred_mode = 'guided|free';
	}
	if ('correction_style' in body) {
		if (oneOf(CORRECTION_STYLES, body.correction_style)) out.correction_style = body.correction_style;
		else errors.correction_style = 'beginner|intermediate|advanced';
	}
	if ('session_minutes_default' in body) {
		if (isInt(body.session_minutes_default, 3, 60)) out.session_minutes_default = body.session_minutes_default;
		else errors.session_minutes_default = 'integer 3..60';
	}
	if (Object.keys(errors).length) return { ok: false, errors };
	if (!Object.keys(out).length) return { ok: false, errors: { body: 'no editable fields' } };
	return { ok: true, value: out };
}

// ---------------------------------------------------------------- scenarios

export type ScenarioFilters = { domain: string | null; cefr: Cefr | null; q: string | null; limit: number; offset: number };

export function parseScenarioFilters(params: URLSearchParams): Result<ScenarioFilters> {
	const errors: Record<string, string> = {};
	const domain = params.get('domain')?.trim() || null;
	const cefrRaw = params.get('cefr')?.trim().toUpperCase() || null;
	const q = params.get('q')?.trim() || null;
	const limit = params.has('limit') ? Number(params.get('limit')) : 20;
	const offset = params.has('offset') ? Number(params.get('offset')) : 0;
	if (domain !== null && !DOMAIN_RE.test(domain)) errors.domain = 'lowercase slug';
	if (cefrRaw !== null && !oneOf(CEFR_LEVELS, cefrRaw)) errors.cefr = 'one of A1..C2';
	if (q !== null && q.length > 80) errors.q = 'max 80 chars';
	if (!isInt(limit, 1, 50)) errors.limit = 'integer 1..50';
	if (!isInt(offset, 0, 10_000)) errors.offset = 'integer 0..10000';
	if (Object.keys(errors).length) return { ok: false, errors };
	return { ok: true, value: { domain, cefr: cefrRaw as Cefr | null, q, limit, offset } };
}

/** Escape LIKE wildcards; use with `ESCAPE '\\'`. */
export const likePattern = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

// ---------------------------------------------------------------- sessions

export type SessionStart = {
	mode: SessionMode;
	scenario_id: number | null;
	level: Cefr | null;
	planned_minutes: number | null;
	confidence_before: number | null;
};

export function validateSessionStart(body: unknown): Result<SessionStart> {
	if (!isObject(body)) return { ok: false, errors: { body: 'JSON object required' } };
	const errors: Record<string, string> = {};
	if (!oneOf(SESSION_MODES, body.mode)) errors.mode = SESSION_MODES.join('|');
	const scenario = body.scenario_id ?? null;
	if (scenario !== null && !isInt(scenario, 1, Number.MAX_SAFE_INTEGER)) errors.scenario_id = 'positive integer or null';
	const level = body.level ?? null;
	if (level !== null && !oneOf(CEFR_LEVELS, level)) errors.level = 'one of A1..C2 or null';
	const minutes = body.planned_minutes ?? null;
	if (minutes !== null && !isInt(minutes, 1, 120)) errors.planned_minutes = 'integer 1..120';
	const conf = body.confidence_before ?? null;
	if (conf !== null && !isInt(conf, 1, 5)) errors.confidence_before = 'integer 1..5';
	if (Object.keys(errors).length) return { ok: false, errors };
	return {
		ok: true,
		value: {
			mode: body.mode as SessionMode,
			scenario_id: scenario as number | null,
			level: level as Cefr | null,
			planned_minutes: minutes as number | null,
			confidence_before: conf as number | null
		}
	};
}

export type SessionComplete = { confidence_after: number | null; want_continue: boolean | null; notes: string | null };

export function validateSessionComplete(body: unknown): Result<SessionComplete> {
	if (body === null || body === undefined) body = {};
	if (!isObject(body)) return { ok: false, errors: { body: 'JSON object required' } };
	const errors: Record<string, string> = {};
	const conf = body.confidence_after ?? null;
	if (conf !== null && !isInt(conf, 1, 5)) errors.confidence_after = 'integer 1..5';
	const want = body.want_continue ?? null;
	if (want !== null && typeof want !== 'boolean') errors.want_continue = 'boolean';
	const notes = body.notes ?? null;
	if (notes !== null && (typeof notes !== 'string' || notes.length > 1000)) errors.notes = 'string, max 1000 chars';
	if (Object.keys(errors).length) return { ok: false, errors };
	return {
		ok: true,
		value: { confidence_after: conf as number | null, want_continue: want as boolean | null, notes: notes ? (notes as string).trim() || null : null }
	};
}

export const parseId = (raw: string | undefined): number | null => {
	if (!raw || !/^[1-9][0-9]{0,15}$/.test(raw)) return null;
	const n = Number(raw);
	return Number.isSafeInteger(n) ? n : null;
};

export type SessionSummary = {
	session_id: number;
	mode: string;
	duration_minutes: number;
	planned_minutes: number;
	confidence_before: number | null;
	confidence_after: number | null;
	confidence_delta: number | null;
	want_continue: boolean | null;
	turns: number;
	errors_logged: number;
	retry_success_rate: number | null;
	patterns: { code: string; count: number }[];
	review_due: number;
};

export function buildSessionSummary(input: {
	session: { id: number; mode: string; started_at: string; planned_minutes: number; confidence_before: number | null };
	endedAt: Date;
	complete: SessionComplete;
	turns: number;
	events: { pattern_code: string; retry_success: number | boolean }[];
	reviewDue: number;
}): SessionSummary {
	const started = new Date(`${input.session.started_at.replace(' ', 'T')}Z`);
	const minutes = Number.isNaN(started.getTime()) ? 0 : Math.max(0, Math.round((input.endedAt.getTime() - started.getTime()) / 60_000));
	const counts = new Map<string, number>();
	let successes = 0;
	for (const e of input.events) {
		counts.set(e.pattern_code, (counts.get(e.pattern_code) ?? 0) + 1);
		if (e.retry_success === true || e.retry_success === 1) successes += 1;
	}
	const before = input.session.confidence_before;
	const after = input.complete.confidence_after;
	return {
		session_id: input.session.id,
		mode: input.session.mode,
		duration_minutes: minutes,
		planned_minutes: input.session.planned_minutes,
		confidence_before: before,
		confidence_after: after,
		confidence_delta: before !== null && after !== null ? after - before : null,
		want_continue: input.complete.want_continue,
		turns: input.turns,
		errors_logged: input.events.length,
		retry_success_rate: input.events.length ? Math.round((successes / input.events.length) * 100) / 100 : null,
		patterns: [...counts.entries()].map(([code, count]) => ({ code, count })).sort((a, b) => b.count - a.count || a.code.localeCompare(b.code)),
		review_due: input.reviewDue
	};
}

// ---------------------------------------------------------------- error memory

export type ErrorEventInput = {
	pattern_code: string;
	wrong_text: string | null;
	fixed_text: string | null;
	retry_success: boolean;
	session_id: number | null;
	turn_id: number | null;
	severity: number | null;
};

const PATTERN_CODE_RE = /^[A-Z][A-Z0-9_]{2,47}$/;

export function validateErrorEvent(body: unknown): Result<ErrorEventInput> {
	if (!isObject(body)) return { ok: false, errors: { body: 'JSON object required' } };
	const errors: Record<string, string> = {};
	if (typeof body.pattern_code !== 'string' || !PATTERN_CODE_RE.test(body.pattern_code)) errors.pattern_code = 'UPPER_SNAKE pattern code';
	const text = (key: 'wrong_text' | 'fixed_text') => {
		const v = body[key] ?? null;
		if (v === null) return null;
		if (typeof v !== 'string' || v.length > 500) {
			errors[key] = 'string, max 500 chars';
			return null;
		}
		return v.trim() || null;
	};
	const wrong = text('wrong_text');
	const fixed = text('fixed_text');
	if (typeof body.retry_success !== 'boolean') errors.retry_success = 'boolean';
	const sid = body.session_id ?? null;
	if (sid !== null && !isInt(sid, 1, Number.MAX_SAFE_INTEGER)) errors.session_id = 'positive integer or null';
	const tid = body.turn_id ?? null;
	if (tid !== null && !isInt(tid, 1, Number.MAX_SAFE_INTEGER)) errors.turn_id = 'positive integer or null';
	if (tid !== null && sid === null) errors.turn_id = 'turn_id requires session_id';
	const sev = body.severity ?? null;
	if (sev !== null && !isInt(sev, 1, 3)) errors.severity = 'integer 1..3';
	if (Object.keys(errors).length) return { ok: false, errors };
	return {
		ok: true,
		value: {
			pattern_code: body.pattern_code as string,
			wrong_text: wrong,
			fixed_text: fixed,
			retry_success: body.retry_success as boolean,
			session_id: sid as number | null,
			turn_id: tid as number | null,
			severity: sev as number | null
		}
	};
}

export type LearnerErrorState = {
	frequency: number;
	severity: number;
	mastery_score: number;
	ease: number;
	interval_days: number;
	repetitions: number;
};

export const MASTERY_GAIN_ON_RETRY = 0.15;
export const MASTERY_LOSS_ON_REPEAT = 0.2;
const round3 = (n: number) => Math.round(n * 1000) / 1000;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * One corrected error -> next learner-error state.
 * - frequency always +1 (the pattern appeared again);
 * - mastery: +0.15 if the learner's retry succeeded, -0.20 if not (clamped 0..1);
 * - scheduling reuses SM-2 from srs.ts: retry success = quality 4, failure = quality 1
 *   (failure resets repetitions and brings the review back tomorrow).
 */
export function applyErrorEvent(
	prev: LearnerErrorState | null,
	event: { retry_success: boolean; severity: number },
	now: Date
): LearnerErrorState & { next_review_at: string } {
	const base: LearnerErrorState = prev ?? { frequency: 0, severity: event.severity, mastery_score: 0, ease: 2.5, interval_days: 0, repetitions: 0 };
	const mastery = clamp01(base.mastery_score + (event.retry_success ? MASTERY_GAIN_ON_RETRY : -MASTERY_LOSS_ON_REPEAT));
	const next = sm2(base.ease, base.interval_days, base.repetitions, event.retry_success ? 4 : 1);
	return {
		frequency: base.frequency + 1,
		severity: event.severity,
		mastery_score: round3(mastery),
		ease: round3(next.ease),
		interval_days: next.interval,
		repetitions: next.repetitions,
		next_review_at: toSqliteDate(new Date(now.getTime() + next.interval * 86_400_000))
	};
}

export type RankableError = {
	pattern_code: string;
	severity: number;
	frequency: number;
	mastery_score: number;
	next_review_at: string;
};

export const reviewPriority = (e: Pick<RankableError, 'severity' | 'frequency'>) => e.severity * e.frequency;

/** Order: severity×frequency desc, then most overdue first, then lowest mastery, then code. */
export function rankErrors<T extends RankableError>(rows: T[]): (T & { priority: number })[] {
	return rows
		.map((r) => ({ ...r, priority: reviewPriority(r) }))
		.sort(
			(a, b) =>
				b.priority - a.priority ||
				a.next_review_at.localeCompare(b.next_review_at) ||
				a.mastery_score - b.mastery_score ||
				a.pattern_code.localeCompare(b.pattern_code)
		);
}

/** Rows with next_review_at <= now, ranked. */
export function dueErrors<T extends RankableError>(rows: T[], now: Date, limit = 10): (T & { priority: number })[] {
	const cutoff = toSqliteDate(now);
	return rankErrors(rows.filter((r) => r.next_review_at <= cutoff)).slice(0, limit);
}
