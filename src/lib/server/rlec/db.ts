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
	type SessionStart
} from './core';

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

const VISIBLE = `((s.status IN ('active','qc_passed') AND (s.owner_user_id IS NULL OR s.owner_user_id = ?))
  OR (s.owner_user_id = ? AND s.status != 'archived'))`;

export async function listScenarios(db: D1Database, userId: number, f: ScenarioFilters) {
	const where = [VISIBLE];
	const binds: unknown[] = [userId, userId];
	if (f.domain) {
		where.push('s.domain = ?');
		binds.push(f.domain);
	}
	if (f.cefr) {
		where.push('s.cefr = ?');
		binds.push(f.cefr);
	}
	if (f.q) {
		where.push("(s.title LIKE ? ESCAPE '\\' OR s.situation LIKE ? ESCAPE '\\' OR s.place LIKE ? ESCAPE '\\')");
		const p = likePattern(f.q);
		binds.push(p, p, p);
	}
	const { results } = await db
		.prepare(
			`SELECT s.id, s.source_kind, s.source_ref, s.title, s.domain, s.subdomain, s.place, s.situation, s.cefr,
			        s.difficulty, s.goal, s.status, (s.owner_user_id IS NOT NULL) AS personal
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

async function visibleScenario(db: D1Database, userId: number, scenarioId: number) {
	return db
		.prepare(`SELECT s.id, s.cefr FROM rlec_scenarios s WHERE s.id = ? AND ${VISIBLE}`)
		.bind(scenarioId, userId, userId)
		.first<{ id: number; cefr: string | null }>();
}

// ---------------------------------------------------------------- sessions

export async function startSession(db: D1Database, userId: number, input: SessionStart) {
	const profile = await getOrCreateProfile(db, userId);
	let scenarioCefr: string | null = null;
	if (input.scenario_id !== null) {
		const scenario = await visibleScenario(db, userId, input.scenario_id);
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

	return { pattern_code: input.pattern_code, ...next };
}
