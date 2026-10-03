// Tomorrow Mode intent: "Besok mau ngapain?" -> structured intent.
// Rules first (free, deterministic, ID+EN). Optional LLM classification through
// the provider interface, with the JSON output validated against the taxonomy.
import { CARD_LEVELS, type CardLevel, type TomorrowIntent } from './types';
import { DOMAINS, SITUATIONS, domainById, hasKeyword } from './taxonomy';
import type { LlmProvider, LlmResult } from './provider';
import { redactPii } from './validator';

const COUNTERPARTS: { label: string; keywords: string[] }[] = [
	{ label: 'patient family', keywords: ['keluarga pasien', 'patient family', "patient's family", 'family of the patient', 'anak pasien', 'istri pasien', 'suami pasien'] },
	{ label: 'foreign doctor', keywords: ['dokter asing', 'foreign doctor', 'dokter dari australia', 'dokter luar negeri', 'visiting doctor', 'dokter tamu'] },
	{ label: 'consultant', keywords: ['konsulen', 'consultant', 'supervisor'] },
	{ label: 'session chair', keywords: ['moderator', 'chair', 'ketua sesi', 'penguji', 'examiner'] },
	{ label: 'interviewer', keywords: ['pewawancara', 'interviewer', 'hrd', 'recruiter'] },
	{ label: 'vendor', keywords: ['vendor', 'supplier', 'sales'] },
	{ label: 'investor', keywords: ['investor'] },
	{ label: 'client', keywords: ['klien', 'client', 'customer', 'pelanggan'] },
	{ label: 'manager', keywords: ['atasan', 'bos', 'boss', 'manager', 'manajer', 'direktur', 'director'] },
	{ label: 'nurse', keywords: ['perawat', 'nurse'] },
	{ label: 'patient', keywords: ['pasien', 'patient'] },
	{ label: 'doctor', keywords: ['dokter', 'doctor'] },
	{ label: 'team', keywords: ['tim', 'team', 'kolega', 'colleague', 'rekan kerja'] },
	{ label: 'waiter', keywords: ['pelayan', 'waiter', 'waitress'] },
	{ label: 'receptionist', keywords: ['resepsionis', 'receptionist', 'front desk'] },
	{ label: 'immigration officer', keywords: ['petugas imigrasi', 'immigration officer'] },
	{ label: 'driver', keywords: ['sopir', 'supir', 'driver'] },
	{ label: 'airline agent', keywords: ['petugas maskapai', 'airline', 'check-in counter'] }
];

const HIGH_STAKES = ['presentasi', 'presentation', 'interview', 'wawancara', 'negosiasi', 'negotiation', 'direktur', 'director', 'konferensi', 'conference', 'icu', 'keluarga pasien', 'ujian', 'exam', 'investor', 'penting', 'important', 'darurat', 'emergency'];
const LOW_STAKES = ['ngobrol', 'small talk', 'makan', 'lunch', 'belanja', 'shopping', 'santai'];
const WEEKDAYS: Record<string, string> = { senin: 'monday', selasa: 'tuesday', rabu: 'wednesday', kamis: 'thursday', jumat: 'friday', "jum'at": 'friday', sabtu: 'saturday', minggu: 'sunday' };

/** Situations whose presence should win a domain tie (who you talk to decides the fence). */
const SITUATION_DOMAIN: Record<string, string> = { Negotiation: 'D17', 'Estimate or quotation': 'D17', Handover: 'D04', 'Procedure explanation': 'D04', 'Describing symptoms': 'D04', 'Medication instructions': 'D04' };

export function levelHint(text: string, fallback: CardLevel | null = null): CardLevel | null {
	const m = text.match(/\b(A1|A2|B1|B2|C1)\b/i);
	if (m) return m[1].toUpperCase() as CardLevel;
	const t = text.toLowerCase();
	if (/\b(pemula|beginner|dasar)\b/.test(t)) return 'A2';
	if (/\b(menengah|intermediate)\b/.test(t)) return 'B1';
	if (/\b(mahir|advanced|lancar)\b/.test(t)) return 'B2';
	return fallback;
}

