/**
 * The 14-day daily check-in.
 *
 * Every vocabulary question is drawn from the vocabulary of that same day's
 * lesson in `daily-coach.ts`, so the questionnaire tests what was actually
 * taught rather than inventing new words. Difficulty ramps by design:
 *
 *   Day 1–4   comfort and vocabulary
 *   Day 5–9   grammar awareness
 *   Day 10–14 production and fluency self-assessment
 */

export type RatingQuestion = {
	id: string;
	type: 'rating';
	prompt: string;
	low: string;
	high: string;
};

export type ChoiceQuestion = {
	id: string;
	type: 'choice';
	prompt: string;
	options: string[];
	answer: number;
};

export type TextQuestion = {
	id: string;
	type: 'text';
	prompt: string;
	hint: string;
	minWords: number;
};

export type Question = RatingQuestion | ChoiceQuestion | TextQuestion;

export type DailyQuestionnaire = {
	day: number;
	title: string;
	focus: 'comfort' | 'grammar' | 'fluency';
	questions: Question[];
};

const rate = (id: string, prompt: string, low = 'Not at all', high = 'Completely'): RatingQuestion => ({
	id,
	type: 'rating',
	prompt,
	low,
	high
});

const pick = (id: string, prompt: string, options: string[], answer: number): ChoiceQuestion => ({
	id,
	type: 'choice',
	prompt,
	options,
	answer
});

const write = (id: string, prompt: string, hint: string, minWords = 5): TextQuestion => ({
	id,
	type: 'text',
	prompt,
	hint,
	minWords
});

