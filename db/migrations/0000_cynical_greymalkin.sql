CREATE TABLE `allocation_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`allocation_id` integer,
	`ticker` text NOT NULL,
	`asset_class` text NOT NULL,
	`country` text NOT NULL,
	`weight_pct` real NOT NULL,
	`amount` real NOT NULL,
	FOREIGN KEY (`allocation_id`) REFERENCES `allocations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `allocations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`regime_id` integer,
	`total_amount` real NOT NULL,
	`risk_level` integer DEFAULT 3 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`regime_id`) REFERENCES `regimes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `computed_indicators` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`indicator_name` text NOT NULL,
	`date` text NOT NULL,
	`value` real NOT NULL,
	`country` text NOT NULL,
	`axis` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `economic_data` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`series_id` text NOT NULL,
	`date` text NOT NULL,
	`value` real NOT NULL,
	`country` text NOT NULL,
	`category` text NOT NULL,
	`fetched_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `liquidity_signals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`signal_name` text NOT NULL,
	`direction` text NOT NULL,
	`raw_value` real
);
--> statement-breakpoint
CREATE TABLE `news_articles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`source` text NOT NULL,
	`url` text NOT NULL,
	`published_at` text NOT NULL,
	`summary` text,
	`sentiment` text,
	`regime_relevance` text,
	`related_tickers` text,
	`category` text
);
--> statement-breakpoint
CREATE TABLE `pipeline_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pipeline_name` text NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`status` text DEFAULT 'running' NOT NULL,
	`records_processed` integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `regimes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`growth_state` text NOT NULL,
	`inflation_state` text NOT NULL,
	`liquidity_state` text NOT NULL,
	`regime_name` text NOT NULL,
	`country` text DEFAULT 'US' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `series_config` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`series_id` text NOT NULL,
	`name` text NOT NULL,
	`country` text NOT NULL,
	`category` text NOT NULL,
	`axis` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `series_config_series_id_unique` ON `series_config` (`series_id`);--> statement-breakpoint
CREATE TABLE `user_assets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ticker` text NOT NULL,
	`name` text NOT NULL,
	`asset_class` text NOT NULL,
	`country` text NOT NULL,
	`maturity` text,
	`is_active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_countries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`name_ko` text NOT NULL,
	`flag` text NOT NULL,
	`weight_override` real,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_countries_code_unique` ON `user_countries` (`code`);--> statement-breakpoint
CREATE TABLE `user_regime_overrides` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`regime_name` text NOT NULL,
	`asset_class` text NOT NULL,
	`weight_pct` real NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_settings_key_unique` ON `user_settings` (`key`);