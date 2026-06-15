import { db } from "@db/index";
import {
  regimes,
  allocations,
  allocationItems,
  economicData,
  computedIndicators,
  liquiditySignals,
  newsArticles,
  pipelineRuns,
  historicalPrices,
  campaign,
  stageTransitions,
} from "@db/schema";
import { desc, eq } from "drizzle-orm";
import { deriveRegimeName } from "@/lib/regimes";
import { buildReading } from "@/lib/signals";
import { determineStage, STAGES } from "@/lib/stages";
import type {
  CampaignConfig,
  SignalReading,
  StageAssessment,
  StageId,
  StageTransition,
} from "@/types/campaign";

// ─── Real-time liquidity correction ─────────────────────────────────────────

/**
 * 최신 유동성 신호 기반 3-of-5 룰로 실시간 유동성 상태 계산.
 * 레짐 테이블의 유동성과 다르면 보정된 값 반환.
 */
export async function getRealTimeLiquidityState(): Promise<string> {
  const signals = await db
    .select()
    .from(liquiditySignals)
    .orderBy(desc(liquiditySignals.date))
    .limit(10);

  if (signals.length === 0) return "expanding";

  const latestDate = signals[0].date;
  const latest = signals.filter((s) => s.date === latestDate);
  const easingCount = latest.filter((s) => s.direction === "easing").length;

  return easingCount >= 3 ? "expanding" : "contracting";
}

/**
 * 레짐 레코드에 최신 유동성 상태를 반영하여 보정.
 */
export function applyLiquidityCorrection<T extends { growthState: string; inflationState: string; liquidityState: string; regimeName: string }>(
  regime: T,
  realTimeLiquidity: string
): T {
  if (regime.liquidityState === realTimeLiquidity) return regime;
  return {
    ...regime,
    liquidityState: realTimeLiquidity,
    regimeName: deriveRegimeName(regime.growthState, regime.inflationState, realTimeLiquidity),
  };
}

// ─── Public DB functions ────────────────────────────────────────────────────

export async function getCurrentRegime(country: string = "US") {
  const result = await db
    .select()
    .from(regimes)
    .where(eq(regimes.country, country))
    .orderBy(desc(regimes.date))
    .limit(1);

  if (!result[0]) return null;

  const realTimeLiquidity = await getRealTimeLiquidityState();
  return applyLiquidityCorrection(result[0], realTimeLiquidity);
}

export async function getAllRegimes() {
  const all = await db
    .select()
    .from(regimes)
    .orderBy(desc(regimes.date))
    .limit(20);

  const byCountry = new Map<string, (typeof all)[number]>();
  for (const r of all) {
    if (!byCountry.has(r.country)) {
      byCountry.set(r.country, r);
    }
  }

  // 최신 유동성 신호 기반 보정
  const realTimeLiquidity = await getRealTimeLiquidityState();
  const corrected = new Map<string, (typeof all)[number]>();
  for (const [country, regime] of byCountry) {
    corrected.set(country, applyLiquidityCorrection(regime, realTimeLiquidity));
  }

  return Object.fromEntries(corrected);
}

export async function getLatestAllocation() {
  const latest = await db
    .select()
    .from(allocations)
    .orderBy(desc(allocations.createdAt))
    .limit(1);

  if (latest.length === 0) return { allocation: null, items: [] };

  const items = await db
    .select()
    .from(allocationItems)
    .where(eq(allocationItems.allocationId, latest[0].id));

  return { allocation: latest[0], items };
}

export async function getComputedIndicators() {
  return db
    .select()
    .from(computedIndicators)
    .orderBy(desc(computedIndicators.date));
}

export async function getLiquiditySignals() {
  const all = await db
    .select()
    .from(liquiditySignals)
    .orderBy(desc(liquiditySignals.date))
    .limit(20);

  // Only return signals from the latest date to avoid duplicate keys
  if (all.length === 0) return [];
  const latestDate = all[0].date;
  return all.filter((s) => s.date === latestDate);
}

export async function getRecentNews(limit: number = 20) {
  const articles = await db
    .select()
    .from(newsArticles)
    .orderBy(desc(newsArticles.publishedAt))
    .limit(limit);

  return articles.map((a) => ({
    ...a,
    relatedTickers: a.relatedTickers ? JSON.parse(a.relatedTickers) : [],
  }));
}

export async function getEconomicSeries(seriesId: string, limit: number = 60) {
  return db
    .select()
    .from(economicData)
    .where(eq(economicData.seriesId, seriesId))
    .orderBy(desc(economicData.date))
    .limit(limit);
}

export async function getEconomicDataByCountry(country: string) {
  return db
    .select()
    .from(economicData)
    .where(eq(economicData.country, country))
    .orderBy(desc(economicData.date))
    .limit(200);
}

export async function getDistinctSeries() {
  return db
    .select({
      seriesId: economicData.seriesId,
      country: economicData.country,
      category: economicData.category,
    })
    .from(economicData)
    .groupBy(economicData.seriesId, economicData.country, economicData.category);
}

export async function getLastPipelineRun() {
  const result = await db
    .select()
    .from(pipelineRuns)
    .orderBy(desc(pipelineRuns.startedAt))
    .limit(1);
  return result[0] ?? null;
}

