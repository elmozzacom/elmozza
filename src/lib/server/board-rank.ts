/**
 * Global honor-board ranking. Rules are locked to the Telegram EDC board:
 * average of quiz percentages, ≥3 quizzes for weekly/all-time,
 * tie-break questions then faster duration, Monday 00:00 Asia/Jakarta.
 */

export const MIN_QUIZZES = 3;
export const NICKNAME_RE = /^[A-Za-z0-9 _]{3,20}$/;
const BLOCKED = [
	'anjing',
	'bangsat',
	'kontol',
	'memek',
	'ngentot',
	'jancok',
	'bajingan',
	'fuck',
	'shit',
	'bitch',
	'asshole',
	'dick',
	'pussy',
	'slut',
	'bastard',
	'admin',
	'official',
	'elmozza'
];

export type ResultRow = {
	userId: string;
	nickname: string | null;
	percentage: number;
	questions: number;
	duration: number | null;
	completedAt: string;
};

export type RankRow = {
	userId: string;
	nickname: string;
	avgPct: number;
	quizzes: number;
	questions: number;
	avgDuration: number;
	rank: number;
};

export function weekStartJakarta(now = new Date()) {
	const shifted = new Date(now.getTime() + 7 * 60 * 60_000);
	const dow = shifted.getUTCDay();
	const daysFromMonday = (dow + 6) % 7;
	const mondayUtcMs =
		Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate() - daysFromMonday) -
		7 * 60 * 60_000;
	return new Date(mondayUtcMs);
}

export function formatPct(value: number) {
	return value.toFixed(1);
}

export function validateNickname(raw: string) {
	const cleaned = raw.trim().replace(/\s+/g, ' ');
	if (!NICKNAME_RE.test(cleaned)) {
		return { ok: false as const, error: 'Nickname must be 3–20 letters, numbers, spaces, or underscores.' };
	}
	const compact = cleaned.toLowerCase().replace(/ /g, '');
	if (BLOCKED.some((word) => compact.includes(word))) {
		return { ok: false as const, error: 'Please choose a kinder nickname.' };
	}
	return { ok: true as const, nickname: cleaned };
}

export function aggregate(rows: ResultRow[], minQuizzes: number): RankRow[] {
	const buckets = new Map<
		string,
		{ nickname: string; pcts: number[]; questions: number; durations: number[] }
	>();
	for (const row of rows) {
		if (!row.nickname) continue;
		const bucket = buckets.get(row.userId) ?? {
			nickname: row.nickname,
			pcts: [],
			questions: 0,
			durations: []
		};
		bucket.pcts.push(row.percentage);
		bucket.questions += row.questions;
		if (row.duration != null) bucket.durations.push(row.duration);
		buckets.set(row.userId, bucket);
	}
	const ranked: RankRow[] = [];
	for (const [userId, bucket] of buckets) {
		if (bucket.pcts.length < minQuizzes) continue;
		ranked.push({
			userId,
			nickname: bucket.nickname,
			avgPct: bucket.pcts.reduce((a, b) => a + b, 0) / bucket.pcts.length,
			quizzes: bucket.pcts.length,
			questions: bucket.questions,
			avgDuration: bucket.durations.length
				? bucket.durations.reduce((a, b) => a + b, 0) / bucket.durations.length
				: 1e12,
			rank: 0
		});
	}
	ranked.sort((a, b) => b.avgPct - a.avgPct || b.questions - a.questions || a.avgDuration - b.avgDuration);
	ranked.forEach((row, index) => {
		row.rank = index + 1;
	});
	return ranked;
}

export function rankActive(rows: ResultRow[]): RankRow[] {
	const ranked = aggregate(rows, 1);
	ranked.sort((a, b) => b.questions - a.questions || b.avgPct - a.avgPct || a.avgDuration - b.avgDuration);
	ranked.forEach((row, index) => {
		row.rank = index + 1;
	});
	return ranked;
}

export function inCurrentWeek(iso: string, now = new Date()) {
	return new Date(iso).getTime() >= weekStartJakarta(now).getTime();
}
