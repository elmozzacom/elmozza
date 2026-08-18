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

export const LEVEL_CODES = ['A1', 'A2', 'B1', 'B2', 'C1'] as const;
export const PAYMENT_STATES = ['pending', 'paid', 'refunded', 'waived'] as const;
export type LevelCode = (typeof LEVEL_CODES)[number];
export type PaymentState = (typeof PAYMENT_STATES)[number];
