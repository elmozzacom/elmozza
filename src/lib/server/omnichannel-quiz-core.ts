export type QuizQuestion = {
	id: string;
	prompt: string;
	choices: string[];
	correctIndex: number;
	explanation: string;
};

export type QuizPackage = {
	id: string;
	runId: string;
	title: string;
	source: string;
	questions: QuizQuestion[];
};

export type PublicQuizPackage = Omit<QuizPackage, 'questions'> & {
	questions: Array<Pick<QuizQuestion, 'id' | 'prompt' | 'choices'>>;
};

function text(value: unknown, name: string, max: number) {
	if (typeof value !== 'string') throw new Error(`${name} must be text.`);
	const normalized = value.trim();
	if (!normalized || normalized.length > max || /[\r\n]/.test(normalized)) {
		throw new Error(`${name} is invalid.`);
	}
	return normalized;
}

export function validateQuizPackage(value: unknown): QuizPackage {
	if (!value || typeof value !== 'object') throw new Error('Quiz package is invalid.');
	const row = value as Record<string, unknown>;
	if (!Array.isArray(row.questions) || row.questions.length !== 5) {
		throw new Error('Quiz package must contain exactly five questions.');
	}
	const ids = new Set<string>();
	const questions = row.questions.map((raw, index): QuizQuestion => {
		if (!raw || typeof raw !== 'object') throw new Error(`Question ${index + 1} is invalid.`);
		const question = raw as Record<string, unknown>;
		const id = text(question.id ?? `q${index + 1}`, `Question ${index + 1} id`, 80);
		if (ids.has(id)) throw new Error('Question ids must be unique.');
		ids.add(id);
		if (!Array.isArray(question.choices) || question.choices.length < 2 || question.choices.length > 10) {
			throw new Error(`Question ${index + 1} choices are invalid.`);
		}
		const choices = question.choices.map((choice, choiceIndex) =>
			text(choice, `Question ${index + 1} choice ${choiceIndex + 1}`, 100)
		);
		if (new Set(choices).size !== choices.length) throw new Error('Choices must be unique.');
		const correctIndex = Number(question.correct_index ?? question.correctIndex);
		if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= choices.length) {
			throw new Error(`Question ${index + 1} answer key is invalid.`);
		}
		return {
			id,
			prompt: text(question.prompt, `Question ${index + 1} prompt`, 280),
			choices,
			correctIndex,
			explanation: text(question.explanation ?? 'Elmozza English', `Question ${index + 1} explanation`, 190)
		};
	});
	return {
		id: text(row.id, 'Package id', 80).toLowerCase(),
		runId: text(row.run_id ?? row.runId, 'Run id', 100).toLowerCase(),
		title: text(row.title, 'Title', 300),
		source: text(row.source ?? 'hermes-cron', 'Source', 40),
		questions
	};
}

export function publicQuizPackage(quiz: QuizPackage): PublicQuizPackage {
	return {
		id: quiz.id,
		runId: quiz.runId,
		title: quiz.title,
		source: quiz.source,
		questions: quiz.questions.map(({ id, prompt, choices }) => ({ id, prompt, choices: [...choices] }))
	};
}

export function gradeQuiz(quiz: QuizPackage, answers: number[]) {
	if (!Array.isArray(answers) || answers.length !== quiz.questions.length) {
		throw new Error('Every question must be answered.');
	}
	const correct = quiz.questions.reduce((total, question, index) => {
		const selected = answers[index];
		if (!Number.isInteger(selected) || selected < 0 || selected >= question.choices.length) {
			throw new Error('Answer is invalid.');
		}
		return total + (selected === question.correctIndex ? 1 : 0);
	}, 0);
	return { correct, total: quiz.questions.length, percentage: (correct * 100) / quiz.questions.length };
}

export function telegramPollPayloads(quiz: QuizPackage, chatId: string) {
	return quiz.questions.map((question, index) => ({
		chat_id: chatId,
		question: `Question ${index + 1} of ${quiz.questions.length}\n\n${question.prompt}`.slice(0, 300),
		options: question.choices,
		type: 'quiz' as const,
		is_anonymous: false,
		correct_option_id: question.correctIndex,
		explanation: question.explanation,
		protect_content: false
	}));
}

export function secureEqual(actual: string | null | undefined, expected: string | null | undefined) {
	if (!actual || !expected) return false;
	const a = new TextEncoder().encode(actual);
	const b = new TextEncoder().encode(expected);
	const length = Math.max(a.length, b.length);
	let difference = a.length ^ b.length;
	for (let index = 0; index < length; index += 1) difference |= (a[index] ?? 0) ^ (b[index] ?? 0);
	return difference === 0;
}

function hash(value: string) {
	let output = 2166136261;
	for (let index = 0; index < value.length; index += 1) {
		output ^= value.charCodeAt(index);
		output = Math.imul(output, 16777619);
	}
	return (output >>> 0).toString(36);
}

export function publicationKey(channel: 'telegram' | 'web', runId: string, questionIndex: number, destination: string) {
	return `${channel}:${runId}:${questionIndex}:${hash(destination)}`;
}

export function safeLeaderboardLimit(raw: string | null, fallback = 10) {
	const parsed = Number(raw);
	if (!Number.isInteger(parsed)) return fallback;
	return Math.max(1, Math.min(50, parsed));
}
