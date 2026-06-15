import type { AssetRole } from "@/types/campaign";

// ─── 자산 역할 메타 ───────────────────────────────────────────────────────────

export const ROLE_META: Record<
  AssetRole,
  { nameKo: string; name: string; color: string; group: "offense" | "hedge"; desc: string }
> = {
  semis: {
    nameKo: "반도체 (구조적)",
    name: "Semiconductors",
    color: "#3b82f6",
    group: "offense",
    desc: "AI 적자에도 돈 버는 구조적 승자. 온디바이스 AI로 수요 지속.",
  },
  core_ai: {
    nameKo: "AI·빅테크 (투기)",
    name: "AI / Big Tech",
    color: "#8b5cf6",
    group: "offense",
    desc: "AI 소프트웨어/하이퍼스케일러. 거품의 핵심, 정점에서 먼저 트림.",
  },
  broad: {
    nameKo: "광범위 주식",
    name: "Broad Equity",
    color: "#06b6d4",
    group: "offense",
    desc: "S&P 500 등 시장 전반.",
  },
  crypto: {
    nameKo: "암호화폐",
    name: "Crypto",
    color: "#f59e0b",
    group: "offense",
    desc: "고베타 위험자산. 유동성에 민감.",
  },
  hedge_cash: {
    nameKo: "현금성",
    name: "Cash",
    color: "#94a3b8",
    group: "hedge",
    desc: "실탄. 붕괴 대비 + 바닥 매수 재원.",
  },
  hedge_gold: {
    nameKo: "금",
    name: "Gold",
    color: "#eab308",
    group: "hedge",
    desc: "인플레/위기 헤지. 멜트업 단계 1순위 헤지.",
  },
  hedge_bond: {
    nameKo: "장기국채",
    name: "Long Treasury",
    color: "#a855f7",
    group: "hedge",
    desc: "안전자산 쏠림 헤지. 금리↑ 환경상 붕괴 단계에서만 효과.",
  },
  hedge_inverse: {
    nameKo: "인버스",
    name: "Inverse / Vol",
    color: "#ef4444",
    group: "hedge",
    desc: "하락 방어. 변동성 크므로 붕괴 국면 소량만.",
  },
};

export const ROLE_ORDER: AssetRole[] = [
  "semis",
  "core_ai",
  "broad",
  "crypto",
  "hedge_cash",
  "hedge_gold",
  "hedge_bond",
  "hedge_inverse",
];

// ─── 자산 유니버스 ────────────────────────────────────────────────────────────

export type CampaignAsset = {
  ticker: string;
  nameKo: string;
  role: AssetRole;
  weightInRole: number; // 역할 내 비중 (합계 1)
  note: string;
};

export const CAMPAIGN_ASSETS: CampaignAsset[] = [
  // 반도체 (구조적 승자)
  { ticker: "SMH", nameKo: "반도체 ETF (SMH)", role: "semis", weightInRole: 0.55, note: "반도체 광범위 노출 — 구조적 수요" },
  { ticker: "NVDA", nameKo: "엔비디아 (NVDA)", role: "semis", weightInRole: 0.45, note: "AI 가속기 독점적 지위" },
  // AI·빅테크 (투기)
  { ticker: "QQQ", nameKo: "나스닥 100 (QQQ)", role: "core_ai", weightInRole: 0.65, note: "AI·빅테크 집약 거품 탑승" },
  { ticker: "IGV", nameKo: "소프트웨어 ETF (IGV)", role: "core_ai", weightInRole: 0.35, note: "AI 소프트웨어 — 정점에서 먼저 트림" },
  // 광범위 주식
  { ticker: "SPY", nameKo: "S&P 500 (SPY)", role: "broad", weightInRole: 1, note: "시장 전반 베타" },
  // 암호화폐
  { ticker: "IBIT", nameKo: "비트코인 현물 ETF (IBIT)", role: "crypto", weightInRole: 1, note: "고베타, 유동성 민감" },
  // 헤지
  { ticker: "BIL", nameKo: "단기국채/현금성 (BIL)", role: "hedge_cash", weightInRole: 1, note: "실탄 — 바닥 매수 재원" },
  { ticker: "GLD", nameKo: "금 (GLD)", role: "hedge_gold", weightInRole: 1, note: "멜트업 1순위 헤지" },
  { ticker: "TLT", nameKo: "장기국채 20년+ (TLT)", role: "hedge_bond", weightInRole: 1, note: "붕괴 단계 안전자산 쏠림 헤지" },
  { ticker: "SQQQ", nameKo: "나스닥 인버스 3x (SQQQ)", role: "hedge_inverse", weightInRole: 1, note: "붕괴 방어 — 소량만, 변동성 큼" },
];

export function assetsForRole(role: AssetRole): CampaignAsset[] {
  return CAMPAIGN_ASSETS.filter((a) => a.role === role);
}
