CREATE TABLE `campaign` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`total_capital` real DEFAULT 100000000 NOT NULL,
	`risk_level` integer DEFAULT 3 NOT NULL,
	`auto_detect` integer DEFAULT true NOT NULL,
	`manual_stage_id` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stage_transitions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`from_stage` text,
	`to_stage` text NOT NULL,
	`reason` text,
	`confidence` real,
	`created_at` text NOT NULL
);
