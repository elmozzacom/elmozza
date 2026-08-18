export type Vocab = {
	term: string;
	ipa: string;
	meaning: string;
	example: string;
};

export type QuizItem = {
	id: string;
	prompt: string;
	options: string[];
	answer: number;
	because: string;
};

/** The listening snippet is a transcript, not an audio file: no heavy media. */
export const TRANSCRIPT = [
	{ speaker: 'Nadia', line: 'You look different. Have you been running again?' },
	{ speaker: 'Arif', line: 'Every morning since March. I have been trying to sleep better.' },
	{ speaker: 'Nadia', line: 'And has it worked?' },
	{ speaker: 'Arif', line: 'It has. I sleep by ten now.' }
];

export const VOCAB: Vocab[] = [
	{
		term: 'since',
		ipa: '/sɪns/',
		meaning: 'From a starting point in the past until now.',
		example: 'Since March — the running started in March and has not stopped.'
	},
	{
		term: 'every morning',
		ipa: '/ˈevri ˈmɔːnɪŋ/',
		meaning: 'A repeated habit, not one event.',
		example: 'Habits pair naturally with the continuous form.'
	},
	{
		term: 'has it worked',
		ipa: '/hæz ɪt wɜːkt/',
		meaning: 'Asking about a result that still matters now.',
		example: 'Present perfect: the past action has a present consequence.'
	},
	{
		term: 'by ten',
		ipa: '/baɪ ten/',
		meaning: 'Not later than ten o’clock.',
		example: 'By ten means the deadline; at ten means the exact moment.'
	}
];

export const QUIZ: QuizItem[] = [
	{
		id: 'q1',
		prompt: 'I ___ English for two years.',
		options: ['have been studying', 'am studying', 'study'],
		answer: 0,
		because: 'A duration reaching the present takes the present perfect continuous.'
	},
	{
		id: 'q2',
		prompt: 'Which sentence keeps the idea of duration?',
		options: ['She has learned quietly.', 'She has been learning quietly.', 'She learns quietly.'],
		answer: 1,
		because: 'Been + ‑ing is what carries duration. Remove it and only the result remains.'
	},
	{
		id: 'q3',
		prompt: 'He has been waiting ___ seven o’clock.',
		options: ['for', 'since', 'during'],
		answer: 1,
		because: 'Since takes a point in time; for takes a length of time.'
	},
	{
		id: 'q4',
		prompt: 'Choose the natural reply to “Have you been running again?”',
		options: ['Yes, I have.', 'Yes, I do.', 'Yes, I am running.'],
		answer: 0,
		because: 'Short answers echo the auxiliary in the question — have.'
	},
	{
		id: 'q5',
		prompt: 'I sleep ___ ten now.',
		options: ['by', 'until', 'from'],
		answer: 0,
		because: 'By ten sets a limit: asleep no later than ten.'
	}
];
