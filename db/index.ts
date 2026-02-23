import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

// Resolve DB directory: explicit env > /app/db (Docker) > cwd/db (local dev)
function resolveDbDir(): string {
  if (process.env.DB_DIR) return process.env.DB_DIR;
  // In Docker/Railway, /app/db should exist
  if (fs.existsSync("/app/db")) return "/app/db";
  return path.join(process.cwd(), "db");
}

const dbDir = resolveDbDir();
const dbPath = path.join(dbDir, "hts.db");

console.log("[DB] Resolved dbDir:", dbDir, "dbPath:", dbPath);

// Ensure DB directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log("[DB] Created directory:", dbDir);
}

const isNewDb = !fs.existsSync(dbPath);

if (isNewDb) {
  console.log("[DB] No database found, will create fresh one");
}

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// Auto-create all tables if DB was just created (fresh Railway volume)
if (isNewDb) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS economic_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      series_id TEXT NOT NULL, date TEXT NOT NULL, value REAL NOT NULL,
      country TEXT NOT NULL, category TEXT NOT NULL, fetched_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS computed_indicators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      indicator_name TEXT NOT NULL, date TEXT NOT NULL, value REAL NOT NULL,
      country TEXT NOT NULL, axis TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS liquidity_signals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL, signal_name TEXT NOT NULL, direction TEXT NOT NULL, raw_value REAL
    );
    CREATE TABLE IF NOT EXISTS regimes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL, growth_state TEXT NOT NULL, inflation_state TEXT NOT NULL,
      liquidity_state TEXT NOT NULL, regime_name TEXT NOT NULL, country TEXT NOT NULL DEFAULT 'US'
    );
    CREATE TABLE IF NOT EXISTS allocations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      regime_id INTEGER REFERENCES regimes(id), total_amount REAL NOT NULL,
      risk_level INTEGER NOT NULL DEFAULT 3, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS allocation_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      allocation_id INTEGER REFERENCES allocations(id), ticker TEXT NOT NULL,
      asset_class TEXT NOT NULL, country TEXT NOT NULL, weight_pct REAL NOT NULL, amount REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS news_articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL, source TEXT NOT NULL, url TEXT NOT NULL, published_at TEXT NOT NULL,
      summary TEXT, sentiment TEXT, regime_relevance TEXT, related_tickers TEXT, category TEXT
    );
    CREATE TABLE IF NOT EXISTS series_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      series_id TEXT NOT NULL UNIQUE, name TEXT NOT NULL, country TEXT NOT NULL,
      category TEXT NOT NULL, axis TEXT NOT NULL, is_active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS pipeline_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pipeline_name TEXT NOT NULL, started_at TEXT NOT NULL, finished_at TEXT,
      status TEXT NOT NULL DEFAULT 'running', records_processed INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS user_assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticker TEXT NOT NULL, name TEXT NOT NULL, asset_class TEXT NOT NULL, country TEXT NOT NULL,
      maturity TEXT, is_active INTEGER NOT NULL DEFAULT 1, sort_order INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS user_countries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, name_ko TEXT NOT NULL, flag TEXT NOT NULL,
      weight_override REAL, is_active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS user_regime_overrides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      regime_name TEXT NOT NULL, asset_class TEXT NOT NULL, weight_pct REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS user_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE, value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS glossary_terms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      term TEXT NOT NULL, term_en TEXT, category TEXT NOT NULL DEFAULT '일반',
      definition TEXT NOT NULL, example TEXT, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS algorithm_references (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL, author TEXT, year INTEGER, description TEXT, url TEXT, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS algorithm_changelog (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_input TEXT NOT NULL, ai_analysis TEXT, applied_changes TEXT, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS historical_prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticker TEXT NOT NULL, date TEXT NOT NULL, open REAL, high REAL, low REAL,
      close REAL NOT NULL, adj_close REAL NOT NULL, volume INTEGER
    );
    CREATE TABLE IF NOT EXISTS backtest_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, start_date TEXT NOT NULL, end_date TEXT NOT NULL,
      initial_capital REAL NOT NULL, risk_level INTEGER NOT NULL DEFAULT 3,
      rebalance_period TEXT NOT NULL DEFAULT 'monthly',
      final_value REAL, total_return_pct REAL, annualized_return_pct REAL,
      volatility_pct REAL, sharpe_ratio REAL, max_drawdown_pct REAL,
      max_drawdown_start TEXT, max_drawdown_end TEXT,
      benchmark_ticker TEXT DEFAULT 'SPY', benchmark_return_pct REAL,
      benchmark_sharpe REAL, benchmark_mdd_pct REAL,
      status TEXT NOT NULL DEFAULT 'pending', allocations_json TEXT, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS backtest_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER REFERENCES backtest_runs(id), date TEXT NOT NULL,
      portfolio_value REAL NOT NULL, benchmark_value REAL, regime_name TEXT, drawdown_pct REAL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_economic_data_unique ON economic_data (series_id, date);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_computed_indicators_unique ON computed_indicators (country, axis);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_liquidity_signals_unique ON liquidity_signals (signal_name, date);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_regimes_unique ON regimes (country, date);
  `);
  console.log("[DB] Created fresh database with all tables");
}

export const db = drizzle(sqlite, { schema });
export type DbType = typeof db;
