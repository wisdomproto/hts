CREATE TABLE `algorithm_changelog` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_input` text NOT NULL,
	`ai_analysis` text,
	`applied_changes` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `algorithm_references` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`author` text,
	`year` integer,
	`description` text,
	`url` text,
	`created_at` text NOT NULL
);
