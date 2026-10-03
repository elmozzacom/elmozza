// RLEC Level 0 — BYO AI ("bring your own" ChatGPT/Gemini/Claude). Pure, no I/O, no AI calls.
// buildByoPackage(): the copy-paste prompt (plan v0.1 section 7 shape).
// parseSessionReport(): the pasted === SESSION REPORT === block -> structured report.
//
// Design note (owner decision D): the import side is source-agnostic. A
// ParsedSessionReport carries its `source`; today the only producer is
// 'byo_paste' (learner pastes text from an external chatbot). Later the
// internal tutor ('internal_tutor') will emit the same shape directly, and
// importSessionReport() in db.ts will store both the same way. Do not couple
// storage or UI to manual paste.

export type SessionReportSource = 'byo_paste' | 'internal_tutor';
export const KNOWN_PATTERNS = [
	'PAST_TENSE_OMISSION',
	'ARTICLE_OMISSION',
	'SV_AGREEMENT',
	'PREPOSITION_CONFUSION',
	'PLURAL_S_OMISSION',
	'WORD_ORDER_QUESTION',
	'TRANSLATION_STYLE',
	'LIMITED_VOCAB',
	'OVERUSE_VERY',
	'HESITATION_LONG_PAUSE',
	'PRON_TH',
	'PRON_FINAL_CONSONANT',
	'WORD_STRESS',
	'REGISTER_TOO_CASUAL'
] as const;
export const UNCLASSIFIED = 'UNCLASSIFIED';

export type ByoScenario = {
	title: string;
	place: string | null;
	situation: string | null;
	cefr: string | null;
	role_a: string | null;
	role_b: string | null;
	goal: string | null;
	context_brief: string | null;
	useful_phrases_json: string | null;
	unexpected_challenge: string | null;
	correction_policy: string | null;
};
export type ByoProfile = { correction_style?: string | null; cefr_self?: string | null; cefr_estimated?: string | null } | null;
export type ByoWeakPoint = { pattern_code: string; label?: string | null };
export type ByoOptions = { learnerName?: string | null; partnerName?: string | null; minutes?: number | null };

/** Learner-facing reminders for each Error Memory pattern. */
export const PATTERN_HINT: Record<string, string> = {
	PAST_TENSE_OMISSION: 'past tense (went, had, was)',
	ARTICLE_OMISSION: 'articles a/an/the',
	SV_AGREEMENT: 'subject-verb agreement (she has, he goes)',
	PREPOSITION_CONFUSION: 'prepositions (on Monday, at 3 p.m., in the room)',
	PLURAL_S_OMISSION: 'plural -s (two tickets)',
	WORD_ORDER_QUESTION: 'question word order (Where do you work?)',
	TRANSLATION_STYLE: 'thinking in English, not word-by-word translation',
	LIMITED_VOCAB: 'using the target words instead of going around them',
	OVERUSE_VERY: 'stronger words instead of "very" (exhausted, delighted)',
	HESITATION_LONG_PAUSE: 'short fillers instead of long silence ("Let me think...")',
	PRON_TH: 'the TH sound (think, the)',
	PRON_FINAL_CONSONANT: 'clear final sounds (-s, -ed, -t)',
	WORD_STRESS: 'word stress',
	REGISTER_TOO_CASUAL: 'polite, professional tone'
};

const LEVEL_GUIDE: Record<string, string> = {
	A1: 'Use very short sentences, the most common words, and one question per turn. Speak slowly.',
	A2: 'Use short sentences, common words, and one question per turn.',
	B1: 'Use short sentences, common words, one question per turn. Explain any difficult word simply.',
	B2: 'Use natural sentences at normal speed. One or two questions per turn.',
	C1: 'Speak naturally, like a native professional. Use idioms when they fit.',
	C2: 'Speak naturally, like a native professional. Use idioms when they fit.'
};

export const CORRECTION_TEXT: Record<'beginner' | 'intermediate' | 'advanced', string> = {
	beginner:
		'Max 2 corrections per turn, the most important ones only. Format: ✏️ "you said" → "better". You may give me two options. Then continue the role.',
	intermediate:
		'Correct only mistakes that change the meaning or make grammar hard to follow; naturalness only after meaning is safe. Max 1 correction per turn. Format: ✏️ "you said" → "better". Then continue the role.',
	advanced:
		'Conversation first. Do not correct me during the role-play. Collect my mistakes and give them only in REVIEW and in the SESSION REPORT.'
};

/** "Name — description" -> { name, description }. Seeded scenarios use this shape. */
export function splitRole(role: string | null | undefined, fallbackName: string) {
	const raw = (role ?? '').trim();
	const i = raw.indexOf(' — ');
	if (i > 0) return { name: raw.slice(0, i).trim(), description: raw.slice(i + 3).trim() };
	return { name: fallbackName, description: raw || 'a person in this situation' };
}

