import { browser } from '$app/environment';

type SpeakOptions = {
	lang?: string;
	rate?: number;
	pitch?: number;
	volume?: number;
	voiceName?: string;
};

const defaultOptions: Required<Omit<SpeakOptions, 'voiceName'>> = {
	lang: 'en-US',
	rate: 1,
	pitch: 1,
	volume: 1
};

const pickVoice = (options: SpeakOptions): SpeechSynthesisVoice | null => {
	if (!browser || !('speechSynthesis' in window)) return null;
	const voices = window.speechSynthesis.getVoices();
	if (voices.length === 0) return null;
	if (options.voiceName) {
		const named = voices.find((voice) => voice.name === options.voiceName);
		if (named) return named;
	}
	if (options.lang) {
		const exact = voices.find((voice) => voice.lang === options.lang);
		if (exact) return exact;
		const prefix = voices.find((voice) => voice.lang.startsWith(options.lang.split('-')[0]));
		if (prefix) return prefix;
	}
	return null;
};

export const stop = () => {
	if (!browser || !('speechSynthesis' in window)) return;
	if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
		window.speechSynthesis.cancel();
	}
};

export const speak = (text: string, options: SpeakOptions = {}): boolean => {
	if (!browser || !('speechSynthesis' in window)) return false;
	const trimmed = text.trim();
	if (!trimmed) return false;

	stop();

	const utterance = new SpeechSynthesisUtterance(trimmed);
	const resolved = { ...defaultOptions, ...options };
	utterance.lang = resolved.lang;
	utterance.rate = resolved.rate;
	utterance.pitch = resolved.pitch;
	utterance.volume = resolved.volume;
	const voice = pickVoice(options);
	if (voice) utterance.voice = voice;

	window.speechSynthesis.speak(utterance);
	return true;
};

export type { SpeakOptions };
