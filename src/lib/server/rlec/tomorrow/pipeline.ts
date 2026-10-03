// Tomorrow Mode pipeline (Level 0).
// FULL  -> bank / own card, no AI, no credit.
// PARTIAL / NONE -> Workers AI generates a card under a guardrail prompt (role,
// scenario and level locks + warehouse anchors), deterministic validator gate with
// 1 retry, saved as the learner's personal scenario (source_kind='tomorrow').
// Budget cap / no credit / AI error / QC failure -> bank-only fallback (credit refunded).
// The learner's raw text is only stored in their own rlec_tomorrow_notes row.
import type { D1Database } from '@cloudflare/workers-types';
import type { CardLevel, Coverage, TomorrowCard, TomorrowIntent, ValidationResult } from './types';
import { CARD_LEVELS } from './types';
import { domainById, rlecDomainsFor } from './taxonomy';
import { ruleIntent, llmIntent } from './intent';
import { retrieve, type Anchor, type VectorizeLike } from './retrieval';
import { validateCard, redactPii, LEVEL_MAX_WORDS } from './validator';
import { creditStatus, getConfig, getConfigNumber, refundCredit, spendCredit, type CreditStatus } from './credits';
import { DEFAULT_MODEL, DEFAULT_USD_IDR, estimateCostUsd, extractJson, usdToIdr, type AiBinding, type LlmProvider, type LlmResult } from './provider';
import { budgetStatus, newlyCrossedThresholds, BUDGET_CAP_IDR } from '../budget';

export type PipelineDeps = {
	db: D1Database;
	now: Date;
	pilot: boolean;
	provider?: LlmProvider | null;
	ai?: AiBinding | null; // for embeddings (Vectorize)
	ecwDb?: D1Database | null;
	vec?: VectorizeLike | null;
	budgetCapIdr?: number;
};

export type FallbackReason = 'no_ai' | 'llm_disabled' | 'budget_cap' | 'no_credit' | 'unclear' | 'ai_error' | 'qc_failed';

export type TomorrowResponse = {
	ok: true;
	status: 'bank' | 'own' | 'generated' | 'fallback';
	reason: FallbackReason | null;
	coverage: Coverage;
	charged: boolean;
	card: TomorrowCard | null;
	card_id: number | null;
	scenario_id: number | null;
	session_id: number | null;
	note_id: number;
	intent: Omit<TomorrowIntent, 'confidence'> & { confidence: number };
	level: CardLevel;
	qc: Pick<ValidationResult, 'warnings' | 'flags'> | null;
	anchors: { ref: string; title: string }[];
	suggestions: { id: number; title: string; cefr: string | null }[];
	credits: CreditStatus;
	budget_alerts: number[];
	attempts: number;
};

const LEARNER_ROLE: Record<string, string> = {
	D04: 'Hospital doctor or nurse (you)',
	D19: 'Person giving help (you)',
	D03: 'Employee (you)',
	D17: 'Hospital or company representative (you)',
	D02: 'Presenter or participant (you)',
	D05: 'Customer (you)',
	D07: 'Passenger (you)',
	D08: 'Traveller (you)',
	D06: 'Shopper (you)',
	D09: 'Applicant (you)',
	D10: 'Guest (you)',
	D18: 'Customer (you)'
};
const COUNTERPART_ROLE: Record<string, string> = {
	'patient family': "Patient's family member",
	'foreign doctor': 'Foreign doctor colleague',
	consultant: 'Senior consultant',
	'session chair': 'Session chair',
	interviewer: 'Interviewer',
	vendor: 'Vendor sales manager',
	investor: 'Investor',
	client: 'Client',
	manager: 'Manager',
	nurse: 'Nurse colleague',
	patient: 'Patient',
	doctor: 'Doctor colleague',
	team: 'Team colleague',
	waiter: 'Waiter',
	receptionist: 'Receptionist',
	'immigration officer': 'Immigration officer',
	driver: 'Driver',
	'airline agent': 'Airline check-in agent'
};

export const CARD_SCHEMA = {
	type: 'object',
	properties: {
		title: { type: 'string' },
		situation: { type: 'string' },
		opener: { type: 'string' },
		phrases: { type: 'array', items: { type: 'string' }, minItems: 5, maxItems: 5 },
		ready_answers: {
			type: 'array',
			minItems: 3,
			maxItems: 3,
			items: { type: 'object', properties: { question: { type: 'string' }, answer: { type: 'string' } }, required: ['question', 'answer'] }
		},
		traps: {
			type: 'array',
			minItems: 2,
			maxItems: 2,
			items: { type: 'object', properties: { trap: { type: 'string' }, fix: { type: 'string' } }, required: ['trap', 'fix'] }
		},
		safety_note: { type: 'string' }
	},
	required: ['title', 'situation', 'opener', 'phrases', 'ready_answers', 'traps']
} as const;

