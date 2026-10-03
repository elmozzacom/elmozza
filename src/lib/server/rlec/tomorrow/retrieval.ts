// Tomorrow Mode retrieval: own cards -> local bank (rlec_scenarios) -> ECW warehouse
// (FTS5 via ECW_DB, Vectorize via AI embedding + ECW_VEC). Always domain-fenced.
// FULL = a complete, validated card exists (no AI, no credit).
// PARTIAL = in-fence anchors exist (fed to the LLM). NONE = nothing in the fence.
import type { D1Database } from '@cloudflare/workers-types';
import type { CardLevel, Coverage, TomorrowCard, TomorrowIntent, ValidationResult } from './types';
import { SITUATIONS, domainById, hasKeyword, rlecDomainsFor } from './taxonomy';
import { validateCard } from './validator';
import { embed, type AiBinding } from './provider';

export type Anchor = {
	ref: string; // ECW-xxxxx or RLEC scenario id
	origin: 'ecw' | 'bank';
	title: string;
	place: string | null;
	situation: string | null;
	level: string | null;
	role_a: string | null;
	role_b: string | null;
	summary: string | null;
	lines: string[];
};

export type VectorizeLike = {
	query(vector: number[], opts: Record<string, unknown>): Promise<{ matches?: { id: string; score?: number }[] }>;
};

export type RetrievalDeps = {
	db: D1Database;
	userId: number;
	pilot: boolean;
	ecwDb?: D1Database | null;
	vec?: VectorizeLike | null;
	ai?: AiBinding | null;
};

export type RetrievalResult = {
	coverage: Coverage;
	card: TomorrowCard | null;
	card_source: 'own' | 'bank' | null;
	scenario_id: number | null;
	qc: ValidationResult | null;
	anchors: Anchor[];
	via: string[]; // which stores answered / failed (diagnostics, no user text)
};

const parseArr = (raw: unknown): string[] => {
	try {
		const v = JSON.parse(String(raw ?? '[]'));
		return Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()) : [];
	} catch {
		return [];
	}
};

