// RLEC Phase 1 — D1 access. Every query is scoped to the authenticated user.
import { error } from '@sveltejs/kit';
import type { D1Database } from '@cloudflare/workers-types';
import type { AuthUser } from '$lib/server/auth';
import {
	applyErrorEvent,
	buildSessionSummary,
	dueErrors,
	likePattern,
	profileFromRow,
	rankErrors,
	toSqliteDate,
	type ErrorEventInput,
	type LearnerProfile,
	type ProfilePatch,
	type RankableError,
	type ScenarioFilters,
	type SessionComplete,
	type SessionStart,
	LINK_CODE_TTL_MS
} from './core';
import { applyEvidence, skillForPattern, skillForWin, SKILLS, type Evidence, type SkillCode, type SuccessKind } from './learning';
import { buildByoPackage, UNCLASSIFIED, type ParsedSessionReport, type SessionReportSource } from './byo';

export type Access = { pilot: boolean };
const NO_PILOT: Access = { pilot: false };

/** API variant of requireUser: JSON 401 instead of a redirect to /login. */
export function requireApiUser(locals: App.Locals): { user: AuthUser; db: D1Database } {
	if (!locals.user) throw error(401, 'Login diperlukan.');
	if (!locals.db) throw error(503, 'Database belum terhubung.');
	return { user: locals.user, db: locals.db };
}

export async function readJson(request: Request): Promise<unknown> {
	const type = request.headers.get('content-type') ?? '';
	if (!type.includes('application/json')) throw error(415, 'Content-Type harus application/json.');
	const text = await request.text();
	if (text.length > 16_384) throw error(413, 'Body terlalu besar.');
	if (!text.trim()) return null;
	try {
		return JSON.parse(text);
	} catch {
		throw error(400, 'JSON tidak valid.');
	}
}

// ---------------------------------------------------------------- profile

export async function getOrCreateProfile(db: D1Database, userId: number): Promise<LearnerProfile> {
	await db.prepare('INSERT OR IGNORE INTO rlec_learner_profiles (user_id) VALUES (?)').bind(userId).run();
	const row = await db.prepare('SELECT * FROM rlec_learner_profiles WHERE user_id = ?').bind(userId).first<Record<string, unknown>>();
	if (!row) throw error(500, 'Profil gagal dibuat.');
	return profileFromRow(row);
}

export async function updateProfile(db: D1Database, userId: number, patch: ProfilePatch): Promise<LearnerProfile> {
	await getOrCreateProfile(db, userId);
	const sets: string[] = [];
	const values: unknown[] = [];
	const put = (column: string, value: unknown) => {
		sets.push(`${column} = ?`);
		values.push(value);
	};
	if ('cefr_self' in patch) put('cefr_self', patch.cefr_self ?? null);
	if (patch.native_lang !== undefined) put('native_lang', patch.native_lang);
	if (patch.goals !== undefined) put('goals_json', JSON.stringify(patch.goals));
	if (patch.domains !== undefined) put('domains_json', JSON.stringify(patch.domains));
	if (patch.preferred_mode !== undefined) put('preferred_mode', patch.preferred_mode);
	if (patch.correction_style !== undefined) put('correction_style', patch.correction_style);
	if (patch.session_minutes_default !== undefined) put('session_minutes_default', patch.session_minutes_default);
	sets.push("updated_at = datetime('now')");
	await db
		.prepare(`UPDATE rlec_learner_profiles SET ${sets.join(', ')} WHERE user_id = ?`)
		.bind(...values, userId)
		.run();
	return getOrCreateProfile(db, userId);
}

type ErrorRow = RankableError & { id: number; label: string; category: string; example_wrong: string | null; example_fixed: string | null; last_seen: string };

const ERROR_SELECT = `SELECT e.id, e.pattern_code, p.label, p.category, e.severity, e.frequency, e.mastery_score,
  e.next_review_at, e.example_wrong, e.example_fixed, e.last_seen
  FROM rlec_learner_errors e JOIN rlec_error_patterns p ON p.code = e.pattern_code
  WHERE e.user_id = ?`;

export async function topErrors(db: D1Database, userId: number, limit = 3) {
	const { results } = await db.prepare(`${ERROR_SELECT} ORDER BY e.severity * e.frequency DESC LIMIT 200`).bind(userId).all<ErrorRow>();
	return rankErrors(results ?? []).slice(0, limit);
}