export function lockedRoles(intent: TomorrowIntent, anchors: Anchor[]) {
	const learner = LEARNER_ROLE[intent.domain_id ?? ''] ?? 'Learner (you)';
	const anchorCp = anchors.find((a) => a.origin === 'ecw')?.role_b ?? null;
	const counterpart = (intent.counterpart && COUNTERPART_ROLE[intent.counterpart]) || (intent.counterpart ? intent.counterpart.replace(/^./, (c) => c.toUpperCase()) : null) || anchorCp || 'Conversation partner';
	return { learner, counterpart: counterpart.toLowerCase() === learner.toLowerCase() ? `${counterpart} (other person)` : counterpart };
}

/** Guardrail prompt: role lock, scenario lock, level lock, warehouse anchors, safety. */
export function buildPrompt(input: { text: string; intent: TomorrowIntent; level: CardLevel; roles: { learner: string; counterpart: string }; anchors: Anchor[]; errors?: string[] }) {
	const d = domainById(input.intent.domain_id);
	const max = LEVEL_MAX_WORDS[input.level];
	const anchorText = input.anchors.length
		? input.anchors
				.slice(0, 4)
				.map((a) => `- [${a.ref}] ${a.title} (${a.place ?? '-'} / ${a.situation ?? '-'} / ${a.level ?? '-'}); roles: ${a.role_a ?? '-'} vs ${a.role_b ?? '-'}${a.lines.length ? `\n  lines: ${a.lines.slice(0, 6).join(' / ')}` : ''}`)
				.join('\n')
		: '- (no warehouse match; stay strictly inside the locks)';
	const system = [
		'You write a one-screen "Tomorrow Card" that prepares an Indonesian adult to speak English in one real situation tomorrow.',
		`ROLE LOCK: exactly two people. Learner = "${input.roles.learner}". Counterpart = "${input.roles.counterpart}". The learner says the opener, the phrases, every answer and every fix. The counterpart only asks the three questions. Never add a third speaker. No "Name:" speaker labels.`,
		`SCENARIO LOCK: domain ${d?.id} ${d?.name}; place "${input.intent.place ?? 'any place inside this domain'}"; situation "${input.intent.situation ?? 'as described'}". Do not move to another place, domain or topic.`,
		`LEVEL LOCK: CEFR ${input.level}. Every learner line has at most ${max} words. Use common words for this level.`,
		'LANGUAGE: every content field is in English only. Do not copy Indonesian words.',
		'PRIVACY: never include real names, phone numbers, emails, medical record numbers, ID numbers or dates of birth. Use roles, not names.',
		'SAFETY: this is language practice. No drug doses, no treatment advice, no diagnosis decisions. For healthcare, add safety_note: "Language practice only. Follow your local protocol."',
		'CONTENT: opener = first sentence the learner says. phrases = 5 useful learner sentences. ready_answers = 3 likely counterpart questions, each with a short learner answer. traps = 2 likely mistakes or surprises with a fix the learner can say.',
		'WAREHOUSE ANCHORS (reuse their roles and wording when they fit the locks):',
		anchorText,
		'Reply with JSON only: {"title","situation","opener","phrases":[5],"ready_answers":[{"question","answer"}x3],"traps":[{"trap","fix"}x2],"safety_note"}'
	].join('\n');
	const user = `Learner's plan (redacted): ${redactPii(input.text).slice(0, 500)}${
		input.errors?.length ? `\nYour previous card failed these checks, fix all of them: ${input.errors.slice(0, 8).join('; ')}` : ''
	}`;
	return { system, user };
}

