export type EconomicDataPoint = {
  date: string;
  value: number;
};

export type EconomicSeries = {
  seriesId: string;
  name: string;
  country: string;
  category: "growth" | "inflation" | "liquidity";
  axis: "growth" | "inflation" | "liquidity";
  data: EconomicDataPoint[];
  latestValue: number;
  previousValue: number;
  change: number;
  unit: string;
};

export type CountryEconomicData = {
  country: string;
  growth: EconomicSeries[];
  inflation: EconomicSeries[];
  liquidity: EconomicSeries[];
};

export type TimeRange = "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y" | "MAX";
