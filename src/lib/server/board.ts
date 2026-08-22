import type { D1Database } from '@cloudflare/workers-types';
import {
	MIN_QUIZZES,
	aggregate,
	inCurrentWeek,
	rankActive,
	type RankRow,
	type ResultRow
} from '$lib/server/board-rank';

export type { RankRow };

const cache = new Map<string, { at: number; value: unknown }>();
const TTL = 60_000;

function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
	const hit = cache.get(key);
	if (hit && Date.now() - hit.at < TTL) return Promise.resolve(hit.value as T);
	return fn().then((value) => {
		cache.set(key, { at: Date.now(), value });
		return value;
	});
}

export function bustBoardCache() {
	cache.clear();
}

async function loadRows(db: D1Database, weekly: boolean, now = new Date()): Promise<ResultRow[]> {
	const listing = await db
		.prepare(
			`SELECT r.user_id, u.board_nickname AS nickname, r.percentage, r.total_questions, r.duration_seconds, r.completed_at
			 FROM quiz_results r
			 LEFT JOIN users u ON u.id = r.user_id`
		)
		.all<{
			user_id: number;
			nickname: string | null;
			percentage: number;
			total_questions: number;
			duration_seconds: number | null;
			completed_at: string;
		}>();
	const rows: ResultRow[] = (listing.results ?? []).
		filter((row) => !weekly || inCurrentWeek(row.completed_at, now))
		.map((row) => ({
			userId: String(row.user_id),
			nickname: row.nickname,
			percentage: Number(row.percentage),
			questions: Number(row.total_questions),
			duration: row.duration_seconds,
			completedAt: row.completed_at
		}));

	// Telegram players join the same ranking rules only after explicit nickname opt-in.
	// Missing migration tables are tolerated during phased rollout.
	try {
		const telegram = await db.prepare(
			`SELECT p.id AS player_id, p.display_name, s.id AS session_id,
			        100.0 * SUM(a.is_correct) / COUNT(a.id) AS percentage,
			        COUNT(a.id) AS questions, MAX(a.answered_at) AS completed_at
			 FROM quiz_answers a
			 JOIN quiz_players p ON p.id = a.player_id
			 JOIN quiz_publications q ON q.id = a.publication_id
			 JOIN quiz_sessions s ON s.id = q.session_id
			 WHERE p.platform = 'telegram' AND p.leaderboard_opt_in = 1
			 GROUP BY p.id, p.display_name, s.id
			 HAVING COUNT(a.id) = 5`
		).all<{
			player_id: number; display_name: string; session_id: number;
			percentage: number; questions: number; completed_at: string;
		}>();
		for (const row of telegram.results ?? []) {
			if (weekly && !inCurrentWeek(row.completed_at, now)) continue;
			rows.push({
				userId: `telegram:${row.player_id}`,
				nickname: row.display_name,
				percentage: Number(row.percentage),
				questions: Number(row.questions),
				duration: null,
				completedAt: row.completed_at
			});
		}
	} catch {
		// Migration 0008 may not yet be applied; the existing web board remains available.
	}
	return rows;
}

export async function weeklyBoard(db: D1Database, now = new Date()) {
	return cached(`weekly:${now.toISOString().slice(0, 13)}`, async () =>
		aggregate(await loadRows(db, true, now), MIN_QUIZZES)
	);
}

export async function alltimeBoard(db: D1Database) {
	return cached('alltime', async () => aggregate(await loadRows(db, false), MIN_QUIZZES));
}

export async function activeBoard(db: D1Database) {
	return cached('active', async () => rankActive(await loadRows(db, false)));
}

export async function recordQuizResult(
	db: D1Database,
	row: {
		userId: number;
		quizId: string;
		source: 'path_step' | 'checkpoint' | 'daily_questionnaire' | 'practice';
		total: number;
		correct: number;
		duration?: number | null;
	}
) {
	if (row.total <= 0) return;
	const correct = Math.max(0, Math.min(row.correct, row.total));
	const percentage = (100 * correct) / row.total;
	try {
		await db
			.prepare(
				`INSERT OR IGNORE INTO quiz_results
				 (user_id, quiz_id, source, total_questions, correct_answers, percentage, duration_seconds, completed_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
			)
			.bind(row.userId, row.quizId.slice(0, 80), row.source, row.total, correct, percentage, row.duration ?? null)
			.run();
		bustBoardCache();
	} catch (error) {
		console.error('quiz_results write failed', error);
	}
}

export function findSelf(rows: RankRow[], userId: number | string | null) {
	if (userId == null) return null;
	return rows.find((row) => row.userId === String(userId)) ?? null;
}

export async function siteFlag(db: D1Database, key: string, fallback = '1') {
	const row = await db.prepare('SELECT value FROM site_settings WHERE key = ?').bind(key).first<{ value: string }>();
	return (row?.value ?? fallback) === '1';
}

export async function setSiteFlag(db: D1Database, key: string, on: boolean) {
	await db
		.prepare(
			`INSERT INTO site_settings (key, value) VALUES (?, ?)
			 ON CONFLICT(key) DO UPDATE SET value = excluded.value`
		)
		.bind(key, on ? '1' : '0')
		.run();
}
