import { NextRequest, NextResponse } from "next/server";
import { db } from "@db/index";
import {
  backtestRuns,
  backtestSnapshots,
  historicalPrices,
  userRegimeOverrides,
  regimes,
} from "@db/schema";
import { desc, eq, and, gte, lte, sql } from "drizzle-orm";
import { REGIME_ALLOCATION_TEMPLATES } from "@/lib/regimes";
import type { RegimeId } from "@/types/regime";


export const dynamic = "force-dynamic";

const RISK_MULTIPLIERS: Record<
  number,
  Record<string, number>
> = {
  1: { stocks: 0.6, bonds: 1.4, realestate: 0.7, commodities: 0.8, crypto: 0.3, cash: 1.5 },
  2: { stocks: 0.8, bonds: 1.2, realestate: 0.85, commodities: 0.9, crypto: 0.6, cash: 1.3 },
  3: { stocks: 1.0, bonds: 1.0, realestate: 1.0, commodities: 1.0, crypto: 1.0, cash: 1.0 },
  4: { stocks: 1.2, bonds: 0.8, realestate: 1.15, commodities: 1.1, crypto: 1.4, cash: 0.7 },
  5: { stocks: 1.4, bonds: 0.6, realestate: 1.3, commodities: 1.2, crypto: 1.8, cash: 0.5 },
};

// Global market cap weights: US ~63%, EU ~15%, JP ~6%, CN ~3%, IN ~2%, KR ~1.5%
const DEFAULT_ASSETS = [
  // Stocks — weighted by global market cap
  { ticker: "SPY", assetClass: "stocks", weightWithinClass: 0.44 },  // US large cap (S&P500)
  { ticker: "QQQ", assetClass: "stocks", weightWithinClass: 0.19 },  // US tech (Nasdaq100)
  { ticker: "VGK", assetClass: "stocks", weightWithinClass: 0.15 },  // Europe
  { ticker: "EWJ", assetClass: "stocks", weightWithinClass: 0.07 },  // Japan
  { ticker: "FXI", assetClass: "stocks", weightWithinClass: 0.06 },  // China
  { ticker: "INDA", assetClass: "stocks", weightWithinClass: 0.05 }, // India
  { ticker: "EWY", assetClass: "stocks", weightWithinClass: 0.04 },  // Korea
  // Bonds — US dominant, some international
  { ticker: "SHY", assetClass: "bonds", weightWithinClass: 0.15 },   // US short-term
  { ticker: "IEI", assetClass: "bonds", weightWithinClass: 0.20 },   // US mid-term
  { ticker: "IEF", assetClass: "bonds", weightWithinClass: 0.25 },   // US 7-10yr
  { ticker: "TLT", assetClass: "bonds", weightWithinClass: 0.20 },   // US long-term
  { ticker: "BNDX", assetClass: "bonds", weightWithinClass: 0.20 },  // International
  // Real Estate
  { ticker: "VNQ", assetClass: "realestate", weightWithinClass: 0.60 },
  { ticker: "VNQI", assetClass: "realestate", weightWithinClass: 0.40 },
  // Commodities
  { ticker: "GLD", assetClass: "commodities", weightWithinClass: 0.50 },
  { ticker: "CPER", assetClass: "commodities", weightWithinClass: 0.25 },
  { ticker: "USO", assetClass: "commodities", weightWithinClass: 0.25 },
  // Crypto
  { ticker: "IBIT", assetClass: "crypto", weightWithinClass: 0.70 },
  { ticker: "BITO", assetClass: "crypto", weightWithinClass: 0.30 },
];

// GET: Fetch backtest runs list, or a specific run with snapshots
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get("runId");

    if (runId) {
      // Fetch specific run with snapshots
      const run = await db
        .select()
        .from(backtestRuns)
        .where(eq(backtestRuns.id, Number(runId)))
        .then((rows) => rows[0]);

      if (!run) {
        return NextResponse.json({ error: "Run not found" }, { status: 404 });
      }

      const snapshots = await db
        .select()
        .from(backtestSnapshots)
        .where(eq(backtestSnapshots.runId, Number(runId)))
        .orderBy(backtestSnapshots.date);

      return NextResponse.json({ run, snapshots });
    }

    // Fetch all runs
    const runs = await db
      .select()
      .from(backtestRuns)
      .orderBy(desc(backtestRuns.createdAt));

    return NextResponse.json({ runs });
  } catch (error) {
    console.error("Backtest GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch backtest data" },
      { status: 500 }
    );
  }
}

