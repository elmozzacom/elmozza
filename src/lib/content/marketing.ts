export type Level = {
	code: 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
	name: string;
	canDo: string;
	lessons: number;
	hours: number;
};

/** Brightness carries the axis, but each band is a readable row on its own. */
export const LEVELS: Level[] = [
	{ code: 'A1', name: 'Foundation', canDo: 'Introduce yourself and handle everyday greetings.', lessons: 24, hours: 12 },
	{ code: 'A2', name: 'Elementary', canDo: 'Describe your routine, your work, and your plans.', lessons: 28, hours: 16 },
	{ code: 'B1', name: 'Threshold', canDo: 'Hold a conversation about familiar topics without preparing.', lessons: 32, hours: 22 },
	{ code: 'B2', name: 'Vantage', canDo: 'Argue a position and follow fast native speech.', lessons: 30, hours: 26 },
	{ code: 'C1', name: 'Command', canDo: 'Speak precisely in professional and academic settings.', lessons: 26, hours: 30 }
];

export type PlacementQuestion = {
	id: string;
	prompt: string;
	options: string[];
	answer: number;
	because: string;
};

/** Three inline questions on the landing page. Not scored, not stored. */
export const PLACEMENT: PlacementQuestion[] = [
	{
		id: 'p1',
		prompt: 'She ___ in Surabaya since 2019.',
		options: ['lives', 'has lived', 'is living'],
		answer: 1,
		because: 'Since 2019 marks a start point that reaches the present — present perfect.'
	},
	{
		id: 'p2',
		prompt: 'If I ___ more time, I would read every evening.',
		options: ['have', 'had', 'will have'],
		answer: 1,
		because: 'Second conditional: past form in the if-clause, would in the result.'
	},
	{
		id: 'p3',
		prompt: 'The report ___ before the meeting started.',
		options: ['had been finished', 'has finished', 'was finishing'],
		answer: 0,
		because: 'One past action completed before another past action — past perfect passive.'
	}
];

export type Tier = {
	name: string;
	price: string;
	period: string;
	forWhom: string;
	cta: string;
	href: string;
};

/** A rate card, not a pricing wall: one sentence each, no badges, no checkmarks. */
export const TIERS: Tier[] = [
	{
		name: 'Open',
		price: 'Free',
		period: 'forever',
		forWhom: 'For anyone testing whether daily practice fits their life.',
		cta: 'Start free',
		href: '/register'
	},
	{
		name: 'Studio',
		price: 'Rp 149k',
		period: 'per month',
		forWhom: 'For learners who want the full A1–C1 path and weekly speaking review.',
		cta: 'Start free, upgrade later',
		href: '/register'
	},
	{
		name: 'Private',
		price: 'Rp 690k',
		period: 'per month',
		forWhom: 'For professionals preparing for a specific exam, interview, or posting.',
		cta: 'Enquire',
		href: '/register'
	}
];

export const QUOTES = [
	{
		text: 'I stopped collecting rules and started hearing the pattern. The exploded sentence is what did it.',
		by: 'Rani A.',
		role: 'Pharmacist, Malang'
	},
	{
		text: 'Ten minutes a day for four months. I chaired my first English meeting last week without notes.',
		by: 'Bagus P.',
		role: 'Project engineer, Surabaya'
	}
];