export async function reviewDue(db: D1Database, userId: number, now: Date, limit = 10) {
	const { results } = await db
		.prepare(`${ERROR_SELECT} AND e.next_review_at <= ? ORDER BY e.severity * e.frequency DESC, e.next_review_at LIMIT 200`)
		.bind(userId, toSqliteDate(now))
		.all<ErrorRow>();
	const rows = results ?? [];
	return { total: rows.length, items: dueErrors(rows, now, limit) };
}

// ---------------------------------------------------------------- scenarios

/** Servable = active/qc_passed (+ 'pilot' for pilot users/superadmin) or the learner's own personal scenarios. */
const visible = (access: Access) => `((s.status IN (${access.pilot ? "'active','qc_passed','pilot'" : "'active','qc_passed'"})
  AND (s.owner_user_id IS NULL OR s.owner_user_id = ?))
  OR (s.owner_user_id = ? AND s.status != 'archived'))`;

export async function listScenarios(db: D1Database, userId: number, f: ScenarioFilters, access: Access = NO_PILOT) {
	const where = [visible(access)];
	const binds: unknown[] = [userId, userId];
	if (f.domain) {
		where.push('s.domain = ?');
		binds.push(f.domain);
	}
	if (f.cefr) {
		where.push('s.cefr = ?');
		binds.push(f.cefr);
	}
	if (f.source_kind) {
		where.push('s.source_kind = ?');
		binds.push(f.source_kind);
	}
	if (f.q) {
		where.push("(s.title LIKE ? ESCAPE '\\' OR s.situation LIKE ? ESCAPE '\\' OR s.place LIKE ? ESCAPE '\\')");
		const p = likePattern(f.q);
		binds.push(p, p, p);
	}
	const { results } = await db
		.prepare(
			`SELECT s.id, s.source_kind, s.source_ref, s.title, s.domain, s.subdomain, s.place, s.situation, s.cefr,
			        s.difficulty, s.goal, s.status, s.correction_policy, (s.owner_user_id IS NOT NULL) AS personal
			 FROM rlec_scenarios s WHERE ${where.join(' AND ')}
			 ORDER BY s.difficulty IS NULL, s.difficulty, s.id LIMIT ? OFFSET ?`
		)
		.bind(...binds, f.limit + 1, f.offset)
		.all<Record<string, unknown>>();
	const rows = results ?? [];
	return {
		items: rows.slice(0, f.limit).map((r) => ({ ...r, personal: Boolean(r.personal) })),
		has_more: rows.length > f.limit
	};
}

async function visibleScenario(db: D1Database, userId: number, scenarioId: number, access: Access = NO_PILOT) {
	return db
		.prepare(`SELECT s.id, s.cefr FROM rlec_scenarios s WHERE s.id = ? AND ${visible(access)}`)
		.bind(scenarioId, userId, userId)
		.first<{ id: number; cefr: string | null }>();
}

// ---------------------------------------------------------------- sessions

export async function startSession(db: D1Database, userId: number, input: SessionStart, access: Access = NO_PILOT) {
	const profile = await getOrCreateProfile(db, userId);
	let scenarioCefr: string | null = null;
	if (input.scenario_id !== null) {
		const scenario = await visibleScenario(db, userId, input.scenario_id, access);
		if (!scenario) throw error(404, 'Skenario tidak ditemukan.');
		scenarioCefr = scenario.cefr;
	}
	const level = input.level ?? scenarioCefr ?? profile.cefr_estimated ?? profile.cefr_self ?? null;
	const minutes = input.planned_minutes ?? profile.session_minutes_default;
	const row = await db
		.prepare(
			`INSERT INTO rlec_sessions (user_id, mode, scenario_id, level, planned_minutes, confidence_before)
			 VALUES (?, ?, ?, ?, ?, ?)
			 RETURNING id, mode, scenario_id, level, planned_minutes, started_at, confidence_before`
		)
		.bind(userId, input.mode, input.scenario_id, level, minutes, input.confidence_before)
		.first<Record<string, unknown>>();
	if (!row) throw error(500, 'Sesi gagal dibuat.');
	return row;
}

