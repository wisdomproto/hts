CREATE TABLE `backtest_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`initial_capital` real NOT NULL,
	`risk_level` integer DEFAULT 3 NOT NULL,
	`rebalance_period` text DEFAULT 'monthly' NOT NULL,
	`final_value` real,
	`total_return_pct` real,
	`annualized_return_pct` real,
	`volatility_pct` real,
	`sharpe_ratio` real,
	`max_drawdown_pct` real,
	`max_drawdown_start` text,
	`max_drawdown_end` text,
	`benchmark_ticker` text DEFAULT 'SPY',
	`benchmark_return_pct` real,
	`benchmark_sharpe` real,
	`benchmark_mdd_pct` real,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `backtest_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run_id` integer,
	`date` text NOT NULL,
	`portfolio_value` real NOT NULL,
	`benchmark_value` real,
	`regime_name` text,
	`drawdown_pct` real,
	FOREIGN KEY (`run_id`) REFERENCES `backtest_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `historical_prices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ticker` text NOT NULL,
	`date` text NOT NULL,
	`open` real,
	`high` real,
	`low` real,
	`close` real NOT NULL,
	`adj_close` real NOT NULL,
	`volume` integer
);
