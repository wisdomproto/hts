import type { AssetClass, Country } from "@/types/portfolio";

export const ASSET_CLASS_LABELS: Record<AssetClass, { name: string; nameKo: string; color: string }> = {
  stocks: { name: "Stocks", nameKo: "주식", color: "var(--color-asset-stocks)" },
  bonds: { name: "Bonds", nameKo: "채권", color: "var(--color-asset-bonds)" },
  realestate: { name: "Real Estate", nameKo: "부동산", color: "var(--color-asset-realestate)" },
  commodities: { name: "Commodities", nameKo: "현물", color: "var(--color-asset-commodities)" },
  crypto: { name: "Crypto", nameKo: "암호화폐", color: "var(--color-asset-crypto)" },
  cash: { name: "Cash", nameKo: "현금", color: "var(--color-asset-cash)" },
};

export const ASSET_CLASS_COLORS_HEX: Record<AssetClass, string> = {
  stocks: "#3b82f6",
  bonds: "#8b5cf6",
  realestate: "#f59e0b",
  commodities: "#f97316",
  crypto: "#06b6d4",
  cash: "#94a3b8",
};

export const DEFAULT_COUNTRIES: Country[] = [
  { code: "US", name: "United States", nameKo: "미국", flag: "🇺🇸", isActive: true, weightOverride: null },
  { code: "EU", name: "Europe", nameKo: "유럽", flag: "🇪🇺", isActive: true, weightOverride: null },
  { code: "IN", name: "India", nameKo: "인도", flag: "🇮🇳", isActive: true, weightOverride: null },
  { code: "CN", name: "China", nameKo: "중국", flag: "🇨🇳", isActive: true, weightOverride: null },
  { code: "KR", name: "South Korea", nameKo: "한국", flag: "🇰🇷", isActive: true, weightOverride: null },
  { code: "JP", name: "Japan", nameKo: "일본", flag: "🇯🇵", isActive: true, weightOverride: null },
];

export const DEFAULT_ASSETS = [
  // Stocks - Index ETFs
  { ticker: "SPY", name: "S&P 500", assetClass: "stocks" as AssetClass, country: "US" },
  { ticker: "QQQ", name: "NASDAQ 100", assetClass: "stocks" as AssetClass, country: "US" },
  { ticker: "VGK", name: "FTSE Europe", assetClass: "stocks" as AssetClass, country: "EU" },
  { ticker: "FXI", name: "China Large-Cap", assetClass: "stocks" as AssetClass, country: "CN" },
  { ticker: "INDA", name: "MSCI India", assetClass: "stocks" as AssetClass, country: "IN" },
  { ticker: "EWY", name: "MSCI South Korea", assetClass: "stocks" as AssetClass, country: "KR" },
  { ticker: "EWJ", name: "MSCI Japan", assetClass: "stocks" as AssetClass, country: "JP" },

  // Bonds
  { ticker: "SHY", name: "1-3yr Treasury", assetClass: "bonds" as AssetClass, country: "US", maturity: "3yr" },
  { ticker: "IEI", name: "3-7yr Treasury", assetClass: "bonds" as AssetClass, country: "US", maturity: "5yr" },
  { ticker: "IEF", name: "7-10yr Treasury", assetClass: "bonds" as AssetClass, country: "US", maturity: "10yr" },
  { ticker: "TLT", name: "20+yr Treasury", assetClass: "bonds" as AssetClass, country: "US", maturity: "20yr" },
  { ticker: "BNDX", name: "Intl Bond (Hedged)", assetClass: "bonds" as AssetClass, country: "EU" },

  // Real Estate
  { ticker: "VNQ", name: "US REITs", assetClass: "realestate" as AssetClass, country: "US" },
  { ticker: "VNQI", name: "Intl REITs", assetClass: "realestate" as AssetClass, country: "EU" },

  // Commodities
  { ticker: "GLD", name: "Gold", assetClass: "commodities" as AssetClass, country: "GL" },
  { ticker: "CPER", name: "Copper", assetClass: "commodities" as AssetClass, country: "GL" },
  { ticker: "USO", name: "Crude Oil", assetClass: "commodities" as AssetClass, country: "GL" },

  // Crypto
  { ticker: "IBIT", name: "Bitcoin ETF", assetClass: "crypto" as AssetClass, country: "GL" },
  { ticker: "BITO", name: "Bitcoin Strategy", assetClass: "crypto" as AssetClass, country: "GL" },
];

