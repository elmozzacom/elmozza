/**
 * The learning ladder: two sections, eight themed units, sixty-plus
 * micro-steps. Content is real classroom English, not placeholder copy.
 */

export type StepType =
	| 'vocab_match'
	| 'listening'
	| 'fill_gap'
	| 'sentence_builder'
	| 'speaking'
	| 'story_dialogue'
	| 'checkpoint'
	| 'review';

export type PathStep = {
	sort: number;
	type: Exclude<StepType, 'review'>;
	title: string;
	xp: number;
	payload: Record<string, unknown>;
	srs?: { key: string; kind: 'vocab' | 'grammar'; prompt: string; answer: string };
};

export type PathUnit = {
	slug: string;
	title: string;
	theme: string;
	intro: string;
	section: 'A1' | 'A2';
	steps: PathStep[];
};

const match = (sort: number, title: string, pairs: [string, string][], key: string, prompt: string): PathStep => ({
	sort,
	type: 'vocab_match',
	title,
	xp: 10,
	payload: { pairs: pairs.map(([en, id]) => ({ en, id })) },
	srs: { key, kind: 'vocab', prompt, answer: pairs[0][0] }
});

const listen = (sort: number, title: string, audioText: string, question: string, options: string[], answer: number): PathStep => ({
	sort,
	type: 'listening',
	title,
	xp: 10,
	payload: { audioText, question, options, answer }
});

const gap = (sort: number, title: string, sentence: string, options: string[], answer: number, key: string, prompt: string, correct: string): PathStep => ({
	sort,
	type: 'fill_gap',
	title,
	xp: 10,
	payload: { sentence, options, answer },
	srs: { key, kind: 'grammar', prompt, answer: correct }
});

const build = (sort: number, title: string, words: string[], correct: string): PathStep => ({
	sort,
	type: 'sentence_builder',
	title,
	xp: 12,
	payload: { words, correct }
});

const speak = (sort: number, title: string, target: string, hint: string): PathStep => ({
	sort,
	type: 'speaking',
	title,
	xp: 12,
	payload: { target, hint }
});

const story = (
	sort: number,
	title: string,
	lines: Array<{ speaker: string; text: string }>,
	question: string,
	options: string[],
	answer: number
): PathStep => ({
	sort,
	type: 'story_dialogue',
	title,
	xp: 12,
	payload: { lines, question, options, answer }
});

const gate = (sort: number, title: string, questions: Array<{ prompt: string; options: string[]; answer: number }>): PathStep => ({
	sort,
	type: 'checkpoint',
	title,
	xp: 25,
	payload: { questions }
});

