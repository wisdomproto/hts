import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const economicData = sqliteTable("economic_data", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  seriesId: text("series_id").notNull(),
  date: text("date").notNull(),
  value: real("value").notNull(),
  country: text("country").notNull(),
  category: text("category").notNull(),
  fetchedAt: text("fetched_at").notNull(),
});

export const computedIndicators = sqliteTable("computed_indicators", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  indicatorName: text("indicator_name").notNull(),
  date: text("date").notNull(),
  value: real("value").notNull(),
  country: text("country").notNull(),
  axis: text("axis").notNull(),
});

export const liquiditySignals = sqliteTable("liquidity_signals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  signalName: text("signal_name").notNull(),
  direction: text("direction").notNull(),
  rawValue: real("raw_value"),
});

export const regimes = sqliteTable("regimes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  growthState: text("growth_state").notNull(),
  inflationState: text("inflation_state").notNull(),
  liquidityState: text("liquidity_state").notNull(),
  regimeName: text("regime_name").notNull(),
  country: text("country").notNull().default("US"),
});

export const allocations = sqliteTable("allocations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  regimeId: integer("regime_id").references(() => regimes.id),
  totalAmount: real("total_amount").notNull(),
  riskLevel: integer("risk_level").notNull().default(3),
  createdAt: text("created_at").notNull(),
});

export const allocationItems = sqliteTable("allocation_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  allocationId: integer("allocation_id").references(() => allocations.id),
  ticker: text("ticker").notNull(),
  assetClass: text("asset_class").notNull(),
  country: text("country").notNull(),
  weightPct: real("weight_pct").notNull(),
  amount: real("amount").notNull(),
});

export const newsArticles = sqliteTable("news_articles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  source: text("source").notNull(),
  url: text("url").notNull(),
  publishedAt: text("published_at").notNull(),
  summary: text("summary"),
  sentiment: text("sentiment"),
  regimeRelevance: text("regime_relevance"),
  relatedTickers: text("related_tickers"),
  category: text("category"),
});

export const seriesConfig = sqliteTable("series_config", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  seriesId: text("series_id").notNull().unique(),
  name: text("name").notNull(),
  country: text("country").notNull(),
  category: text("category").notNull(),
  axis: text("axis").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});

export const pipelineRuns = sqliteTable("pipeline_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pipelineName: text("pipeline_name").notNull(),
  startedAt: text("started_at").notNull(),
  finishedAt: text("finished_at"),
  status: text("status").notNull().default("running"),
  recordsProcessed: integer("records_processed").default(0),
});

export const userAssets = sqliteTable("user_assets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ticker: text("ticker").notNull(),
  name: text("name").notNull(),
  assetClass: text("asset_class").notNull(),
  country: text("country").notNull(),
  maturity: text("maturity"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const userCountries = sqliteTable("user_countries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  nameKo: text("name_ko").notNull(),
  flag: text("flag").notNull(),
  weightOverride: real("weight_override"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});

export const userRegimeOverrides = sqliteTable("user_regime_overrides", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  regimeName: text("regime_name").notNull(),
  assetClass: text("asset_class").notNull(),
  weightPct: real("weight_pct").notNull(),
});

export const userSettings = sqliteTable("user_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

export const glossaryTerms = sqliteTable("glossary_terms", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  term: text("term").notNull(),
  termEn: text("term_en"),
  category: text("category").notNull().default("일반"),
  definition: text("definition").notNull(),
  example: text("example"),
  createdAt: text("created_at").notNull(),
});

export const algorithmReferences = sqliteTable("algorithm_references", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  author: text("author"),
  year: integer("year"),
  description: text("description"),
  url: text("url"),
  createdAt: text("created_at").notNull(),
});

export const algorithmChangelog = sqliteTable("algorithm_changelog", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userInput: text("user_input").notNull(),
  aiAnalysis: text("ai_analysis"),
  appliedChanges: text("applied_changes"),
  createdAt: text("created_at").notNull(),
});

// Backtest: Historical price data from Yahoo Finance
export const historicalPrices = sqliteTable("historical_prices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ticker: text("ticker").notNull(),
  date: text("date").notNull(),
  open: real("open"),
  high: real("high"),
  low: real("low"),
  close: real("close").notNull(),
  adjClose: real("adj_close").notNull(),
  volume: integer("volume"),
});

// Backtest: Run configuration and summary results
export const backtestRuns = sqliteTable("backtest_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  initialCapital: real("initial_capital").notNull(),
  riskLevel: integer("risk_level").notNull().default(3),
  rebalancePeriod: text("rebalance_period").notNull().default("monthly"),
  // Summary metrics
  finalValue: real("final_value"),
  totalReturnPct: real("total_return_pct"),
  annualizedReturnPct: real("annualized_return_pct"),
  volatilityPct: real("volatility_pct"),
  sharpeRatio: real("sharpe_ratio"),
  maxDrawdownPct: real("max_drawdown_pct"),
  maxDrawdownStart: text("max_drawdown_start"),
  maxDrawdownEnd: text("max_drawdown_end"),
  // Benchmark comparison
  benchmarkTicker: text("benchmark_ticker").default("SPY"),
  benchmarkReturnPct: real("benchmark_return_pct"),
  benchmarkSharpe: real("benchmark_sharpe"),
  benchmarkMddPct: real("benchmark_mdd_pct"),
  status: text("status").notNull().default("pending"),
  allocationsJson: text("allocations_json"),
  createdAt: text("created_at").notNull(),
});

// Backtest: Daily portfolio snapshots
export const backtestSnapshots = sqliteTable("backtest_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  runId: integer("run_id").references(() => backtestRuns.id),
  date: text("date").notNull(),
  portfolioValue: real("portfolio_value").notNull(),
  benchmarkValue: real("benchmark_value"),
  regimeName: text("regime_name"),
  drawdownPct: real("drawdown_pct"),
});