/** Merge model JSON with the locked fields (domain, place, level, roles are never model-chosen). */
export function lockCard(raw: unknown, intent: TomorrowIntent, level: CardLevel, roles: { learner: string; counterpart: string }): TomorrowCard | null {
	if (!raw || typeof raw !== 'object') return null;
	const o = raw as Record<string, unknown>;
	return {
		title: String(o.title ?? ''),
		level,
		domain_id: intent.domain_id ?? '',
		place: intent.place ?? domainById(intent.domain_id)?.name ?? '',
		situation: String(o.situation ?? intent.situation ?? ''),
		learner_role: roles.learner,
		counterpart_role: roles.counterpart,
		opener: String(o.opener ?? ''),
		phrases: Array.isArray(o.phrases) ? o.phrases.map(String) : [],
		ready_answers: Array.isArray(o.ready_answers) ? (o.ready_answers as Record<string, unknown>[]).map((r) => ({ question: String(r?.question ?? ''), answer: String(r?.answer ?? '') })) : [],
		traps: Array.isArray(o.traps) ? (o.traps as Record<string, unknown>[]).map((t) => ({ trap: String(t?.trap ?? ''), fix: String(t?.fix ?? '') })) : [],
		safety_note: typeof o.safety_note === 'string' ? o.safety_note : null
	};
}

const normLevel = (v: unknown): CardLevel | null => {
	const s = String(v ?? '').toUpperCase();
	if (s === 'C2') return 'C1';
	return (CARD_LEVELS as readonly string[]).includes(s) ? (s as CardLevel) : null;
};

async function spentIdr(db: D1Database): Promise<number> {
	const r = await db.prepare('SELECT COALESCE(SUM(cost_idr), 0) AS s FROM rlec_ai_usage').first<{ s: number }>();
	return Number(r?.s ?? 0);
}

async function logUsage(db: D1Database, userId: number, sessionId: number | null, call: LlmResult, rate: number) {
	const idr = usdToIdr(estimateCostUsd(call.model, call.input_tokens, call.output_tokens), rate);
	await db
		.prepare('INSERT INTO rlec_ai_usage (user_id, session_id, provider, model, input_tokens, output_tokens, cost_idr) VALUES (?, ?, ?, ?, ?, ?, ?)')
		.bind(userId, sessionId, call.provider, call.model, Math.max(0, call.input_tokens | 0), Math.max(0, call.output_tokens | 0), idr)
		.run();
	return idr;
}

async function suggestions(db: D1Database, userId: number, pilot: boolean, intent: TomorrowIntent) {
	const doms = intent.domain_id ? rlecDomainsFor(intent.domain_id) : [];
	const statuses = pilot ? "'active','qc_passed','pilot'" : "'active','qc_passed'";
	const where = doms.length ? `AND domain IN (${doms.map(() => '?').join(',')})` : '';
	const { results } = await db
		.prepare(
			`SELECT id, title, cefr FROM rlec_scenarios WHERE status IN (${statuses}) AND (owner_user_id IS NULL OR owner_user_id = ?) AND status != 'archived' ${where} ORDER BY id LIMIT 3`
		)
		.bind(userId, ...doms)
		.all<{ id: number; title: string; cefr: string | null }>();
	return results ?? [];
}

async function startTomorrowSession(db: D1Database, userId: number, scenarioId: number | null, level: CardLevel, route: string) {
	const row = await db
		.prepare("INSERT INTO rlec_sessions (user_id, mode, scenario_id, level, planned_minutes, model_route) VALUES (?, 'tomorrow', ?, ?, 10, ?) RETURNING id")
		.bind(userId, scenarioId, level, route)
		.first<{ id: number }>();
	return Number(row?.id ?? 0) || null;
}

async function saveCard(
	db: D1Database,
	v: { userId: number; noteId: number; scenarioId: number | null; sessionId: number | null; source: 'bank' | 'own' | 'llm'; coverage: Coverage; card: TomorrowCard; qc: ValidationResult | null; anchors: Anchor[]; model: string | null }
) {
	const row = await db
		.prepare(
			`INSERT INTO rlec_tomorrow_cards (user_id, note_id, scenario_id, session_id, source, coverage, domain_id, place, situation, level, card_json, qc_json, anchors_json, model)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`
		)
		.bind(
			v.userId,
			v.noteId,
			v.scenarioId,
			v.sessionId,
			v.source,
			v.coverage,
			v.card.domain_id || null,
			v.card.place || null,
			v.card.situation || null,
			v.card.level,
			JSON.stringify(v.card),
			v.qc ? JSON.stringify(v.qc) : null,
			JSON.stringify(v.anchors.map((a) => a.ref)),
			v.model
		)
		.first<{ id: number }>();
	if (v.scenarioId) await db.prepare('UPDATE rlec_tomorrow_notes SET scenario_id = ? WHERE id = ? AND user_id = ?').bind(v.scenarioId, v.noteId, v.userId).run();
	return Number(row?.id ?? 0) || null;
}

