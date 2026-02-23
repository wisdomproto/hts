import type { Regime, RegimeId } from "@/types/regime";

export const REGIMES: Record<RegimeId, Regime> = {
  goldilocks: {
    id: "goldilocks",
    name: "Goldilocks",
    nameKo: "골디락스",
    growth: "high",
    inflation: "low",
    liquidity: "expanding",
    color: "var(--color-regime-goldilocks)",
    gradientFrom: "#10b981",
    gradientTo: "#34d399",
    description: "고성장 + 저물가 + 유동성 확장. 위험자산에 가장 유리한 환경.",
  },
  disinflation_tightening: {
    id: "disinflation_tightening",
    name: "Disinflation Tightening",
    nameKo: "디스인플레 긴축",
    growth: "high",
    inflation: "low",
    liquidity: "contracting",
    color: "var(--color-regime-disinflation)",
    gradientFrom: "#06b6d4",
    gradientTo: "#22d3ee",
    description: "고성장 + 저물가 + 유동성 축소. 성장주 선별, 퀄리티 우선.",
  },
  inflation_boom: {
    id: "inflation_boom",
    name: "Inflation Boom",
    nameKo: "인플레 가속",
    growth: "high",
    inflation: "high",
    liquidity: "expanding",
    color: "var(--color-regime-inflation-boom)",
    gradientFrom: "#f59e0b",
    gradientTo: "#fbbf24",
    description: "고성장 + 고물가 + 유동성 확장. 원자재/TIPS 비중 확대.",
  },
  overheating: {
    id: "overheating",
    name: "Overheating",
    nameKo: "과열 긴축",
    growth: "high",
    inflation: "high",
    liquidity: "contracting",
    color: "var(--color-regime-overheating)",
    gradientFrom: "#f97316",
    gradientTo: "#fb923c",
    description: "고성장 + 고물가 + 유동성 축소. 현금 비중 확대, 방어적.",
  },
  stagflation_lite: {
    id: "stagflation_lite",
    name: "Stagflation Lite",
    nameKo: "스태그 완화",
    growth: "low",
    inflation: "high",
    liquidity: "expanding",
    color: "var(--color-regime-stagflation-lite)",
    gradientFrom: "#a855f7",
    gradientTo: "#c084fc",
    description: "저성장 + 고물가 + 유동성 확장. 금/원자재 + 방어주.",
  },
  stagflation: {
    id: "stagflation",
    name: "Stagflation",
    nameKo: "스태그플레이션",
    growth: "low",
    inflation: "high",
    liquidity: "contracting",
    color: "var(--color-regime-stagflation)",
    gradientFrom: "#dc2626",
    gradientTo: "#ef4444",
    description: "저성장 + 고물가 + 유동성 축소. 가장 위험한 환경. 금/현금 중심.",
  },
  reflation: {
    id: "reflation",
    name: "Reflation",
    nameKo: "침체 완화",
    growth: "low",
    inflation: "low",
    liquidity: "expanding",
    color: "var(--color-regime-reflation)",
    gradientFrom: "#6366f1",
    gradientTo: "#818cf8",
    description: "저성장 + 저물가 + 유동성 확장. 장기국채/IG크레딧 강세.",
  },
  deflation_crisis: {
    id: "deflation_crisis",
    name: "Deflation Crisis",
    nameKo: "디플레 경색",
    growth: "low",
    inflation: "low",
    liquidity: "contracting",
    color: "var(--color-regime-deflation)",
    gradientFrom: "#64748b",
    gradientTo: "#94a3b8",
    description: "저성장 + 저물가 + 유동성 축소. 현금/최고품질 국채만.",
  },
};

// Regime allocation templates (% per asset class, sums to 100)
// Design principles:
// - High inflation → commodities (gold/copper/oil) as inflation hedge, NOT cash
// - Cash loses purchasing power during inflation — minimize in inflationary regimes
// - Low growth → bonds (especially long-term) for safety + yield
// - Expanding liquidity → more risk assets (stocks, crypto, realestate)
// - Contracting liquidity → reduce risk, increase defensive (bonds, gold)
export const REGIME_ALLOCATION_TEMPLATES: Record<
  RegimeId,
  { stocks: number; bonds: number; realestate: number; commodities: number; crypto: number; cash: number }
