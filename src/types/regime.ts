export type GrowthState = "high" | "low";
export type InflationState = "high" | "low";
export type LiquidityState = "expanding" | "contracting";

export type RegimeId =
  | "goldilocks"
  | "disinflation_tightening"
  | "inflation_boom"
  | "overheating"
  | "stagflation_lite"
  | "stagflation"
  | "reflation"
  | "deflation_crisis";

export type Regime = {
  id: RegimeId;
  name: string;
  nameKo: string;
  growth: GrowthState;
  inflation: InflationState;
  liquidity: LiquidityState;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  description: string;
};

export type RegimeDetection = {
  regime: Regime;
  country: string;
  date: string;
  growthValue: number;
  inflationValue: number;
  liquiditySignals: LiquiditySignal[];
  confidence: number;
};

export type LiquiditySignal = {
  name: string;
  direction: "easing" | "tightening";
  value: number;
  threshold: number;
};

export type AxisIndicator = {
  name: string;
  value: number;
  previousValue: number;
  change: number;
  date: string;
  unit: string;
};
