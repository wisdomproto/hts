"use client";

import { useState } from "react";
import { REGIMES, REGIME_ALLOCATION_TEMPLATES } from "@/lib/regimes";
import { ASSET_CLASS_LABELS, ASSET_CLASS_COLORS_HEX } from "@/lib/constants";
import type { RegimeId } from "@/types/regime";
import type { AssetClass } from "@/types/portfolio";
import {
  TrendingUp,
  TrendingDown,
  Droplets,
  Flame,
  Snowflake,
  Zap,
  Shield,
  AlertTriangle,
  Sun,
} from "lucide-react";

const REGIME_ICONS: Record<RegimeId, React.ReactNode> = {
  goldilocks: <Sun className="w-4 h-4" />,
  disinflation_tightening: <Snowflake className="w-4 h-4" />,
  inflation_boom: <Flame className="w-4 h-4" />,
  overheating: <AlertTriangle className="w-4 h-4" />,
  stagflation_lite: <Zap className="w-4 h-4" />,
  stagflation: <AlertTriangle className="w-4 h-4" />,
  reflation: <Droplets className="w-4 h-4" />,
  deflation_crisis: <Shield className="w-4 h-4" />,
};

const REGIME_DETAILS: Record<RegimeId, { subtitle: string; strategy: string; keyAssets: string }> = {
  goldilocks: {
    subtitle: "고성장 · 저물가 · 유동성 확장",
    strategy: "위험자산 적극 투자. 주식 비중 최대화, 크립토·리츠 등 성장성 자산 확대.",
    keyAssets: "SPY, QQQ, IBIT, VNQ",
  },
  disinflation_tightening: {
    subtitle: "고성장 · 저물가 · 유동성 축소",
    strategy: "퀄리티 주식 중심. 긴축에 대비해 채권 비중 확대, 투기적 자산 축소.",
    keyAssets: "SPY, IEF, TLT, BNDX",
  },
  inflation_boom: {
    subtitle: "고성장 · 고물가 · 유동성 확장",
    strategy: "인플레 헤지 자산 집중. 원자재·금·크립토 비중 확대, 채권 최소화.",
    keyAssets: "GLD, CPER, USO, IBIT",
  },
  overheating: {
    subtitle: "고성장 · 고물가 · 유동성 축소",
    strategy: "방어적 전환. 금·원자재 유지, 현금 비중 확대, 리스크 자산 축소.",
    keyAssets: "GLD, USO, SHY, 현금",
  },
  stagflation_lite: {
    subtitle: "저성장 · 고물가 · 유동성 확장",
    strategy: "금·원자재 중심 방어. 유동성 확장이 완충 역할, 소량 리스크 자산 유지.",
    keyAssets: "GLD, CPER, IBIT, IEF",
  },
  stagflation: {
    subtitle: "저성장 · 고물가 · 유동성 축소",
    strategy: "최대 방어 모드. 금·현금 집중, 주식·크립토 최소화. 가장 위험한 환경.",
    keyAssets: "GLD, 현금, SHY, USO",
  },
  reflation: {
    subtitle: "저성장 · 저물가 · 유동성 확장",
    strategy: "장기채 강세 구간. 국채 비중 최대화, 경기 회복 기대 리플레이션 트레이드.",
    keyAssets: "TLT, IEF, BNDX, SPY",
  },
  deflation_crisis: {
    subtitle: "저성장 · 저물가 · 유동성 축소",
    strategy: "안전자산 올인. 현금·최고품질 국채만 보유, 거의 모든 리스크 자산 회피.",
    keyAssets: "현금, TLT, IEF, SHY",
  },
};

type RegimeExplorerProps = {
  currentRegimeId?: RegimeId;
};

