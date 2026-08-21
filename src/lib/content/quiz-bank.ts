/**
 * The public quiz draws from the SAME question bank the learning path uses —
 * every checkpoint ("gate") question inside `ladder.ts`, plus the three
 * placement questions on the landing page. Nothing is authored twice here: if a
 * unit check changes, this quiz changes with it.
 */

import { LADDER_UNITS } from '$lib/content/ladder';
import { PLACEMENT } from '$lib/content/marketing';

export const QUIZ_LENGTH = 5;

export type BankQuestion = {
	/** Stable id, so a served quiz can be re-graded on submit. */
	id: string;
	prompt: string;
	options: string[];
	answer: number;
	/** Where in the curriculum this question comes from. */
	origin: string;
};

type GateQuestion = { prompt: string; options: string[]; answer: number };

function isGateQuestion(value: unknown): value is GateQuestion {
	if (!value || typeof value !== 'object') return false;
	const row = value as Record<string, unknown>;
	return (
		typeof row.prompt === 'string' &&
		Array.isArray(row.options) &&
		row.options.every((option) => typeof option === 'string') &&
		typeof row.answer === 'number'
	);
}

/** Every checkpoint question in the ladder, flattened, in curriculum order. */
export function bank(): BankQuestion[] {
	const out: BankQuestion[] = [];

	for (const unit of LADDER_UNITS) {
		for (const step of unit.steps) {
			if (step.type !== 'checkpoint') continue;
			const questions = step.payload?.questions;
			if (!Array.isArray(questions)) continue;
			questions.forEach((question, index) => {
				if (!isGateQuestion(question)) return;
				out.push({
					id: `${unit.slug}-${step.sort}-${index}`,
					prompt: question.prompt,
					options: [...question.options],
					answer: question.answer,
					origin: `${unit.section} · ${unit.title}`
				});
			});
		}
	}

	PLACEMENT.forEach((question, index) => {
		out.push({
			id: `placement-${question.id ?? index}`,
			prompt: question.prompt,
			options: [...question.options],
			answer: question.answer,
			origin: 'Placement'
		});
	});

	return out;
}

/** Small deterministic hash — same seed always yields the same paper. */
function hash(seed: string) {
	let value = 2166136261;
	for (let index = 0; index < seed.length; index += 1) {
		value ^= seed.charCodeAt(index);
		value = Math.imul(value, 16777619);
	}
	return value >>> 0;
}

/**
 * Pick `count` questions for a seed. Deterministic on purpose: a reload must
 * not silently hand the visitor a different paper mid-answer, and the server
 * can re-derive the exact same paper when grading the submission.
 */
export function drawQuiz(seed: string, count = QUIZ_LENGTH): BankQuestion[] {
	const pool = bank();
	if (pool.length === 0) return [];

	const picked: BankQuestion[] = [];
	const used = new Set<number>();
	let cursor = hash(seed);

	while (picked.length < Math.min(count, pool.length)) {
		cursor = (Math.imul(cursor, 1103515245) + 12345) >>> 0;
		const index = cursor % pool.length;
		if (used.has(index)) continue;
		used.add(index);
		picked.push(pool[index]);
	}

	return picked;
}

/** The seed rotates daily in Asia/Jakarta, so the paper is "today's quiz". */
export function todaySeed(now = new Date()) {
	return new Date(now.getTime() + 7 * 60 * 60_000).toISOString().slice(0, 10);
}