export const LADDER_UNITS: PathUnit[] = [
	{
		slug: 'first-words',
		title: 'First words',
		theme: 'Meeting someone new',
		intro: 'She has been learning quietly, and now she speaks.',
		section: 'A1',
		steps: [
			match(1, 'Greetings', [['good morning', 'selamat pagi'], ['nice to meet you', 'senang bertemu'], ['fine', 'baik']], 'v-greet', 'good morning'),
			listen(2, 'A short hello', 'Good morning. My name is Sari. Nice to meet you.', 'What is her name?', ['Sari', 'Siti', 'Nadia'], 0),
			gap(3, 'I am / You are', 'I ___ Sari.', ['am', 'is', 'are'], 0, 'g-be-am', 'I ___ Sari.', 'am'),
			build(4, 'Introduce yourself', ['My', 'name', 'is', 'Ahmad'], 'My name is Ahmad'),
			speak(5, 'Say hello', 'Nice to meet you.', 'A first meeting.'),
			story(6, 'Two colleagues', [
				{ speaker: 'Ahmad', text: 'Good morning. My name is Ahmad.' },
				{ speaker: 'Siti', text: 'Nice to meet you, Ahmad. I am Siti.' }
			], 'How does Siti reply?', ['Nice to meet you, Ahmad.', 'Good night.', 'I am a book.'], 0),
			listen(7, 'How are you?', 'How are you? I am fine, thank you.', 'The natural answer is…', ['I am fine, thank you.', 'I am a morning.', 'See you yesterday.'], 0),
			gate(8, 'Unit check', [
				{ prompt: 'Reply to “Nice to meet you.”', options: ['Nice to meet you, too.', 'Good night.', 'I like tea.'], answer: 0 },
				{ prompt: 'Choose the correct form.', options: ['I am ready.', 'I is ready.', 'I are ready.'], answer: 0 },
				{ prompt: '“Good morning” means…', options: ['selamat pagi', 'selamat malam', 'terima kasih'], answer: 0 }
			])
		]
	},
	{
		slug: 'ordering-food',
		title: 'Ordering food',
		theme: 'At a small café',
		intro: 'I would like rice and tea, please.',
		section: 'A1',
		steps: [
			match(1, 'On the menu', [['rice', 'nasi'], ['chicken', 'ayam'], ['tea', 'teh'], ['please', 'tolong / mohon']], 'v-food', 'rice'),
			listen(2, 'An offer', 'Would you like some coffee?', 'The polite reply is…', ['Yes, please.', 'I like yesterday.', 'Coffee is a noun.'], 0),
			gap(3, 'I’d like', 'I ___ like tea, please.', ['would', 'was', 'did'], 0, 'g-would-like', 'I ___ like tea.', 'would'),
			build(4, 'A polite order', ['I', 'would', 'like', 'rice', 'please'], 'I would like rice please'),
			speak(5, 'Order aloud', 'I would like fried rice, please.', 'Slow and clear.'),
			story(6, 'At the counter', [
				{ speaker: 'Waiter', text: 'What would you like to eat?' },
				{ speaker: 'Guest', text: 'I’d like rice and chicken, please.' }
			], 'What does the guest want?', ['Rice and chicken', 'Only water', 'The bill'], 0),
			gap(7, 'No, thank you', 'Would you like sugar? — No, ___.', ['thank you', 'please now', 'I do'], 0, 'g-no-thanks', 'No, ___', 'thank you'),
			gate(8, 'Unit check', [
				{ prompt: 'The polite order is…', options: ['I’d like rice, please.', 'Give rice.', 'Rice is like.'], answer: 0 },
				{ prompt: '“Would you like tea?”', options: ['Yes, please.', 'I like Tuesday.', 'Tea noun.'], answer: 0 },
				{ prompt: 'chicken means…', options: ['ayam', 'nasi', 'gula'], answer: 0 }
			])
		]
	},
	{
		slug: 'at-home',
		title: 'At home',
		theme: 'A simple morning',
		intro: 'I wake up at five and have breakfast.',
		section: 'A1',
		steps: [
			match(1, 'Morning words', [['wake up', 'bangun'], ['breakfast', 'sarapan'], ['home', 'rumah']], 'v-morning', 'wake up'),
			listen(2, 'A routine', 'I wake up at five and have breakfast.', 'When does she wake up?', ['At five', 'At noon', 'At night'], 0),
			gap(3, 'Present simple', 'I ___ up at five.', ['wake', 'wakes', 'waking'], 0, 'g-wake', 'I ___ up at five.', 'wake'),
			build(4, 'Tell your morning', ['I', 'have', 'breakfast', 'at', 'six'], 'I have breakfast at six'),
			speak(5, 'Say your routine', 'I wake up at five.', 'Use the simple present.'),
			story(6, 'Leaving the house', [
				{ speaker: 'Rina', text: 'I leave home at seven.' },
				{ speaker: 'Budi', text: 'I go to work by bus.' }
			], 'How does Budi travel?', ['By bus', 'By plane', 'He stays home'], 0),
			gap(7, 'Go home', 'After work I go ___.', ['home', 'to home', 'the home'], 0, 'g-go-home', 'I go ___', 'home'),
			gate(8, 'Unit check', [
				{ prompt: 'Correct sentence', options: ['I wake up at five.', 'I wakes up at five.', 'I waking up at five.'], answer: 0 },
				{ prompt: '“breakfast” means…', options: ['sarapan', 'makan malam', 'tidur'], answer: 0 },
				{ prompt: 'After work I…', options: ['go home', 'go to home', 'going home now yesterday'], answer: 0 }
			])
		]
	},
	{
		slug: 'getting-around',
		title: 'Getting around',
		theme: 'Buses, times, and traffic',
		intro: 'I leave home at seven and go by bus.',
		section: 'A1',
		steps: [
			match(1, 'Travel words', [['by bus', 'naik bus'], ['traffic', 'lalu lintas'], ['appointment', 'janji temu']], 'v-travel', 'by bus'),
			listen(2, 'Half past', 'The appointment is at half past two.', 'What time is that?', ['2:30', '2:15', '3:00'], 0),
			gap(3, 'How do you go?', 'I go to work ___ motorbike.', ['by', 'with', 'on the'], 0, 'g-by', 'I go ___ bus.', 'by'),
			build(4, 'Say the time', ['It', 'is', 'at', 'half', 'past', 'nine'], 'It is at half past nine'),
			speak(5, 'Tell the time', 'It is half past two.', 'Half past = :30'),
			story(6, 'In traffic', [
				{ speaker: 'Dina', text: 'How do you go to work?' },
				{ speaker: 'Eko', text: 'I go by bus. The traffic is heavy today.' }
			], 'What is heavy?', ['The traffic', 'The tea', 'The report'], 0),
			listen(7, 'Leave home', 'I leave home at seven.', 'leave home means…', ['berangkat dari rumah', 'tinggal di rumah', 'membersihkan rumah'], 0),
			gate(8, 'Unit check', [
				{ prompt: 'Half past two is…', options: ['2:30', '2:15', '3:00'], answer: 0 },
				{ prompt: 'I go ___ bus.', options: ['by', 'with', 'to'], answer: 0 },
				{ prompt: 'Correct', options: ['I go home by bus.', 'I go to home by bus.', 'I am go home bus.'], answer: 0 }
			])
		]
	},
	{
		slug: 'at-work',
		title: 'At work',
		theme: 'Meetings and updates',
		intro: 'The project is on schedule.',
		section: 'A2',
		steps: [
			match(1, 'Office words', [['meeting', 'rapat'], ['report', 'laporan'], ['schedule', 'jadwal']], 'v-work', 'meeting'),
			listen(2, 'Are you ready?', 'Are you ready for the meeting? Yes, I am. I have the report.', 'What does she have?', ['The report', 'The bus', 'The menu'], 0),
			gap(3, 'Be ready', 'Yes, I ___.', ['am', 'are', 'be'], 0, 'g-yes-i-am', 'Yes, I ___.', 'am'),
			build(4, 'A short update', ['The', 'project', 'is', 'on', 'schedule'], 'The project is on schedule'),
			speak(5, 'Give an update', 'The project is on schedule.', 'Calm and clear.'),
			story(6, 'A polite request', [
				{ speaker: 'Manager', text: 'Can you give us an update?' },
				{ speaker: 'Staff', text: 'Yes. The report is ready.' }
			], 'What is ready?', ['The report', 'The coffee', 'The taxi'], 0),
			gap(7, 'Can you…?', '___ you send the file, please?', ['Can', 'Are', 'Do be'], 0, 'g-can-you', '___ you send it?', 'Can'),
			gate(8, 'Unit check', [
				{ prompt: '“on schedule” means…', options: ['sesuai jadwal', 'terlambat', 'dibatalkan'], answer: 0 },
				{ prompt: 'Are you ready?', options: ['Yes, I am.', 'Yes, I ready.', 'I am yes.'], answer: 0 },
				{ prompt: 'Polite request', options: ['Can you give us an update, please?', 'Give update.', 'You update me now.'], answer: 0 }
			])
		]
	},
	{
		slug: 'meeting-friends',
		title: 'Meeting friends',
		theme: 'Invitations and evenings',
		intro: 'Would you like to join us tonight?',
		section: 'A2',
		steps: [
			match(1, 'Social words', [['join', 'bergabung'], ['tonight', 'malam ini'], ['event', 'acara']], 'v-social', 'join'),
			listen(2, 'An invitation', 'Would you like to join our community event?', 'A warm reply is…', ['I’d love to.', 'I love.', 'Event good.'], 0),
			gap(3, 'Going to', 'I am ___ to read tonight.', ['going', 'go', 'went'], 0, 'g-going-to', 'I am ___ to read.', 'going'),
			build(4, 'Invite someone', ['Would', 'you', 'like', 'to', 'join', 'us'], 'Would you like to join us'),
			speak(5, 'Accept an invite', 'I’d love to.', 'Warm, not loud.'),
			story(6, 'After work', [
				{ speaker: 'Lina', text: 'Do you have any plans tonight?' },
				{ speaker: 'Rafi', text: 'I am going to read a book.' }
			], 'What is Rafi going to do?', ['Read a book', 'Fly to Bali', 'Skip dinner forever'], 0),
			gap(7, 'After work', 'After I finish work, I go ___.', ['home', 'to home', 'the home'], 0, 'g-after-home', 'I go ___', 'home'),
			gate(8, 'Unit check', [
				{ prompt: 'A warm reply', options: ['I’d love to.', 'I love.', 'Yes I join yesterday.'], answer: 0 },
				{ prompt: 'Correct plan', options: ['I am going to read.', 'I going to read.', 'I am go to read.'], answer: 0 },
				{ prompt: 'tonight means…', options: ['malam ini', 'kemarin', 'minggu lalu'], answer: 0 }
			])
		]
	},
	{
		slug: 'job-interview',
		title: 'Job interview',
		theme: 'A formal first meeting',
		intro: 'I have been preparing for this interview.',
		section: 'A2',
		steps: [
			match(1, 'Interview words', [['experience', 'pengalaman'], ['strength', 'kekuatan'], ['available', 'tersedia']], 'v-interview', 'experience'),
			listen(2, 'A calm opening', 'Thank you for coming. Please tell me about yourself.', 'What should you do?', ['Talk about yourself', 'Leave the room', 'Order coffee'], 0),
			gap(3, 'Present perfect', 'I have ___ here since 2022.', ['worked', 'work', 'working'], 0, 'g-pp-worked', 'I have ___ here since 2022.', 'worked'),
			build(4, 'A clear strength', ['I', 'work', 'well', 'in', 'a', 'team'], 'I work well in a team'),
			speak(5, 'One sentence about you', 'I have been learning English every morning.', 'Steady, not fast.'),
			story(6, 'The close', [
				{ speaker: 'Interviewer', text: 'Do you have any questions for us?' },
				{ speaker: 'Candidate', text: 'Yes. When will I hear from you?' }
			], 'What does the candidate ask?', ['When they will hear back', 'Where the canteen is', 'Who makes the tea'], 0),
			gap(7, 'May I…', '___ I ask a question?', ['May', 'Do be', 'Going'], 0, 'g-may-i', '___ I ask?', 'May'),
			gate(8, 'Unit check', [
				{ prompt: 'I have ___ here since 2022.', options: ['worked', 'work', 'working'], answer: 0 },
				{ prompt: 'A polite question', options: ['May I ask a question?', 'I ask now.', 'Give question.'], answer: 0 },
				{ prompt: 'available means…', options: ['tersedia', 'marah', 'terlambat'], answer: 0 }
			])
		]
	},
	{
		slug: 'making-plans',
		title: 'Making plans',
		theme: 'Next week, clearly',
		intro: 'I am going to finish the report on Friday.',
		section: 'A2',
		steps: [
			match(1, 'Plan words', [['finish', 'selesai'], ['Friday', 'Jumat'], ['together', 'bersama']], 'v-plans', 'finish'),
			listen(2, 'A Friday plan', 'I am going to finish the report on Friday.', 'When will it be done?', ['Friday', 'Yesterday', 'Never'], 0),
			gap(3, 'On Friday', 'See you ___ Friday.', ['on', 'in', 'at the'], 0, 'g-on-friday', 'See you ___ Friday.', 'on'),
			build(4, 'Suggest a time', ['Shall', 'we', 'meet', 'at', 'ten'], 'Shall we meet at ten'),
			speak(5, 'Make a plan', 'I am going to study tonight.', 'One clear sentence.'),
			story(6, 'Confirming', [
				{ speaker: 'Nia', text: 'Shall we meet at ten?' },
				{ speaker: 'Omar', text: 'Yes. See you on Friday.' }
			], 'When do they meet?', ['Friday at ten', 'Monday at dawn', 'Never'], 0),
			listen(7, 'A lot', 'I learned a lot this month.', 'a lot means…', ['banyak', 'sedikit', 'tidak pernah'], 0),
			gate(8, 'Unit check', [
				{ prompt: 'Correct plan', options: ['I am going to finish it on Friday.', 'I going finish Friday.', 'I am go finish.'], answer: 0 },
				{ prompt: 'See you ___ Friday.', options: ['on', 'in', 'at'], answer: 0 },
				{ prompt: 'Shall we meet at ten?', options: ['Yes. See you then.', 'I meet yesterday.', 'Ten is number.'], answer: 0 }
			])
		]
	}
];