export function ruleIntent(text: string, profileLevel: CardLevel | null = null): TomorrowIntent {
	const t = text.toLowerCase();
	const situation = SITUATIONS.find((s) => s.keywords.some((k) => hasKeyword(t, k)))?.name ?? null;

	const scored = DOMAINS.map((d, order) => {
		let score = d.keywords.filter((k) => hasKeyword(t, k)).length;
		let bestPlace: { name: string; hits: number } | null = null;
		for (const p of d.places) {
			const hits = p.keywords.filter((k) => hasKeyword(t, k)).length;
			if (hits && (!bestPlace || hits > bestPlace.hits)) bestPlace = { name: p.name, hits };
		}
		if (bestPlace) score += 2 * bestPlace.hits;
		return { d, score, place: bestPlace?.name ?? null, order };
	}).filter((s) => s.score > 0);
	scored.sort((a, b) => b.score - a.score || a.order - b.order);
	let pick = scored[0] ?? null;
	if (pick && situation && SITUATION_DOMAIN[situation]) {
		const pref = scored.find((s) => s.d.id === SITUATION_DOMAIN[situation] && s.score >= pick!.score - 1);
		if (pref) pick = pref;
	}

	const counterpart = COUNTERPARTS.find((c) => c.keywords.some((k) => hasKeyword(t, k)))?.label ?? null;
	const stakes = HIGH_STAKES.some((k) => hasKeyword(t, k)) ? 'high' : LOW_STAKES.some((k) => hasKeyword(t, k)) ? 'low' : 'medium';
	let date: string | null = null;
	if (/\b(besok|tomorrow)\b/.test(t)) date = 'tomorrow';
	else if (/\blusa\b|day after tomorrow/.test(t)) date = 'day_after_tomorrow';
	else if (/\b(hari ini|nanti|today|tonight|malam ini)\b/.test(t)) date = 'today';
	else {
		for (const [id, en] of Object.entries(WEEKDAYS)) if (hasKeyword(t, id) || hasKeyword(t, en)) date = en;
	}

	const confidence = Math.min(1, (pick ? 0.4 : 0) + (pick?.place ? 0.3 : 0) + (situation ? 0.2 : 0) + (counterpart ? 0.1 : 0));
	return {
		domain_id: pick?.d.id ?? null,
		place: pick?.place ?? null,
		situation,
		counterpart,
		stakes,
		date,
		level_hint: levelHint(text, profileLevel),
		confidence: Math.round(confidence * 100) / 100,
		source: 'rules'
	};
}

// ---------------------------------------------------------------- optional LLM intent

export const INTENT_SCHEMA = {
	type: 'object',
	properties: {
		domain_id: { type: 'string' },
		place: { type: 'string' },
		situation: { type: 'string' },
		counterpart: { type: 'string' },
		stakes: { type: 'string', enum: ['low', 'medium', 'high'] },
		level_hint: { type: 'string' }
	},
	required: ['domain_id', 'place', 'situation', 'counterpart', 'stakes']
} as const;

/** Validate an LLM intent JSON against the taxonomy; anything unknown becomes null. */
export function parseLlmIntent(raw: unknown, base: TomorrowIntent): TomorrowIntent | null {
	let o: Record<string, unknown>;
	try {
		o = (typeof raw === 'string' ? JSON.parse(raw) : raw) as Record<string, unknown>;
	} catch {
		return null;
	}
	if (!o || typeof o !== 'object') return null;
	const d = domainById(typeof o.domain_id === 'string' ? o.domain_id.trim().toUpperCase() : null);
	if (!d) return null;
	const place = d.places.find((p) => p.name.toLowerCase() === String(o.place ?? '').trim().toLowerCase())?.name ?? null;
	const situation = SITUATIONS.find((s) => s.name.toLowerCase() === String(o.situation ?? '').trim().toLowerCase())?.name ?? base.situation;
	const cp = typeof o.counterpart === 'string' && /^[A-Za-z' -]{2,40}$/.test(o.counterpart.trim()) ? o.counterpart.trim().toLowerCase() : base.counterpart;
	const stakes = ['low', 'medium', 'high'].includes(String(o.stakes)) ? (o.stakes as TomorrowIntent['stakes']) : base.stakes;
	const lvl = String(o.level_hint ?? '').toUpperCase();
	return {
		...base,
		domain_id: d.id,
		place,
		situation,
		counterpart: cp,
		stakes,
		level_hint: base.level_hint ?? ((CARD_LEVELS as readonly string[]).includes(lvl) ? (lvl as CardLevel) : null),
		confidence: Math.max(base.confidence, 0.6),
		source: 'llm'
	};
}

export async function llmIntent(provider: LlmProvider, text: string, base: TomorrowIntent): Promise<{ intent: TomorrowIntent | null; call: LlmResult }> {
	const taxonomy = DOMAINS.map((d) => `${d.id} ${d.name}: ${d.places.map((p) => p.name).join('; ')}`).join('\n');
	const call = await provider.complete(
		[
			{
				role: 'system',
				content: `Classify a learner's plan for tomorrow into this taxonomy. Reply with JSON only.\nDomains and places:\n${taxonomy}\nSituations: ${SITUATIONS.map((s) => s.name).join('; ')}`
			},
			{ role: 'user', content: redactPii(text).slice(0, 500) }
		],
		{ maxTokens: 120, temperature: 0, jsonSchema: INTENT_SCHEMA }
	);
	return { intent: parseLlmIntent(call.text, base), call };
}