// ─── AI 버블 1년 작전 ─────────────────────────────────────────────────────────

const HY_SPREAD_SERIES = "BAMLH0A0HYM2";

function defaultCampaignConfig(): CampaignConfig {
  const now = new Date();
  const end = new Date(now);
  end.setFullYear(end.getFullYear() + 1);
  return {
    startDate: now.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    totalCapital: 100_000_000,
    riskLevel: 3,
    autoDetect: true,
    manualStageId: null,
  };
}

export async function getCampaignConfig(): Promise<CampaignConfig> {
  try {
    const rows = await db.select().from(campaign).orderBy(desc(campaign.id)).limit(1);
    if (rows.length === 0) return defaultCampaignConfig();
    const r = rows[0];
    return {
      startDate: r.startDate,
      endDate: r.endDate,
      totalCapital: r.totalCapital,
      riskLevel: r.riskLevel,
      autoDetect: r.autoDetect,
      manualStageId: (r.manualStageId as StageId | null) ?? null,
    };
  } catch {
    return defaultCampaignConfig();
  }
}

/** historical_prices에서 티커별 최근 가격(오름차순) */
async function getPriceSeries(ticker: string, limit = 320): Promise<{ date: string; close: number }[]> {
  try {
    const rows = await db
      .select({ date: historicalPrices.date, adj: historicalPrices.adjClose, close: historicalPrices.close })
      .from(historicalPrices)
      .where(eq(historicalPrices.ticker, ticker))
      .orderBy(desc(historicalPrices.date))
      .limit(limit);
    return rows
      .map((r) => ({ date: r.date, close: r.adj ?? r.close }))
      .reverse();
  } catch {
    return [];
  }
}

async function getLatestEconomicValue(seriesId: string): Promise<{ value: number; date: string } | null> {
  try {
    const rows = await db
      .select()
      .from(economicData)
      .where(eq(economicData.seriesId, seriesId))
      .orderBy(desc(economicData.date))
      .limit(1);
    if (rows.length === 0) return null;
    return { value: rows[0].value, date: rows[0].date };
  } catch {
    return null;
  }
}

/** DB 데이터로 5개 시그널 산출. 데이터 없으면 unknown. */
export async function computeStageSignals(): Promise<SignalReading[]> {
  const [qqq, vix, hy, liq] = await Promise.all([
    getPriceSeries("QQQ"),
    getPriceSeries("^VIX", 5),
    getLatestEconomicValue(HY_SPREAD_SERIES),
    getRealTimeLiquidityState(),
  ]);

  // 나스닥 추세 (200일선 이격도) + 고점 대비 낙폭
  let trendVal: number | null = null;
  let ddVal: number | null = null;
  let priceAsOf: string | null = null;
  if (qqq.length > 0) {
    priceAsOf = qqq[qqq.length - 1].date;
    const last = qqq[qqq.length - 1].close;
    const window = qqq.slice(-200);
    if (window.length >= 50) {
      const ma = window.reduce((s, p) => s + p.close, 0) / window.length;
      trendVal = ((last - ma) / ma) * 100;
    }
    const high = Math.max(...qqq.slice(-252).map((p) => p.close));
    ddVal = high > 0 ? Math.max(0, ((high - last) / high) * 100) : null;
  }

  const vixVal = vix.length > 0 ? vix[vix.length - 1].close : null;
  const vixAsOf = vix.length > 0 ? vix[vix.length - 1].date : null;

  return [
    buildReading("nasdaq_trend", trendVal, priceAsOf),
    buildReading("drawdown", ddVal, priceAsOf),
    buildReading("volatility", vixVal, vixAsOf),
    buildReading("credit_spread", hy?.value ?? null, hy?.date ?? null),
    buildReading("liquidity", liq === "expanding" ? 1 : 0, null, liq === "expanding" ? "healthy" : "caution"),
  ];
}

export async function getStageTransitions(limit = 20): Promise<StageTransition[]> {
  try {
    const rows = await db
      .select()
      .from(stageTransitions)
      .orderBy(desc(stageTransitions.date))
      .limit(limit);
    return rows.map((r) => ({
      date: r.date,
      fromStage: (r.fromStage as StageId | null) ?? null,
      toStage: r.toStage as StageId,
      reason: r.reason ?? "",
      confidence: r.confidence ?? 0,
    }));
  } catch {
    return [];
  }
}

/** 작전 본부 전체 상태: 설정 + 시그널 + 단계 판정 + 전환 이력 */
export async function getCampaignState(): Promise<{
  config: CampaignConfig;
  signals: SignalReading[];
  assessment: StageAssessment;
  transitions: StageTransition[];
}> {
  const [config, signals, transitions] = await Promise.all([
    getCampaignConfig(),
    computeStageSignals(),
    getStageTransitions(),
  ]);

  const previousStageId = transitions.length > 0 ? transitions[0].toStage : null;
  const auto = determineStage(signals, previousStageId);

  let assessment = auto;
  if (!config.autoDetect && config.manualStageId && STAGES[config.manualStageId]) {
    assessment = {
      ...auto,
      stageId: config.manualStageId,
      isAuto: false,
      rationale: ["수동으로 고정된 단계입니다.", ...auto.rationale],
    };
  }

  return { config, signals, assessment, transitions };
}