export async function completeSession(db: D1Database, userId: number, sessionId: number, input: SessionComplete, now: Date) {
	const session = await db
		.prepare('SELECT id, mode, started_at, planned_minutes, confidence_before, completed FROM rlec_sessions WHERE id = ? AND user_id = ?')
		.bind(sessionId, userId)
		.first<{ id: number; mode: string; started_at: string; planned_minutes: number; confidence_before: number | null; completed: number }>();
	if (!session) throw error(404, 'Sesi tidak ditemukan.');
	if (session.completed) throw error(409, 'Sesi sudah selesai.');
	const endedAt = toSqliteDate(now);
	const res = await db
		.prepare(
			`UPDATE rlec_sessions SET ended_at = ?, completed = 1, confidence_after = ?, want_continue = ?, notes = ?
			 WHERE id = ? AND user_id = ? AND completed = 0`
		)
		.bind(endedAt, input.confidence_after, input.want_continue === null ? null : input.want_continue ? 1 : 0, input.notes, sessionId, userId)
		.run();
	if (!res.meta.changes) throw error(409, 'Sesi sudah selesai.');
	await recordSuccessEvent(db, userId, { skill_code: 'CONFIDENCE', pattern_code: null, kind: 'scenario_completed', evidence_text: null, session_id: sessionId, source: 'internal' }, now);
	const [turns, events, due] = await Promise.all([
		db.prepare('SELECT COUNT(*) AS n FROM rlec_session_turns WHERE session_id = ?').bind(sessionId).first<{ n: number }>(),
		db
			.prepare('SELECT pattern_code, retry_success FROM rlec_error_events WHERE session_id = ? AND user_id = ?')
			.bind(sessionId, userId)
			.all<{ pattern_code: string; retry_success: number }>(),
		db
			.prepare('SELECT COUNT(*) AS n FROM rlec_learner_errors WHERE user_id = ? AND next_review_at <= ?')
			.bind(userId, endedAt)
			.first<{ n: number }>()
	]);
	return buildSessionSummary({
		session,
		endedAt: now,
		complete: input,
		turns: turns?.n ?? 0,
		events: events.results ?? [],
		reviewDue: due?.n ?? 0
	});
}

// ---------------------------------------------------------------- error memory

