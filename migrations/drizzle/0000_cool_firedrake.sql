CREATE TABLE `questionnaire_responses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`day_number` integer NOT NULL,
	`answers` text NOT NULL,
	`self_rating` integer,
	`completed_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `questionnaires` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`day_number` integer NOT NULL,
	`title` text NOT NULL,
	`focus` text DEFAULT 'comfort' NOT NULL,
	`questions` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `questionnaires_day_number_unique` ON `questionnaires` (`day_number`);--> statement-breakpoint
CREATE TABLE `registrations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`full_name` text NOT NULL,
	`email` text NOT NULL,
	`level` text DEFAULT 'A1' NOT NULL,
	`placement_score` integer DEFAULT 0 NOT NULL,
	`payment_status` text DEFAULT 'pending' NOT NULL,
	`source` text DEFAULT 'web' NOT NULL,
	`user_id` integer,
	`created_at` text NOT NULL
);
