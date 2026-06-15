import type {
  Stage,
  StageId,
  StageAssessment,
  SignalReading,
  SignalId,
} from "@/types/campaign";

// ════════════════════════════════════════════════════════════════════════════
// AI 버블 1년 작전 — 5단계 시나리오 정의 (Single Source of Truth)
//
// 서사: 멜트업 라이드 → 탈출(분산) → 폭락 매수
// 테제 반영:
//  - 반도체 = 구조적 승자 → 단계가 진행돼도 가장 오래 보유
//  - AI 소프트웨어/빅테크 = 투기적 거품 → 정점에서 가장 먼저 트림
//  - 온디바이스 AI 확산 = 랠리 엔드게임 신호 → 분산 단계의 마커
//  - 멜트업 헤지는 금·현금 우선 (금리↑·인플레↑ → TLT는 붕괴 단계에서만)
// ════════════════════════════════════════════════════════════════════════════

export const STAGES: Record<StageId, Stage> = {
  meltup: {
    id: "meltup",
    order: 1,
    name: "Melt-up",
    nameKo: "멜트업 라이드",
    tagline: "버블 상승에 올라탄다. AI/반도체 공격 비중 최대.",
    posture: "offense_max",
    postureKo: "공격 최대",
    gradientFrom: "#10b981",
    gradientTo: "#34d399",
    allocation: {
      semis: 28,
      edge_silicon: 6,
      core_ai: 18,
      broad: 12,
      crypto: 12,
      hedge_cash: 12,
      hedge_gold: 12,
      hedge_bond: 0,
      hedge_inverse: 0,
    },
    entryTriggers: [
      "고점 대비 낙폭 5% 미만 (상승 추세 유지)",
      "나스닥 200일선 위, VIX 안정권(<20)",
      "하이퍼스케일러 capex 가속 + 유동성 확장",
    ],
    playbook: {
      do: [
        "반도체(SMH/NVDA) 코어 비중 최대로 유지",
        "AI 빅테크(QQQ) 추세 추종, 눌림목 추가",
        "수익 구간 트레일링 스탑만 설정, 섣불리 팔지 않기",
      ],
      watch: [
        "온디바이스 AI 상용화 뉴스 — 랠리 엔드게임 신호",
        "VIX 14 이하 과도한 안일함 = 정점 경계 전조",
        "200일선 이격도 15% 이상 과열",
      ],
      avoid: ["공포에 의한 조기 매도", "헤지 과다로 상승 놓치기"],
    },
    thesis:
      "AI 기업은 적자여도 반도체는 돈을 번다. 스테이블코인발 국채 발행·중간선거 등 유동성 배경이 버블을 떠받친다. 금리·인플레를 감안해도 당분간 거품은 지속될 가능성이 높으므로 공격적으로 올라탄다.",
  },

  distribution: {
    id: "distribution",
    order: 2,
    name: "Distribution",
    nameKo: "분산·정점경계",
    tagline: "유포리아 신호 점등. AI 거품 먼저 트림, 현금·금 확보.",
    posture: "neutral",
    postureKo: "중립·차익실현",
    gradientFrom: "#f59e0b",
    gradientTo: "#fbbf24",
    allocation: {
      semis: 18,
      edge_silicon: 8,
      core_ai: 9,
      broad: 7,
      crypto: 5,
      hedge_cash: 31,
      hedge_gold: 14,
      hedge_bond: 8,
      hedge_inverse: 0,
    },
    entryTriggers: [
      "하이퍼스케일러 capex 증가율 둔화 (선행 천장 신호)",
      "200일선 이격도 15%↑ & VIX 16↓ (과도한 안일)",
      "온디바이스 AI 보편화 → 클라우드 수요 정점 서사",
    ],
    playbook: {
      do: [
        "AI 소프트웨어/빅테크(QQQ·IGV) 먼저 차익실현",
        "현금 비중 30%대로 확대, 금 비중 확대",
        "장기국채(TLT) 헤지 소량 시작",
      ],
      watch: [
        "신용 스프레드 확대 시작 = 붕괴 임박",
        "반도체 실적·수주 둔화 신호",
        "고점 대비 낙폭 12% 돌파 여부",
      ],
      avoid: ["반도체 코어를 한 번에 전량 매도", "신용 추격 매수"],
    },
    thesis:
      "소비자가 원하는 성능 임계점을 이미 넘어선 상태에서 수백조 투자는 한계 효용이 급감한다. 온디바이스 AI가 보편화되면 랠리의 명분이 약해진다 — 거품의 정점을 경계하며 투기적 비중부터 줄인다. 단, 반도체 구조적 수요는 남으므로 코어는 유지.",
  },

  crash: {
    id: "crash",
    order: 3,
    name: "Crash",
    nameKo: "붕괴·방어",
    tagline: "버블 붕괴. 자본 보존 최우선. 현금·금·국채·인버스.",
    posture: "defense_max",
    postureKo: "방어 최대",
    gradientFrom: "#dc2626",
    gradientTo: "#ef4444",
    allocation: {
      semis: 6,
      edge_silicon: 3,
      core_ai: 2,
      broad: 0,
      crypto: 0,
      hedge_cash: 47,
      hedge_gold: 17,
      hedge_bond: 17,
      hedge_inverse: 8,
    },
    entryTriggers: [
      "고점 대비 낙폭 12%↑ 또는 VIX 28↑",
      "하이일드 스프레드 6%↑ 급확대",
      "나스닥 200일선 하향 이탈",
    ],
    playbook: {
      do: [
        "위험자산 비중 최소화, 현금 50% 내외 확보",
        "장기국채(TLT)·금으로 안전자산 쏠림 헤지",
        "인버스(SQQQ) 소량으로 하락 방어 (변동성 큼 주의)",
      ],
      watch: [
        "VIX 38↑ 패닉 = 바닥 신호 접근",
        "반도체 생존 기업 리스트 작성 (매수 후보)",
        "유동성 재공급(Fed 피벗) 신호",
      ],
      avoid: ["떨어지는 칼 받기(추세 확인 전 매수)", "레버리지 사용"],
    },
    thesis:
      "거품이 터지면 가장 먼저 자본을 지킨다. 이 국면에서는 금리·인플레보다 안전자산 쏠림이 우세해 장기국채(TLT)가 비로소 헤지로 작동한다. 반도체 코어만 최소한으로 남기고 현금을 쌓아 바닥 매수 실탄을 준비한다.",
  },

  capitulation: {
    id: "capitulation",
    order: 4,
    name: "Capitulation",
    nameKo: "바닥·분할매수",
    tagline: "최대 공포. 반도체 생존자부터 분할 매수 시작.",
    posture: "offense",
    postureKo: "공격 전환",
    gradientFrom: "#7c3aed",
    gradientTo: "#a855f7",
    allocation: {
      semis: 22,
      edge_silicon: 12,
      core_ai: 13,
      broad: 9,
      crypto: 8,
      hedge_cash: 23,
      hedge_gold: 10,
      hedge_bond: 3,
      hedge_inverse: 0,
    },
    entryTriggers: [
      "고점 대비 낙폭 30%↑ 또는 VIX 38↑ (패닉)",
      "투매 후 변동성 정점 통과",
      "신용 스프레드 정점 형성 후 안정화 조짐",
    ],
    playbook: {
      do: [
        "반도체(SMH/NVDA) 구조적 생존자부터 분할 매수",
        "쌓아둔 현금을 3~4회 분할로 투입",
        "인버스 헤지 단계적 청산",
      ],
      watch: [
        "바닥 확인용 추세 반전(200일선 회복 시도)",
        "거래량 동반 반등 여부",
        "온디바이스 AI·차세대 반도체 수요 회복 단서",
      ],
      avoid: ["한 번에 전량 매수", "현금 0% 만들기"],
    },
    thesis:
      "최대 공포 구간이 일생일대의 매수 기회다. AI 소프트웨어 거품은 사라져도 반도체 수요는 구조적으로 남는다 — 온디바이스 AI(PC·노트북·스마트폰 탑재)라는 다음 수요처가 기다린다. 생존자 중심으로 분할 매수한다.",
  },

  recovery: {
    id: "recovery",
    order: 5,
    name: "Recovery",
    nameKo: "회복·재배치",
    tagline: "새 주도주로 재진입. 반도체 중심 공격 복귀.",
    posture: "offense",
    postureKo: "공격 복귀",
    gradientFrom: "#06b6d4",
    gradientTo: "#22d3ee",
    allocation: {
      semis: 26,
      edge_silicon: 16,
      core_ai: 18,
      broad: 11,
      crypto: 11,
      hedge_cash: 10,
      hedge_gold: 6,
      hedge_bond: 2,
      hedge_inverse: 0,
    },
    entryTriggers: [
      "바닥 이후 나스닥 200일선 회복",
      "VIX 22 이하로 안정",
      "신용 스프레드 정상화",
    ],
    playbook: {
      do: [
        "반도체 코어 비중 재확대",
        "온디바이스 AI 수혜 신규 주도주 편입",
        "헤지 비중 정상화(현금/금 축소)",
      ],
      watch: [
        "새로운 버블 형성 여부 (사이클 반복)",
        "1년 작전 종료 시점 — 차익 확정 계획",
      ],
      avoid: ["과거 고점 추격", "회복 초입 과도한 레버리지"],
    },
    thesis:
      "바닥을 통과하면 새 사이클의 주도주가 등장한다. 반도체는 온디바이스 AI라는 새 수요 위에서 다시 주도한다. 1년 작전의 마지막 국면으로, 재배치 후 종료 시점의 차익 확정 계획을 세운다.",
  },
};

