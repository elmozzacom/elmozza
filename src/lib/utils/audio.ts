import { browser } from '$app/environment';

export type VoiceKind = 'female' | 'male' | 'any';

export type SpeakOptions = {
	lang?: string;
	rate?: number;
	pitch?: number;
	volume?: number;
	voiceName?: string;
	kind?: VoiceKind;
	/** Keep the current playback session instead of starting a new one. */
	join?: boolean;
};

export type SpokenLine = {
	text: string;
	kind?: VoiceKind;
};

const defaults = {
	lang: 'en-US',
	rate: 0.88,
	pitch: 1,
	volume: 1
};

/** Incremented by stop() and by a fresh speak(). In-flight work checks this. */
let session = 0;

export function speechSupported() {
	return browser && typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function recordingSupported() {
	return (
		browser &&
		typeof navigator !== 'undefined' &&
		Boolean(navigator.mediaDevices?.getUserMedia) &&
		typeof MediaRecorder !== 'undefined'
	);
}

export function readyVoices(): Promise<SpeechSynthesisVoice[]> {
	if (!speechSupported()) return Promise.resolve([]);
	const existing = window.speechSynthesis.getVoices();
	if (existing.length > 0) return Promise.resolve(existing);

	return new Promise((resolve) => {
		const finish = () => resolve(window.speechSynthesis.getVoices());
		window.speechSynthesis.addEventListener('voiceschanged', finish, { once: true });
		window.setTimeout(finish, 900);
	});
}

const FEMALE =
	/female|zira|samantha|victoria|karen|moira|fiona|susan|linda|salli|ivy|joanna|kendra|kimberly|google us english$/i;
const MALE = /male|david|daniel|alex|fred|tom|mark|george|ravi|matthew|justin|google uk english male/i;

export function pickVoice(
	voices: SpeechSynthesisVoice[],
	options: SpeakOptions
): SpeechSynthesisVoice | null {
	if (voices.length === 0) return null;
	const english = voices.filter((voice) => /^en\b/i.test(voice.lang));
	const pool = english.length > 0 ? english : voices;

	if (options.voiceName) {
		const named = pool.find((voice) => voice.name === options.voiceName);
		if (named) return named;
	}

	if (options.kind === 'female') {
		return pool.find((voice) => FEMALE.test(voice.name)) ?? pool[0] ?? null;
	}
	if (options.kind === 'male') {
		const female = pickVoice(voices, { kind: 'female' });
		return pool.find((voice) => MALE.test(voice.name)) ?? pool.find((voice) => voice !== female) ?? pool[0] ?? null;
	}

	if (options.lang) {
		const exact = pool.find((voice) => voice.lang === options.lang);
		if (exact) return exact;
		const prefix = pool.find((voice) =>
			voice.lang.toLowerCase().startsWith(options.lang!.slice(0, 2).toLowerCase())
		);
		if (prefix) return prefix;
	}

	return pool[0] ?? null;
}

export function stop() {
	session += 1;
	if (!speechSupported()) return;
	if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
		window.speechSynthesis.cancel();
	}
}

export async function speak(text: string, options: SpeakOptions = {}): Promise<boolean> {
	if (!speechSupported()) return false;
	const trimmed = text.trim();
	if (!trimmed) return false;

	const token = options.join ? session : ++session;
	if (!options.join) window.speechSynthesis.cancel();

	const voices = await readyVoices();
	if (token !== session) return false;

	const resolved = { ...defaults, ...options };
	const utterance = new SpeechSynthesisUtterance(trimmed);
	utterance.lang = resolved.lang;
	utterance.rate = resolved.rate;
	utterance.pitch = options.kind === 'male' && options.pitch == null ? 0.92 : resolved.pitch;
	utterance.volume = resolved.volume;
	const voice = pickVoice(voices, options);
	if (voice) utterance.voice = voice;

	return new Promise((resolve) => {
		utterance.onend = () => resolve(token === session);
		utterance.onerror = () => resolve(false);
		window.speechSynthesis.speak(utterance);
	});
}

export async function speakLines(
	lines: SpokenLine[],
	options: { gapMs?: number; onLine?: (index: number | null) => void; rate?: number } = {}
): Promise<void> {
	stop();
	const token = session;
	const gap = options.gapMs ?? 380;

	for (let index = 0; index < lines.length; index += 1) {
		if (token !== session) {
			options.onLine?.(null);
			return;
		}
		options.onLine?.(index);
		await speak(lines[index].text, { kind: lines[index].kind, rate: options.rate ?? 0.88, join: true });
		if (token !== session) {
			options.onLine?.(null);
			return;
		}
		if (index < lines.length - 1) await wait(gap, token);
	}

	if (token === session) options.onLine?.(null);
}

function wait(ms: number, token: number) {
	return new Promise<void>((resolve) => {
		window.setTimeout(() => resolve(), ms);
		void token;
	});
}

/** Preferred MIME type for an in-memory recording. Empty means let the browser choose. */
export function recordingMime(): string {
	if (!recordingSupported()) return '';
	const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
	return types.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
}
