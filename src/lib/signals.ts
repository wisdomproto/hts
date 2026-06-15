import type { SignalId, SignalReading, SignalStatus, SignalBand } from "@/types/campaign";

// ─── 시그널 상태 표시용 메타 ──────────────────────────────────────────────────

export const SIGNAL_STATUS_META: Record<SignalStatus, { ko: string; color: string }> = {
  euphoric: { ko: "과열", color: "#f59e0b" },
  healthy: { ko: "양호", color: "#10b981" },
  caution: { ko: "주의", color: "#eab308" },
  stress: { ko: "스트레스", color: "#f97316" },
  panic: { ko: "패닉", color: "#dc2626" },
  unknown: { ko: "데이터 없음", color: "#64748b" },
};

type SignalDef = {
  id: SignalId;
  name: string;
  nameKo: string;
  unit: string;
  bands: SignalBand[];
  // 숫자 → 상태 (liquidity 제외)
  classify?: (v: number) => SignalStatus;
  detail: (v: number | null, status: SignalStatus) => string;
};

export const SIGNAL_DEFS: Record<SignalId, SignalDef> = {
  nasdaq_trend: {
    id: "nasdaq_trend",
    name: "Nasdaq Trend",
    nameKo: "나스닥 추세 (200일선 이격도)",
    unit: "%",
    bands: [
      { label: "+15%↑ 과열", status: "euphoric" },
      { label: "0~15% 양호", status: "healthy" },
      { label: "-5~0% 주의", status: "caution" },
      { label: "-5%↓ 스트레스", status: "stress" },
    ],
    classify: (v) => (v >= 15 ? "euphoric" : v >= 0 ? "healthy" : v >= -5 ? "caution" : "stress"),
    detail: (v, s) =>
      v == null
        ? "QQQ 가격 데이터 필요"
        : s === "euphoric"
          ? "200일선 대비 과도하게 이격 — 멜트업 후반/정점 경계"
          : s === "healthy"
            ? "상승 추세 유지 — 멜트업 진행"
            : s === "caution"
              ? "추세 둔화 — 천장 가능성 점검"
              : "200일선 하향 이탈 — 붕괴 위험",
  },
  drawdown: {
    id: "drawdown",
    name: "Drawdown",
    nameKo: "고점 대비 낙폭 (52주)",
    unit: "%",
    bands: [
      { label: "5%↓ 양호", status: "healthy" },
      { label: "5~12% 주의", status: "caution" },
      { label: "12~30% 스트레스", status: "stress" },
      { label: "30%↑ 패닉", status: "panic" },
    ],
    classify: (v) => (v < 5 ? "healthy" : v < 12 ? "caution" : v < 30 ? "stress" : "panic"),
    detail: (v, s) =>
      v == null
        ? "QQQ 가격 데이터 필요"
        : s === "healthy"
          ? "고점 부근 — 상승 추세 건강"
          : s === "caution"
            ? "초기 조정 — 정점 경계 구간"
            : s === "stress"
              ? "본격 하락 — 붕괴 국면"
              : "투매 구간 — 바닥 매수 기회 접근",
  },
  volatility: {
    id: "volatility",
    name: "Volatility (VIX)",
    nameKo: "변동성 (VIX)",
    unit: "",
    bands: [
      { label: "14↓ 안일(과열)", status: "euphoric" },
      { label: "14~20 양호", status: "healthy" },
      { label: "20~28 주의", status: "caution" },
      { label: "28~38 스트레스", status: "stress" },
      { label: "38↑ 패닉", status: "panic" },
    ],
    classify: (v) =>
      v < 14 ? "euphoric" : v < 20 ? "healthy" : v < 28 ? "caution" : v < 38 ? "stress" : "panic",
    detail: (v, s) =>
      v == null
        ? "^VIX 데이터 필요"
        : s === "euphoric"
          ? "과도한 안일함 — 정점 전조"
          : s === "healthy"
            ? "정상 변동성"
            : s === "caution"
              ? "불안 증가"
              : s === "stress"
                ? "변동성 급등 — 붕괴 국면"
                : "패닉 정점 — 바닥 신호 접근",
  },
  credit_spread: {
    id: "credit_spread",
    name: "HY Credit Spread",
    nameKo: "하이일드 신용 스프레드",
    unit: "%",
    bands: [
      { label: "3.5%↓ 양호", status: "healthy" },
      { label: "3.5~5% 주의", status: "caution" },
      { label: "5~7% 스트레스", status: "stress" },
      { label: "7%↑ 패닉", status: "panic" },
    ],
    classify: (v) => (v < 3.5 ? "healthy" : v < 5 ? "caution" : v < 7 ? "stress" : "panic"),
    detail: (v, s) =>
      v == null
        ? "FRED BAMLH0A0HYM2 데이터 필요"
        : s === "healthy"
          ? "신용 환경 안정 — 위험자산 우호적"
          : s === "caution"
            ? "스프레드 확대 시작 — 경계"
            : s === "stress"
              ? "신용 경색 — 붕괴 신호"
              : "신용 위기 — 시스템 스트레스",
  },
  liquidity: {
    id: "liquidity",
    name: "Liquidity Backdrop",
    nameKo: "유동성 배경 (3-of-5)",
    unit: "",
    bands: [
      { label: "확장 — 우호적", status: "healthy" },
      { label: "수축 — 주의", status: "caution" },
    ],
    detail: (_v, s) =>
      s === "healthy"
        ? "유동성 확장 — 버블 지속 우호적 (국채 발행·정책 배경)"
        : s === "caution"
          ? "유동성 수축 — 위험자산 역풍"
          : "유동성 데이터 필요",
  },
};

export function classifySignal(id: SignalId, value: number | null): SignalStatus {
  if (value == null) return "unknown";
  const def = SIGNAL_DEFS[id];
  return def.classify ? def.classify(value) : "unknown";
}

export function buildReading(
  id: SignalId,
  value: number | null,
  asOf: string | null,
  statusOverride?: SignalStatus
): SignalReading {
  const def = SIGNAL_DEFS[id];
  const status = statusOverride ?? classifySignal(id, value);
  return {
    id,
    name: def.name,
    nameKo: def.nameKo,
    value,
    unit: def.unit,
    status,
    statusKo: SIGNAL_STATUS_META[status].ko,
    detail: def.detail(value, status),
    asOf,
    bands: def.bands,
  };
}
