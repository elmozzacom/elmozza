// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
type D1PreparedStatement = {
	bind(...values: unknown[]): D1PreparedStatement;
	first<T = unknown>(): Promise<T | null>;
	all<T = unknown>(): Promise<{ results: T[] }>;
	run(): Promise<{ success: boolean; error?: string }>;
};

type D1Database = {
	prepare(query: string): D1PreparedStatement;
};

declare global {
	namespace App {
		interface Platform {
			env: {
				DB: D1Database;
			};
		}
	}
}

export {};
