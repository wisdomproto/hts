import { SectionHeader } from "@/components/shared/section-header";
import { GlassCard } from "@/components/shared/glass-card";
import { REGIMES } from "@/lib/regimes";
import { formatCurrencyFull } from "@/lib/format";
import { getLatestAllocation, getAllRegimes, getCurrentRegime } from "@/lib/db";
import { DEFAULT_COUNTRIES } from "@/lib/constants";
import type { RegimeId } from "@/types/regime";
import { PortfolioTabs } from "@/components/portfolio/portfolio-tabs";
import { RegimeInfoPopup } from "@/components/regime/regime-info-popup";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const [allocationData, allRegimes, currentRegime] = await Promise.all([
    getLatestAllocation(),
    getAllRegimes(),
    getCurrentRegime("US"),
  ]);

  const { items, allocation } = allocationData;
  const totalAmount = allocation?.totalAmount ?? 100_000_000;
  const regimeId = (currentRegime?.regimeName ?? "goldilocks") as RegimeId;
  const regime = REGIMES[regimeId] ?? REGIMES.goldilocks;

  // Serialize allRegimes for client component
  const allRegimesSerialized: Record<string, { regimeName: string }> = {};
  for (const [country, r] of Object.entries(allRegimes)) {
    allRegimesSerialized[country] = { regimeName: r.regimeName };
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <SectionHeader
        title="포트폴리오 상세"
        description={`총 투자금: ${formatCurrencyFull(totalAmount)}`}
      />

      {/* Regime badge */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-text-muted">현재 레짐:</span>
        <RegimeInfoPopup regimeId={regimeId}>
          <span
            className="text-sm font-semibold px-3 py-1.5 rounded-full cursor-pointer hover:opacity-80 transition-opacity"
            style={{
              background: `linear-gradient(135deg, ${regime.gradientFrom}20, ${regime.gradientTo}20)`,
              color: regime.gradientFrom,
            }}
          >
            {regime.nameKo} ↗
          </span>
        </RegimeInfoPopup>
      </div>

      {items.length === 0 ? (
        <GlassCard>
          <div className="text-center py-16">
            <p className="text-text-muted text-lg mb-2">배분 데이터가 없습니다</p>
            <p className="text-text-muted text-sm">
              데이터 파이프라인을 먼저 실행해주세요: <code className="bg-bg-overlay px-2 py-1 rounded text-xs">cd data && python run_pipeline.py</code>
            </p>
          </div>
        </GlassCard>
      ) : (
        <>
          <PortfolioTabs
            items={items.map((item) => ({
              ticker: item.ticker,
              assetClass: item.assetClass,
              country: item.country,
              weightPct: item.weightPct,
              amount: item.amount,
            }))}
            totalAmount={totalAmount}
            regimeNameKo={regime.nameKo}
            regimeColor={regime.gradientFrom}
            allRegimes={allRegimesSerialized}
          />

          {/* Country regimes */}
          <GlassCard>
            <h3 className="text-sm font-medium text-text-muted mb-4">국가별 현재 레짐</h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(allRegimes).map(([country, r]) => {
                const rObj = REGIMES[(r.regimeName as RegimeId)] ?? REGIMES.goldilocks;
                const countryInfo = DEFAULT_COUNTRIES.find((c) => c.code === country);
                return (
                  <RegimeInfoPopup key={country} regimeId={r.regimeName as RegimeId}>
                    <div
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border-subtle hover:border-border-subtle/80 transition-colors"
                      style={{ background: `linear-gradient(135deg, ${rObj.gradientFrom}10, ${rObj.gradientTo}10)` }}
                    >
                      <span className="text-lg">{countryInfo?.flag ?? "🌐"}</span>
                      <div className="text-left">
                        <p className="text-xs text-text-muted">{countryInfo?.nameKo ?? country}</p>
                        <p className="text-sm font-semibold" style={{ color: rObj.gradientFrom }}>{rObj.nameKo}</p>
                      </div>
                    </div>
                  </RegimeInfoPopup>
                );
              })}
            </div>
          </GlassCard>
        </>
      )}
    </div>
  );
}