// Ticker → Korean display name mapping (원래이름 (약자) 형식)
export const TICKER_NAMES_KO: Record<string, string> = {
  // 주식 - 지수 ETF
  SPY: "S&P 500 지수 (SPY)",
  QQQ: "나스닥 100 지수 (QQQ)",
  VGK: "FTSE 유럽 지수 (VGK)",
  FXI: "중국 대형주 지수 (FXI)",
  INDA: "MSCI 인도 지수 (INDA)",
  EWY: "MSCI 한국 지수 (EWY)",
  EWJ: "MSCI 일본 지수 (EWJ)",
  EEM: "신흥국 지수 (EEM)",
  // 채권
  SHY: "미국 단기국채 1-3년 (SHY)",
  IEI: "미국 중기국채 3-7년 (IEI)",
  IEF: "미국 중장기국채 7-10년 (IEF)",
  TLT: "미국 장기국채 20년+ (TLT)",
  BNDX: "글로벌 채권 헤지 (BNDX)",
  // 부동산
  VNQ: "미국 부동산 리츠 (VNQ)",
  VNQI: "글로벌 부동산 리츠 (VNQI)",
  // 현물
  GLD: "금 (GLD)",
  CPER: "구리 (CPER)",
  USO: "원유 (USO)",
  // 암호화폐
  IBIT: "비트코인 현물 ETF (IBIT)",
  BITO: "비트코인 선물 ETF (BITO)",
};

// Country code → Korean name mapping (for portfolio display)
export const COUNTRY_NAMES_KO: Record<string, string> = {
  US: "미국",
  EU: "유럽",
  IN: "인도",
  CN: "중국",
  KR: "한국",
  JP: "일본",
  GL: "글로벌",
};

export const FRED_SERIES = {
  US: {
    growth: [
      { id: "A191RL1Q225SBEA", name: "Real GDP Growth", unit: "%" },
      { id: "MPMISA", name: "ISM Manufacturing PMI", unit: "index" },
    ],
    inflation: [
      { id: "CPIAUCSL", name: "CPI All Items", unit: "index" },
      { id: "PCEPILFE", name: "Core PCE", unit: "index" },
    ],
    liquidity: [
      { id: "NFCI", name: "Financial Conditions Index", unit: "index" },
      { id: "ANFCI", name: "Adjusted NFCI", unit: "index" },
      { id: "BAMLH0A0HYM2", name: "HY OAS Spread", unit: "%" },
      { id: "BAMLC0A0CM", name: "IG OAS Spread", unit: "%" },
      { id: "SOFR", name: "SOFR Rate", unit: "%" },
      { id: "WALCL", name: "Fed Balance Sheet", unit: "M$" },
      { id: "RRPONTSYD", name: "Reverse Repo", unit: "B$" },
    ],
  },
  EU: {
    growth: [{ id: "CLVMNACSCAB1GQEA19", name: "Euro Area GDP", unit: "M€" }],
    inflation: [{ id: "CP0000EZ19M086NEST", name: "HICP", unit: "index" }],
    liquidity: [{ id: "ECBASSETSW", name: "ECB Balance Sheet", unit: "M€" }],
  },
  JP: {
    growth: [{ id: "JPNRGDPEXP", name: "Japan GDP", unit: "B¥" }],
    inflation: [{ id: "JPNCPIALLMINMEI", name: "Japan CPI", unit: "index" }],
    liquidity: [{ id: "JPNASSETS", name: "BOJ Balance Sheet", unit: "B¥" }],
  },
  KR: {
    growth: [{ id: "NGDPRSAXDCKRQ", name: "Korea GDP", unit: "BW" }],
    inflation: [{ id: "KORCPIALLMINMEI", name: "Korea CPI", unit: "index" }],
    liquidity: [],
  },
  CN: {
    growth: [{ id: "CHNRGDPEXP", name: "China GDP", unit: "BY" }],
    inflation: [{ id: "CHNCPIALLMINMEI", name: "China CPI", unit: "index" }],
    liquidity: [],
  },
  IN: {
    growth: [{ id: "INDRGDPEXP", name: "India GDP", unit: "BR" }],
    inflation: [{ id: "INDCPIALLMINMEI", name: "India CPI", unit: "index" }],
    liquidity: [],
  },
} as const;