async function savePersonalScenario(db: D1Database, userId: number, noteId: number, card: TomorrowCard, qc: ValidationResult) {
	const d = domainById(card.domain_id);
	const instructions = `ROLE: You are the ${card.counterpart_role}. Never switch roles and never speak for the learner (${card.learner_role}). SCENARIO: ${card.place} — ${card.situation}. Stay in this place and topic; if the learner goes off-topic, steer back politely in one sentence. LEVEL: ${card.level}, max ${LEVEL_MAX_WORDS[card.level]} words per sentence, one question per turn. Do not use Indonesian.`;
	const row = await db
		.prepare(
			`INSERT INTO rlec_scenarios (source_kind, source_ref, title, domain, subdomain, place, situation, cefr, role_a, role_b, learner_role_default, goal,
			   useful_phrases_json, likely_questions_json, likely_problems_json, safety_notes, model_instructions, correction_policy, status, qc_report_json, created_by, owner_user_id)
			 VALUES ('tomorrow', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'role_b', ?, ?, ?, ?, ?, ?, ?, 'qc_passed', ?, 'llm', ?) RETURNING id`
		)
		.bind(
			`TMR-u${userId}-n${noteId}`,
			card.title,
			d?.rlec ?? 'daily_life',
			card.domain_id,
			card.place,
			card.situation,
			card.level,
			card.counterpart_role,
			card.learner_role,
			`Get through "${card.situation}" at ${card.place} using the Tomorrow Card.`,
			JSON.stringify([card.opener, ...card.phrases]),
			JSON.stringify(card.ready_answers.map((r) => r.question)),
			JSON.stringify(card.traps.map((t) => t.trap)),
			card.safety_note ?? null,
			instructions,
			['A1', 'A2'].includes(card.level) ? 'beginner' : card.level === 'B1' ? 'intermediate' : 'advanced',
			JSON.stringify(qc),
			userId
		)
		.first<{ id: number }>();
	return Number(row?.id ?? 0) || null;
}

