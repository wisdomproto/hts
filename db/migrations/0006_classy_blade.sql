CREATE TABLE `capex_data` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company` text NOT NULL,
	`period` text NOT NULL,
	`capex` real NOT NULL,
	`fetched_at` text NOT NULL
);
