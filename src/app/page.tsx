import { RegimeExplorer } from "@/components/regime/regime-explorer";
import { GlassCard } from "@/components/shared/glass-card";
import { SectionHeader } from "@/components/shared/section-header";
import { DashboardPortfolioTabs } from "@/components/dashboard/dashboard-portfolio-tabs";
import { ASSET_CLASS_COLORS_HEX, ASSET_CLASS_LABELS, DEFAULT_COUNTRIES } from "@/lib/constants";
import { formatCurrencyFull, formatPercent, formatChange, formatRelativeTime } from "@/lib/format";
import { REGIMES, REGIME_ALLOCATION_TEMPLATES } from "@/lib/regimes";
import { getCurrentRegime, getLatestAllocation, getComputedIndicators, getRecentNews, getAllRegimes, getLiquiditySignals } from "@/lib/db";
import type { RegimeId } from "@/types/regime";
import type { AssetClass } from "@/types/portfolio";
import { RegimeInfoPopup } from "@/components/regime/regime-info-popup";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [currentRegime, allocationData, indicators, news, allRegimes, liquiditySignals] = await Promise.all([
    getCurrentRegime("US"),
    getLatestAllocation(),
    getComputedIndicators(),
    getRecentNews(5),
    getAllRegimes(),
    getLiquiditySignals(),
  ]);

  const regimeId = (currentRegime?.regimeName ?? "goldilocks") as RegimeId;
  const regime = REGIMES[regimeId] ?? REGIMES.goldilocks;

  const { items: allocationItems } = allocationData;
  const totalAmount = allocationData.allocation?.totalAmount ?? 100_000_000;

  // Group indicators by country
  const indicatorsByCountry = new Map<string, { growth?: number; inflation?: number }>();
  for (const ind of indicators) {
    const existing = indicatorsByCountry.get(ind.country) ?? {};
    if (ind.axis === "growth") existing.growth = ind.value;
    if (ind.axis === "inflation") existing.inflation = ind.value;
    indicatorsByCountry.set(ind.country, existing);
  }

  // Group allocation by asset class for summary
  const allocationByClass = new Map<string, number>();
  for (const item of allocationItems) {
    const current = allocationByClass.get(item.assetClass) ?? 0;
    allocationByClass.set(item.assetClass, current + item.weightPct);
  }
  const allocatedPct = Array.from(allocationByClass.values()).reduce((a, b) => a + b, 0);
  if (allocatedPct < 100) {
    allocationByClass.set("cash", Math.round((100 - allocatedPct) * 100) / 100);
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* [A] Regime Explorer — 8개 레짐 탭 */}
      <RegimeExplorer currentRegimeId={regimeId} />

      {/* [B] Country Indicators — horizontal strip */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        {DEFAULT_COUNTRIES.map((country) => {
          const data = indicatorsByCountry.get(country.code);
          const cr = allRegimes[country.code];
          const crName = cr?.regimeName as RegimeId | undefined;
          const crObj = crName ? REGIMES[crName] : null;
          return (
            <GlassCard key={country.code} hover className="!p-3 shrink-0 min-w-[148px] flex-1">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-base">{country.flag}</span>
                <span className="text-sm font-medium text-text-primary">{country.nameKo}</span>
              </div>
              {crObj && crName && (
                <RegimeInfoPopup regimeId={crName}>
                  <div
                    className="text-[10px] px-1.5 py-0.5 rounded-full mb-1.5 inline-block cursor-pointer hover:opacity-80"
                    style={{
                      background: `linear-gradient(135deg, ${crObj.gradientFrom}20, ${crObj.gradientTo}20)`,
                      color: crObj.gradientFrom,
                    }}
                  >
                    {crObj.nameKo}
                  </div>
                </RegimeInfoPopup>
              )}
              <div className="space-y-0.5">
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">GDP</span>
                  <span className={`font-mono ${data?.growth != null ? (data.growth > 0 ? "text-positive" : "text-negative") : "text-text-muted"}`}>
                    {data?.growth != null ? formatChange(data.growth) : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">CPI</span>
                  <span className={`font-mono ${data?.inflation != null ? (data.inflation > 3 ? "text-negative" : data.inflation > 2 ? "text-warning" : "text-positive") : "text-text-muted"}`}>
                    {data?.inflation != null ? formatPercent(data.inflation) : "N/A"}
                  </span>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* [C] + [D] Investment + Portfolio Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard>
          <h3 className="text-sm font-medium text-text-muted mb-3">투자 금액</h3>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-3xl font-bold font-mono tabular-nums text-text-primary">
              {formatCurrencyFull(totalAmount)}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-bg-overlay rounded-lg p-3">
              <p className="text-xs text-text-muted">자산 수</p>
              <p className="text-lg font-semibold text-text-primary">{allocationItems.length}</p>
            </div>
            <div className="bg-bg-overlay rounded-lg p-3">
              <p className="text-xs text-text-muted">현재 레짐</p>
              <p className="text-sm font-semibold" style={{ color: regime.gradientFrom }}>
                {regime.nameKo}
              </p>
            </div>
            <div className="bg-bg-overlay rounded-lg p-3">
              <p className="text-xs text-text-muted">국가</p>
              <p className="text-lg font-semibold text-text-primary">{Object.keys(allRegimes).length}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="text-sm font-medium text-text-muted mb-3">자산군별 배분</h3>
          <div className="space-y-2.5">
            {Array.from(allocationByClass.entries())
              .sort((a, b) => b[1] - a[1])
              .map(([cls, pct]) => (
                <div key={cls} className="flex items-center gap-3">
                  <span className="text-xs text-text-secondary w-14 shrink-0">
                    {ASSET_CLASS_LABELS[cls as AssetClass]?.nameKo ?? cls}
                  </span>
                  <div className="flex-1 h-3 bg-bg-overlay rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: ASSET_CLASS_COLORS_HEX[cls as keyof typeof ASSET_CLASS_COLORS_HEX] ?? "#94a3b8",
                      }}
                    />
                  </div>
                  <span className="text-xs font-mono tabular-nums text-text-primary w-10 text-right">
                    {formatPercent(pct)}
                  </span>
                </div>
              ))}
          </div>
        </GlassCard>
      </div>

      {/* [E] Portfolio Detail */}
      <div>
        <SectionHeader title="포트폴리오 배분 상세" viewAllHref="/portfolio" />
        <DashboardPortfolioTabs items={allocationItems} totalAmount={totalAmount} />
      </div>

      {/* [F] News */}
      <div>
        <SectionHeader title="최근 뉴스" viewAllHref="/news" />
        <GlassCard>
          {news.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">뉴스가 없습니다.</p>
          ) : (
            <div className="space-y-4">
              {news.map((a) => (
                <div key={a.id} className="flex items-start justify-between gap-4 pb-4 border-b border-border-subtle/50 last:border-0 last:pb-0">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary leading-relaxed">{a.title}</p>
                    {a.summary && <p className="text-xs text-text-secondary mt-1 line-clamp-2">{a.summary}</p>}
                    <p className="text-xs text-text-muted mt-1">{a.source} &middot; {formatRelativeTime(a.publishedAt)}</p>
                  </div>
                  <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${a.sentiment === "bullish" || a.sentiment === "very_bullish" ? "bg-positive" : a.sentiment === "bearish" || a.sentiment === "very_bearish" ? "bg-negative" : "bg-text-muted"}`} />
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