export async function runTomorrow(deps: PipelineDeps, userId: number, text: string, requestedLevel: CardLevel | null = null): Promise<TomorrowResponse> {
	const { db, now } = deps;
	const note = await db.prepare('INSERT INTO rlec_tomorrow_notes (user_id, text) VALUES (?, ?) RETURNING id').bind(userId, text).first<{ id: number }>();
	const noteId = Number(note?.id);
	const profile = await db.prepare('SELECT cefr_estimated, cefr_self FROM rlec_learner_profiles WHERE user_id = ?').bind(userId).first<{ cefr_estimated: string | null; cefr_self: string | null }>();
	const profileLevel = normLevel(profile?.cefr_estimated) ?? normLevel(profile?.cefr_self);
	let intent = ruleIntent(text, profileLevel);
	const level: CardLevel = normLevel(requestedLevel) ?? intent.level_hint ?? 'B1';

	const retrieval = await retrieve({ db, userId, pilot: deps.pilot, ecwDb: deps.ecwDb, vec: deps.vec, ai: deps.ai }, intent, level);
	const base = {
		note_id: noteId,
		level,
		coverage: retrieval.coverage,
		anchors: retrieval.anchors.map((a) => ({ ref: a.ref, title: a.title })),
		budget_alerts: [] as number[],
		attempts: 0
	};

	// ---- FULL: bank / own card, free
	if (retrieval.coverage === 'FULL' && retrieval.card) {
		const sessionId = await startTomorrowSession(db, userId, retrieval.scenario_id, level, retrieval.card_source === 'own' ? 'own-card' : 'bank');
		const cardId = await saveCard(db, {
			userId,
			noteId,
			scenarioId: retrieval.scenario_id,
			sessionId,
			source: retrieval.card_source === 'own' ? 'own' : 'bank',
			coverage: 'FULL',
			card: retrieval.card,
			qc: retrieval.qc,
			anchors: [],
			model: null
		});
		return {
			ok: true,
			status: retrieval.card_source === 'own' ? 'own' : 'bank',
			reason: null,
			charged: false,
			card: retrieval.card,
			card_id: cardId,
			scenario_id: retrieval.scenario_id,
			session_id: sessionId,
			intent,
			qc: retrieval.qc ? { warnings: retrieval.qc.warnings, flags: retrieval.qc.flags } : null,
			suggestions: [],
			credits: await creditStatus(db, userId, now),
			...base
		};
	}

	const fallback = async (reason: FallbackReason, extra: Partial<TomorrowResponse> = {}): Promise<TomorrowResponse> => ({
		ok: true,
		status: 'fallback',
		reason,
		charged: false,
		card: null,
		card_id: null,
		scenario_id: null,
		session_id: null,
		intent,
		qc: null,
		suggestions: await suggestions(db, userId, deps.pilot, intent),
		credits: await creditStatus(db, userId, now),
		...base,
		...extra
	});

	// ---- PARTIAL / NONE: LLM path, guarded
	if (!deps.provider) return fallback('no_ai');
	if ((await getConfig(db, 'tomorrow_llm_enabled', '1')) !== '1') return fallback('llm_disabled');
	const cap = deps.budgetCapIdr ?? BUDGET_CAP_IDR;
	const rate = await getConfigNumber(db, 'usd_idr', DEFAULT_USD_IDR);
	const before = await spentIdr(db);
	// Worst case for 2 generation calls + 1 intent call at max tokens.
	const worstIdr = usdToIdr(estimateCostUsd(deps.provider.model, 3 * 2500, 2 * 900 + 120), rate);
	if (budgetStatus(before, cap).cap_reached || before + worstIdr > cap) return fallback('budget_cap');

	const ref = `tomorrow:note:${noteId}`;
	const spend = await spendCredit(db, userId, ref, now);
	if (!spend.ok) return fallback('no_credit');

	const sessionId = await startTomorrowSession(db, userId, null, level, `${deps.provider.name}:${deps.provider.model}`);
	let costIdr = 0;
	let attempts = 0;
	const finish = async (reason: FallbackReason) => {
		await refundCredit(db, userId, ref, now, reason);
		const after = before + costIdr;
		return fallback(reason, { session_id: sessionId, attempts, budget_alerts: newlyCrossedThresholds(before, after) });
	};

	try {
		if (!intent.domain_id) {
			const r = await llmIntent(deps.provider, text, intent);
			costIdr += await logUsage(db, userId, sessionId, r.call, rate);
			if (r.intent) intent = r.intent;
			if (!intent.domain_id) return await finish('unclear');
		}
		const roles = lockedRoles(intent, retrieval.anchors);
		let errors: string[] = [];
		let card: TomorrowCard | null = null;
		let qc: ValidationResult | null = null;
		while (attempts < 2) {
			attempts += 1;
			const p = buildPrompt({ text, intent, level, roles, anchors: retrieval.anchors, errors });
			const call = await deps.provider.complete(
				[
					{ role: 'system', content: p.system },
					{ role: 'user', content: p.user }
				],
				{ maxTokens: 900, temperature: attempts === 1 ? 0.4 : 0.2, jsonSchema: CARD_SCHEMA }
			);
			costIdr += await logUsage(db, userId, sessionId, call, rate);
			card = lockCard(extractJson(call.text), intent, level, roles);
			qc = card ? validateCard(card, { domain_id: intent.domain_id, place: intent.place, counterpart: intent.counterpart, level }) : null;
			if (card && qc?.ok) break;
			errors = qc?.errors ?? ['reply was not valid JSON with the required keys'];
			card = null;
		}
		if (!card || !qc) return await finish('qc_failed');

		const scenarioId = await savePersonalScenario(db, userId, noteId, card, qc);
		await db
			.prepare('UPDATE rlec_sessions SET scenario_id = ?, cost_estimate_usd = ? WHERE id = ? AND user_id = ?')
			.bind(scenarioId, Math.round((costIdr / rate) * 1e6) / 1e6, sessionId, userId)
			.run();
		const cardId = await saveCard(db, { userId, noteId, scenarioId, sessionId, source: 'llm', coverage: retrieval.coverage, card, qc, anchors: retrieval.anchors, model: deps.provider.model });
		return {
			ok: true,
			status: 'generated',
			reason: null,
			charged: true,
			card,
			card_id: cardId,
			scenario_id: scenarioId,
			session_id: sessionId,
			intent,
			qc: { warnings: qc.warnings, flags: qc.flags },
			suggestions: [],
			credits: await creditStatus(db, userId, now),
			...base,
			attempts,
			budget_alerts: newlyCrossedThresholds(before, before + costIdr)
		};
	} catch (e) {
		console.warn('rlec tomorrow: AI error', e instanceof Error ? e.message : 'unknown');
		return await finish('ai_error');
	}
}

export { DEFAULT_MODEL };