export const SECTIONS = [
	{ code: 'A1', title: 'Foundation', sort: 1 },
	{ code: 'A2', title: 'Everyday life', sort: 2 }
];

export const BADGE_SEED = [
	['streak-3', 'Three days', 'A streak of three mornings.'],
	['streak-7', 'A quiet week', 'Seven days in a row.'],
	['streak-14', 'Fourteen days', 'Two weeks without a break.'],
	['perfect-week', 'Perfect week', 'A week of clean checkpoints.'],
	['night-owl', 'Night owl', 'A lesson after nine.'],
	['early-bird', 'Early bird', 'A lesson before seven.'],
	['journey-14', '14-Day Journey graduate', 'You finished the questionnaire path.'],
	['first-step', 'First step', 'You completed your first micro-lesson.']
];

export const QUEST_POOL = [
	{ key: 'xp30', label: 'Earn 30 XP', target: 30 },
	{ key: 'listen5', label: 'Get 5 listening answers right', target: 5 },
	{ key: 'speak1', label: 'Finish 1 speaking check', target: 1 },
	{ key: 'steps2', label: 'Complete 2 steps', target: 2 },
	{ key: 'review3', label: 'Review 3 items', target: 3 }
];

export function countLadder() {
	const units = LADDER_UNITS.length;
	const steps = LADDER_UNITS.reduce((sum, unit) => sum + unit.steps.length, 0);
	return { units, steps };
}