> = {
  // High growth + Low inflation + Expanding liquidity → best for risk assets
  goldilocks:              { stocks: 50, bonds: 15, realestate: 10, commodities: 5,  crypto: 10, cash: 10 },
  // High growth + Low inflation + Contracting liquidity → quality stocks + bonds
  disinflation_tightening: { stocks: 35, bonds: 30, realestate: 8,  commodities: 7,  crypto: 5,  cash: 15 },
  // High growth + High inflation + Expanding liquidity → commodities boom, stocks OK
  inflation_boom:          { stocks: 20, bonds: 5,  realestate: 8,  commodities: 40, crypto: 12, cash: 15 },
  // High growth + High inflation + Contracting liquidity → gold/commodities, reduce risk
  overheating:             { stocks: 12, bonds: 10, realestate: 5,  commodities: 40, crypto: 5,  cash: 28 },
  // Low growth + High inflation + Expanding liquidity → gold/commodities + some risk
  stagflation_lite:        { stocks: 8,  bonds: 10, realestate: 5,  commodities: 45, crypto: 7,  cash: 25 },
  // Low growth + High inflation + Contracting liquidity → max defensive, gold heavy
  stagflation:             { stocks: 5,  bonds: 10, realestate: 2,  commodities: 50, crypto: 3,  cash: 30 },
  // Low growth + Low inflation + Expanding liquidity → long bonds rally, reflation trade
  reflation:               { stocks: 25, bonds: 35, realestate: 10, commodities: 8,  crypto: 7,  cash: 15 },
  // Low growth + Low inflation + Contracting liquidity → safety, long bonds + cash
  deflation_crisis:        { stocks: 5,  bonds: 40, realestate: 2,  commodities: 8,  crypto: 2,  cash: 43 },
};

// Regime-specific country weights for stocks allocation (sums to 100)
// Each regime adjusts country exposure based on economic conditions
// Design principles:
// - Goldilocks: US leads + broad EM exposure (risk-on)
// - Inflation regimes: favor commodity exporters (IN resources, KR industrial)
// - Deflation/crisis: US safe haven + JP yen hedge, minimal EM
// - Expanding liquidity: more EM (risk-on), contracting: concentrate developed
export const REGIME_COUNTRY_WEIGHTS: Record<
  RegimeId,
  { US: number; EU: number; JP: number; KR: number; CN: number; IN: number }
> = {
  goldilocks:              { US: 55, EU: 15, JP: 6, KR: 5, CN: 8, IN: 11 },
  disinflation_tightening: { US: 60, EU: 18, JP: 8, KR: 4, CN: 4, IN: 6 },
  inflation_boom:          { US: 40, EU: 12, JP: 5, KR: 8, CN: 10, IN: 25 },
  overheating:             { US: 55, EU: 15, JP: 10, KR: 5, CN: 5, IN: 10 },
  stagflation_lite:        { US: 45, EU: 10, JP: 8, KR: 7, CN: 8, IN: 22 },
  stagflation:             { US: 55, EU: 12, JP: 15, KR: 5, CN: 5, IN: 8 },
  reflation:               { US: 45, EU: 15, JP: 7, KR: 8, CN: 12, IN: 13 },
  deflation_crisis:        { US: 65, EU: 15, JP: 12, KR: 3, CN: 2, IN: 3 },
};

