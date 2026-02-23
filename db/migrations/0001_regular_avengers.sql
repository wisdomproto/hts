CREATE TABLE `glossary_terms` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`term` text NOT NULL,
	`term_en` text,
	`category` text DEFAULT '일반' NOT NULL,
	`definition` text NOT NULL,
	`example` text,
	`created_at` text NOT NULL
);
