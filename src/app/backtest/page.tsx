"use client";

import { useState, useEffect, useCallback } from "react";
import { GlassCard } from "@/components/shared/glass-card";
import { formatCurrency } from "@/lib/format";
import {
  Play,
  Loader2,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Trash2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Sparkles,
  RotateCcw,
  Settings2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { REGIMES, REGIME_ALLOCATION_TEMPLATES } from "@/lib/regimes";
import type { RegimeId } from "@/types/regime";

type BacktestRun = {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  riskLevel: number;
  rebalancePeriod: string;
  finalValue: number | null;
  totalReturnPct: number | null;
  annualizedReturnPct: number | null;
  volatilityPct: number | null;
  sharpeRatio: number | null;
  maxDrawdownPct: number | null;
  maxDrawdownStart: string | null;
  maxDrawdownEnd: string | null;
  benchmarkTicker: string | null;
  benchmarkReturnPct: number | null;
  benchmarkSharpe: number | null;
  benchmarkMddPct: number | null;
  status: string;
  allocationsJson: string | null;
  createdAt: string;
};

type Snapshot = {
  id: number;
  runId: number;
  date: string;
  portfolioValue: number;
  benchmarkValue: number | null;
  regimeName: string | null;
  drawdownPct: number | null;
};

type BacktestConfig = {
  startDate: string;
  endDate: string;
  initialCapital: number;
  riskLevel: number;
  rebalancePeriod: string;
  benchmarkTicker: string;
  name: string;
};

type RegimeAllocations = Record<string, Record<string, number>>;

const REBALANCE_OPTIONS = [
  { value: "daily", label: "일별" },
  { value: "weekly", label: "주별" },
  { value: "monthly", label: "월별" },
  { value: "quarterly", label: "분기별" },
  { value: "yearly", label: "연별" },
];

const RISK_LABELS = ["", "매우 보수적", "보수적", "보통", "공격적", "매우 공격적"];

const ASSET_CLASSES = [
  { key: "stocks", label: "주식", color: "#3b82f6" },
  { key: "bonds", label: "채권", color: "#06b6d4" },
  { key: "realestate", label: "부동산", color: "#8b5cf6" },
  { key: "commodities", label: "현물", color: "#f59e0b" },
  { key: "crypto", label: "암호화폐", color: "#f97316" },
  { key: "cash", label: "현금", color: "#94a3b8" },
] as const;

const REGIME_LIST: { id: RegimeId; label: string }[] = [
  { id: "goldilocks", label: "골디락스" },
  { id: "disinflation_tightening", label: "디스인플레 긴축" },
  { id: "inflation_boom", label: "인플레 가속" },
  { id: "overheating", label: "과열 긴축" },
  { id: "stagflation_lite", label: "스태그 완화" },
  { id: "stagflation", label: "스태그플레이션" },
  { id: "reflation", label: "침체 완화" },
  { id: "deflation_crisis", label: "디플레 경색" },
];

function getDefaultAllocations(): RegimeAllocations {
  const allocs: RegimeAllocations = {};
  for (const regime of REGIME_LIST) {
    allocs[regime.id] = { ...REGIME_ALLOCATION_TEMPLATES[regime.id] };
  }
  return allocs;
}

export default function BacktestPage() {
  const [runs, setRuns] = useState<BacktestRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<BacktestRun | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [chartMode, setChartMode] = useState<"value" | "drawdown">("value");

  // Allocation editor state
  const [showAllocEditor, setShowAllocEditor] = useState(false);
  const [selectedRegime, setSelectedRegime] = useState<RegimeId>("goldilocks");
  const [customAllocations, setCustomAllocations] = useState<RegimeAllocations>(getDefaultAllocations);
  const [optimizeTarget, setOptimizeTarget] = useState<"sharpe" | "return" | "mdd">("sharpe");

  const [config, setConfig] = useState<BacktestConfig>({
    startDate: "2022-03-01",
    endDate: new Date().toISOString().split("T")[0],
    initialCapital: 100000000,
    riskLevel: 3,
    rebalancePeriod: "monthly",
    benchmarkTicker: "SPY",
    name: "",
  });

  // Fetch runs
  const fetchRuns = useCallback(async () => {
    try {
      const res = await fetch("/api/backtest");
      const data = await res.json();
      if (data.runs) {
        setRuns(data.runs);
        const completed = data.runs.find(
          (r: BacktestRun) => r.status === "completed"
        );
        if (completed && !selectedRun) {
          loadRunDetail(completed.id);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const loadRunDetail = async (runId: number) => {
    try {
      const res = await fetch(`/api/backtest?runId=${runId}`);
      const data = await res.json();
      if (data.run) {
        setSelectedRun(data.run);
        setSnapshots(data.snapshots || []);
      }
    } catch {
      // ignore
    }
  };

  // Check if allocations differ from default
  const hasCustomAllocations = (): boolean => {
    const defaults = getDefaultAllocations();
    for (const regime of REGIME_LIST) {
      for (const ac of ASSET_CLASSES) {
        if ((customAllocations[regime.id]?.[ac.key] ?? 0) !== (defaults[regime.id]?.[ac.key] ?? 0)) {
          return true;
        }
      }
    }
    return false;
  };

  // Run backtest
  const handleRunBacktest = async () => {
    setRunning(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        startDate: config.startDate,
        endDate: config.endDate,
        initialCapital: config.initialCapital,
        riskLevel: config.riskLevel,
        rebalancePeriod: config.rebalancePeriod,
        benchmarkTicker: config.benchmarkTicker,
        name: config.name || undefined,
      };

      if (hasCustomAllocations()) {
        payload.customAllocations = customAllocations;
      }

      const res = await fetch("/api/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "백테스트 실행 실패");
        if (data.needsPriceData) {
          setError(
            "가격 데이터가 없습니다. 터미널에서 'cd data && python fetch_prices.py'를 실행해 Yahoo Finance 가격 데이터를 먼저 가져오세요."
          );
        }
        return;
      }

      if (data.result) {
        await fetchRuns();
        loadRunDetail(data.result.runId);
        setShowConfig(false);
      }
    } catch {
      setError("백테스트 실행 중 오류가 발생했습니다.");
    } finally {
      setRunning(false);
    }
  };

  // Optimize allocation
  const handleOptimize = async () => {
    setOptimizing(true);
    setError(null);

    try {
      const res = await fetch("/api/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          optimize: true,
          startDate: config.startDate,
          endDate: config.endDate,
          initialCapital: config.initialCapital,
          riskLevel: config.riskLevel,
          rebalancePeriod: config.rebalancePeriod,
          benchmarkTicker: config.benchmarkTicker,
          optimizeTarget,
          baseAllocations: customAllocations,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "최적화 실패");
        return;
      }

      if (data.optimizeResult) {
        const optimized = data.optimizeResult.allocations as RegimeAllocations;
        setCustomAllocations((prev) => {
          const next = { ...prev };
          for (const [regime, alloc] of Object.entries(optimized)) {
            next[regime] = { ...alloc };
          }
          return next;
        });

        const m = data.optimizeResult.metrics;
        setError(null);
        alert(
          `최적화 완료! (${data.optimizeResult.iterations}회 반복)\n\n` +
          `수익률: ${m.totalReturnPct >= 0 ? "+" : ""}${m.totalReturnPct}%\n` +
          `샤프: ${m.sharpeRatio}\n` +
          `MDD: -${m.maxDrawdownPct}%\n\n` +
          `적용된 레짐: ${data.optimizeResult.regimesUsed.join(", ")}\n\n` +
          `배분 비율이 자동으로 적용되었습니다. "백테스트 실행"을 눌러 확인하세요.`
        );
      }
    } catch {
      setError("최적화 실행 중 오류가 발생했습니다.");
    } finally {
      setOptimizing(false);
    }
  };

  // Delete run
  const handleDelete = async (runId: number) => {
    try {
      await fetch(`/api/backtest?runId=${runId}`, { method: "DELETE" });
      if (selectedRun?.id === runId) {
        setSelectedRun(null);
        setSnapshots([]);
      }
      fetchRuns();
    } catch {
      // ignore
    }
  };

  // Update a single regime/asset class allocation
  const updateAllocation = (regime: string, assetClass: string, value: number) => {
    setCustomAllocations((prev) => ({
      ...prev,
      [regime]: {
        ...prev[regime],
        [assetClass]: Math.max(0, Math.min(100, value)),
      },
    }));
  };

  // Reset a single regime to defaults
  const resetRegime = (regimeId: string) => {
    const rKey = regimeId as RegimeId;
    setCustomAllocations((prev) => ({
      ...prev,
      [regimeId]: { ...REGIME_ALLOCATION_TEMPLATES[rKey] },
    }));
  };

  // Reset all to defaults
  const resetAllAllocations = () => {
    setCustomAllocations(getDefaultAllocations());
  };

  // Get current regime's sum
  const getCurrentSum = (regimeId: string): number => {
    const alloc = customAllocations[regimeId];
    if (!alloc) return 0;
    return ASSET_CLASSES.reduce((sum, ac) => sum + (alloc[ac.key] || 0), 0);
  };

  // Chart data
  const chartData = snapshots.map((s) => ({
    date: s.date,
    portfolio: Math.round(s.portfolioValue),
    benchmark: s.benchmarkValue ? Math.round(s.benchmarkValue) : null,
    drawdown: s.drawdownPct ? -Math.abs(s.drawdownPct) : 0,
    regime: s.regimeName,
  }));

  const formatAxis = (value: number) => {
    if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(0)}억`;
    if (value >= 10_000_000) return `${(value / 10_000_000).toFixed(0)}천만`;
    return `${(value / 10_000).toFixed(0)}만`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">백테스트</h1>
          <p className="text-sm text-text-muted mt-1">
            레짐 기반 포트폴리오 전략의 과거 성과를 시뮬레이션합니다
          </p>
        </div>
        <button
          onClick={() => setShowConfig((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Play className="w-4 h-4" />
          새 백테스트
        </button>
      </div>

      {/* Config Panel */}
      {showConfig && (
        <GlassCard>
          <h3 className="text-base font-semibold text-text-primary mb-4">
            백테스트 설정
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-xs text-text-muted block mb-1">시작일</label>
              <input
                type="date"
                value={config.startDate}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, startDate: e.target.value }))
                }
                className="w-full bg-bg-overlay border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted block mb-1">종료일</label>
              <input
                type="date"
                value={config.endDate}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, endDate: e.target.value }))
                }
                className="w-full bg-bg-overlay border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted block mb-1">
                초기 투자금
              </label>
              <input
                type="number"
                value={config.initialCapital}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    initialCapital: Number(e.target.value),
                  }))
                }
                className="w-full bg-bg-overlay border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted block mb-1">
                리밸런싱 주기
              </label>
              <select
                value={config.rebalancePeriod}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, rebalancePeriod: e.target.value }))
                }
                className="w-full bg-bg-overlay border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
              >
                {REBALANCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-text-muted block mb-1">
                위험 수준 ({RISK_LABELS[config.riskLevel]})
              </label>
              <input
                type="range"
                min={1}
                max={5}
                value={config.riskLevel}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    riskLevel: Number(e.target.value),
                  }))
                }
                className="w-full accent-accent"
              />
              <div className="flex justify-between text-[10px] text-text-muted">
                <span>1</span>
                <span>2</span>
                <span>3</span>
                <span>4</span>
                <span>5</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-text-muted block mb-1">
                벤치마크
              </label>
              <select
                value={config.benchmarkTicker}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, benchmarkTicker: e.target.value }))
                }
                className="w-full bg-bg-overlay border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
              >
                <option value="SPY">S&P 500 (SPY)</option>
                <option value="QQQ">나스닥 100 (QQQ)</option>
                <option value="VTI">미국 전체 (VTI)</option>
              </select>
            </div>
          </div>

          {/* Regime Allocation Editor Toggle */}
          <div className="border-t border-border-subtle pt-4 mb-4">
            <button
              onClick={() => setShowAllocEditor((v) => !v)}
              className="flex items-center gap-2 w-full text-left"
            >
              {showAllocEditor ? (
                <ChevronDown className="w-4 h-4 text-text-muted" />
              ) : (
                <ChevronRight className="w-4 h-4 text-text-muted" />
              )}
              <Settings2 className="w-4 h-4 text-text-secondary" />
              <span className="text-sm font-medium text-text-primary">
                레짐별 자산 배분 비율
              </span>
              {hasCustomAllocations() && (
                <span className="text-[10px] px-1.5 py-0.5 bg-accent/15 text-accent rounded-full font-medium">
                  수정됨
                </span>
              )}
            </button>

            {showAllocEditor && (
              <div className="mt-4 space-y-4">
                {/* Optimizer controls — top right above graph */}
                <div className="flex items-center justify-between gap-3 bg-bg-overlay/50 rounded-xl px-4 py-3 border border-border-subtle">
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-medium text-text-secondary">AI 최적화</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={optimizeTarget}
                      onChange={(e) => setOptimizeTarget(e.target.value as "sharpe" | "return" | "mdd")}
                      className="bg-bg-surface border border-border-subtle rounded-lg px-3 py-1.5 text-xs text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    >
                      <option value="sharpe">샤프 비율 최대화</option>
                      <option value="return">수익률 최대화</option>
                      <option value="mdd">MDD 최소화</option>
                    </select>
                    <button
                      onClick={handleOptimize}
                      disabled={optimizing || running}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-all shadow-sm shadow-amber-500/20"
                    >
                      {optimizing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      {optimizing ? "최적화 중..." : "최적 배분 찾기"}
                    </button>
                    {hasCustomAllocations() && (
                      <button
                        onClick={resetAllAllocations}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-muted hover:text-negative border border-border-subtle rounded-lg hover:border-negative/30 transition-all"
                      >
                        <RotateCcw className="w-3 h-3" />
                        전체 초기화
                      </button>
                    )}
                  </div>
                </div>

                {/* Regime tabs */}
                <div className="flex flex-wrap gap-1.5">
                  {REGIME_LIST.map((regime) => {
                    const regimeData = REGIMES[regime.id];
                    const isSelected = selectedRegime === regime.id;
                    const sum = getCurrentSum(regime.id);
                    const isValid = sum === 100;
                    return (
                      <button
                        key={regime.id}
                        onClick={() => setSelectedRegime(regime.id)}
                        className={`relative px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                          isSelected
                            ? "text-white shadow-sm"
                            : "text-text-muted hover:text-text-secondary bg-bg-overlay hover:bg-bg-overlay/80"
                        }`}
                        style={
                          isSelected
                            ? {
                                background: `linear-gradient(135deg, ${regimeData.gradientFrom}, ${regimeData.gradientTo})`,
                              }
                            : undefined
                        }
                      >
                        {regime.label}
                        {!isValid && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 bg-negative rounded-full" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Allocation editor for selected regime */}
                <div className="bg-bg-overlay/50 rounded-xl p-4 border border-border-subtle">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          background: `linear-gradient(135deg, ${REGIMES[selectedRegime].gradientFrom}, ${REGIMES[selectedRegime].gradientTo})`,
                        }}
                      />
                      <span className="text-sm font-medium text-text-primary">
                        {REGIMES[selectedRegime].nameKo}
                      </span>
                      <span className="text-xs text-text-muted">
                        ({REGIMES[selectedRegime].description.substring(0, 30)}...)
                      </span>
                    </div>
                    <button
                      onClick={() => resetRegime(selectedRegime)}
                      className="flex items-center gap-1 text-xs text-text-muted hover:text-accent transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      기본값
                    </button>
                  </div>

                  <div className="space-y-3">
                    {ASSET_CLASSES.map((ac) => {
                      const value = customAllocations[selectedRegime]?.[ac.key] ?? 0;
                      const defaultValue = REGIME_ALLOCATION_TEMPLATES[selectedRegime]?.[ac.key as keyof typeof REGIME_ALLOCATION_TEMPLATES.goldilocks] ?? 0;
                      const isModified = value !== defaultValue;
                      return (
                        <div key={ac.key} className="flex items-center gap-3">
                          <div className="w-16 flex items-center gap-1.5 shrink-0">
                            <div
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: ac.color }}
                            />
                            <span className={`text-xs ${isModified ? "text-accent font-medium" : "text-text-secondary"}`}>
                              {ac.label}
                            </span>
                          </div>
                          <div className="flex-1">
                            <input
                              type="range"
                              min={0}
                              max={80}
                              step={1}
                              value={value}
                              onChange={(e) =>
                                updateAllocation(selectedRegime, ac.key, Number(e.target.value))
                              }
                              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                              style={{
                                background: `linear-gradient(to right, ${ac.color} 0%, ${ac.color} ${(value / 80) * 100}%, var(--color-bg-surface) ${(value / 80) * 100}%, var(--color-bg-surface) 100%)`,
                              }}
                            />
                          </div>
                          <div className="w-16 shrink-0">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={value}
                              onChange={(e) =>
                                updateAllocation(selectedRegime, ac.key, Number(e.target.value))
                              }
                              className="w-full bg-bg-surface border border-border-subtle rounded px-2 py-1 text-xs text-text-primary font-mono text-right focus:outline-none focus:ring-1 focus:ring-accent/50"
                            />
                          </div>
                          <span className="text-xs text-text-muted w-3">%</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Sum indicator */}
                  <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between">
                    <span className="text-xs text-text-muted">합계</span>
                    <span
                      className={`text-sm font-mono font-semibold ${
                        getCurrentSum(selectedRegime) === 100
                          ? "text-positive"
                          : "text-negative"
                      }`}
                    >
                      {getCurrentSum(selectedRegime)}%
                      {getCurrentSum(selectedRegime) !== 100 && (
                        <span className="text-xs ml-1 font-normal">
                          ({getCurrentSum(selectedRegime) > 100 ? "+" : ""}
                          {getCurrentSum(selectedRegime) - 100}%)
                        </span>
                      )}
                    </span>
                  </div>

                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleRunBacktest}
              disabled={running || optimizing}
              className="flex items-center gap-2 px-5 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {running ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {running ? "실행 중..." : "백테스트 실행"}
            </button>
            <button
              onClick={() => setShowConfig(false)}
              className="px-4 py-2 text-sm text-text-muted hover:text-text-secondary transition-colors"
            >
              취소
            </button>
          </div>

          {error && (
            <div className="mt-3 flex items-start gap-2 p-3 bg-negative/10 border border-negative/20 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-negative shrink-0 mt-0.5" />
              <p className="text-sm text-negative">{error}</p>
            </div>
          )}
        </GlassCard>
      )}

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-text-muted gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>불러오는 중...</span>
        </div>
      ) : selectedRun ? (
        <>
          {/* Metrics Cards */}
          <MetricsRow run={selectedRun} />

          {/* Chart */}
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-text-primary">
                {selectedRun.name}
              </h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setChartMode("value")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    chartMode === "value"
                      ? "bg-accent/10 text-accent border border-accent/30"
                      : "text-text-muted hover:text-text-secondary border border-transparent"
                  }`}
                >
                  포트폴리오 가치
                </button>
                <button
                  onClick={() => setChartMode("drawdown")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    chartMode === "drawdown"
                      ? "bg-accent/10 text-accent border border-accent/30"
                      : "text-text-muted hover:text-text-secondary border border-transparent"
                  }`}
                >
                  낙폭 (Drawdown)
                </button>
              </div>
            </div>

            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                {chartMode === "value" ? (
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="benchmarkGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border-subtle)"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
                      tickFormatter={(v: string) => v.substring(0, 7)}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
                      tickFormatter={formatAxis}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--color-bg-surface)",
                        border: "1px solid var(--color-border-subtle)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(value: any, name: any) => [
                        formatCurrency(Number(value) || 0),
                        name === "portfolio" ? "포트폴리오" : "벤치마크",
                      ]}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      labelFormatter={(label: any) => `날짜: ${String(label)}`}
                    />
                    <Legend
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(value: any) =>
                        value === "portfolio" ? "포트폴리오" : "벤치마크"
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="portfolio"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="url(#portfolioGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="benchmark"
                      stroke="#94a3b8"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      fill="url(#benchmarkGrad)"
                    />
                    <ReferenceLine
                      y={selectedRun.initialCapital}
                      stroke="var(--color-text-muted)"
                      strokeDasharray="2 2"
                      strokeOpacity={0.5}
                    />
                  </AreaChart>
                ) : (
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="drawdownGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border-subtle)"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
                      tickFormatter={(v: string) => v.substring(0, 7)}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
                      tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--color-bg-surface)",
                        border: "1px solid var(--color-border-subtle)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(value: any) => [
                        `${(Number(value) || 0).toFixed(2)}%`,
                        "낙폭",
                      ]}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      labelFormatter={(label: any) => `날짜: ${String(label)}`}
                    />
                    <ReferenceLine y={0} stroke="var(--color-text-muted)" />
                    <Area
                      type="monotone"
                      dataKey="drawdown"
                      stroke="#ef4444"
                      strokeWidth={1.5}
                      fill="url(#drawdownGrad)"
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Regime timeline */}
            {chartData.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border-subtle">
                <p className="text-xs text-text-muted mb-2">기간별 레짐 변화</p>
                <div className="flex h-3 rounded-full overflow-hidden">
                  {(() => {
                    const segments: { regime: string; count: number }[] = [];
                    for (const d of chartData) {
                      const regime = d.regime || "goldilocks";
                      if (
                        segments.length > 0 &&
                        segments[segments.length - 1].regime === regime
                      ) {
                        segments[segments.length - 1].count++;
                      } else {
                        segments.push({ regime, count: 1 });
                      }
                    }
                    const total = segments.reduce((s, seg) => s + seg.count, 0);
                    return segments.map((seg, i) => {
                      const regimeData = REGIMES[seg.regime as RegimeId];
                      return (
                        <div
                          key={i}
                          className="h-full"
                          style={{
                            width: `${(seg.count / total) * 100}%`,
                            background: regimeData
                              ? `linear-gradient(135deg, ${regimeData.gradientFrom}, ${regimeData.gradientTo})`
                              : "#64748b",
                          }}
                          title={regimeData?.nameKo || seg.regime}
                        />
                      );
                    });
                  })()}
                </div>
                <div className="flex flex-wrap gap-3 mt-2">
                  {(() => {
                    const seen = new Set<string>();
                    return chartData
                      .map((d) => d.regime || "goldilocks")
                      .filter((r) => {
                        if (seen.has(r)) return false;
                        seen.add(r);
                        return true;
                      })
                      .map((r) => {
                        const regimeData = REGIMES[r as RegimeId];
                        return (
                          <div key={r} className="flex items-center gap-1.5">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{
                                background: regimeData
                                  ? regimeData.gradientFrom
                                  : "#64748b",
                              }}
                            />
                            <span className="text-[10px] text-text-muted">
                              {regimeData?.nameKo || r}
                            </span>
                          </div>
                        );
                      });
                  })()}
                </div>
              </div>
            )}
          </GlassCard>
        </>
      ) : (
        <GlassCard>
          <div className="flex flex-col items-center justify-center py-16 text-text-muted">
            <BarChart3 className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-sm mb-2">백테스트 결과가 없습니다</p>
            <p className="text-xs text-text-muted">
              &apos;새 백테스트&apos; 버튼을 클릭하여 시작하세요
            </p>
          </div>
        </GlassCard>
      )}

      {/* Run History */}
      {runs.length > 0 && (
        <GlassCard>
          <h3 className="text-base font-semibold text-text-primary mb-4">
            백테스트 이력
          </h3>
          <div className="space-y-1">
            {runs.map((run) => (
              <div
                key={run.id}
                onClick={() => loadRunDetail(run.id)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                  selectedRun?.id === run.id
                    ? "bg-accent/10 border border-accent/20"
                    : "hover:bg-bg-overlay"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      run.status === "completed"
                        ? "bg-positive"
                        : run.status === "running"
                          ? "bg-warning animate-pulse"
                          : "bg-text-muted"
                    }`}
                  />
                  <div className="min-w-0">
                    <span className="text-sm text-text-primary block truncate">
                      {run.name}
                    </span>
                    <span className="text-xs text-text-muted">
                      {run.startDate} ~ {run.endDate} · {RISK_LABELS[run.riskLevel]} ·{" "}
                      {REBALANCE_OPTIONS.find((o) => o.value === run.rebalancePeriod)?.label || run.rebalancePeriod}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  {run.totalReturnPct !== null && (
                    <span
                      className={`text-sm font-mono tabular-nums font-medium ${
                        run.totalReturnPct >= 0
                          ? "text-positive"
                          : "text-negative"
                      }`}
                    >
                      {run.totalReturnPct >= 0 ? "+" : ""}
                      {run.totalReturnPct.toFixed(1)}%
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(run.id);
                    }}
                    className="p-1 text-text-muted hover:text-negative transition-colors rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}

// === Sub Components ===

function MetricsRow({ run }: { run: BacktestRun }) {
  const metrics = [
    {
      label: "총 수익률",
      value: run.totalReturnPct,
      format: (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`,
      color: (v: number) => (v >= 0 ? "text-positive" : "text-negative"),
      icon: run.totalReturnPct && run.totalReturnPct >= 0 ? TrendingUp : TrendingDown,
    },
    {
      label: "연환산 수익률",
      value: run.annualizedReturnPct,
      format: (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`,
      color: (v: number) => (v >= 0 ? "text-positive" : "text-negative"),
    },
    {
      label: "샤프 비율",
      value: run.sharpeRatio,
      format: (v: number) => v.toFixed(4),
      color: (v: number) =>
        v >= 1 ? "text-positive" : v >= 0.5 ? "text-warning" : "text-negative",
    },
    {
      label: "변동성",
      value: run.volatilityPct,
      format: (v: number) => `${v.toFixed(2)}%`,
      color: () => "text-text-primary",
    },
    {
      label: "최대 낙폭 (MDD)",
      value: run.maxDrawdownPct,
      format: (v: number) => `-${v.toFixed(2)}%`,
      color: () => "text-negative",
    },
    {
      label: "최종 자산",
      value: run.finalValue,
      format: (v: number) => formatCurrency(v),
      color: () => "text-text-primary",
    },
  ];

  const benchmarks = [
    {
      label: `벤치마크 수익률 (${run.benchmarkTicker || "SPY"})`,
      value: run.benchmarkReturnPct,
      format: (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`,
    },
    {
      label: "벤치마크 샤프",
      value: run.benchmarkSharpe,
      format: (v: number) => v.toFixed(4),
    },
    {
      label: "벤치마크 MDD",
      value: run.benchmarkMddPct,
      format: (v: number) => `-${v.toFixed(2)}%`,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {metrics.map((m) => (
          <GlassCard key={m.label} className="!p-3">
            <p className="text-xs text-text-muted mb-1">{m.label}</p>
            <p
              className={`text-lg font-semibold font-mono tabular-nums ${
                m.value !== null ? m.color(m.value!) : "text-text-muted"
              }`}
            >
              {m.value !== null ? m.format(m.value!) : "-"}
            </p>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {benchmarks.map((b) => (
          <GlassCard key={b.label} className="!p-3">
            <p className="text-xs text-text-muted mb-1">{b.label}</p>
            <p className="text-sm font-medium font-mono tabular-nums text-text-secondary">
              {b.value !== null && b.value !== undefined ? b.format(b.value) : "-"}
            </p>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

