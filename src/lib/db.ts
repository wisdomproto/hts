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
} from "@db/schema";
import { desc, eq } from "drizzle-orm";
import { deriveRegimeName } from "@/lib/regimes";

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
