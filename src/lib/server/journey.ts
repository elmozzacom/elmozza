import type { D1Database } from '@cloudflare/workers-types';
import { QUESTIONNAIRES, TOTAL_DAYS, type Question } from '$lib/content/questionnaires';

/**
 * The programme runs on Jakarta days, not on UTC days and not on the visitor's
 * clock. A learner in Malang finishing at 23:30 WIB has used up that calendar
 * day; in UTC it is still 16:30 the same day, so a UTC comparison would let
 * them unlock the next day only seven hours later — or, worse, twice.
 */
export const JAKARTA_OFFSET_MINUTES = 7 * 60;

/** Calendar date in Asia/Jakarta as YYYY-MM-DD. */
export function jakartaDate(at: Date = new Date()): string {
	const shifted = new Date(at.getTime() + JAKARTA_OFFSET_MINUTES * 60_000);
	return shifted.toISOString().slice(0, 10);
}

/** Whole days between two Jakarta dates. */
export function daysBetween(from: string, to: string): number {
	const a = Date.parse(`${from}T00:00:00Z`);
	const b = Date.parse(`${to}T00:00:00Z`);
	if (Number.isNaN(a) || Number.isNaN(b)) return 0;
	return Math.round((b - a) / 86_400_000);
}

export type ResponseRow = {
	day_number: number;
	completed_at: string;
	self_rating: number | null;
};

export type JourneyDay = {
	day: number;
	title: string;
	status: 'completed' | 'available' | 'locked';
	completedOn: string | null;
};

export type Journey = {
	days: JourneyDay[];
	completedCount: number;
	/** The day the learner may answer right now, or null when nothing is open. */
	currentDay: number | null;
	/** True once all 14 are done. */
	finished: boolean;
	/** Consecutive Jakarta days ending today or yesterday. */
	streak: number;
	/** Set when the next day exists but must wait for tomorrow. */
	waitingForTomorrow: boolean;
};

/**
 * Day N unlocks only when day N−1 is complete AND the Jakarta calendar date has
 * moved on. Missed days are not skipped: the learner simply resumes at the
 * lowest unanswered day, and the streak — not the sequence — is what breaks.
 */
export function buildJourney(
	rows: ResponseRow[],
	today = jakartaDate(),
	mercyDay: number | null = null
): Journey {
	const byDay = new Map<number, ResponseRow>();
	for (const row of rows) byDay.set(row.day_number, row);

	// The lowest day with no response is the one still owed.
	let nextUnanswered = TOTAL_DAYS + 1;
	for (let day = 1; day <= TOTAL_DAYS; day += 1) {
		if (!byDay.has(day)) {
			nextUnanswered = day;
			break;
		}
	}

	const finished = nextUnanswered > TOTAL_DAYS;
	const previous = nextUnanswered > 1 ? byDay.get(nextUnanswered - 1) : undefined;
	const previousDate = previous ? jakartaDateOf(previous.completed_at) : null;

	// Same Jakarta day as the previous answer means the next day is not open yet.
	const waitingForTomorrow = !finished && previousDate !== null && previousDate === today && mercyDay !== nextUnanswered;
	const currentDay = finished || waitingForTomorrow ? null : nextUnanswered;

	const days: JourneyDay[] = QUESTIONNAIRES.map((item) => {
		const row = byDay.get(item.day);
		const status: JourneyDay['status'] = row
			? 'completed'
			: item.day === currentDay
				? 'available'
				: 'locked';
		return {
			day: item.day,
			title: item.title,
			status,
			completedOn: row ? jakartaDateOf(row.completed_at) : null
		};
	});

	return {
		days,
		completedCount: byDay.size,
		currentDay,
		finished,
		streak: streakFrom(rows, today),
		waitingForTomorrow
	};
}

/**
 * A stored timestamp is UTC ('YYYY-MM-DD HH:MM:SS' from SQLite). Slicing the
 * date straight off it would mis-date every answer given after 17:00 WIB, so it
 * is converted to Jakarta first.
 */