export function RegimeExplorer({ currentRegimeId }: RegimeExplorerProps) {
  const [selectedId, setSelectedId] = useState<RegimeId>(currentRegimeId ?? "goldilocks");
  const regime = REGIMES[selectedId];
  const details = REGIME_DETAILS[selectedId];
  const allocation = REGIME_ALLOCATION_TEMPLATES[selectedId];

  const allRegimeIds = Object.keys(REGIMES) as RegimeId[];

  return (
    <div className="glass rounded-xl overflow-hidden">
      {/* Tab bar */}
      <div className="flex overflow-x-auto border-b border-border-subtle/50 bg-bg-overlay/30">
        {allRegimeIds.map((id) => {
          const r = REGIMES[id];
          const isSelected = id === selectedId;
          const isCurrent = id === currentRegimeId;
          return (
            <button
              key={id}
              onClick={() => setSelectedId(id)}
              className={`
                relative flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap
                transition-all duration-200 shrink-0
                ${isSelected
                  ? "text-text-primary"
                  : "text-text-muted hover:text-text-secondary hover:bg-white/[0.02]"
                }
              `}
            >
              <span style={{ color: isSelected ? r.gradientFrom : undefined }}>
                {REGIME_ICONS[id]}
              </span>
              <span>{r.nameKo}</span>
              {isCurrent && (
                <span className="ml-1 w-1.5 h-1.5 rounded-full bg-positive animate-pulse" />
              )}
              {isSelected && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ background: `linear-gradient(90deg, ${r.gradientFrom}, ${r.gradientTo})` }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: regime info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${regime.gradientFrom}20, ${regime.gradientTo}20)`,
                  color: regime.gradientFrom,
                }}
              >
                {REGIME_ICONS[selectedId]}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3
                    className="text-lg font-bold"
                    style={{
                      background: `linear-gradient(135deg, ${regime.gradientFrom}, ${regime.gradientTo})`,
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    {regime.nameKo}
                  </h3>
                  <span className="text-xs text-text-muted font-mono">{regime.name}</span>
                  {selectedId === currentRegimeId && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-positive/10 text-positive font-medium">
                      현재
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted">{details.subtitle}</p>
              </div>
            </div>

            {/* 3-axis pills */}
            <div className="flex flex-wrap gap-2 mb-4">
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${regime.growth === "high" ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative"}`}>
                {regime.growth === "high" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                성장 {regime.growth === "high" ? "↑" : "↓"}
              </div>
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${regime.inflation === "high" ? "bg-warning/10 text-warning" : "bg-positive/10 text-positive"}`}>
                {regime.inflation === "high" ? <Flame className="w-3 h-3" /> : <Snowflake className="w-3 h-3" />}
                물가 {regime.inflation === "high" ? "↑" : "↓"}
              </div>
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${regime.liquidity === "expanding" ? "bg-info/10 text-info" : "bg-negative/10 text-negative"}`}>
                <Droplets className="w-3 h-3" />
                유동성 {regime.liquidity === "expanding" ? "확장" : "축소"}
              </div>
            </div>

            {/* Strategy */}
            <div className="bg-bg-overlay rounded-lg p-3 mb-3">
              <p className="text-xs text-text-muted mb-1 font-medium">투자 전략</p>
              <p className="text-sm text-text-secondary leading-relaxed">{details.strategy}</p>
            </div>

            {/* Key assets */}
            <div className="bg-bg-overlay rounded-lg p-3">
              <p className="text-xs text-text-muted mb-1 font-medium">핵심 자산</p>
              <div className="flex flex-wrap gap-1.5">
                {details.keyAssets.split(", ").map((asset) => (
                  <span
                    key={asset}
                    className="text-xs px-2 py-0.5 rounded-md bg-white/5 text-text-primary font-mono"
                  >
                    {asset}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right: allocation bar chart */}
          <div className="lg:w-64 shrink-0">
            <p className="text-xs text-text-muted mb-3 font-medium">기본 자산 배분</p>
            <div className="space-y-2">
              {Object.entries(allocation)
                .sort(([, a], [, b]) => b - a)
                .map(([cls, pct]) => (
                  <div key={cls} className="group">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-xs text-text-secondary">
                        {ASSET_CLASS_LABELS[cls as AssetClass]?.nameKo ?? cls}
                      </span>
                      <span className="text-xs font-mono tabular-nums text-text-primary">
                        {pct}%
                      </span>
                    </div>
                    <div className="h-2 bg-bg-overlay rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: ASSET_CLASS_COLORS_HEX[cls as keyof typeof ASSET_CLASS_COLORS_HEX] ?? "#94a3b8",
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
