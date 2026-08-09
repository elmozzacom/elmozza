// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

import type { D1Database } from '@cloudflare/workers-types';
import type { AuthUser } from '$lib/server/auth';

type Env = {
	DB: D1Database;
};

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			db: D1Database | null;
			user: AuthUser | null;
		}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env: Env;
		}
	}
}

export {};
