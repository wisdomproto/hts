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
  capexData,
} from "@db/schema";
import { desc, eq } from "drizzle-orm";
import { deriveRegimeName } from "@/lib/regimes";
import { buildReading } from "@/lib/signals";
import { determineStage, STAGES } from "@/lib/stages";
import type {
  CampaignConfig,
  SignalReading,
  SignalStatus,
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

/** 하이퍼스케일러 capex YoY 증가율 + 가속/감속 → 시그널 1개 */
async function getCapexReading(): Promise<{ value: number | null; status: SignalStatus; asOf: string | null }> {
  let rows: { company: string; period: string; capex: number }[];
  try {
    rows = await db
      .select({ company: capexData.company, period: capexData.period, capex: capexData.capex })
      .from(capexData);
  } catch {
    return { value: null, status: "unknown", asOf: null };
  }
  if (rows.length === 0) return { value: null, status: "unknown", asOf: null };

  // 캘린더 분기별 합계 (MSFT 등 회계분기도 캘린더 분기말에 정렬됨)
  const byQuarter = new Map<string, { sum: number; count: number; end: string }>();
  for (const r of rows) {
    const d = new Date(r.period);
    const key = `${d.getUTCFullYear()}-Q${Math.floor(d.getUTCMonth() / 3) + 1}`;
    const e = byQuarter.get(key) ?? { sum: 0, count: 0, end: r.period };
    e.sum += r.capex;
    e.count += 1;
    if (r.period > e.end) e.end = r.period;
    byQuarter.set(key, e);
  }

  const totalOf = (key: string): number | undefined => {
    const e = byQuarter.get(key);
    return e && e.count >= 3 ? e.sum : undefined;
  };
  const prevYearKey = (key: string) => {
    const [y, q] = key.split("-");
    return `${Number(y) - 1}-${q}`;
  };
  const prevQuarterKey = (key: string) => {
    const [y, q] = key.split("-Q");
    const qn = Number(q);
    return qn > 1 ? `${y}-Q${qn - 1}` : `${Number(y) - 1}-Q4`;
  };
  const yoyOf = (key: string): number | null => {
    const cur = totalOf(key);
    const prev = totalOf(prevYearKey(key));
    if (cur == null || prev == null || prev === 0) return null;
    return ((cur - prev) / prev) * 100;
  };

  const validKeys = [...byQuarter.entries()]
    .filter(([, v]) => v.count >= 3)
    .map(([k]) => k)
    .sort((a, b) => {
      const oa = Number(a.split("-Q")[0]) * 4 + Number(a.split("-Q")[1]);
      const ob = Number(b.split("-Q")[0]) * 4 + Number(b.split("-Q")[1]);
      return oa - ob;
    });
  if (validKeys.length === 0) return { value: null, status: "unknown", asOf: null };

  const latestKey = validKeys[validKeys.length - 1];
  const yoyNow = yoyOf(latestKey);
  const yoyPrev = yoyOf(prevQuarterKey(latestKey));
  const accel = yoyNow != null && yoyPrev != null ? yoyNow - yoyPrev : null;
  const asOf = byQuarter.get(latestKey)?.end ?? null;

  let status: SignalStatus = "unknown";
  if (yoyNow != null) {
    if (yoyNow < 0) status = "stress";
    else if (accel != null && accel <= -8) status = "caution";
    else if (yoyNow >= 40) status = "euphoric";
    else status = "healthy";
  }

  return { value: yoyNow, status, asOf };
}

/** DB 데이터로 6개 시그널 산출. 데이터 없으면 unknown. */
export async function computeStageSignals(): Promise<SignalReading[]> {
  const [qqq, vix, hy, liq, capex] = await Promise.all([
    getPriceSeries("QQQ"),
    getPriceSeries("^VIX", 5),
    getLatestEconomicValue(HY_SPREAD_SERIES),
    getRealTimeLiquidityState(),
    getCapexReading(),
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
    buildReading("hyperscaler_capex", capex.value, capex.asOf, capex.status),
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
