// Tomorrow Mode (Level 0) shared types. Pure: no runtime imports.

export const CARD_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'] as const;
export type CardLevel = (typeof CARD_LEVELS)[number];

export type ReadyAnswer = { question: string; answer: string };
export type Trap = { trap: string; fix: string };

/** The one-screen card a learner reads the night before. All content fields are English. */
export type TomorrowCard = {
	title: string;
	level: CardLevel;
	domain_id: string; // ECW domain id, e.g. D04
	place: string;
	situation: string;
	learner_role: string;
	counterpart_role: string;
	opener: string;
	phrases: string[]; // exactly 5
	ready_answers: ReadyAnswer[]; // exactly 3: counterpart question -> learner answer
	traps: Trap[]; // exactly 2
	safety_note?: string | null;
};

export type TomorrowIntent = {
	domain_id: string | null; // ECW D01..D20
	place: string | null; // ECW place name
	situation: string | null; // ECW situation name
	counterpart: string | null;
	stakes: 'low' | 'medium' | 'high';
	date: string | null; // 'tomorrow' | 'today' | 'day_after_tomorrow' | weekday | null
	level_hint: CardLevel | null;
	confidence: number; // 0..1, rule based
	source: 'rules' | 'llm';
};

export type Coverage = 'FULL' | 'PARTIAL' | 'NONE';

export type ValidationResult = {
	ok: boolean;
	errors: string[];
	warnings: string[];
	flags: { clinical: boolean; pii: boolean };
};