// Algorithm parameters: thresholds for regime determination
export const ALGORITHM_PARAMS = {
  growth: {
    usThreshold: 2.0,       // US GDP growth threshold (%)
    nonUsMethod: "vs_avg",   // "vs_avg" = compare to historical average
  },
  inflation: {
    thresholds: { US: 2.5, EU: 2.5, JP: 2.0, KR: 2.5, CN: 3.0, IN: 4.0 } as Record<string, number>,
    yoyLookback: 12,         // months for YoY CPI calculation
  },
  liquidity: {
    rule: "3-of-5",          // majority rule for liquidity signals
    signals: [
      { id: "WALCL", name: "Fed Balance Sheet", lookback: 12, condition: "recent >= older * 0.99" },
      { id: "RRPONTSYD", name: "Reverse Repo", lookback: 12, condition: "recent <= older (declining)" },
      { id: "NFCI", name: "Financial Conditions", lookback: 4, condition: "latest < 0" },
      { id: "BAMLH0A0HYM2", name: "HY Spread", lookback: 12, condition: "recent <= older (narrowing)" },
      { id: "SOFR", name: "SOFR Rate", lookback: 12, condition: "recent <= older (declining)" },
    ],
    minSignalsForExpanding: 3,
  },
  risk: {
    multipliers: {
      1: { stocks: 0.6, bonds: 1.4, realestate: 0.7, commodities: 0.8, crypto: 0.3, cash: 1.5 },
      2: { stocks: 0.8, bonds: 1.2, realestate: 0.85, commodities: 0.9, crypto: 0.6, cash: 1.3 },
      3: { stocks: 1.0, bonds: 1.0, realestate: 1.0, commodities: 1.0, crypto: 1.0, cash: 1.0 },
      4: { stocks: 1.2, bonds: 0.8, realestate: 1.15, commodities: 1.1, crypto: 1.4, cash: 0.7 },
      5: { stocks: 1.4, bonds: 0.6, realestate: 1.3, commodities: 1.2, crypto: 1.8, cash: 0.5 },
    } as Record<number, Record<string, number>>,
  },
  tickerWeights: {
    stocks: {
      SPY: { weight: 0.44, label: "S&P 500" },
      QQQ: { weight: 0.19, label: "NASDAQ 100" },
      VGK: { weight: 0.15, label: "FTSE Europe" },
      EWJ: { weight: 0.07, label: "MSCI Japan" },
      FXI: { weight: 0.06, label: "China Large-Cap" },
      INDA: { weight: 0.05, label: "MSCI India" },
      EWY: { weight: 0.04, label: "MSCI Korea" },
    } as Record<string, { weight: number; label: string }>,
    bonds: {
      SHY: { weight: 0.15, label: "1-3yr Treasury" },
      IEI: { weight: 0.20, label: "3-7yr Treasury" },
      IEF: { weight: 0.25, label: "7-10yr Treasury" },
      TLT: { weight: 0.20, label: "20+yr Treasury" },
      BNDX: { weight: 0.20, label: "Intl Bond" },
    } as Record<string, { weight: number; label: string }>,
    realestate: {
      VNQ: { weight: 0.60, label: "US REITs" },
      VNQI: { weight: 0.40, label: "Intl REITs" },
    } as Record<string, { weight: number; label: string }>,
    commodities: {
      GLD: { weight: 0.50, label: "Gold" },
      CPER: { weight: 0.25, label: "Copper" },
      USO: { weight: 0.25, label: "Crude Oil" },
    } as Record<string, { weight: number; label: string }>,
    crypto: {
      IBIT: { weight: 0.70, label: "Bitcoin ETF" },
      BITO: { weight: 0.30, label: "Bitcoin Futures" },
    } as Record<string, { weight: number; label: string }>,
  },
} as const;

// ─── Regime name derivation (single source of truth) ────────────────────────
// Used by db.ts, regime/route.ts, and any code that needs to map axes → regime name

export const REGIME_NAMES: Record<string, RegimeId> = {
  "high|low|expanding": "goldilocks",
  "high|low|contracting": "disinflation_tightening",
  "high|high|expanding": "inflation_boom",
  "high|high|contracting": "overheating",
  "low|high|expanding": "stagflation_lite",
  "low|high|contracting": "stagflation",
  "low|low|expanding": "reflation",
  "low|low|contracting": "deflation_crisis",
};

/**
 * Derive regime name from 3-axis states.
 * Central function — all TS code should use this instead of duplicating the mapping.
 */
export function deriveRegimeName(growth: string, inflation: string, liquidity: string): RegimeId {
  return REGIME_NAMES[`${growth}|${inflation}|${liquidity}`] ?? "goldilocks";
}

export function getRegimeFromAxes(
  growth: "high" | "low",
  inflation: "high" | "low",
  liquidity: "expanding" | "contracting"
): Regime {
  const match = Object.values(REGIMES).find(
    (r) => r.growth === growth && r.inflation === inflation && r.liquidity === liquidity
  );
  return match ?? REGIMES.goldilocks;
}
