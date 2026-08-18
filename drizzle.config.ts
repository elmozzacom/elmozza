import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle types the newer tables (registrations, questionnaires,
 * questionnaire_responses). The generated SQL is reviewed and committed to
 * ./migrations, then applied with `wrangler d1 execute`, because the live
 * database holds real learner accounts and an unreviewed automatic push is not
 * something to run against it.
 */
export default defineConfig({
	schema: './src/lib/server/schema.ts',
	out: './migrations/drizzle',
	dialect: 'sqlite',
	driver: 'd1-http',
	verbose: true,
	strict: true
});
