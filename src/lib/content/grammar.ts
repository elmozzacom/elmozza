export type Fragment = {
	/** The literal text as it appears in the sentence. */
	text: string;
	/** Utility label shown at the end of the leader line. */
	label: string;
	/** Horizontal drift at full explosion, in rem. */
	dx: number;
	/** Vertical drift at full explosion, in rem. */
	dy: number;
	/** Depth layer 1..8 — drives scale and label stagger. */
	layer: number;
	/** Trailing space after this fragment when assembled. */
	space?: boolean;
};

export type ExplodedSentence = {
	id: string;
	sentence: string;
	translation?: string;
	fragments: Fragment[];
};

/**
 * The signature sentence. Labels are real grammar teaching, not decoration:
 * read together they explain why this is present perfect continuous.
 */
export const SIGNATURE: ExplodedSentence = {
	id: 'signature',
	sentence: 'She has been learning quietly, and now she speaks.',
	fragments: [
		{ text: 'She', label: 'Subject · pronoun', dx: -13.5, dy: -6.2, layer: 1, space: true },
		{ text: 'has', label: 'Aux 1 · present tense', dx: -7.5, dy: -11.4, layer: 3, space: true },
		{ text: 'been', label: 'Aux 2 · perfect aspect', dx: 1.2, dy: -14.6, layer: 4, space: true },
		{ text: 'learning', label: 'Main verb · ‑ing, continuous', dx: 9.6, dy: -8.8, layer: 5, space: true },
		{ text: 'quietly,', label: 'Adverb · manner', dx: 15.2, dy: 1.4, layer: 2, space: true },
		{ text: 'and', label: 'Conjunction · coordinating', dx: 9.4, dy: 9.6, layer: 6, space: true },
		{ text: 'now she', label: 'Subject · second clause', dx: -1.4, dy: 13.8, layer: 7, space: true },
		{ text: 'speaks.', label: 'Main verb · simple present', dx: -11.8, dy: 9.2, layer: 8 }
	]
};

/** Reused inside the demo lesson as a hover/tap micro-interaction. */
export const LESSON_EXAMPLE: ExplodedSentence = {
	id: 'lesson-example',
	sentence: 'I have been waiting for the bus since seven.',
	translation: 'Saya sudah menunggu bus sejak jam tujuh.',
	fragments: [
		{ text: 'I', label: 'Subject', dx: -9.4, dy: -5.4, layer: 1, space: true },
		{ text: 'have', label: 'Aux 1 · present', dx: -4.6, dy: -9.2, layer: 3, space: true },
		{ text: 'been', label: 'Aux 2 · perfect', dx: 1.8, dy: -10.8, layer: 4, space: true },
		{ text: 'waiting', label: 'Main verb · ‑ing', dx: 7.8, dy: -6.4, layer: 5, space: true },
		{ text: 'for the bus', label: 'Object phrase', dx: 10.4, dy: 3.2, layer: 2, space: true },
		{ text: 'since seven.', label: 'Time marker · start point', dx: 2.6, dy: 10.4, layer: 6 }
	]
};

/**
 * The grammar note the diagram is teaching. Shown as prose so the lesson
 * still teaches when motion is off and when the reader prefers text.
 */
export const SIGNATURE_NOTE =
	'Has + been + ‑ing is the present perfect continuous: an action that started in the past and is still running now. Drop “been” and the sentence loses its duration.';