// POST: Run a new backtest (or optimize)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // If optimize mode, run the optimizer
    if (body.optimize) {
      return handleOptimize(body);
    }

    const {
      startDate = "2020-01-01",
      endDate,
      initialCapital = 100000000,
      riskLevel = 3,
      rebalancePeriod = "monthly",
      benchmarkTicker = "SPY",
      name,
      customAllocations,
    } = body as {
      startDate?: string;
      endDate?: string;
      initialCapital?: number;
      riskLevel?: number;
      rebalancePeriod?: string;
      benchmarkTicker?: string;
      name?: string;
      customAllocations?: Record<string, Record<string, number>>;
    };

    const finalEndDate = endDate || new Date().toISOString().split("T")[0];
    const finalName = name || `백테스트 ${startDate} ~ ${finalEndDate}`;

    // Check if we have price data
    const priceCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(historicalPrices)
      .where(
        and(
          gte(historicalPrices.date, startDate),
          lte(historicalPrices.date, finalEndDate)
        )
      );

    if (!priceCount[0] || priceCount[0].count === 0) {
      return NextResponse.json(
        {
          error: "가격 데이터가 없습니다. 먼저 'python data/fetch_prices.py'를 실행해 Yahoo Finance에서 가격 데이터를 가져오세요.",
          needsPriceData: true,
        },
        { status: 400 }
      );
    }

    // Load price data
    const allPrices = await db
      .select({
        ticker: historicalPrices.ticker,
        date: historicalPrices.date,
        adjClose: historicalPrices.adjClose,
      })
      .from(historicalPrices)
      .where(
        and(
          gte(historicalPrices.date, startDate),
          lte(historicalPrices.date, finalEndDate)
        )
      )
      .orderBy(historicalPrices.date);

    // Build price lookup: { ticker: { date: adjClose } }
    const priceLookup: Record<string, Record<string, number>> = {};
    const allDatesSet = new Set<string>();
    for (const p of allPrices) {
      if (!priceLookup[p.ticker]) priceLookup[p.ticker] = {};
      priceLookup[p.ticker][p.date] = p.adjClose;
      allDatesSet.add(p.date);
    }
    const allDates = Array.from(allDatesSet).sort();

    if (allDates.length < 2) {
      return NextResponse.json(
        { error: "충분한 가격 데이터가 없습니다." },
        { status: 400 }
      );
    }

    // Filter assets to only those with available prices
    const availableTickers = new Set(Object.keys(priceLookup));
    const assets = DEFAULT_ASSETS.filter((a) => availableTickers.has(a.ticker));

    if (assets.length === 0) {
      return NextResponse.json(
        { error: "포트폴리오 자산의 가격 데이터가 없습니다." },
        { status: 400 }
      );
    }

    // Renormalize within-class weights
    const classGroups: Record<string, typeof assets> = {};
    for (const a of assets) {
      if (!classGroups[a.assetClass]) classGroups[a.assetClass] = [];
      classGroups[a.assetClass].push(a);
    }
    for (const group of Object.values(classGroups)) {
      const totalW = group.reduce((s, a) => s + a.weightWithinClass, 0);
      if (totalW > 0) {
        for (const a of group) {
          a.weightWithinClass = a.weightWithinClass / totalW;
        }
      }
    }

    // Load regime overrides
    const overrides = await db.select().from(userRegimeOverrides);
    const overrideMap: Record<string, Record<string, number>> = {};
    for (const o of overrides) {
      if (!overrideMap[o.regimeName]) overrideMap[o.regimeName] = {};
      overrideMap[o.regimeName][o.assetClass] = o.weightPct;
    }

    // Load regime history for date lookup (US regimes, sorted by date)
    // US regime is used for the whole portfolio since US dominates global allocation
    const regimeHistory = await db
      .select()
      .from(regimes)
      .where(eq(regimes.country, "US"))
      .orderBy(regimes.date);

    // Use DB regime history: find the most recent US regime entry on or before a given date.
    // If no regime data exists for a date, default to "goldilocks" (balanced).
    // Historical regimes are computed from FRED data via compute_historical_regimes.py.
    function getRegimeForDate(date: string): string {
      let result = "goldilocks";
      for (const r of regimeHistory) {
        if (r.date <= date) {
          result = r.regimeName;
        } else {
          break;
        }
      }
      return result;
    }

    function getAllocationWeights(regimeName: string): { tickerWeights: Record<string, number>; cashWeight: number } {
      const regimeKey = regimeName as RegimeId;
      const template = {
        ...(REGIME_ALLOCATION_TEMPLATES[regimeKey] || REGIME_ALLOCATION_TEMPLATES.goldilocks),
      };

      // Apply custom allocations from backtest request (highest priority)
      if (customAllocations && customAllocations[regimeName]) {
        for (const [ac, pct] of Object.entries(customAllocations[regimeName])) {
          (template as Record<string, number>)[ac] = pct;
        }
      } else if (overrideMap[regimeName]) {
        // Fall back to DB overrides if no custom allocation for this regime
        for (const [ac, pct] of Object.entries(overrideMap[regimeName])) {
          (template as Record<string, number>)[ac] = pct;
        }
      }

      // Apply risk multiplier
      const multipliers = RISK_MULTIPLIERS[riskLevel] || RISK_MULTIPLIERS[3];
      const adjusted: Record<string, number> = {};
      let totalPct = 0;
      for (const [ac, pct] of Object.entries(template)) {
        const adj = (pct as number) * (multipliers[ac] || 1.0);
        adjusted[ac] = adj;
        totalPct += adj;
      }

      // Normalize to 100%
      if (totalPct > 0) {
        for (const ac of Object.keys(adjusted)) {
          adjusted[ac] = (adjusted[ac] / totalPct) * 100;
        }
      }

      // Cash is held as cash (no ETF), separate from ticker weights
      const cashWeight = (adjusted["cash"] || 0) / 100;

      // Per-ticker weights (excluding cash)
      const tickerWeights: Record<string, number> = {};
      for (const asset of assets) {
        if (asset.assetClass === "cash") continue;
        const classPct = adjusted[asset.assetClass] || 0;
        if (classPct === 0) continue;
        tickerWeights[asset.ticker] = (classPct * asset.weightWithinClass) / 100;
      }

      return { tickerWeights, cashWeight };
    }

    function isRebalanceDate(date: string, prevDate: string | null): boolean {
      if (!prevDate) return true;
      const dt = new Date(date);
      const prev = new Date(prevDate);

      switch (rebalancePeriod) {
        case "daily":
          return true;
        case "weekly":
          return getWeekNumber(dt) !== getWeekNumber(prev);
        case "monthly":
          return dt.getMonth() !== prev.getMonth();
        case "quarterly":
          return Math.floor(dt.getMonth() / 3) !== Math.floor(prev.getMonth() / 3);
        case "yearly":
          return dt.getFullYear() !== prev.getFullYear();
        default:
          return dt.getMonth() !== prev.getMonth();
      }
    }

    function getWeekNumber(d: Date): number {
      const oneJan = new Date(d.getFullYear(), 0, 1);
      return Math.ceil(
        ((d.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7
      );
    }

    // === Run Simulation ===
    let portfolioValue = initialCapital;
    let cashHolding = 0; // Cash portion (no ETF, just held as cash)
    const holdings: Record<string, number> = {}; // ticker -> shares
    let prevDate: string | null = null;
    const dailyValues: number[] = [];
    const dailyDates: string[] = [];
    const dailyRegimes: string[] = [];

    // Benchmark
    let benchmarkInitialPrice: number | null = null;
    const benchmarkValues: number[] = [];

    for (const date of allDates) {
      // Benchmark
      if (
        priceLookup[benchmarkTicker] &&
        priceLookup[benchmarkTicker][date]
      ) {
        const bp = priceLookup[benchmarkTicker][date];
        if (benchmarkInitialPrice === null) benchmarkInitialPrice = bp;
        benchmarkValues.push(
          initialCapital * (bp / benchmarkInitialPrice)
        );
      } else {
        benchmarkValues.push(
          benchmarkValues.length > 0 ? benchmarkValues[benchmarkValues.length - 1] : initialCapital
        );
      }

      const shouldRebalance = isRebalanceDate(date, prevDate);

      if (shouldRebalance) {
        // Calculate current portfolio value (ETF holdings + cash)
        if (Object.keys(holdings).length > 0 || cashHolding > 0) {
          let etfValue = 0;
          for (const [t, shares] of Object.entries(holdings)) {
            const price = getPrice(priceLookup, t, date);
            if (price) etfValue += shares * price;
          }
          portfolioValue = etfValue + cashHolding;
        }

        // Get allocation (includes cash weight separately)
        const regime = getRegimeForDate(date);
        const { tickerWeights, cashWeight } = getAllocationWeights(regime);

        // Rebalance: allocate cash portion, rest to ETFs
        cashHolding = portfolioValue * cashWeight;
        const etfBudget = portfolioValue - cashHolding;

        for (const key of Object.keys(holdings)) {
          delete holdings[key];
        }
        // Only include tickers that have price data on this date
        // Redistribute unavailable ticker weights to available ones
        let availableTickerWeight = 0;
        for (const [ticker, weight] of Object.entries(tickerWeights)) {
          const price = getPrice(priceLookup, ticker, date);
          if (price && price > 0) {
            availableTickerWeight += weight;
          }
        }
        // Distribute ETF budget only to tickers with available prices
        if (availableTickerWeight > 0) {
          for (const [ticker, weight] of Object.entries(tickerWeights)) {
            const price = getPrice(priceLookup, ticker, date);
            if (price && price > 0) {
              const normalizedWeight = weight / availableTickerWeight;
              holdings[ticker] = (etfBudget * normalizedWeight) / price;
            }
          }
        }
      }

      // Calculate current value (ETFs + cash)
      let etfValue = 0;
      for (const [t, shares] of Object.entries(holdings)) {
        const price = getPrice(priceLookup, t, date);
        if (price) etfValue += shares * price;
      }
      portfolioValue = etfValue + cashHolding;

      dailyValues.push(portfolioValue);
      dailyDates.push(date);
      dailyRegimes.push(getRegimeForDate(date));
      prevDate = date;
    }

    // === Compute Metrics ===
    const metrics = computeMetrics(dailyValues, dailyDates, initialCapital);
    const benchMetrics = computeMetrics(benchmarkValues, dailyDates, initialCapital);

    // Build effective allocations used (for display in results)
    const REGIME_IDS = [
      "goldilocks", "disinflation_tightening", "inflation_boom", "overheating",
      "stagflation_lite", "stagflation", "reflation", "deflation_crisis",
    ] as const;
    const effectiveAllocations: Record<string, Record<string, number>> = {};
    for (const rid of REGIME_IDS) {
      const { tickerWeights, cashWeight } = getAllocationWeights(rid);
      // Reconstruct asset class percentages from ticker weights
      const classTotals: Record<string, number> = { cash: Math.round(cashWeight * 100 * 10) / 10 };
      for (const asset of assets) {
        if (asset.assetClass === "cash") continue;
        const tw = tickerWeights[asset.ticker] || 0;
        if (!classTotals[asset.assetClass]) classTotals[asset.assetClass] = 0;
        classTotals[asset.assetClass] += tw * 100;
      }
      // Round
      for (const ac of Object.keys(classTotals)) {
        classTotals[ac] = Math.round(classTotals[ac] * 10) / 10;
      }
      effectiveAllocations[rid] = classTotals;
    }

    // Create run record
    const now = new Date().toISOString();
    const insertResult = await db.insert(backtestRuns).values({
      name: finalName,
      startDate: allDates[0],
      endDate: allDates[allDates.length - 1],
      initialCapital,
      riskLevel,
      rebalancePeriod,
      finalValue: metrics.finalValue,
      totalReturnPct: metrics.totalReturnPct,
      annualizedReturnPct: metrics.annualizedReturnPct,
      volatilityPct: metrics.volatilityPct,
      sharpeRatio: metrics.sharpeRatio,
      maxDrawdownPct: metrics.maxDrawdownPct,
      maxDrawdownStart: metrics.maxDrawdownStart,
      maxDrawdownEnd: metrics.maxDrawdownEnd,
      benchmarkTicker,
      benchmarkReturnPct: benchMetrics.totalReturnPct,
      benchmarkSharpe: benchMetrics.sharpeRatio,
      benchmarkMddPct: benchMetrics.maxDrawdownPct,
      status: "completed",
      allocationsJson: JSON.stringify(effectiveAllocations),
      createdAt: now,
    }).returning();

    const runId = insertResult[0].id;

    // Store snapshots (sample every 5 days)
    const drawdowns = metrics.drawdowns || [];
    const snapshotValues = [];
    for (let i = 0; i < dailyDates.length; i += 5) {
      snapshotValues.push({
        runId,
        date: dailyDates[i],
        portfolioValue: dailyValues[i],
        benchmarkValue: benchmarkValues[i] || null,
        regimeName: dailyRegimes[i],
        drawdownPct: drawdowns[i] || 0,
      });
    }
    // Include last date
    const lastIdx = dailyDates.length - 1;
    if (lastIdx % 5 !== 0 && lastIdx > 0) {
      snapshotValues.push({
        runId,
        date: dailyDates[lastIdx],
        portfolioValue: dailyValues[lastIdx],
        benchmarkValue: benchmarkValues[lastIdx] || null,
        regimeName: dailyRegimes[lastIdx],
        drawdownPct: drawdowns[lastIdx] || 0,
      });
    }

    if (snapshotValues.length > 0) {
      await db.insert(backtestSnapshots).values(snapshotValues);
    }

    // Return result
    const result = {
      runId,
      name: finalName,
      startDate: allDates[0],
      endDate: allDates[allDates.length - 1],
      initialCapital,
      finalValue: metrics.finalValue,
      totalReturnPct: metrics.totalReturnPct,
      annualizedReturnPct: metrics.annualizedReturnPct,
      volatilityPct: metrics.volatilityPct,
      sharpeRatio: metrics.sharpeRatio,
      maxDrawdownPct: metrics.maxDrawdownPct,
      benchmarkReturnPct: benchMetrics.totalReturnPct,
      benchmarkSharpe: benchMetrics.sharpeRatio,
      benchmarkMddPct: benchMetrics.maxDrawdownPct,
    };

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Backtest POST error:", error);
    return NextResponse.json(
      { error: "백테스트 실행 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// DELETE: Remove a backtest run
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get("runId");

    if (!runId) {
      return NextResponse.json({ error: "runId required" }, { status: 400 });
    }

    await db.delete(backtestSnapshots).where(eq(backtestSnapshots.runId, Number(runId)));
    await db.delete(backtestRuns).where(eq(backtestRuns.id, Number(runId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Backtest DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete backtest run" },
      { status: 500 }
    );
  }
}

// === Optimizer ===

type AssetClassWeights = Record<string, number>;
type RegimeAllocations = Record<string, AssetClassWeights>;

async function handleOptimize(body: {
  startDate?: string;
  endDate?: string;
  initialCapital?: number;
  riskLevel?: number;
  rebalancePeriod?: string;
  benchmarkTicker?: string;
  optimizeTarget?: "sharpe" | "return" | "mdd";
  baseAllocations?: RegimeAllocations;
}) {
  const {
    startDate = "2022-03-01",
    endDate,
    initialCapital = 100000000,
    riskLevel = 3,
    rebalancePeriod = "monthly",
    benchmarkTicker = "SPY",
    optimizeTarget = "sharpe",
    baseAllocations,
  } = body;

  const finalEndDate = endDate || new Date().toISOString().split("T")[0];
  const ASSET_CLASSES = ["stocks", "bonds", "realestate", "commodities", "crypto", "cash"] as const;

  // Load price data
  const allPrices = await db
    .select({
      ticker: historicalPrices.ticker,
      date: historicalPrices.date,
      adjClose: historicalPrices.adjClose,
    })
    .from(historicalPrices)
    .where(and(gte(historicalPrices.date, startDate), lte(historicalPrices.date, finalEndDate)))
    .orderBy(historicalPrices.date);

  const priceLookup: Record<string, Record<string, number>> = {};
  const allDatesSet = new Set<string>();
  for (const p of allPrices) {
    if (!priceLookup[p.ticker]) priceLookup[p.ticker] = {};
    priceLookup[p.ticker][p.date] = p.adjClose;
    allDatesSet.add(p.date);
  }
  const allDates = Array.from(allDatesSet).sort();

  if (allDates.length < 20) {
    return NextResponse.json({ error: "최적화에 충분한 데이터가 없습니다." }, { status: 400 });
  }

  // Load assets
  const availableTickers = new Set(Object.keys(priceLookup));
  const assets = DEFAULT_ASSETS.filter((a) => availableTickers.has(a.ticker));
  // Renormalize
  const classGroups: Record<string, typeof assets> = {};
  for (const a of assets) {
    if (!classGroups[a.assetClass]) classGroups[a.assetClass] = [];
    classGroups[a.assetClass].push(a);
  }
  for (const group of Object.values(classGroups)) {
    const totalW = group.reduce((s, a) => s + a.weightWithinClass, 0);
    if (totalW > 0) for (const a of group) a.weightWithinClass /= totalW;
  }

  // Load regime history
  const regimeHistory = await db
    .select()
    .from(regimes)
    .where(eq(regimes.country, "US"))
    .orderBy(regimes.date);

  function getRegimeForDate(date: string): string {
    let result = "goldilocks";
    for (const r of regimeHistory) {
      if (r.date <= date) result = r.regimeName;
      else break;
    }
    return result;
  }

  // Identify which regimes actually appear in this period
  const regimesInPeriod = new Set<string>();
  for (const date of allDates) {
    regimesInPeriod.add(getRegimeForDate(date));
  }

  // Fast simulation function (returns key metrics without DB writes)
  function runSimulation(allocations: RegimeAllocations): {
    totalReturnPct: number;
    sharpeRatio: number;
    maxDrawdownPct: number;
    finalValue: number;
  } {
    const multipliers = RISK_MULTIPLIERS[riskLevel] || RISK_MULTIPLIERS[3];

    function getAllocWeights(regimeName: string): { tickerWeights: Record<string, number>; cashWeight: number } {
      const regimeKey = regimeName as RegimeId;
      const template = {
        ...(REGIME_ALLOCATION_TEMPLATES[regimeKey] || REGIME_ALLOCATION_TEMPLATES.goldilocks),
      };

      if (allocations[regimeName]) {
        for (const [ac, pct] of Object.entries(allocations[regimeName])) {
          (template as Record<string, number>)[ac] = pct;
        }
      }

      const adjusted: Record<string, number> = {};
      let totalPct = 0;
      for (const [ac, pct] of Object.entries(template)) {
        const adj = (pct as number) * (multipliers[ac] || 1.0);
        adjusted[ac] = adj;
        totalPct += adj;
      }
      if (totalPct > 0) {
        for (const ac of Object.keys(adjusted)) adjusted[ac] = (adjusted[ac] / totalPct) * 100;
      }

      const cashWeight = (adjusted["cash"] || 0) / 100;
      const tickerWeights: Record<string, number> = {};
      for (const asset of assets) {
        if (asset.assetClass === "cash") continue;
        const classPct = adjusted[asset.assetClass] || 0;
        if (classPct === 0) continue;
        tickerWeights[asset.ticker] = (classPct * asset.weightWithinClass) / 100;
      }
      return { tickerWeights, cashWeight };
    }

    let portfolioValue = initialCapital;
    let cashHolding = 0;
    const holdings: Record<string, number> = {};
    let prevMonth: number | null = null;
    const dailyValues: number[] = [];

    for (const date of allDates) {
      const curMonth = new Date(date).getMonth();
      const shouldRebalance = prevMonth === null || curMonth !== prevMonth;

      if (shouldRebalance) {
        if (Object.keys(holdings).length > 0 || cashHolding > 0) {
          let etfVal = 0;
          for (const [t, shares] of Object.entries(holdings)) {
            const p = getPrice(priceLookup, t, date);
            if (p) etfVal += shares * p;
          }
          portfolioValue = etfVal + cashHolding;
        }

        const regime = getRegimeForDate(date);
        const { tickerWeights, cashWeight } = getAllocWeights(regime);
        cashHolding = portfolioValue * cashWeight;
        const etfBudget = portfolioValue - cashHolding;

        for (const k of Object.keys(holdings)) delete holdings[k];

        let availableTickerWeight = 0;
        for (const [ticker, weight] of Object.entries(tickerWeights)) {
          const p = getPrice(priceLookup, ticker, date);
          if (p && p > 0) availableTickerWeight += weight;
        }
        if (availableTickerWeight > 0) {
          for (const [ticker, weight] of Object.entries(tickerWeights)) {
            const p = getPrice(priceLookup, ticker, date);
            if (p && p > 0) {
              holdings[ticker] = (etfBudget * (weight / availableTickerWeight)) / p;
            }
          }
        }
      }

      let etfVal = 0;
      for (const [t, shares] of Object.entries(holdings)) {
        const p = getPrice(priceLookup, t, date);
        if (p) etfVal += shares * p;
      }
      portfolioValue = etfVal + cashHolding;
      dailyValues.push(portfolioValue);
      prevMonth = new Date(date).getMonth();
    }

    // Compute metrics inline
    const fv = dailyValues[dailyValues.length - 1];
    const totalReturn = (fv / initialCapital - 1) * 100;

    const dailyReturns: number[] = [];
    for (let i = 1; i < dailyValues.length; i++) {
      if (dailyValues[i - 1] > 0) dailyReturns.push(dailyValues[i] / dailyValues[i - 1] - 1);
    }
    const meanDaily = dailyReturns.length > 0 ? dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length : 0;
    const variance = dailyReturns.length > 0 ? dailyReturns.reduce((s, r) => s + (r - meanDaily) ** 2, 0) / dailyReturns.length : 0;
    const dailyVol = Math.sqrt(variance);
    const sharpe = dailyVol > 0 ? ((meanDaily - 0.04 / 252) / dailyVol) * Math.sqrt(252) : 0;

    let peak = dailyValues[0];
    let maxDD = 0;
    for (const v of dailyValues) {
      if (v > peak) peak = v;
      const dd = peak > 0 ? ((peak - v) / peak) * 100 : 0;
      if (dd > maxDD) maxDD = dd;
    }

    return {
      totalReturnPct: Math.round(totalReturn * 100) / 100,
      sharpeRatio: Math.round(sharpe * 10000) / 10000,
      maxDrawdownPct: Math.round(maxDD * 100) / 100,
      finalValue: Math.round(fv),
    };
  }

  // Start with base or default allocations
  const baseAlloc: RegimeAllocations = {};
  for (const regimeName of regimesInPeriod) {
    const rKey = regimeName as RegimeId;
    baseAlloc[regimeName] = {
      ...(baseAllocations?.[regimeName] || REGIME_ALLOCATION_TEMPLATES[rKey] || REGIME_ALLOCATION_TEMPLATES.goldilocks),
    };
  }

  function score(m: { sharpeRatio: number; totalReturnPct: number; maxDrawdownPct: number }): number {
    switch (optimizeTarget) {
      case "return": return m.totalReturnPct;
      case "mdd": return -m.maxDrawdownPct;
      case "sharpe":
      default: return m.sharpeRatio;
    }
  }

  // Normalize allocations to sum to 100
  function normalizeAlloc(alloc: Record<string, number>): Record<string, number> {
    const total = ASSET_CLASSES.reduce((s, ac) => s + (alloc[ac] || 0), 0);
    if (total <= 0) return alloc;
    const result: Record<string, number> = {};
    for (const ac of ASSET_CLASSES) {
      result[ac] = Math.round(((alloc[ac] || 0) / total) * 100);
    }
    // Fix rounding to exactly 100
    const diff = 100 - ASSET_CLASSES.reduce((s, ac) => s + result[ac], 0);
    if (diff !== 0) {
      // Add remainder to largest
      const largest = ASSET_CLASSES.reduce((a, b) => result[a] > result[b] ? a : b);
      result[largest] += diff;
    }
    return result;
  }

  // === Phase 1: Multi-step hill climbing with varied step sizes ===
  const STEPS = [10, 7, 5, 3, 2, 1];
  const MAX_ITERATIONS = 30;

  let bestAlloc = JSON.parse(JSON.stringify(baseAlloc)) as RegimeAllocations;
  let bestMetrics = runSimulation(bestAlloc);
  let bestScore = score(bestMetrics);
  let totalIterations = 0;

  for (const step of STEPS) {
    let improved = true;
    let iterationsAtStep = 0;

    while (improved && iterationsAtStep < MAX_ITERATIONS) {
      improved = false;
      iterationsAtStep++;
      totalIterations++;

      for (const regimeName of regimesInPeriod) {
        for (let i = 0; i < ASSET_CLASSES.length; i++) {
          for (let j = i + 1; j < ASSET_CLASSES.length; j++) {
            const acFrom = ASSET_CLASSES[i];
            const acTo = ASSET_CLASSES[j];

            for (const direction of [1, -1]) {
              const trial = JSON.parse(JSON.stringify(bestAlloc)) as RegimeAllocations;
              const fromVal = trial[regimeName][acFrom] || 0;
              const toVal = trial[regimeName][acTo] || 0;

              const shift = step * direction;
              if (fromVal - shift < 0 || toVal + shift < 0) continue;
              if (fromVal - shift > 80 || toVal + shift > 80) continue;

              trial[regimeName][acFrom] = fromVal - shift;
              trial[regimeName][acTo] = toVal + shift;

              const metrics = runSimulation(trial);
              const s = score(metrics);

              if (s > bestScore) {
                bestAlloc = trial;
                bestMetrics = metrics;
                bestScore = s;
                improved = true;
              }
            }
          }
        }
      }
    }
  }

  // === Phase 2: Try aggressive preset templates per regime ===
  // These are "smart" alternatives that make economic sense
  const aggressiveTemplates: Record<string, Record<string, number>[]> = {
    goldilocks: [
      { stocks: 60, bonds: 10, realestate: 10, commodities: 5, crypto: 10, cash: 5 },
      { stocks: 55, bonds: 15, realestate: 10, commodities: 5, crypto: 10, cash: 5 },
      { stocks: 50, bonds: 15, realestate: 10, commodities: 10, crypto: 10, cash: 5 },
    ],
    inflation_boom: [
      { stocks: 20, bonds: 5, realestate: 10, commodities: 40, crypto: 15, cash: 10 },
      { stocks: 25, bonds: 5, realestate: 5, commodities: 35, crypto: 15, cash: 15 },
      { stocks: 15, bonds: 5, realestate: 10, commodities: 45, crypto: 10, cash: 15 },
    ],
    overheating: [
      { stocks: 10, bonds: 10, realestate: 5, commodities: 40, crypto: 5, cash: 30 },
      { stocks: 15, bonds: 5, realestate: 5, commodities: 45, crypto: 5, cash: 25 },
      { stocks: 10, bonds: 15, realestate: 3, commodities: 35, crypto: 7, cash: 30 },
    ],
    stagflation_lite: [
      { stocks: 5, bonds: 5, realestate: 3, commodities: 55, crypto: 7, cash: 25 },
      { stocks: 10, bonds: 10, realestate: 5, commodities: 45, crypto: 10, cash: 20 },
      { stocks: 5, bonds: 10, realestate: 3, commodities: 50, crypto: 5, cash: 27 },
    ],
    stagflation: [
      { stocks: 5, bonds: 5, realestate: 2, commodities: 55, crypto: 3, cash: 30 },
      { stocks: 5, bonds: 10, realestate: 2, commodities: 50, crypto: 5, cash: 28 },
      { stocks: 3, bonds: 5, realestate: 2, commodities: 60, crypto: 5, cash: 25 },
    ],
    reflation: [
      { stocks: 30, bonds: 30, realestate: 10, commodities: 10, crypto: 10, cash: 10 },
      { stocks: 25, bonds: 35, realestate: 10, commodities: 10, crypto: 10, cash: 10 },
      { stocks: 20, bonds: 40, realestate: 10, commodities: 10, crypto: 10, cash: 10 },
    ],
    deflation_crisis: [
      { stocks: 5, bonds: 45, realestate: 2, commodities: 15, crypto: 3, cash: 30 },
      { stocks: 5, bonds: 50, realestate: 2, commodities: 10, crypto: 3, cash: 30 },
      { stocks: 10, bonds: 40, realestate: 5, commodities: 15, crypto: 5, cash: 25 },
    ],
    disinflation_tightening: [
      { stocks: 40, bonds: 25, realestate: 10, commodities: 5, crypto: 10, cash: 10 },
      { stocks: 35, bonds: 30, realestate: 10, commodities: 5, crypto: 10, cash: 10 },
      { stocks: 45, bonds: 20, realestate: 10, commodities: 5, crypto: 10, cash: 10 },
    ],
  };

  // Try each aggressive template for each regime independently
  for (const regimeName of regimesInPeriod) {
    const templates = aggressiveTemplates[regimeName] || [];
    for (const tmpl of templates) {
      const trial = JSON.parse(JSON.stringify(bestAlloc)) as RegimeAllocations;
      trial[regimeName] = normalizeAlloc(tmpl);

      const metrics = runSimulation(trial);
      const s = score(metrics);
      if (s > bestScore) {
        bestAlloc = trial;
        bestMetrics = metrics;
        bestScore = s;
      }
    }
  }

  // === Phase 3: Fine-tune again with small steps after aggressive templates ===
  for (const step of [5, 3, 2, 1]) {
    let improved = true;
    let iterationsAtStep = 0;

    while (improved && iterationsAtStep < 20) {
      improved = false;
      iterationsAtStep++;
      totalIterations++;

      for (const regimeName of regimesInPeriod) {
        for (let i = 0; i < ASSET_CLASSES.length; i++) {
          for (let j = i + 1; j < ASSET_CLASSES.length; j++) {
            const acFrom = ASSET_CLASSES[i];
            const acTo = ASSET_CLASSES[j];

            for (const direction of [1, -1]) {
              const trial = JSON.parse(JSON.stringify(bestAlloc)) as RegimeAllocations;
              const fromVal = trial[regimeName][acFrom] || 0;
              const toVal = trial[regimeName][acTo] || 0;

              const shift = step * direction;
              if (fromVal - shift < 0 || toVal + shift < 0) continue;
              if (fromVal - shift > 80 || toVal + shift > 80) continue;

              trial[regimeName][acFrom] = fromVal - shift;
              trial[regimeName][acTo] = toVal + shift;

              const metrics = runSimulation(trial);
              const s = score(metrics);

              if (s > bestScore) {
                bestAlloc = trial;
                bestMetrics = metrics;
                bestScore = s;
                improved = true;
              }
            }
          }
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    optimizeResult: {
      allocations: bestAlloc,
      metrics: bestMetrics,
      iterations: totalIterations,
      target: optimizeTarget,
      regimesUsed: Array.from(regimesInPeriod),
    },
  });
}

// === Helpers ===

function getPrice(
  priceLookup: Record<string, Record<string, number>>,
  ticker: string,
  date: string
): number | null {
  if (priceLookup[ticker]?.[date]) return priceLookup[ticker][date];

  // Find most recent price before this date
  const dates = Object.keys(priceLookup[ticker] || {}).filter((d) => d <= date);
  if (dates.length > 0) {
    const latest = dates[dates.length - 1];
    return priceLookup[ticker][latest];
  }
  return null;
}

function computeMetrics(
  dailyValues: number[],
  dates: string[],
  initialCapital: number
): {
  finalValue: number;
  totalReturnPct: number;
  annualizedReturnPct: number;
  volatilityPct: number;
  sharpeRatio: number;
  maxDrawdownPct: number;
  maxDrawdownStart: string;
  maxDrawdownEnd: string;
  drawdowns: number[];
} {
  const defaultResult = {
    finalValue: initialCapital,
    totalReturnPct: 0,
    annualizedReturnPct: 0,
    volatilityPct: 0,
    sharpeRatio: 0,
    maxDrawdownPct: 0,
    maxDrawdownStart: dates[0] || "",
    maxDrawdownEnd: dates[0] || "",
    drawdowns: [],
  };

  if (dailyValues.length < 2) return defaultResult;

  const finalValue = dailyValues[dailyValues.length - 1];
  const totalReturn = (finalValue / initialCapital - 1) * 100;

  const daysDiff =
    (new Date(dates[dates.length - 1]).getTime() - new Date(dates[0]).getTime()) /
    (1000 * 60 * 60 * 24);
  const years = Math.max(daysDiff / 365.25, 0.01);
  const annualizedReturn =
    (Math.pow(finalValue / initialCapital, 1 / years) - 1) * 100;

  // Daily returns
  const dailyReturns: number[] = [];
  for (let i = 1; i < dailyValues.length; i++) {
    if (dailyValues[i - 1] > 0) {
      dailyReturns.push(dailyValues[i] / dailyValues[i - 1] - 1);
    }
  }

  // Volatility
  const meanDaily =
    dailyReturns.length > 0
      ? dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length
      : 0;
  const variance =
    dailyReturns.length > 0
      ? dailyReturns.reduce((s, r) => s + (r - meanDaily) ** 2, 0) / dailyReturns.length
      : 0;
  const dailyVol = Math.sqrt(variance);
  const annualizedVol = dailyVol * Math.sqrt(252) * 100;

  // Sharpe (assuming 4% risk-free rate)
  const dailyRf = 0.04 / 252;
  const excessMean = meanDaily - dailyRf;
  const sharpe = dailyVol > 0 ? (excessMean / dailyVol) * Math.sqrt(252) : 0;

  // Max Drawdown
  let peak = dailyValues[0];
  let maxDD = 0;
  let maxDDStart = dates[0];
  let maxDDEnd = dates[0];
  let currentDDStart = dates[0];
  const drawdowns: number[] = [];

  for (let i = 0; i < dailyValues.length; i++) {
    if (dailyValues[i] > peak) {
      peak = dailyValues[i];
      currentDDStart = dates[i];
    }
    const dd = peak > 0 ? ((peak - dailyValues[i]) / peak) * 100 : 0;
    drawdowns.push(dd);
    if (dd > maxDD) {
      maxDD = dd;
      maxDDStart = currentDDStart;
      maxDDEnd = dates[i];
    }
  }

  return {
    finalValue: Math.round(finalValue * 100) / 100,
    totalReturnPct: Math.round(totalReturn * 100) / 100,
    annualizedReturnPct: Math.round(annualizedReturn * 100) / 100,
    volatilityPct: Math.round(annualizedVol * 100) / 100,
    sharpeRatio: Math.round(sharpe * 10000) / 10000,
    maxDrawdownPct: Math.round(maxDD * 100) / 100,
    maxDrawdownStart: maxDDStart,
    maxDrawdownEnd: maxDDEnd,
    drawdowns,
  };
}
