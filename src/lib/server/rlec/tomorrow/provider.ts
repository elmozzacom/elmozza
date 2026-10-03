// LLM provider interface for Tomorrow Mode. Default: Cloudflare Workers AI via
// the AI binding on the klinikelmozza account (billed there, no external key).
// Another provider can be added by implementing LlmProvider.

export type LlmMessage = { role: 'system' | 'user' | 'assistant'; content: string };
export type LlmOptions = { maxTokens: number; temperature?: number; jsonSchema?: object };
export type LlmResult = { text: string; input_tokens: number; output_tokens: number; model: string; provider: string; ms: number };

export interface LlmProvider {
	readonly name: string;
	readonly model: string;
	complete(messages: LlmMessage[], opts: LlmOptions): Promise<LlmResult>;
}

/** Minimal shape of the Workers AI binding (env.AI). */
export type AiBinding = { run(model: string, input: Record<string, unknown>): Promise<unknown> };

export const DEFAULT_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
export const EMBED_MODEL = '@cf/baai/bge-base-en-v1.5';

/** USD per 1M tokens (Workers AI price list; 26,668 / 204,805 neurons per M for llama-3.3 fp8-fast). */
export const PRICING_USD_PER_M: Record<string, { input: number; output: number }> = {
	'@cf/meta/llama-3.3-70b-instruct-fp8-fast': { input: 0.293, output: 2.253 },
	'@cf/baai/bge-base-en-v1.5': { input: 0.067, output: 0 }
};
export const DEFAULT_USD_IDR = 16_500;

export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
	const p = PRICING_USD_PER_M[model] ?? PRICING_USD_PER_M[DEFAULT_MODEL];
	return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}

export const usdToIdr = (usd: number, rate = DEFAULT_USD_IDR) => Math.round(usd * rate * 100) / 100;

/** Rough token estimate when the API omits usage (≈4 chars per token). */
export const approxTokens = (s: string) => Math.ceil(s.length / 4);

export function isAiBinding(v: unknown): v is AiBinding {
	return !!v && typeof (v as AiBinding).run === 'function';
}

export function workersAiProvider(ai: AiBinding, model = DEFAULT_MODEL): LlmProvider {
	return {
		name: 'workers-ai',
		model,
		async complete(messages, opts) {
			const t0 = Date.now();
			const input: Record<string, unknown> = { messages, max_tokens: opts.maxTokens, temperature: opts.temperature ?? 0.4 };
			if (opts.jsonSchema) input.response_format = { type: 'json_schema', json_schema: opts.jsonSchema };
			const out = (await ai.run(model, input)) as { response?: unknown; usage?: { prompt_tokens?: number; completion_tokens?: number } } | null;
			const resp = out?.response;
			const text = typeof resp === 'string' ? resp : resp == null ? '' : JSON.stringify(resp);
			const promptChars = messages.reduce((n, m) => n + m.content.length, 0);
			return {
				text,
				input_tokens: Number(out?.usage?.prompt_tokens ?? Math.ceil(promptChars / 4)),
				output_tokens: Number(out?.usage?.completion_tokens ?? approxTokens(text)),
				model,
				provider: 'workers-ai',
				ms: Date.now() - t0
			};
		}
	};
}

/** 768-dim embedding via Workers AI (bge-base), or null when unavailable. */
export async function embed(ai: AiBinding, text: string): Promise<number[] | null> {
	const out = (await ai.run(EMBED_MODEL, { text: [text] })) as { data?: number[][] } | null;
	const v = out?.data?.[0];
	return Array.isArray(v) && v.length ? v : null;
}

/** Pull the first JSON object out of a model reply (tolerates code fences / prose). */
export function extractJson(text: string): unknown {
	const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
	try {
		return JSON.parse(trimmed);
	} catch {
		const start = trimmed.indexOf('{');
		const end = trimmed.lastIndexOf('}');
		if (start >= 0 && end > start) {
			try {
				return JSON.parse(trimmed.slice(start, end + 1));
			} catch {
				return null;
			}
		}
		return null;
	}
}