export const QUESTIONNAIRES: DailyQuestionnaire[] = [
	{
		day: 1,
		title: 'First words out loud',
		focus: 'comfort',
		questions: [
			rate('d1q1', 'How comfortable did you feel saying an English greeting out loud today?'),
			pick('d1q2', 'What does “good morning” mean?', ['selamat pagi', 'selamat malam', 'sampai jumpa', 'terima kasih'], 0),
			pick('d1q3', 'Someone says “Nice to meet you.” You reply …', ['Nice to meet you, too.', 'Good night.', 'I am a book.', 'See you yesterday.'], 0),
			rate('d1q4', 'How clearly could you hear the difference between the two speakers?', 'Not clear', 'Very clear'),
			write('d1q5', 'Introduce yourself in English, in one sentence.', 'Example: My name is Sari and I work at a hospital.', 5)
		]
	},
	{
		day: 2,
		title: 'The shape of a morning',
		focus: 'comfort',
		questions: [
			rate('d2q1', 'How confident did you feel describing your own routine today?'),
			pick('d2q2', 'What does “wake up” mean?', ['bangun', 'tidur', 'berjalan', 'makan'], 0),
			pick('d2q3', 'Which sentence is correct?', ['I wake up at five.', 'I wakes up at five.', 'I waking up at five.', 'I am wake up at five.'], 0),
			rate('d2q4', 'How easy was it to remember yesterday’s words without looking?', 'Very hard', 'Very easy'),
			write('d2q5', 'Write one sentence about what you do every morning.', 'Example: I wake up at five and have breakfast with my family.', 6)
		]
	},
	{
		day: 3,
		title: 'Saying what you want',
		focus: 'comfort',
		questions: [
			rate('d3q1', 'How comfortable were you accepting or refusing an offer politely?'),
			pick('d3q2', 'What does “prefer” mean?', ['lebih memilih', 'melupakan', 'menolak', 'memesan'], 0),
			pick('d3q3', '“Would you like some tea?” The most natural reply is …', ['Yes, please.', 'I like yesterday.', 'Tea is a noun.', 'No, I do.'], 0),
			rate('d3q4', 'How natural did “I’d like …” feel when you said it?', 'Very awkward', 'Very natural'),
			write('d3q5', 'What would you like for breakfast tomorrow? Answer in English.', 'Example: I would like rice and hot tea.', 5)
		]
	},
	{
		day: 4,
		title: 'Getting there',
		focus: 'comfort',
		questions: [
			rate('d4q1', 'How confident did you feel explaining how you travel to work?'),
			pick('d4q2', 'What does “leave home” mean?', ['berangkat dari rumah', 'tinggal di rumah', 'membersihkan rumah', 'menjual rumah'], 0),
			pick('d4q3', 'Which sentence is correct?', ['I go home by bus.', 'I go to home by bus.', 'I go bus home to.', 'I am go home bus.'], 0),
			rate('d4q4', 'Looking back at days 1–4, how much easier is speaking now?', 'No easier', 'Much easier'),
			write('d4q5', 'Describe your journey to work in one or two sentences.', 'Example: I leave home at seven and go to work by motorbike.', 8)
		]
	},
	{
		day: 5,
		title: 'Noticing the verb “to be”',
		focus: 'grammar',
		questions: [
			rate('d5q1', 'How aware were you of choosing between am, is, and are today?', 'Not aware', 'Fully aware'),
			pick('d5q2', 'What does “ready” mean?', ['siap', 'lelah', 'terlambat', 'sibuk'], 0),
			pick('d5q3', '“Are you ready?” is answered correctly by …', ['Yes, I am.', 'Yes, I ready.', 'I am yes.', 'Ready are.'], 0),
			pick('d5q4', 'Which one is wrong?', ['We is ready.', 'We are ready.', 'I am ready.', 'She is ready.'], 0),
			write('d5q5', 'Write one sentence about your work today using am, is, or are.', 'Example: I am busy because the report is not finished.', 7)
		]
	},
	{
		day: 6,
		title: 'Polite requests',
		focus: 'grammar',
		questions: [
			rate('d6q1', 'How comfortable were you making a polite request with “Can you …?”'),
			pick('d6q2', 'What does “on schedule” mean?', ['sesuai jadwal', 'terlambat', 'dibatalkan', 'sangat mahal'], 0),
			pick('d6q3', 'Which is the most polite?', ['Can you give us an update, please?', 'Give update.', 'Update now.', 'You update me.'], 0),
			rate('d6q4', 'How well did you follow the speaker without reading the text?', 'Not at all', 'Every word'),
			write('d6q5', 'Give a one-sentence update about something you are working on.', 'Example: The report is on schedule and I will finish it on Friday.', 8)
		]
	},
	{
		day: 7,
		title: 'A week behind you',
		focus: 'grammar',
		questions: [
			rate('d7q1', 'How much of week one can you still use without checking notes?', 'Almost none', 'Almost all'),
			pick('d7q2', 'What does “busy” mean?', ['sibuk', 'santai', 'bosan', 'sakit'], 0),
			pick('d7q3', 'Which sentence sounds most natural?', ['It was busy, but good.', 'It busy but good is.', 'Busy it was good.', 'It was busily good.'], 0),
			rate('d7q4', 'How consistent was your daily practice this week?', 'Missed most days', 'Every day'),
			write('d7q5', 'How was your week? Answer in two sentences.', 'Example: It was busy but good. I spoke English with a colleague twice.', 10)
		]
	},
	{
		day: 8,
		title: 'Ordering, politely',
		focus: 'grammar',
		questions: [
			rate('d8q1', 'How confident would you feel ordering food in English tomorrow?'),
			pick('d8q2', 'What does “order” mean here?', ['memesan', 'membersihkan', 'membayar', 'memasak'], 0),
			pick('d8q3', 'The polite way to order is …', ['I’d like rice, please.', 'I like rice now.', 'Rice is like.', 'Give rice.'], 0),
			rate('d8q4', 'How well can you hear the difference between “I like” and “I’d like”?', 'Cannot hear it', 'Very clearly'),
			write('d8q5', 'Order a meal in English, politely.', 'Example: I would like fried rice and iced tea, please.', 6)
		]
	},
	{
		day: 9,
		title: 'On the telephone',
		focus: 'grammar',
		questions: [
			rate('d9q1', 'How nervous would an English phone call make you right now?', 'Very nervous', 'Not nervous'),
			pick('d9q2', 'What does “available” mean?', ['tersedia', 'terlambat', 'marah', 'pergi'], 0),
			pick('d9q3', '“Can I take a message?” means …', ['Bolehkah saya menerima pesan?', 'Bolehkah saya pergi?', 'Saya akan menelepon polisi.', 'Saya tidak punya telepon.'], 0),
			pick('d9q4', 'Which is most formal?', ['May I speak to Mr. Hasan?', 'Give me Hasan.', 'Hasan there?', 'I want Hasan.'], 0),
			write('d9q5', 'Take a short phone message in English.', 'Example: Mr. Hasan is not available. Can I take a message?', 8)
		]
	},
	{
		day: 10,
		title: 'Speaking about time',
		focus: 'fluency',
		questions: [
			rate('d10q1', 'How fluently could you speak for thirty seconds without stopping?', 'Stopped often', 'Never stopped'),
			pick('d10q2', '“Half past two” means …', ['2:30', '2:15', '2:45', '3:00'], 0),
			pick('d10q3', 'What does “appointment” mean?', ['janji temu', 'kesempatan', 'keterlambatan', 'perjalanan'], 0),
			rate('d10q4', 'How often did you translate from Indonesian in your head today?', 'Every sentence', 'Not once'),
			write('d10q5', 'Describe tomorrow’s schedule in two sentences.', 'Example: I have an appointment at half past nine. After that I go to the clinic.', 10)
		]
	},
	{
		day: 11,
		title: 'Inviting someone',
		focus: 'fluency',
		questions: [
			rate('d11q1', 'How natural did inviting someone in English feel today?', 'Very forced', 'Completely natural'),
			pick('d11q2', 'What does “join” mean?', ['bergabung', 'menolak', 'membatalkan', 'menunggu'], 0),
			pick('d11q3', 'A warm reply to an invitation is …', ['I’d love to.', 'I love.', 'Yes, I join yesterday.', 'Event good.'], 0),
			rate('d11q4', 'How much do you still rely on memorised phrases rather than your own words?', 'Only memorised', 'Mostly my own'),
			write('d11q5', 'Invite a colleague to something, in English.', 'Example: Would you like to join our team lunch on Friday?', 8)
		]
	},
	{
		day: 12,
		title: 'After work',
		focus: 'fluency',
		questions: [
			rate('d12q1', 'How comfortable are you now speaking without preparing first?'),
			pick('d12q2', 'What does “rest” mean?', ['istirahat', 'bekerja', 'berlari', 'membaca'], 0),
			pick('d12q3', 'Which sentence is correct?', ['After I finish work, I go home.', 'After finish my work, I go home.', 'After I finish work, I go to home.', 'After work finish, I go.'], 0),
			rate('d12q4', 'How well can you correct your own mistakes as you speak?', 'Never notice', 'Almost always'),
			write('d12q5', 'What do you do after work? Two sentences.', 'Example: After I finish work, I go home and rest. Sometimes I read in English.', 10)
		]
	},
	{
		day: 13,
		title: 'Talking about plans',
		focus: 'fluency',
		questions: [
			rate('d13q1', 'How confident do you feel talking about the future in English?'),
			pick('d13q2', 'What does “tonight” mean?', ['malam ini', 'kemarin', 'besok pagi', 'minggu lalu'], 0),
			pick('d13q3', 'Which is the correct plan form?', ['I am going to read.', 'I going to read.', 'I am go to read.', 'I read going.'], 0),
			rate('d13q4', 'Compared with day 1, how different does speaking feel?', 'No different', 'Completely different'),
			write('d13q5', 'What are you going to do tonight?', 'Example: I am going to read a book and practise for twenty minutes.', 8)
		]
	},
	{
		day: 14,
		title: 'You made it',
		focus: 'fluency',
		questions: [
			rate('d14q1', 'Overall, how much has your speaking confidence grown across the 14 days?', 'Not at all', 'Enormously'),
			pick('d14q2', 'What does “a lot” mean?', ['banyak', 'sedikit', 'kadang-kadang', 'tidak pernah'], 0),
			pick('d14q3', 'The natural closing sentence is …', ['I learned a lot.', 'I learn lot yesterday now.', 'A lot learned I.', 'Learn is lot.'], 0),
			rate('d14q4', 'How likely are you to keep practising every day from here?', 'Very unlikely', 'Certain'),
			write('d14q5', 'Write four sentences about what changed for you in these 14 days.', 'Use the language you have learned: greetings, routines, plans, polite replies.', 20)
		]
	}
];

export const getQuestionnaire = (day: number) => QUESTIONNAIRES.find((item) => item.day === day);

export const TOTAL_DAYS = 14;
