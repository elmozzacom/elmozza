import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

/**
 * Typed schema for the registration funnel.
 *
 * Scope note: this file covers the NEW registrations table only. The live
 * database already holds real users and progress, and the existing hot paths
 * use audited prepared SQL. Rewriting those working queries into an ORM would
 * buy types at the cost of reliability on a running site, so they stay as they
 * are and drizzle types the new surface.
 */

export const registrations = sqliteTable('registrations', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	fullName: text('full_name').notNull(),
	email: text('email').notNull(),
	level: text('level').notNull().default('A1'),
	placementScore: integer('placement_score').notNull().default(0),
	paymentStatus: text('payment_status', {
		enum: ['pending', 'paid', 'refunded', 'waived']
	})
		.notNull()
		.default('pending'),
	source: text('source').notNull().default('web'),
	userId: integer('user_id'),
	createdAt: text('created_at').notNull()
});

export type Registration = typeof registrations.$inferSelect;
export type NewRegistration = typeof registrations.$inferInsert;

/**
 * The 14-day questionnaire programme.
 *
 * Content lives in the database rather than only in code so an editor can
 * revise a day's wording without a deploy; `scripts/seed.mjs` keeps the two in
 * step from `src/lib/content/questionnaires.ts`.
 */
export const questionnaires = sqliteTable('questionnaires', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	dayNumber: integer('day_number').notNull().unique(),
	title: text('title').notNull(),
	focus: text('focus', { enum: ['comfort', 'grammar', 'fluency'] }).notNull().default('comfort'),
	questions: text('questions').notNull()
});

/**
 * One response per user per day, enforced by a unique index in the migration.
 * A late answer is still recorded against its own day_number; the streak
 * calculation is what treats a missed calendar day as a break.
 */
export const questionnaireResponses = sqliteTable('questionnaire_responses', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id').notNull(),
	dayNumber: integer('day_number').notNull(),
	answers: text('answers').notNull(),
	selfRating: integer('self_rating'),
	completedAt: text('completed_at').notNull()
});

export type Questionnaire = typeof questionnaires.$inferSelect;
export type QuestionnaireResponse = typeof questionnaireResponses.$inferSelect;

export const auditLogs = sqliteTable('audit_logs', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	actorId: integer('actor_id'),
	action: text('action').notNull(),
	targetId: integer('target_id'),
	detail: text('detail'),
	createdAt: text('created_at').notNull()
});

export const mercyUnlocks = sqliteTable('mercy_unlocks', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id').notNull(),
	dayNumber: integer('day_number').notNull(),
	actorId: integer('actor_id'),
	grantedAt: text('granted_at').notNull()
});

export const LEVEL_CODES = ['A1', 'A2', 'B1', 'B2', 'C1'] as const;
export const PAYMENT_STATES = ['pending', 'paid', 'refunded', 'waived'] as const;
export type LevelCode = (typeof LEVEL_CODES)[number];
export type PaymentState = (typeof PAYMENT_STATES)[number];
