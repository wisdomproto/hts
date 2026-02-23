import { GlassCard } from "@/components/shared/glass-card";
import { SectionHeader } from "@/components/shared/section-header";
import { getComputedIndicators, getLiquiditySignals, getAllRegimes, getDistinctSeries } from "@/lib/db";
import { REGIMES } from "@/lib/regimes";
import { DEFAULT_COUNTRIES, COUNTRY_NAMES_KO } from "@/lib/constants";
import type { RegimeId } from "@/types/regime";
import { db } from "@db/index";
import { economicData } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { EconomyTable } from "@/components/economy/economy-table";

export const dynamic = "force-dynamic";

async function getSeriesLatestData(seriesId: string, limit: number = 12): Promise<{ date: string; value: number }[]> {
  try {
    return await db
      .select({ date: economicData.date, value: economicData.value })
      .from(economicData)
      .where(eq(economicData.seriesId, seriesId))
      .orderBy(desc(economicData.date))
      .limit(limit);
  } catch {
    return [];
  }
}

export default async function EconomyPage() {
  let indicators: Awaited<ReturnType<typeof getComputedIndicators>> = [];
  let liquiditySignals: Awaited<ReturnType<typeof getLiquiditySignals>> = [];
  let allRegimes: Awaited<ReturnType<typeof getAllRegimes>> = {};
  let distinctSeries: Awaited<ReturnType<typeof getDistinctSeries>> = [];

  try {
    [indicators, liquiditySignals, allRegimes, distinctSeries] = await Promise.all([
      getComputedIndicators(),
      getLiquiditySignals(),
      getAllRegimes(),
      getDistinctSeries(),
    ]);
  } catch (e) {
    console.error("Economy page data fetch error:", e);
  }

  // Fetch all series
  const seriesIds = [
    "A191RL1Q225SBEA", "CPIAUCSL", "PCEPILFE", "NFCI", "ANFCI",
    "BAMLH0A0HYM2", "BAMLC0A0CM", "SOFR", "WALCL", "RRPONTSYD",
    "CLVMNACSCAB1GQEA19", "CP0000EZ19M086NEST",
    "JPNGDPRQPSMEI", "FPCPITOTLZGJPN", "JPNCPIALLMINMEI",
    "NGDPRSAXDCKRQ", "KORCPIALLMINMEI",
    "CHNGDPRAPSMEI", "CHNCPIALLMINMEI",
    "INDGDPRQPSMEI", "INDCPIALLMINMEI",
    "ECBASSETSW", "JPNASSETS",
  ];
  const seriesResults = await Promise.all(seriesIds.map((id) => getSeriesLatestData(id, 12)));
  const seriesMap = new Map<string, { date: string; value: number }[]>();
  seriesIds.forEach((id, i) => seriesMap.set(id, seriesResults[i]));

  const easingCount = liquiditySignals.filter((s) => s.direction === "easing").length;
  const totalSignals = liquiditySignals.length;

  // Per-country indicators
  const indicatorsByCountry = new Map<string, { growth?: number; inflation?: number }>();
  for (const ind of indicators) {
    const existing = indicatorsByCountry.get(ind.country) ?? {};
    if (ind.axis === "growth") existing.growth = ind.value;
    if (ind.axis === "inflation") existing.inflation = ind.value;
    indicatorsByCountry.set(ind.country, existing);
  }

  // Helpers
  function sparkValues(seriesId: string): number[] {
    const data = seriesMap.get(seriesId) ?? [];
    return [...data].reverse().map((d) => d.value);
  }
  function latestVal(seriesId: string): number | null {
    return (seriesMap.get(seriesId) ?? [])[0]?.value ?? null;
  }
  function latestDate(seriesId: string): string | null {
    return (seriesMap.get(seriesId) ?? [])[0]?.date ?? null;
  }

  // Series config per country
  // gdp: growth rate series (already in % for JP/CN/IN, needs computation for EU/KR)
  // cpi: consumer price index series (raw index, YoY computed in computed_indicators)
  const countrySeriesConfig: Record<string, { gdp?: string; cpi?: string; centralBank?: string }> = {
    US: { gdp: "A191RL1Q225SBEA", cpi: "CPIAUCSL" },
    EU: { gdp: "CLVMNACSCAB1GQEA19", cpi: "CP0000EZ19M086NEST", centralBank: "ECBASSETSW" },
    JP: { gdp: "JPNGDPRQPSMEI", cpi: "FPCPITOTLZGJPN", centralBank: "JPNASSETS" },
    KR: { gdp: "NGDPRSAXDCKRQ", cpi: "KORCPIALLMINMEI" },
    CN: { gdp: "CHNGDPRAPSMEI", cpi: "CHNCPIALLMINMEI" },
    IN: { gdp: "INDGDPRQPSMEI", cpi: "INDCPIALLMINMEI" },
  };

  // Series that are already growth rate % — show raw value directly
  const growthRateSeries = new Set(["JPNGDPRQPSMEI", "CHNGDPRAPSMEI", "INDGDPRQPSMEI", "A191RL1Q225SBEA"]);

  const gdpSparkIds: Record<string, string> = {
    US: "A191RL1Q225SBEA", EU: "CLVMNACSCAB1GQEA19", JP: "JPNGDPRQPSMEI", KR: "NGDPRSAXDCKRQ", CN: "CHNGDPRAPSMEI", IN: "INDGDPRQPSMEI",
  };
  const cpiSparkIds: Record<string, string> = {
    US: "CPIAUCSL", EU: "CP0000EZ19M086NEST", JP: "JPNCPIALLMINMEI", KR: "KORCPIALLMINMEI", CN: "CHNCPIALLMINMEI", IN: "INDCPIALLMINMEI",
  };

  // Build country rows for client component
  const countryRows = DEFAULT_COUNTRIES.map((country) => {
    const regime = allRegimes[country.code];
    const regimeObj = regime ? REGIMES[regime.regimeName as RegimeId] : null;
    const indData = indicatorsByCountry.get(country.code);
    const config = countrySeriesConfig[country.code] ?? {};

    type SeriesItem = { title: string; value: number | null; date: string | null; unit: string; color: string; sparkData: number[]; description?: string };
    const series: SeriesItem[] = [];

    if (config.gdp) {
      // Use computed indicator value (growth rate %) instead of raw series value
      // Raw series may be GDP level (trillions) rather than growth rate
      const computedGrowth = indData?.growth;
      if (computedGrowth != null) {
        series.push({ title: "GDP 성장률", value: computedGrowth, date: latestDate(config.gdp), unit: "%", color: "#22c55e", sparkData: sparkValues(config.gdp) });
      } else if (growthRateSeries.has(config.gdp)) {
        // Series is already in % — safe to show raw value
        series.push({ title: "GDP 성장률", value: latestVal(config.gdp), date: latestDate(config.gdp), unit: "%", color: "#22c55e", sparkData: sparkValues(config.gdp) });
      } else {
        // GDP level — show as raw level, not %
        series.push({ title: "GDP (수준)", value: latestVal(config.gdp), date: latestDate(config.gdp), unit: "", color: "#22c55e", sparkData: sparkValues(config.gdp) });
      }
    }
    if (config.cpi) {
      // Use computed indicator value (CPI YoY %) instead of raw CPI index
      const computedInflation = indData?.inflation;
      if (computedInflation != null) {
        series.push({ title: "소비자물가 (CPI YoY)", value: computedInflation, date: latestDate(config.cpi), unit: "%", color: "#f59e0b", sparkData: sparkValues(config.cpi) });
      } else {
        series.push({ title: "소비자물가지수 (CPI)", value: latestVal(config.cpi), date: latestDate(config.cpi), unit: "index", color: "#f59e0b", sparkData: sparkValues(config.cpi) });
      }
    }
    if (config.centralBank) {
      series.push({ title: "중앙은행 대차대조표", value: latestVal(config.centralBank), date: latestDate(config.centralBank), unit: "백만", color: "#8b5cf6", sparkData: sparkValues(config.centralBank) });
    }

    if (country.code === "US") {
      series.push(
        { title: "Core PCE (근원 PCE)", value: latestVal("PCEPILFE"), date: latestDate("PCEPILFE"), unit: "index", color: "#f97316", sparkData: sparkValues("PCEPILFE") },
        { title: "NFCI (금융여건지수)", value: latestVal("NFCI"), date: latestDate("NFCI"), unit: "", color: "#6366f1", sparkData: sparkValues("NFCI"), description: "< 0 완화 / > 0 긴축" },
        { title: "하이일드 스프레드", value: latestVal("BAMLH0A0HYM2"), date: latestDate("BAMLH0A0HYM2"), unit: "%", color: "#ef4444", sparkData: sparkValues("BAMLH0A0HYM2") },
        { title: "SOFR 금리", value: latestVal("SOFR"), date: latestDate("SOFR"), unit: "%", color: "#06b6d4", sparkData: sparkValues("SOFR") },
        { title: "연준 대차대조표", value: latestVal("WALCL"), date: latestDate("WALCL"), unit: "백만$", color: "#8b5cf6", sparkData: sparkValues("WALCL") },
        { title: "역레포 (RRP)", value: latestVal("RRPONTSYD"), date: latestDate("RRPONTSYD"), unit: "십억$", color: "#a855f7", sparkData: sparkValues("RRPONTSYD") },
      );
    }

    return {
      countryCode: country.code,
      countryName: country.nameKo,
      flag: country.flag,
      regimeName: regimeObj?.nameKo ?? null,
      regimeColor: regimeObj?.gradientFrom ?? null,
      regimeColorTo: regimeObj?.gradientTo ?? null,
      growthState: regime?.growthState ?? null,
      inflationState: regime?.inflationState ?? null,
      liquidityState: regime?.liquidityState ?? null,
      growthValue: indData?.growth ?? null,
      inflationValue: indData?.inflation ?? null,
      gdpSparkData: sparkValues(gdpSparkIds[country.code] ?? ""),
      cpiSparkData: sparkValues(cpiSparkIds[country.code] ?? ""),
      series,
      liquiditySignals: country.code === "US" ? liquiditySignals.map((s) => ({
        name: s.signalName,
        direction: s.direction as "easing" | "tightening",
        rawValue: s.rawValue ?? 0,
      })) : undefined,
    };
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <SectionHeader title="경제 데이터" description="국가별 성장, 물가, 유동성 지표 및 레짐 판정 현황" />

      {/* 국가별 종합 판정 테이블 */}
      <GlassCard className="!p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">국가별 경제 지표 종합</h3>
            <span className="text-xs text-text-muted">행을 클릭하면 상세 보기</span>
          </div>
        </div>
        <EconomyTable countries={countryRows} />
      </GlassCard>

      {/* 미국 유동성 판정 */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary">🇺🇸 미국 유동성 판정 (3-of-5 규칙)</h3>
          <div className={`text-sm font-bold px-3 py-1 rounded-full ${easingCount >= 3 ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative"}`}>
            {easingCount}/{totalSignals} 완화 → {easingCount >= 3 ? "Expanding" : "Contracting"}
          </div>
        </div>
        {liquiditySignals.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {liquiditySignals.map((s) => {
              const isEasing = s.direction === "easing";
              const nameMap: Record<string, string> = {
                fed_balance_sheet: "연준 B/S", reverse_repo: "역레포", nfci: "NFCI", hy_spread: "HY 스프레드", sofr: "SOFR",
              };
              return (
                <div key={s.signalName} className={`rounded-xl p-3 text-center ${isEasing ? "bg-positive/5 border border-positive/20" : "bg-negative/5 border border-negative/20"}`}>
                  <p className="text-xs text-text-muted mb-1">{nameMap[s.signalName] ?? s.signalName}</p>
                  <p className="text-sm font-mono font-bold text-text-primary">{s.rawValue?.toFixed(2)}</p>
                  <p className={`text-xs font-semibold mt-1 ${isEasing ? "text-positive" : "text-negative"}`}>
                    {isEasing ? "✓ 완화" : "✗ 긴축"}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>

      {/* 수집 시리즈 */}
      <GlassCard>
        <h3 className="text-sm font-medium text-text-muted mb-3">수집된 데이터 시리즈 ({distinctSeries.length}개)</h3>
        <div className="flex flex-wrap gap-2">
          {distinctSeries.map((s) => (
            <span key={s.seriesId} className="text-xs px-2 py-1 bg-bg-overlay rounded text-text-secondary">
              {s.seriesId} ({COUNTRY_NAMES_KO[s.country] ?? s.country} / {s.category})
            </span>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