export const STAGE_ORDER: StageId[] = [
  "meltup",
  "distribution",
  "crash",
  "capitulation",
  "recovery",
];

export function getStage(id: StageId): Stage {
  return STAGES[id] ?? STAGES.meltup;
}

export function nextStageId(id: StageId): StageId | null {
  const idx = STAGE_ORDER.indexOf(id);
  if (idx < 0 || idx >= STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}

// ─── 단계 자동 판정 (순수 함수, SSOT) ────────────────────────────────────────
// 신호 → 현재 단계. 가격 데이터 부족 시 신용/유동성으로 폴백, 그래도 부족하면
// confidence를 낮춰 멜트업 기본값 반환 (호출부에서 수동 고정으로 대체 가능).

function val(signals: Record<SignalId, SignalReading | undefined>, id: SignalId): number | null {
  return signals[id]?.value ?? null;
}

export function determineStage(
  readings: SignalReading[],
  previousStageId: StageId | null = null
): StageAssessment {
  const map = {} as Record<SignalId, SignalReading | undefined>;
  for (const r of readings) map[r.id] = r;

  const dd = val(map, "drawdown"); // 고점 대비 낙폭 (양수 magnitude %)
  const vix = val(map, "volatility");
  const trend = val(map, "nasdaq_trend"); // 200일선 이격도 %
  const hy = val(map, "credit_spread");
  const liqExpanding = map.liquidity?.status === "healthy";
  const capexStatus = map.hyperscaler_capex?.status; // 선행 신호: healthy/euphoric=가속, caution=둔화, stress=역성장

  const rationale: string[] = [];
  const hasPriceData = dd != null || vix != null || trend != null;

  // 데이터가 거의 없으면 저신뢰 멜트업
  if (!hasPriceData && hy == null && capexStatus == null) {
    return {
      stageId: previousStageId ?? "meltup",
      confidence: 20,
      rationale: ["시그널 데이터 부족 — 수동 단계 고정을 권장합니다."],
      nextStageId: nextStageId(previousStageId ?? "meltup"),
      distanceToNext: "데이터 수집 후 자동 판정 가능",
      isAuto: true,
    };
  }

  let stageId: StageId = "meltup";
  let confidence = 50;

  // 1) 바닥/패닉 — 가장 강한 신호
  if ((dd != null && dd >= 30) || (vix != null && vix >= 38)) {
    stageId = "capitulation";
    confidence = 80;
    if (dd != null && dd >= 30) rationale.push(`고점 대비 낙폭 ${dd.toFixed(0)}% — 투매 구간`);
    if (vix != null && vix >= 38) rationale.push(`VIX ${vix.toFixed(0)} — 패닉/공포 정점`);
  }
  // 2) 붕괴
  else if ((dd != null && dd >= 12) || (vix != null && vix >= 28) || (hy != null && hy >= 6)) {
    stageId = "crash";
    confidence = 72;
    if (dd != null && dd >= 12) rationale.push(`고점 대비 낙폭 ${dd.toFixed(0)}% — 추세 훼손`);
    if (vix != null && vix >= 28) rationale.push(`VIX ${vix.toFixed(0)} — 변동성 급등`);
    if (hy != null && hy >= 6) rationale.push(`하이일드 스프레드 ${hy.toFixed(1)}% — 신용 경색`);
  }
  // 3) 회복 — 직전이 붕괴/바닥이고 시장이 안정화
  else if (
    (previousStageId === "crash" || previousStageId === "capitulation") &&
    (trend == null || trend > -5) &&
    (vix == null || vix < 22) &&
    (dd == null || dd < 12)
  ) {
    stageId = "recovery";
    confidence = 68;
    rationale.push("붕괴 이후 시장 안정화 — 추세 회복 국면");
    if (trend != null) rationale.push(`나스닥 200일선 이격도 ${trend.toFixed(0)}%`);
  }
  // 4) 분산/정점경계 — capex 둔화(선행) 또는 유포리아/초기 천장
  else if (
    capexStatus === "caution" ||
    capexStatus === "stress" ||
    (trend != null && trend >= 15 && vix != null && vix <= 16) ||
    (dd != null && dd >= 5)
  ) {
    stageId = "distribution";
    confidence = 64;
    if (capexStatus === "caution") {
      rationale.push("하이퍼스케일러 capex 증가율 둔화 — 선행 천장 신호");
      confidence = 70; // 선행 신호는 신뢰도 가중
    }
    if (capexStatus === "stress") {
      rationale.push("하이퍼스케일러 capex 역성장 — 반도체 수요 둔화 임박");
      confidence = 74;
    }
    if (trend != null && trend >= 15) rationale.push(`200일선 이격도 +${trend.toFixed(0)}% — 과열`);
    if (vix != null && vix <= 16) rationale.push(`VIX ${vix.toFixed(0)} — 과도한 안일함`);
    if (dd != null && dd >= 5) rationale.push(`고점 대비 낙폭 ${dd.toFixed(0)}% — 초기 천장`);
  }
  // 5) 기본: 멜트업
  else {
    stageId = "meltup";
    confidence = 66;
    rationale.push("상승 추세 유지 — 멜트업 진행 중");
    if (trend != null && trend > 0) rationale.push(`나스닥 200일선 위 (+${trend.toFixed(0)}%)`);
  }

  // 유동성 배경 보강
  if (liqExpanding && (stageId === "meltup" || stageId === "recovery")) {
    confidence = Math.min(95, confidence + 8);
    rationale.push("유동성 확장 배경 — 위험자산 우호적");
  }
  if (!liqExpanding && (stageId === "crash" || stageId === "distribution")) {
    confidence = Math.min(95, confidence + 6);
    rationale.push("유동성 수축 배경 — 방어 강화");
  }

  // capex 가속 보강 (멜트업/회복 신뢰도)
  if ((capexStatus === "healthy" || capexStatus === "euphoric") && (stageId === "meltup" || stageId === "recovery")) {
    confidence = Math.min(95, confidence + 6);
    rationale.push("하이퍼스케일러 capex 가속 — 반도체 수요 견조");
  }
  if (capexStatus === "stress" && stageId === "crash") {
    confidence = Math.min(95, confidence + 6);
    rationale.push("capex 역성장 — 붕괴 신호 강화");
  }

  const nid = nextStageId(stageId);
  const distanceToNext = describeDistance(stageId, { dd, vix, trend, hy });

  return {
    stageId,
    confidence,
    rationale,
    nextStageId: nid,
    distanceToNext,
    isAuto: true,
  };
}

function describeDistance(
  stageId: StageId,
  s: { dd: number | null; vix: number | null; trend: number | null; hy: number | null }
): string {
  switch (stageId) {
    case "meltup":
      return s.trend != null
        ? `capex 둔화 또는 이격도 15%↑·VIX 16↓ 시 분산 단계로 (현재 이격도 ${s.trend.toFixed(0)}%)`
        : "하이퍼스케일러 capex 둔화 / 이격도 15%↑ / 낙폭 5%↑ 시 분산 단계로";
    case "distribution":
      return s.dd != null
        ? `고점 대비 낙폭 12%↑ 시 붕괴 단계로 (현재 ${s.dd.toFixed(0)}%)`
        : "낙폭 12%↑ / VIX 28↑ / HY 6%↑ 시 붕괴 단계로";
    case "crash":
      return s.dd != null
        ? `낙폭 30%↑ 또는 VIX 38↑ 시 바닥 단계로 (현재 낙폭 ${s.dd.toFixed(0)}%)`
        : "낙폭 30%↑ 또는 VIX 38↑ 시 바닥 단계로";
    case "capitulation":
      return "200일선 회복 & VIX 22↓ 시 회복 단계로";
    case "recovery":
      return "작전 종료 또는 새 사이클 시작 경계";
    default:
      return "";
  }
}