const STOP = new Set('the a an to of and or in on at for with is are you your i me my it this that be can could would will please do does what how'.split(' '));
const tokens = (s: string) => new Set((s.toLowerCase().match(/[a-z']+/g) ?? []).filter((w) => w.length > 2 && !STOP.has(w)));
const overlap = (a: string, b: string) => {
	const A = tokens(a);
	let n = 0;
	for (const w of tokens(b)) if (A.has(w)) n += 1;
	return n;
};

const GENERIC_ANSWERS = ["Good question. Let me check and tell you in a minute.", "I'm not sure yet. Can I get back to you today?", 'Yes, that is right. Let me explain briefly.'];
const GENERIC_FIXES = ['Stay calm and say: "Sorry, could you say that again, please?"', 'Say: "Let me check and get back to you."'];

/** Keywords of the intent's place + situation, used to match free-text bank scenarios. */
function intentKeywords(intent: TomorrowIntent): { place: string[]; situation: string[] } {
	const d = domainById(intent.domain_id);
	const place = d?.places.find((p) => p.name === intent.place);
	const sit = SITUATIONS.find((s) => s.name === intent.situation);
	return {
		place: place ? [place.name.toLowerCase(), ...place.keywords] : [],
		situation: sit ? [sit.name.toLowerCase(), ...sit.keywords] : []
	};
}

/** Build a Tomorrow Card from a curated bank scenario row (no AI). */
export function bankCard(row: Record<string, unknown>, intent: TomorrowIntent, level: CardLevel): TomorrowCard | null {
	const phrases = parseArr(row.useful_phrases_json);
	const questions = parseArr(row.likely_questions_json);
	const problems = parseArr(row.likely_problems_json);
	if (phrases.length < 6 || questions.length < 3 || problems.length < 1) return null;
	const opener = phrases[0];
	const main = phrases.slice(1, 6);
	const spare = phrases.slice(6);
	const used = new Set<string>();
	const ready_answers = questions.slice(0, 3).map((q, i) => {
		const pool = [...spare, ...main].filter((p) => !used.has(p));
		const best = pool.map((p) => ({ p, n: overlap(q, p) })).sort((a, b) => b.n - a.n)[0];
		const answer = best && best.n > 0 ? best.p : GENERIC_ANSWERS[i];
		used.add(answer);
		return { question: q, answer };
	});
	const trapTexts = [problems[0], problems[1] ?? (row.unexpected_challenge as string | null) ?? null].filter(Boolean) as string[];
	if (trapTexts.length < 2) return null;
	const traps = trapTexts.slice(0, 2).map((t, i) => ({ trap: t, fix: GENERIC_FIXES[i] }));
	const roleText = (v: unknown) => String(v ?? '').split('—')[1]?.trim() || String(v ?? '').trim();
	const learnerIsB = String(row.learner_role_default ?? 'role_b') === 'role_b';
	return {
		title: String(row.title),
		level,
		domain_id: intent.domain_id ?? '',
		place: intent.place ?? String(row.place ?? ''),
		situation: intent.situation ?? String(row.situation ?? ''),
		learner_role: roleText(learnerIsB ? row.role_b : row.role_a),
		counterpart_role: roleText(learnerIsB ? row.role_a : row.role_b),
		opener,
		phrases: main,
		ready_answers,
		traps,
		safety_note: (row.safety_notes as string | null) ?? null
	};
}

async function ownCard(deps: RetrievalDeps, intent: TomorrowIntent, level: CardLevel) {
	if (!intent.domain_id || !intent.place) return null;
	try {
		return await deps.db
			.prepare(
				`SELECT id, scenario_id, card_json FROM rlec_tomorrow_cards
				 WHERE user_id = ? AND domain_id = ? AND place = ? AND COALESCE(situation,'') = COALESCE(?, '') AND level = ? AND source IN ('llm','bank','own')
				 ORDER BY id DESC LIMIT 1`
			)
			.bind(deps.userId, intent.domain_id, intent.place, intent.situation, level)
			.first<{ id: number; scenario_id: number | null; card_json: string }>();
	} catch {
		return null;
	}
}

async function bankRows(deps: RetrievalDeps, intent: TomorrowIntent) {
	const doms = intent.domain_id ? rlecDomainsFor(intent.domain_id) : [];
	if (!doms.length) return [];
	const statuses = deps.pilot ? "'active','qc_passed','pilot'" : "'active','qc_passed'";
	const { results } = await deps.db
		.prepare(
			`SELECT * FROM rlec_scenarios s
			 WHERE s.domain IN (${doms.map(() => '?').join(',')}) AND s.source_kind != 'tomorrow'
			   AND s.status IN (${statuses}) AND s.owner_user_id IS NULL
			 ORDER BY s.id LIMIT 50`
		)
		.bind(...doms)
		.all<Record<string, unknown>>();
	return results ?? [];
}

function scoreBankRow(row: Record<string, unknown>, intent: TomorrowIntent) {
	const kw = intentKeywords(intent);
	const text = [row.title, row.subdomain, row.place, row.situation, row.goal].map((v) => String(v ?? '')).join(' | ');
	const placeHit = kw.place.some((k) => hasKeyword(text, k));
	const sitHit = kw.situation.some((k) => hasKeyword(text, k));
	const cpHit = intent.counterpart ? hasKeyword(`${row.role_a} ${row.role_b}`, intent.counterpart.split(' ').pop() ?? '') : false;
	return { placeHit, sitHit, cpHit, score: (placeHit ? 2 : 0) + (sitHit ? 2 : 0) + (cpHit ? 1 : 0) };
}

const ftsTerm = (s: string) => (s.match(/[A-Za-z]{3,}/g) ?? []).map((w) => `"${w}"`);

async function ecwFts(ecw: D1Database, intent: TomorrowIntent, level: CardLevel): Promise<Anchor[]> {
	const terms = [...new Set([...ftsTerm(intent.place ?? ''), ...ftsTerm(intent.situation ?? ''), ...ftsTerm(intent.counterpart ?? '')])].slice(0, 12);
	if (!terms.length || !intent.domain_id) return [];
	const { results } = await ecw
		.prepare(
			`SELECT s.scenario_id, s.title, s.primary_intent, s.role_a, s.role_b, s.semantic_summary,
			        l.code AS level, p.name AS place, si.name AS situation, bm25(scenario_fts) AS rank
			 FROM scenario_fts f
			 JOIN scenarios s ON s.scenario_id = f.scenario_id
			 JOIN situations si ON si.situation_id = s.situation_id
			 JOIN places p ON p.place_id = si.place_id
			 JOIN levels l ON l.level_id = s.level_id
			 WHERE scenario_fts MATCH ? AND p.domain_id = ? AND s.status = 'ACTIVE'
			 ORDER BY (p.name = ?) DESC, (si.name = ?) DESC, (l.code = ?) DESC, rank
			 LIMIT 5`
		)
		.bind(terms.join(' OR '), intent.domain_id, intent.place ?? '', intent.situation ?? '', level)
		.all<Record<string, unknown>>();
	return (results ?? []).map(toAnchor);
}

function toAnchor(r: Record<string, unknown>): Anchor {
	return {
		ref: String(r.scenario_id),
		origin: 'ecw',
		title: String(r.title ?? ''),
		place: (r.place as string) ?? null,
		situation: (r.situation as string) ?? null,
		level: (r.level as string) ?? null,
		role_a: (r.role_a as string) ?? null,
		role_b: (r.role_b as string) ?? null,
		summary: (r.semantic_summary as string) ?? null,
		lines: []
	};
}

async function ecwByIds(ecw: D1Database, ids: string[], domainId: string): Promise<Anchor[]> {
	if (!ids.length) return [];
	const { results } = await ecw
		.prepare(
			`SELECT s.scenario_id, s.title, s.primary_intent, s.role_a, s.role_b, s.semantic_summary,
			        l.code AS level, p.name AS place, si.name AS situation
			 FROM scenarios s JOIN situations si ON si.situation_id = s.situation_id
			 JOIN places p ON p.place_id = si.place_id JOIN levels l ON l.level_id = s.level_id
			 WHERE s.scenario_id IN (${ids.map(() => '?').join(',')}) AND p.domain_id = ? AND s.status = 'ACTIVE'`
		)
		.bind(...ids, domainId)
		.all<Record<string, unknown>>();
	return (results ?? []).map(toAnchor);
}

/** Attach up to 8 servable dialogue lines per anchor (warehouse wording as anchors for the LLM). */
async function attachLines(ecw: D1Database, anchors: Anchor[]) {
	for (const a of anchors.slice(0, 3)) {
		const { results } = await ecw
			.prepare(
				`SELECT u.speaker_role, u.text FROM v_servable_dialogues v JOIN utterances u ON u.dialogue_id = v.dialogue_id
				 WHERE v.scenario_id = ? ORDER BY v.variant_no, u.turn_no LIMIT 8`
			)
			.bind(a.ref)
			.all<{ speaker_role: string; text: string }>();
		a.lines = (results ?? []).map((r) => `${r.speaker_role}: ${r.text}`);
	}
}

export async function retrieve(deps: RetrievalDeps, intent: TomorrowIntent, level: CardLevel): Promise<RetrievalResult> {
	const via: string[] = [];
	const base = { level, domain_id: intent.domain_id, place: intent.place, counterpart: intent.counterpart };

	// 1. learner's own earlier validated card for the same fence + level
	const own = await ownCard(deps, intent, level);
	if (own) {
		try {
			const card = JSON.parse(own.card_json) as TomorrowCard;
			const qc = validateCard(card, base);
			if (qc.ok) return { coverage: 'FULL', card, card_source: 'own', scenario_id: own.scenario_id, qc, anchors: [], via: ['own'] };
		} catch {
			/* fall through */
		}
	}

	// 2. curated bank in the elmozza DB
	const anchors: Anchor[] = [];
	if (intent.domain_id) {
		const rows = (await bankRows(deps, intent)).map((row) => ({ row, ...scoreBankRow(row, intent) })).filter((r) => r.score > 0);
		rows.sort((a, b) => b.score - a.score);
		via.push(`bank:${rows.length}`);
		for (const r of rows) {
			if (r.placeHit && r.sitHit && String(r.row.cefr ?? '') === level) {
				const card = bankCard(r.row, intent, level);
				const qc = card ? validateCard(card, base) : null;
				if (card && qc?.ok) return { coverage: 'FULL', card, card_source: 'bank', scenario_id: Number(r.row.id), qc, anchors: [], via };
			}
		}
		for (const r of rows.slice(0, 2)) {
			anchors.push({
				ref: `RLEC-${r.row.id}`,
				origin: 'bank',
				title: String(r.row.title),
				place: (r.row.place as string) ?? null,
				situation: (r.row.situation as string) ?? null,
				level: (r.row.cefr as string) ?? null,
				role_a: (r.row.role_a as string) ?? null,
				role_b: (r.row.role_b as string) ?? null,
				summary: (r.row.goal as string) ?? null,
				lines: parseArr(r.row.useful_phrases_json).slice(0, 6)
			});
		}
	}

	// 3. ECW warehouse (optional bindings; failures degrade to fewer anchors)
	if (deps.ecwDb && intent.domain_id) {
		try {
			const hits = await ecwFts(deps.ecwDb, intent, level);
			via.push(`ecw_fts:${hits.length}`);
			anchors.push(...hits);
		} catch (e) {
			via.push(`ecw_fts:error`);
		}
		if (deps.vec && deps.ai) {
			try {
				const d = domainById(intent.domain_id);
				const qtext = [d?.name, intent.place, intent.situation, intent.counterpart].filter(Boolean).join(' | ');
				const vector = await embed(deps.ai, qtext);
				if (vector) {
					const res = await deps.vec.query(vector, { topK: 5, filter: { domain_id: intent.domain_id, content_kind: 'scenario' } });
					const ids = (res.matches ?? []).map((m) => m.id).filter((id) => /^ECW-\d+$/.test(id) && !anchors.some((a) => a.ref === id));
					const extra = await ecwByIds(deps.ecwDb, ids, intent.domain_id);
					via.push(`ecw_vec:${extra.length}`);
					anchors.push(...extra);
				}
			} catch {
				via.push('ecw_vec:error');
			}
		}
		try {
			await attachLines(deps.ecwDb, anchors.filter((a) => a.origin === 'ecw'));
		} catch {
			via.push('ecw_lines:error');
		}
	} else via.push('ecw:absent');

	return { coverage: anchors.length ? 'PARTIAL' : 'NONE', card: null, card_source: null, scenario_id: null, qc: null, anchors: anchors.slice(0, 6), via };
}