const parseJsonList = (raw: string | null | undefined): string[] => {
	try {
		const v = JSON.parse(raw ?? '[]');
		return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0) : [];
	} catch {
		return [];
	}
};
const clean = (s: string | null | undefined, max = 120) => (s ?? '').replace(/[\r\n"]+/g, ' ').trim().slice(0, max);
const sentence = (s: string) => (/[.!?]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);

export function challengeTurn(minutes: number) {
	if (minutes <= 5) return 4;
	if (minutes <= 10) return 6;
	return 10;
}

export function buildByoPackage(scenario: ByoScenario, profile: ByoProfile, topErrors: ByoWeakPoint[], opts: ByoOptions = {}): string {
	const minutes = opts.minutes && [5, 10, 20].includes(opts.minutes) ? opts.minutes : 10;
	const partner = splitRole(scenario.role_a, 'your partner');
	const learner = splitRole(scenario.role_b, 'the learner');
	const partnerName = clean(opts.partnerName, 40) || partner.name;
	const learnerName = clean(opts.learnerName, 40) || learner.name;
	const level = scenario.cefr ?? profile?.cefr_estimated ?? profile?.cefr_self ?? 'A2';
	const style = (['beginner', 'intermediate', 'advanced'] as const).find((s) => s === scenario.correction_policy) ?? 'beginner';
	const phrases = parseJsonList(scenario.useful_phrases_json).slice(0, 6);
	const weak = topErrors
		.slice(0, 3)
		.map((e) => PATTERN_HINT[e.pattern_code] ?? e.label ?? null)
		.filter((x): x is string => !!x);
	const scenarioLine = [scenario.situation, scenario.place ? `Place: ${scenario.place}` : null, scenario.context_brief]
		.filter(Boolean)
		.map((s) => sentence(String(s)))
		.join(' ');
	const challenge = scenario.unexpected_challenge?.trim() || 'Raise one realistic small problem that I must solve.';

	return [
		'You are my English speaking partner. Follow these rules strictly.',
		'',
		`ROLE LOCK: You are "${partnerName}", ${partner.description}.`,
		`I am "${learnerName}", ${learner.description}. Never switch roles.`,
		`SCENARIO LOCK: ${scenarioLine} Stay in this scenario. If I go off-topic, steer me back.`,
		`LEVEL LOCK: My level is ${level}. ${LEVEL_GUIDE[level] ?? LEVEL_GUIDE.A2}`,
		`GOAL: ${sentence(scenario.goal ?? scenario.title)} The session lasts about ${minutes} minutes.`,
		phrases.length
			? `TARGET PHRASES I should use: ${phrases.map((p) => `"${p}"`).join(', ')}.`
			: 'TARGET PHRASES I should use: polite questions and short confirmations.',
		weak.length
			? `MY KNOWN WEAK POINTS (force me to use them): ${weak.join(', ')}.`
			: 'MY KNOWN WEAK POINTS (force me to use them): none recorded yet. Watch my mistakes and use them in REVIEW.',
		`UNEXPECTED CHALLENGE: On turn ${challengeTurn(minutes)}, ${challenge}`,
		`CORRECTION POLICY: ${CORRECTION_TEXT[style]}`,
		'If I type RETRY, let me say my last line again.',
		'If I type REVIEW, stop the role and list my top 3 mistakes with a fix.',
		'END: When I type END, output exactly this block:',
		'=== SESSION REPORT ===',
		'errors: [{pattern, wrong, fixed}]',
		'wins: ["things I did well, with my exact words"]',
		'new_phrases: ["new phrases I used correctly"]',
		'confidence_tip: ...',
		'=== END ===',
		`Start now with your first line as ${partnerName}.`
	].join('\n');
}

// ---------------------------------------------------------------- report parsing

export type ParsedError = { pattern_text: string | null; pattern_code: string; wrong: string | null; fixed: string | null };
export type ParsedSessionReport = {
	source: SessionReportSource;
	found_block: boolean;
	errors: ParsedError[];
	wins: string[];
	new_phrases: string[];
	confidence_tip: string | null;
	warnings: string[];
};

const MAX_ITEMS = 20;
const MAX_TEXT = 300;
const trimText = (s: string | null | undefined) => {
	const t = (s ?? '').replace(/\s+/g, ' ').trim().replace(/^["'`]+|["'`,;]+$/g, '').trim();
	return t ? t.slice(0, MAX_TEXT) : null;
};

const KEYWORDS: Array<[string, RegExp]> = [
	['REGISTER_TOO_CASUAL', /register|too (casual|informal|direct)|impolite|politeness|formality|\btone\b/],
	['PAST_TENSE_OMISSION', /past (tense|simple|form)|simple past|\bpast\b|-ed ending/],
	['ARTICLE_OMISSION', /article|\ba\s*\/\s*an\b|\ba\/the\b|determiner/],
	['SV_AGREEMENT', /subject[\s-]*verb|agreement|third[\s-]person|3rd[\s-]person/],
	['PREPOSITION_CONFUSION', /preposition/],
	['PLURAL_S_OMISSION', /plural/],
	['WORD_ORDER_QUESTION', /question (form|formation|word order|structure)|word order|auxiliary|inversion/],
	['TRANSLATION_STYLE', /literal|translat|indonesian/],
	['OVERUSE_VERY', /\bvery\b/],
	['HESITATION_LONG_PAUSE', /hesitat|long pause|pausing|fluency/],
	['PRON_TH', /\bth\b|th[\s-]sound/],
	['PRON_FINAL_CONSONANT', /final (consonant|sound|s\b)|ending sound|dropped (the )?(final|ending)/],
	['WORD_STRESS', /stress/],
	['LIMITED_VOCAB', /vocabular|word choice|wrong word|missing word|collocation/]
];

const ARTICLES = new Set(['a', 'an', 'the']);
const words = (s: string) => s.toLowerCase().replace(/[^a-z' ]+/g, ' ').split(/\s+/).filter(Boolean);

/** Map free text to one of the 14 pattern codes when obvious, else UNCLASSIFIED. */
export function classifyPattern(patternText: string | null, wrong: string | null = null, fixed: string | null = null): string {
	const raw = (patternText ?? '').trim();
	const asCode = raw.toUpperCase().replace(/[\s-]+/g, '_');
	if ((KNOWN_PATTERNS as readonly string[]).includes(asCode)) return asCode;
	const t = raw.toLowerCase();
	if (t) for (const [code, re] of KEYWORDS) if (re.test(t)) return code;
	if (wrong && fixed) {
		const w = words(wrong);
		const f = words(fixed);
		const fNoArticle = f.filter((x) => !ARTICLES.has(x));
		const wNoArticle = w.filter((x) => !ARTICLES.has(x));
		if (f.length > w.length && fNoArticle.join(' ') === wNoArticle.join(' ')) return 'ARTICLE_OMISSION';
	}
	return UNCLASSIFIED;
}

function normalize(text: string) {
	return text
		.replace(/\r\n?/g, '\n')
		.replace(/```[a-z]*\n?/gi, '')
		.replace(/[“”„]/g, '"')
		.replace(/[‘’]/g, "'")
		.replace(/\*\*|__/g, '')
		.replace(/\u00a0/g, ' ');
}

function extractBlock(text: string): { block: string; found: boolean } {
	const start = text.search(/=+\s*session\s+report\s*=+|#+\s*session\s+report|^\s*session\s+report\s*:?\s*$/im);
	if (start < 0) return { block: text, found: false };
	const rest = text.slice(start).replace(/^.*\n?/, '');
	const end = rest.search(/=+\s*end(\s+of\s+(session\s+)?report)?\s*=+/i);
	return { block: end >= 0 ? rest.slice(0, end) : rest, found: true };
}

type SectionKey = 'errors' | 'wins' | 'new_phrases' | 'confidence_tip';
const SECTION_RE: Array<[SectionKey, RegExp]> = [
	['errors', /^(errors?|mistakes?|corrections?)\b/i],
	['wins', /^(wins?|what you did well|strengths?|did well|good points?)\b/i],
	['new_phrases', /^(new[_\s-]?phrases?|phrases?( used)?|useful phrases)\b/i],
	['confidence_tip', /^(confidence[_\s-]?tip|tip)\b/i]
];

function splitSections(block: string): Partial<Record<SectionKey, string>> {
	const out: Partial<Record<SectionKey, string>> = {};
	let current: SectionKey | null = null;
	for (const line of block.split('\n')) {
		const stripped = line.replace(/^[\s>#*\-•]+/, '').trim();
		const head = SECTION_RE.find(([, re]) => re.test(stripped));
		const colon = stripped.indexOf(':');
		if (head && (colon >= 0 || stripped.length <= 30)) {
			current = head[0];
			out[current] = (out[current] ?? '') + (colon >= 0 ? stripped.slice(colon + 1) : '') + '\n';
		} else if (current) {
			out[current] = (out[current] ?? '') + line + '\n';
		}
	}
	return out;
}

function tryJson(s: string): unknown {
	try {
		return JSON.parse(s.trim());
	} catch {
		return undefined;
	}
}

function field(item: string, names: string): string | null {
	const quoted = new RegExp(`(?:${names})"?\\s*[:=]\\s*"([^"]*)"`, 'i').exec(item);
	if (quoted) return quoted[1];
	const bare = new RegExp(`(?:${names})"?\\s*[:=]\\s*([^,|}\\n]+)`, 'i').exec(item);
	return bare ? bare[1] : null;
}

function parseErrorItem(item: string): ParsedError | null {
	const patternField = field(item, 'pattern|type|category|issue');
	let wrong = field(item, 'wrong|you said|original|incorrect|mistake');
	let fixed = field(item, 'fixed|better|correct(?:ed|ion)?|should be|fix');
	let patternText = patternField;
	if (!wrong || !fixed) {
		const arrow = /"([^"]+)"\s*(?:→|->|=>|⇒|➡️?|should be|instead of)\s*"([^"]+)"/i.exec(item);
		if (arrow) {
			const reversed = /instead of/i.test(arrow[0]);
			wrong = reversed ? arrow[2] : arrow[1];
			fixed = reversed ? arrow[1] : arrow[2];
			if (!patternText) {
				const before = item.slice(0, item.indexOf(arrow[0])).replace(/^[\s\d.)\-*•{]+/, '');
				const label = before.replace(/["(]+$/, '').replace(/[:\-–—]\s*$/, '').trim();
				patternText = label || null;
			}
		}
	}
	const w = trimText(wrong);
	const f = trimText(fixed);
	const p = trimText(patternText);
	if (!w && !f && !p) return null;
	return { pattern_text: p, pattern_code: classifyPattern(p, w, f), wrong: w, fixed: f };
}

function parseErrors(section: string | undefined): ParsedError[] {
	if (!section || !section.trim()) return [];
	const json = tryJson(section);
	if (Array.isArray(json)) {
		return json
			.filter((x) => x && typeof x === 'object')
			.map((x) => {
				const o = x as Record<string, unknown>;
				const str = (k: string[]) => {
					for (const key of k) if (typeof o[key] === 'string') return o[key] as string;
					return null;
				};
				const p = trimText(str(['pattern', 'type', 'category']));
				const w = trimText(str(['wrong', 'original', 'you_said']));
				const f = trimText(str(['fixed', 'better', 'correct', 'correction']));
				return { pattern_text: p, pattern_code: classifyPattern(p, w, f), wrong: w, fixed: f };
			})
			.filter((e) => e.pattern_text || e.wrong || e.fixed)
			.slice(0, MAX_ITEMS);
	}
	const objects = section.match(/\{[^{}]*\}/g);
	const items = objects && objects.length ? objects : section.split('\n').map((l) => l.replace(/^[\s\-*•\d.)\]\[]+/, '').trim()).filter((l) => l && l !== ']');
	return items.map(parseErrorItem).filter((e): e is ParsedError => e !== null).slice(0, MAX_ITEMS);
}

function parseList(section: string | undefined): string[] {
	if (!section || !section.trim()) return [];
	const json = tryJson(section);
	let items: string[];
	if (Array.isArray(json)) items = json.filter((x): x is string => typeof x === 'string');
	else {
		const lines = section.split('\n').map((l) => l.trim()).filter((l) => l && l !== '[' && l !== ']');
		items = [];
		for (const line of lines) {
			const body = line.replace(/^[\s\-*•\d.)]+/, '').replace(/^\[|\],?$/g, '').trim();
			const quoted = body.match(/"([^"]+)"/g);
			if (quoted && (lines.length === 1 || quoted.length > 1) && body.replace(/"[^"]+"|[,\s]/g, '') === '') items.push(...quoted.map((q) => q.slice(1, -1)));
			else if (lines.length === 1 && body.includes(';')) items.push(...body.split(';'));
			else items.push(body);
		}
	}
	return [...new Set(items.map(trimText).filter((x): x is string => !!x && !/^(none|n\/a|-|\.\.\.)$/i.test(x)))].slice(0, MAX_ITEMS);
}

export function parseSessionReport(text: string, source: SessionReportSource = 'byo_paste'): ParsedSessionReport {
	const warnings: string[] = [];
	const { block, found } = extractBlock(normalize(String(text ?? '')));
	if (!found) warnings.push('SESSION REPORT block not found; parsed the whole text.');
	const sections = splitSections(block);
	const errors = parseErrors(sections.errors);
	const wins = parseList(sections.wins);
	const new_phrases = parseList(sections.new_phrases);
	const tip = trimText((sections.confidence_tip ?? '').split('\n').map((l) => l.trim()).filter(Boolean).join(' '));
	if (!errors.length && !wins.length && !new_phrases.length) warnings.push('No errors, wins, or phrases found.');
	const unclassified = errors.filter((e) => e.pattern_code === UNCLASSIFIED).length;
	if (unclassified) warnings.push(`${unclassified} error(s) kept as UNCLASSIFIED.`);
	return { source, found_block: found, errors, wins, new_phrases, confidence_tip: tip, warnings };
}