export function jakartaDateOf(stamp: string): string {
	const normalised = stamp.includes('T') ? stamp : stamp.replace(' ', 'T');
	const withZone = /[Zz]|[+-]\d\d:?\d\d$/.test(normalised) ? normalised : `${normalised}Z`;
	const parsed = Date.parse(withZone);
	if (Number.isNaN(parsed)) return stamp.slice(0, 10);
	return jakartaDate(new Date(parsed));
}

/**
 * Consecutive Jakarta days of check-ins, counted back from today. Today not yet
 * done is not a break — the streak may still end yesterday — but a full missed
 * day resets it.
 */
export function streakFrom(rows: ResponseRow[], today = jakartaDate()): number {
	const dates = new Set(rows.map((row) => jakartaDateOf(row.completed_at)));
	if (dates.size === 0) return 0;

	let cursor = today;
	if (!dates.has(cursor)) {
		cursor = shiftDate(today, -1);
		if (!dates.has(cursor)) return 0;
	}

	let streak = 0;
	while (dates.has(cursor)) {
		streak += 1;
		cursor = shiftDate(cursor, -1);
	}
	return streak;
}

export function shiftDate(date: string, deltaDays: number): string {
	const base = Date.parse(`${date}T00:00:00Z`);
	return new Date(base + deltaDays * 86_400_000).toISOString().slice(0, 10);
}

/** Validate a submission against the day's questions. Returns errors by field. */
export function validateAnswers(questions: Question[], form: Map<string, string>) {
	const errors: Record<string, string> = {};
	const answers: Record<string, string | number> = {};
	let ratingTotal = 0;
	let ratingCount = 0;

	for (const question of questions) {
		const raw = (form.get(question.id) ?? '').trim();

		if (question.type === 'rating') {
			const value = Number(raw);
			if (!Number.isInteger(value) || value < 1 || value > 5) {
				errors[question.id] = 'Choose a rating from 1 to 5.';
				continue;
			}
			answers[question.id] = value;
			ratingTotal += value;
			ratingCount += 1;
			continue;
		}

		if (question.type === 'choice') {
			const value = Number(raw);
			if (!Number.isInteger(value) || value < 0 || value >= question.options.length) {
				errors[question.id] = 'Choose one answer.';
				continue;
			}
			answers[question.id] = value;
			continue;
		}

		const words = raw.split(/\s+/).filter(Boolean);
		if (words.length < question.minWords) {
			errors[question.id] = `Write at least ${question.minWords} words in English.`;
			continue;
		}
		// Reflections are stored as written but bounded, so one paste cannot
		// fill the row with a megabyte of text.
		answers[question.id] = raw.slice(0, 2000);
	}

	const selfRating = ratingCount > 0 ? Math.round(ratingTotal / ratingCount) : null;
	return { errors, answers, selfRating };
}

/** Score the multiple-choice questions so the learner sees something concrete. */
export function scoreChoices(questions: Question[], answers: Record<string, string | number>) {
	const choices = questions.filter((q): q is Extract<Question, { type: 'choice' }> => q.type === 'choice');
	const correct = choices.filter((q) => Number(answers[q.id]) === q.answer).length;
	return { correct, total: choices.length };
}

export async function loadResponses(db: D1Database, userId: number): Promise<ResponseRow[]> {
	const { results } = await db
		.prepare(
			'SELECT day_number, completed_at, self_rating FROM questionnaire_responses WHERE user_id = ? ORDER BY day_number'
		)
		.bind(userId)
		.all<ResponseRow>();
	return results ?? [];
}

export async function loadMercyDay(db: D1Database, userId: number): Promise<number | null> {
	const row = await db
		.prepare('SELECT day_number FROM mercy_unlocks WHERE user_id = ? ORDER BY day_number')
		.bind(userId)
		.all<{ day_number: number }>();
	const days = (row.results ?? []).map((item) => item.day_number);
	return days.length > 0 ? days[days.length - 1] : null;
}