export async function recordErrorEvent(db: D1Database, userId: number, input: ErrorEventInput, now: Date) {
	const pattern = await db
		.prepare('SELECT code, default_severity FROM rlec_error_patterns WHERE code = ?')
		.bind(input.pattern_code)
		.first<{ code: string; default_severity: number }>();
	if (!pattern) throw error(400, 'pattern_code tidak dikenal.');

	if (input.session_id !== null) {
		const owned = await db.prepare('SELECT id FROM rlec_sessions WHERE id = ? AND user_id = ?').bind(input.session_id, userId).first();
		if (!owned) throw error(404, 'Sesi tidak ditemukan.');
		if (input.turn_id !== null) {
			const turn = await db
				.prepare('SELECT id FROM rlec_session_turns WHERE id = ? AND session_id = ?')
				.bind(input.turn_id, input.session_id)
				.first();
			if (!turn) throw error(404, 'Giliran tidak ditemukan.');
		}
	}

	const prev = await db
		.prepare('SELECT frequency, severity, mastery_score, ease, interval_days, repetitions FROM rlec_learner_errors WHERE user_id = ? AND pattern_code = ?')
		.bind(userId, input.pattern_code)
		.first<{ frequency: number; severity: number; mastery_score: number; ease: number; interval_days: number; repetitions: number }>();
	const severity = input.severity ?? prev?.severity ?? pattern.default_severity;
	const next = applyErrorEvent(prev ?? null, { retry_success: input.retry_success, severity }, now);
	const ts = toSqliteDate(now);

	await db.batch([
		db
			.prepare(
				`INSERT INTO rlec_learner_errors (user_id, pattern_code, example_wrong, example_fixed, frequency, severity,
				   first_seen, last_seen, last_practiced, mastery_score, ease, interval_days, repetitions, next_review_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				 ON CONFLICT(user_id, pattern_code) DO UPDATE SET
				   example_wrong = COALESCE(excluded.example_wrong, rlec_learner_errors.example_wrong),
				   example_fixed = COALESCE(excluded.example_fixed, rlec_learner_errors.example_fixed),
				   frequency = excluded.frequency, severity = excluded.severity, last_seen = excluded.last_seen,
				   last_practiced = COALESCE(excluded.last_practiced, rlec_learner_errors.last_practiced),
				   mastery_score = excluded.mastery_score, ease = excluded.ease, interval_days = excluded.interval_days,
				   repetitions = excluded.repetitions, next_review_at = excluded.next_review_at`
			)
			.bind(
				userId,
				input.pattern_code,
				input.wrong_text,
				input.fixed_text,
				next.frequency,
				next.severity,
				ts,
				ts,
				input.retry_success ? ts : null,
				next.mastery_score,
				next.ease,
				next.interval_days,
				next.repetitions,
				next.next_review_at
			),
		db
			.prepare(
				`INSERT INTO rlec_error_events (user_id, session_id, turn_id, pattern_code, wrong_text, fixed_text, retry_success, created_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
			)
			.bind(userId, input.session_id, input.turn_id, input.pattern_code, input.wrong_text, input.fixed_text, input.retry_success ? 1 : 0, ts)
	]);

	const skill = skillForPattern(input.pattern_code);
	if (skill) {
		await applySkillEvidence(db, userId, skill, { positive: false, severity }, now);
		if (input.retry_success)
			await recordSuccessEvent(db, userId, { skill_code: skill, pattern_code: input.pattern_code, kind: 'retry_success', evidence_text: input.fixed_text, session_id: input.session_id, source: 'internal' }, now);
	}

	return { pattern_code: input.pattern_code, ...next };
}

// ---------------------------------------------------------------- Learning Memory (Phase 2)

type StrengthRow = {
	strength: number;
	evidence_count: number;
	positive_count: number;
	negative_count: number;
	baseline_strength: number;
	baseline_at: string;
};

export async function applySkillEvidence(db: D1Database, userId: number, skill: SkillCode, ev: Evidence, now: Date) {
	const prev = await db
		.prepare('SELECT strength, evidence_count, positive_count, negative_count, baseline_strength, baseline_at FROM rlec_skill_strength WHERE user_id = ? AND skill_code = ?')
		.bind(userId, skill)
		.first<StrengthRow>();
	const n = applyEvidence(prev ?? null, ev, now);
	await db
		.prepare(
			`INSERT INTO rlec_skill_strength (user_id, skill_code, strength, evidence_count, positive_count, negative_count,
			   last_evidence_at, baseline_strength, baseline_at, trend_delta, mastery_level)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			 ON CONFLICT(user_id, skill_code) DO UPDATE SET
			   strength = excluded.strength, evidence_count = excluded.evidence_count, positive_count = excluded.positive_count,
			   negative_count = excluded.negative_count, last_evidence_at = excluded.last_evidence_at,
			   baseline_strength = excluded.baseline_strength, baseline_at = excluded.baseline_at,
			   trend_delta = excluded.trend_delta, mastery_level = excluded.mastery_level`
		)
		.bind(userId, skill, n.strength, n.evidence_count, n.positive_count, n.negative_count, n.last_evidence_at, n.baseline_strength, n.baseline_at, n.trend_delta, n.mastery_level)
		.run();
	return n;
}

export type SuccessInput = {
	skill_code: SkillCode;
	pattern_code: string | null;
	kind: SuccessKind;
	evidence_text: string | null;
	session_id: number | null;
	source: 'internal' | SessionReportSource;
};

/** Positive evidence: log a success event and raise the skill strength. Caller has verified session ownership. */
export async function recordSuccessEvent(db: D1Database, userId: number, input: SuccessInput, now: Date) {
	await db
		.prepare(
			`INSERT INTO rlec_success_events (user_id, session_id, skill_code, pattern_code, kind, evidence_text, source, created_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(userId, input.session_id, input.skill_code, input.pattern_code, input.kind, input.evidence_text?.slice(0, 300) ?? null, input.source, toSqliteDate(now))
		.run();
	return applySkillEvidence(db, userId, input.skill_code, { positive: true, kind: input.kind }, now);
}

export async function learningProgress(db: D1Database, userId: number, now: Date) {
	const [skills, wins, due] = await Promise.all([
		db
			.prepare(
				`SELECT k.code AS skill_code, k.label, COALESCE(s.strength, 0.3) AS strength, COALESCE(s.evidence_count, 0) AS evidence_count,
				   COALESCE(s.positive_count, 0) AS positive_count, COALESCE(s.negative_count, 0) AS negative_count,
				   COALESCE(s.trend_delta, 0) AS trend_delta, COALESCE(s.mastery_level, 'emerging') AS mastery_level, s.last_evidence_at
				 FROM rlec_skills k LEFT JOIN rlec_skill_strength s ON s.skill_code = k.code AND s.user_id = ?
				 ORDER BY k.rowid`
			)
			.bind(userId)
			.all<Record<string, unknown> & { skill_code: string; trend_delta: number; strength: number }>(),
		db
			.prepare(
				`SELECT e.id, e.kind, e.skill_code, k.label AS skill_label, e.evidence_text, e.source, e.session_id, e.created_at
				 FROM rlec_success_events e JOIN rlec_skills k ON k.code = e.skill_code
				 WHERE e.user_id = ? ORDER BY e.created_at DESC, e.id DESC LIMIT 10`
			)
			.bind(userId)
			.all<Record<string, unknown>>(),
		reviewDue(db, userId, now, 10)
	]);
	const strengths = skills.results ?? [];
	return {
		recent_wins: wins.results ?? [],
		improvements: strengths.filter((r) => Number(r.trend_delta) > 0).sort((a, b) => Number(b.trend_delta) - Number(a.trend_delta)),
		strengths,
		due_reviews: due
	};
}

// ---------------------------------------------------------------- BYO Level 0 (Phase 2)

const BYO_COLUMNS = `s.id, s.title, s.place, s.situation, s.cefr, s.role_a, s.role_b, s.goal, s.context_brief,
  s.useful_phrases_json, s.unexpected_challenge, s.correction_policy`;

export async function byoPackage(db: D1Database, user: { id: number; username: string }, scenarioId: number, minutes: number, access: Access = NO_PILOT) {
	const scenario = await db
		.prepare(`SELECT ${BYO_COLUMNS} FROM rlec_scenarios s WHERE s.id = ? AND ${visible(access)}`)
		.bind(scenarioId, user.id, user.id)
		.first<Record<string, string | null> & { id: number; title: string }>();
	if (!scenario) throw error(404, 'Skenario tidak ditemukan.');
	const profile = await getOrCreateProfile(db, user.id);
	const weak = await topErrors(db, user.id, 3);
	const text = buildByoPackage(scenario as never, profile, weak, { minutes });
	return { scenario_id: scenario.id, title: scenario.title, minutes, text };
}

/**
 * Store a parsed end-of-session report, whatever produced it (BYO paste today,
 * internal tutor later). Classified errors go through recordErrorEvent (Error
 * Memory + skill strength); UNCLASSIFIED ones are kept as events only so they do
 * not pollute the learner's top errors. Wins and phrases become success events.
 */
export async function importSessionReport(
	db: D1Database,
	userId: number,
	report: ParsedSessionReport,
	target: { session_id: number | null; scenario_id: number | null },
	now: Date,
	access: Access = NO_PILOT
) {
	let sessionId = target.session_id;
	if (sessionId !== null) {
		const owned = await db.prepare('SELECT id FROM rlec_sessions WHERE id = ? AND user_id = ?').bind(sessionId, userId).first();
		if (!owned) throw error(404, 'Sesi tidak ditemukan.');
	} else {
		const created = await startSession(
			db,
			userId,
			{ mode: 'byo', scenario_id: target.scenario_id, level: null, planned_minutes: null, confidence_before: null },
			access
		);
		sessionId = Number(created.id);
	}
	const errors: Array<{ pattern_code: string; pattern_text: string | null; wrong: string | null; fixed: string | null; classified: boolean }> = [];
	for (const e of report.errors) {
		if (e.pattern_code === UNCLASSIFIED) {
			await db
				.prepare(
					`INSERT INTO rlec_error_events (user_id, session_id, pattern_code, wrong_text, fixed_text, retry_success, created_at)
					 VALUES (?, ?, ?, ?, ?, 0, ?)`
				)
				.bind(userId, sessionId, UNCLASSIFIED, e.wrong ?? e.pattern_text, e.fixed, toSqliteDate(now))
				.run();
		} else {
			await recordErrorEvent(
				db,
				userId,
				{ pattern_code: e.pattern_code, wrong_text: e.wrong, fixed_text: e.fixed, retry_success: false, session_id: sessionId, turn_id: null, severity: null },
				now
			);
		}
		errors.push({ ...e, classified: e.pattern_code !== UNCLASSIFIED });
	}
	const wins: Array<{ text: string; skill_code: SkillCode; kind: SuccessKind }> = [];
	for (const w of report.wins) {
		const skill = skillForWin(w);
		await recordSuccessEvent(db, userId, { skill_code: skill, pattern_code: null, kind: 'correct_use', evidence_text: w, session_id: sessionId, source: report.source }, now);
		wins.push({ text: w, skill_code: skill, kind: 'correct_use' });
	}
	for (const phrase of report.new_phrases) {
		await recordSuccessEvent(db, userId, { skill_code: 'VOCAB_RANGE', pattern_code: null, kind: 'phrase_used', evidence_text: phrase, session_id: sessionId, source: report.source }, now);
		wins.push({ text: phrase, skill_code: 'VOCAB_RANGE', kind: 'phrase_used' });
	}
	return {
		session_id: sessionId,
		source: report.source,
		found_block: report.found_block,
		wins,
		errors,
		confidence_tip: report.confidence_tip,
		warnings: report.warnings,
		counts: { errors: errors.length, classified: errors.filter((e) => e.classified).length, wins: wins.length }
	};
}

// ---------------------------------------------------------------- Tomorrow notes

export async function saveTomorrowNote(db: D1Database, userId: number, text: string) {
	return db
		.prepare('INSERT INTO rlec_tomorrow_notes (user_id, text) VALUES (?, ?) RETURNING id, text, created_at')
		.bind(userId, text)
		.first<{ id: number; text: string; created_at: string }>();
}

export async function lastTomorrowNote(db: D1Database, userId: number) {
	return db
		.prepare('SELECT id, text, created_at FROM rlec_tomorrow_notes WHERE user_id = ? ORDER BY id DESC LIMIT 1')
		.bind(userId)
		.first<{ id: number; text: string; created_at: string }>();
}

// ---------------------------------------------------------------- Telegram identity link

async function sha256Hex(value: string) {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
	return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}
export const linkCodeHash = (code: string) => sha256Hex(`rlec-link:telegram:${code}`);

function sixDigits() {
	const buf = new Uint32Array(1);
	crypto.getRandomValues(buf);
	return String(buf[0] % 1_000_000).padStart(6, '0');
}

/** New one-time code for the logged-in user; earlier unused codes are retired. Only the hash is stored. */
export async function createLinkCode(db: D1Database, userId: number, now: Date) {
	const ts = toSqliteDate(now);
	const expires = toSqliteDate(new Date(now.getTime() + LINK_CODE_TTL_MS));
	await db.prepare('UPDATE rlec_link_codes SET used_at = ? WHERE user_id = ? AND used_at IS NULL').bind(ts, userId).run();
	for (let attempt = 0; attempt < 5; attempt += 1) {
		const code = sixDigits();
		const hash = await linkCodeHash(code);
		const clash = await db
			.prepare('SELECT id FROM rlec_link_codes WHERE code_hash = ? AND used_at IS NULL AND expires_at > ?')
			.bind(hash, ts)
			.first();
		if (clash) continue;
		await db.prepare('INSERT INTO rlec_link_codes (user_id, code_hash, expires_at, created_at) VALUES (?, ?, ?, ?)').bind(userId, hash, expires, ts).run();
		return { code, expires_at: expires, ttl_seconds: LINK_CODE_TTL_MS / 1000 };
	}
	throw error(503, 'Coba lagi.');
}

/** Server-to-server: consume a code (single use, unexpired) and link the Telegram user id. */
export async function linkTelegram(db: D1Database, code: string, telegramUserId: string, now: Date) {
	const ts = toSqliteDate(now);
	const hash = await linkCodeHash(code);
	const row = await db
		.prepare('SELECT id, user_id FROM rlec_link_codes WHERE code_hash = ? AND used_at IS NULL AND expires_at > ? ORDER BY id DESC LIMIT 1')
		.bind(hash, ts)
		.first<{ id: number; user_id: number }>();
	if (!row) throw error(404, 'Kode tidak valid atau kedaluwarsa.');
	const existing = await db
		.prepare("SELECT user_id FROM rlec_identity_links WHERE channel = 'telegram' AND external_id = ?")
		.bind(telegramUserId)
		.first<{ user_id: number }>();
	if (existing && existing.user_id !== row.user_id) throw error(409, 'Akun Telegram ini sudah tertaut ke pengguna lain.');
	const consumed = await db.prepare('UPDATE rlec_link_codes SET used_at = ? WHERE id = ? AND used_at IS NULL').bind(ts, row.id).run();
	if (!consumed.meta.changes) throw error(404, 'Kode tidak valid atau kedaluwarsa.');
	if (!existing)
		await db.prepare("INSERT INTO rlec_identity_links (user_id, channel, external_id, linked_at) VALUES (?, 'telegram', ?, ?)").bind(row.user_id, telegramUserId, ts).run();
	return { user_id: row.user_id, channel: 'telegram' as const, external_id: telegramUserId, already_linked: !!existing };
}

export const ALL_SKILLS = SKILLS;
