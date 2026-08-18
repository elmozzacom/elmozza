// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

import type { D1Database } from '@cloudflare/workers-types';
import type { AuthUser } from '$lib/server/auth';

type Env = {
	DB: D1Database;
	GOOGLE_CLIENT_ID?: string;
	GOOGLE_CLIENT_SECRET?: string;
	SUPERADMIN_EMAIL?: string;
	VAPID_PUBLIC_KEY?: string;
	VAPID_PRIVATE_KEY?: string;
	AI_CONVERSATION?: string;
	AI?: unknown;
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
