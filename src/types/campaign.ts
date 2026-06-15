// ─── AI 버블 1년 작전 시스템 타입 정의 ──────────────────────────────────────
// 5단계 버블 생애주기(멜트업 → 분산 → 붕괴 → 바닥 → 회복) 기반.

export type StageId =
  | "meltup" // 멜트업 라이드
  | "distribution" // 분산·정점경계
  | "crash" // 붕괴·방어
  | "capitulation" // 바닥·분할매수
  | "recovery"; // 회복·재배치

export type StagePosture =
  | "offense_max"
  | "offense"
  | "neutral"
  | "defense"
  | "defense_max";

// 자산 역할 (AI/테크 집중 + 헤지)
export type AssetRole =
  | "semis" // 데이터센터 반도체 — 구조적 승자 (capex 함수)
  | "edge_silicon" // 엣지/온디바이스 실리콘 — 활주로 연장 + 다음 사이클 주도
  | "core_ai" // AI 소프트웨어/빅테크 — 투기적 거품 탑승
  | "broad" // 광범위 주식 (S&P 등)
  | "crypto" // 암호화폐 — 고베타 공격
  | "hedge_cash" // 현금성
  | "hedge_gold" // 금
  | "hedge_bond" // 장기국채 — 붕괴 단계 안전자산 헤지
  | "hedge_inverse"; // 인버스/변동성 — 붕괴 대비

// 단계별 목표 배분 (역할별 %, 합계 100)
export type StageAllocation = Record<AssetRole, number>;

export type StagePlaybook = {
  do: string[];
  watch: string[];
  avoid: string[];
};

export type Stage = {
  id: StageId;
  order: number;
  name: string;
  nameKo: string;
  tagline: string;
  posture: StagePosture;
  postureKo: string;
  gradientFrom: string;
  gradientTo: string;
  allocation: StageAllocation;
  entryTriggers: string[];
  playbook: StagePlaybook;
  thesis: string;
};

// ─── 시그널 ──────────────────────────────────────────────────────────────────

export type SignalId =
  | "nasdaq_trend" // 나스닥 200일선 이격도
  | "drawdown" // 고점 대비 낙폭
  | "volatility" // VIX 변동성
  | "credit_spread" // 하이일드 신용 스프레드
  | "hyperscaler_capex" // 하이퍼스케일러 capex 증가율 (선행 천장 신호)
  | "liquidity"; // 유동성 배경 (3-of-5)

export type SignalStatus =
  | "euphoric" // 과열·유포리아
  | "healthy" // 양호
  | "caution" // 주의
  | "stress" // 스트레스
  | "panic" // 공포·패닉
  | "unknown"; // 데이터 없음

export type SignalBand = {
  label: string;
  status: SignalStatus;
};

export type SignalReading = {
  id: SignalId;
  name: string;
  nameKo: string;
  value: number | null;
  unit: string;
  status: SignalStatus;
  statusKo: string;
  detail: string;
  asOf: string | null;
  bands: SignalBand[];
};

export type StageAssessment = {
  stageId: StageId;
  confidence: number; // 0-100
  rationale: string[];
  nextStageId: StageId | null;
  distanceToNext: string;
  isAuto: boolean; // 자동 판정 vs 수동 고정
};

export type CampaignConfig = {
  startDate: string;
  endDate: string;
  totalCapital: number;
  riskLevel: number;
  autoDetect: boolean;
  manualStageId: StageId | null;
};

export type StageTransition = {
  date: string;
  fromStage: StageId | null;
  toStage: StageId;
  reason: string;
  confidence: number;
};
