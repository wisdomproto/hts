export type AssetClass = "stocks" | "bonds" | "realestate" | "commodities" | "crypto" | "cash";

export type Country = {
  code: string;
  name: string;
  nameKo: string;
  flag: string;
  isActive: boolean;
  weightOverride: number | null;
};

export type Asset = {
  id: number;
  ticker: string;
  name: string;
  assetClass: AssetClass;
  country: string;
  maturity?: string;
  isActive: boolean;
  sortOrder: number;
};

export type AllocationItem = {
  ticker: string;
  name: string;
  assetClass: AssetClass;
  country: string;
  weightPct: number;
  amount: number;
};

export type Allocation = {
  id: number;
  regimeId: string;
  totalAmount: number;
  riskLevel: number;
  items: AllocationItem[];
  createdAt: string;
};

export type RegimeAllocationTemplate = {
  regimeId: string;
  stocks: number;
  bonds: number;
  realestate: number;
  commodities: number;
  crypto: number;
  cash: number;
};

export type RiskLevel = 1 | 2 | 3 | 4 | 5;
