"use client";

import { useState, useEffect, useCallback } from "react";
import { GlassCard } from "@/components/shared/glass-card";
import { SectionHeader } from "@/components/shared/section-header";
import { RegimeWeightEditor } from "@/components/settings/regime-weight-editor";
import { AssetUniverseManager } from "@/components/settings/asset-universe-manager";
import { CountryWeightEditor } from "@/components/settings/country-weight-editor";
import {
  Brain,
  Loader2,
  Sparkles,
  Check,
  X,
  Trash2,
  Plus,
  ExternalLink,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Droplets,
  History,
  BookMarked,
  Settings,
  Sliders,
  BarChart3,
  Globe,
  Key,
  Layers,
  Gauge,
  ArrowRight,
} from "lucide-react";
import {
  REGIMES,
  REGIME_ALLOCATION_TEMPLATES,
  REGIME_COUNTRY_WEIGHTS,
  ALGORITHM_PARAMS,
} from "@/lib/regimes";
import { ASSET_CLASS_LABELS, ASSET_CLASS_COLORS_HEX, DEFAULT_COUNTRIES } from "@/lib/constants";
import type { RegimeId } from "@/types/regime";
import type { AssetClass } from "@/types/portfolio";
import { cn } from "@/lib/cn";

// ─── Types ────────────────────────────────────────────────────────────────────

type Override = {
  id: number;
  regimeName: string;
  assetClass: string;
  weightPct: number;
};

type Reference = {
  id: number;
  title: string;
  author: string | null;
  year: number | null;
  description: string | null;
  url: string | null;
  createdAt: string;
};

type ChangelogEntry = {
  id: number;
  userInput: string;
  aiAnalysis: string | null;
  appliedChanges: string | null;
  createdAt: string;
};

type SuggestedChange = {
  regime: string;
  assetClass: string;
  newPct: number;
};

type AnalysisResult = {
  analysis: string;
  changes: SuggestedChange[];
};

type TabId = "algorithm" | "allocation" | "country" | "universe" | "general";

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: typeof Brain }[] = [
  { id: "algorithm", label: "알고리즘", icon: Brain },
  { id: "allocation", label: "포트폴리오 배분", icon: Sliders },
  { id: "country", label: "국가별 배분", icon: Globe },
  { id: "universe", label: "자산 유니버스", icon: BarChart3 },
  { id: "general", label: "일반 설정", icon: Settings },
];

const ASSET_CLASSES: AssetClass[] = [
  "stocks",
  "bonds",
  "realestate",
  "commodities",
  "crypto",
  "cash",
];

const REGIME_ORDER: RegimeId[] = [
  "goldilocks",
  "disinflation_tightening",
  "inflation_boom",
  "overheating",
  "reflation",
  "deflation_crisis",
  "stagflation_lite",
  "stagflation",
];

const DEFAULT_REFERENCES: Omit<Reference, "id" | "createdAt">[] = [
  {
    title: "All Weather Portfolio Strategy",
    author: "Ray Dalio / Bridgewater",
    year: 2011,
    description:
      "경제 환경을 성장과 인플레이션 2축으로 나눈 올웨더 포트폴리오 전략. 본 시스템의 레짐 기반 자산배분 철학의 기초가 되는 자료.",
    url: "https://www.bridgewater.com/research-and-insights/the-all-weather-story",
  },
  {
    title: "Global Macro Regime Framework",
    author: "JP Morgan Asset Management",
    year: 2023,
    description:
      "매크로 레짐 기반 자산배분 프레임워크. 성장, 물가, 통화정책 축을 활용한 전술적 자산배분 방법론을 설명.",
    url: null,
  },
  {
    title: "Financial Conditions and Macro Forecasting",
    author: "Chicago Fed",
    year: 2020,
    description:
      "NFCI(National Financial Conditions Index)와 거시경제 예측의 관계. 본 시스템의 유동성 축 판정에 NFCI 지표를 활용하는 근거.",
    url: "https://www.chicagofed.org/research/data/nfci/current-data",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function PortfolioSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("algorithm");
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [references, setReferences] = useState<Reference[]>([]);
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // AI analysis state
  const [userInput, setUserInput] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null
  );
  const [applying, setApplying] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");

  // Reference form state
  const [showRefForm, setShowRefForm] = useState(false);
  const [refTitle, setRefTitle] = useState("");
  const [refAuthor, setRefAuthor] = useState("");
  const [refYear, setRefYear] = useState("");
  const [refDescription, setRefDescription] = useState("");
  const [refUrl, setRefUrl] = useState("");
  const [addingRef, setAddingRef] = useState(false);

  // Expanded sections state
  const [expandedChangelog, setExpandedChangelog] = useState<Set<number>>(
    new Set()
  );

  // ─── Data fetching ──────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/algorithm");
      if (res.ok) {
        const data = await res.json();
        setOverrides(data.overrides || []);
        setReferences(data.references || []);
        setChangelog(data.changelog || []);
      }
    } catch (e) {
      console.error("Failed to fetch algorithm data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const seedDefaultReferences = async () => {
    for (const ref of DEFAULT_REFERENCES) {
      try {
        await fetch("/api/algorithm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "addRef", ...ref }),
        });
      } catch (e) {
        console.error("Failed to seed reference:", e);
      }
    }
    const res = await fetch("/api/algorithm");
    if (res.ok) {
      const data = await res.json();
      setReferences(data.references || []);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!loading && references.length === 0) {
      seedDefaultReferences();
    }
  }, [loading]);

  // ─── Helpers ────────────────────────────────────────────────────────────────

  function getEffectiveAllocation(regimeId: RegimeId) {
    const base = REGIME_ALLOCATION_TEMPLATES[regimeId];
    const result = { ...base };
    const regimeOverrides = overrides.filter((o) => o.regimeName === regimeId);
    for (const o of regimeOverrides) {
      if (o.assetClass in result) {
        result[o.assetClass as AssetClass] = o.weightPct;
      }
    }
    return result;
  }

  function hasOverride(regimeId: RegimeId, assetClass: AssetClass): boolean {
    return overrides.some(
      (o) => o.regimeName === regimeId && o.assetClass === assetClass
    );
  }

  function getBaseValue(regimeId: RegimeId, assetClass: AssetClass): number {
    return REGIME_ALLOCATION_TEMPLATES[regimeId][assetClass];
  }

  // ─── AI Analysis handlers ──────────────────────────────────────────────────

  const handleAnalyze = async () => {
    if (!userInput.trim() || analyzing) return;
    setAnalyzing(true);
    setAnalyzeError("");
    setAnalysisResult(null);

    try {
      const res = await fetch("/api/algorithm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analyze", input: userInput.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        setAnalyzeError(err.error || "분석에 실패했습니다");
        return;
      }

      const data: AnalysisResult = await res.json();
      setAnalysisResult(data);
    } catch {
      setAnalyzeError("네트워크 오류가 발생했습니다");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApplyChanges = async () => {
    if (!analysisResult || applying) return;
    setApplying(true);

    try {
      const res = await fetch("/api/algorithm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "apply",
          changes: analysisResult.changes,
          userInput: userInput.trim(),
          aiAnalysis: analysisResult.analysis,
        }),
      });

      if (res.ok) {
        setAnalysisResult(null);
        setUserInput("");
        fetchData();
      }
    } catch (e) {
      console.error("Failed to apply changes:", e);
    } finally {
      setApplying(false);
    }
  };

  const handleDiscardAnalysis = () => {
    setAnalysisResult(null);
    setAnalyzeError("");
  };

  // ─── Override handlers ──────────────────────────────────────────────────────

  const handleResetRegime = async (regimeName: string) => {
    try {
      await fetch("/api/algorithm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resetOverrides", regimeName }),
      });
      fetchData();
    } catch (e) {
      console.error("Failed to reset overrides:", e);
    }
  };

  // ─── Reference handlers ─────────────────────────────────────────────────────

  const handleAddRef = async () => {
    if (!refTitle.trim() || addingRef) return;
    setAddingRef(true);

    try {
      const res = await fetch("/api/algorithm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addRef",
          title: refTitle.trim(),
          author: refAuthor.trim() || null,
          year: refYear ? Number(refYear) : null,
          description: refDescription.trim() || null,
          url: refUrl.trim() || null,
        }),
      });

      if (res.ok) {
        setRefTitle("");
        setRefAuthor("");
        setRefYear("");
        setRefDescription("");
        setRefUrl("");
        setShowRefForm(false);
        fetchData();
      }
    } catch (e) {
      console.error("Failed to add reference:", e);
    } finally {
      setAddingRef(false);
    }
  };

  const handleDeleteRef = async (id: number) => {
    try {
      await fetch("/api/algorithm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteRef", id }),
      });
      setReferences((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      console.error("Failed to delete reference:", e);
    }
  };

  // ─── Changelog handlers ─────────────────────────────────────────────────────

  const handleDeleteChangelog = async (id: number) => {
    try {
      await fetch(`/api/algorithm?id=${id}`, { method: "DELETE" });
      setChangelog((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      console.error("Failed to delete changelog:", e);
    }
  };

  const toggleChangelog = (id: number) => {
    setExpandedChangelog((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // ─── Collapsible section state ─────────────────────────────────────────────
  const [algoSections, setAlgoSections] = useState<Set<string>>(new Set(["overview"]));
  function toggleAlgoSection(id: string) {
    setAlgoSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const COUNTRY_LABELS: Record<string, string> = { US: "미국", EU: "유럽", JP: "일본", KR: "한국", CN: "중국", IN: "인도" };

  // ─── Tab: 알고리즘 ──────────────────────────────────────────────────────────

  function renderAlgorithmTab() {
    if (loading) {
      return (
        <GlassCard>
          <div className="flex items-center justify-center py-12 gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
            <span className="text-text-muted">데이터를 불러오는 중...</span>
          </div>
        </GlassCard>
      );
    }

    return (
      <div className="space-y-4">
        {/* ═══ 1. 알고리즘 파이프라인 개요 ═══ */}
        <AlgoSection
          id="overview"
          title="알고리즘 파이프라인"
          subtitle="FRED 경제 데이터 → 3축 판단 → 레짐 결정 → 자산배분 → 리스크 조정 → 최종 포트폴리오"
          icon={<Layers className="w-5 h-5 text-accent" />}
          expanded={algoSections.has("overview")}
          onToggle={() => toggleAlgoSection("overview")}
        >
          <div className="space-y-4">
            {/* Flow steps */}
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {[
                { label: "FRED 경제 데이터", sub: "GDP, CPI, NFCI 등" },
                { label: "3축 판단", sub: "성장 × 물가 × 유동성" },
                { label: "8개 레짐 결정", sub: "골디락스~디플레 경색" },
                { label: "자산군 배분", sub: "6개 자산군 비중" },
                { label: "국가별 배분", sub: "레짐별 차등 비중" },
                { label: "리스크 조정", sub: "1~5단계 멀티플라이어" },
                { label: "최종 포트폴리오", sub: "19개 ETF 티커" },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="bg-bg-overlay border border-border-subtle rounded-lg px-3 py-2 text-center min-w-[110px]">
                    <p className="font-medium text-text-primary text-xs">{step.label}</p>
                    <p className="text-[10px] text-text-muted mt-0.5">{step.sub}</p>
                  </div>
                  {i < 6 && <ArrowRight className="w-3.5 h-3.5 text-text-muted shrink-0" />}
                </div>
              ))}
            </div>

            {/* 3 axis cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
              <div className="p-3 rounded-lg bg-bg-overlay/50 border border-border-subtle">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-positive" />
                  <span className="text-text-primary font-medium text-sm">성장 축</span>
                </div>
                <p className="text-xs text-text-secondary">
                  미국: 실질 GDP &gt; <span className="font-mono text-accent">{ALGORITHM_PARAMS.growth.usThreshold}%</span> → High
                </p>
                <p className="text-[10px] text-text-muted mt-1">기타 국가: YoY GDP vs 역사적 평균</p>
              </div>
              <div className="p-3 rounded-lg bg-bg-overlay/50 border border-border-subtle">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-4 h-4 text-warning" />
                  <span className="text-text-primary font-medium text-sm">물가 축</span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-[10px]">
                  {Object.entries(ALGORITHM_PARAMS.inflation.thresholds).map(([c, t]) => (
                    <div key={c} className="flex items-center gap-1">
                      <span className="text-text-muted">{COUNTRY_LABELS[c] || c}:</span>
                      <span className="font-mono text-text-primary">{t}%</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-text-muted mt-1">YoY CPI &gt; 임계값 → High</p>
              </div>
              <div className="p-3 rounded-lg bg-bg-overlay/50 border border-border-subtle">
                <div className="flex items-center gap-2 mb-2">
                  <Droplets className="w-4 h-4 text-accent" />
                  <span className="text-text-primary font-medium text-sm">유동성 축</span>
                </div>
                <p className="text-xs text-text-secondary">
                  5개 시그널 중 <span className="font-mono text-accent">{ALGORITHM_PARAMS.liquidity.minSignalsForExpanding}개</span> 이상 easing → Expanding
                </p>
                <p className="text-[10px] text-text-muted mt-1">Fed자산, 역레포, NFCI, HY스프레드, SOFR</p>
              </div>
            </div>
          </div>
        </AlgoSection>

        {/* ═══ 2. 유동성 시그널 상세 ═══ */}
        <AlgoSection
          id="liquidity"
          title="유동성 판단 시그널 (3-of-5 룰)"
          subtitle="5개 시그널 중 3개 이상 easing이면 유동성 expanding"
          icon={<Droplets className="w-5 h-5 text-accent" />}
          expanded={algoSections.has("liquidity")}
          onToggle={() => toggleAlgoSection("liquidity")}
        >
          <div className="space-y-2">
            {ALGORITHM_PARAMS.liquidity.signals.map((sig, i) => (
              <div key={sig.id} className="flex items-start gap-3 bg-bg-overlay/50 rounded-lg p-3">
                <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center text-accent text-xs font-bold shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-text-primary">{sig.name}</span>
                    <span className="text-[10px] font-mono text-text-muted bg-bg-surface px-1.5 py-0.5 rounded">{sig.id}</span>
                  </div>
                  <p className="text-xs text-text-muted mt-1">
                    Lookback: <span className="font-mono">{sig.lookback}</span>개 관측치 · {sig.condition}
                  </p>
                </div>
              </div>
            ))}
            <div className="bg-accent/5 border border-accent/20 rounded-lg p-3 mt-2">
              <p className="text-xs text-text-secondary">
                <span className="font-semibold text-accent">판정:</span> 위 5개 시그널 중{" "}
                <span className="font-mono font-bold">{ALGORITHM_PARAMS.liquidity.minSignalsForExpanding}개</span> 이상 easing →{" "}
                <span className="font-semibold text-positive">expanding</span>,
                미만 → <span className="font-semibold text-negative">contracting</span>
              </p>
            </div>
          </div>
        </AlgoSection>

        {/* ═══ 2.5. 레짐별 자산 배분 매핑 ═══ */}
        <AlgoSection
          id="asset-alloc"
          title="레짐별 자산 배분 매핑"
          subtitle="8개 레짐 × 6개 자산군 기본 배분 비율"
          icon={<Sliders className="w-5 h-5 text-accent" />}
          expanded={algoSections.has("asset-alloc")}
          onToggle={() => toggleAlgoSection("asset-alloc")}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left py-2 px-2 text-text-muted font-medium">레짐</th>
                  {ASSET_CLASSES.map((ac) => (
                    <th key={ac} className="text-center py-2 px-1 text-text-muted font-medium">{ASSET_CLASS_LABELS[ac].nameKo}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {REGIME_ORDER.map((rid) => {
                  const r = REGIMES[rid];
                  const alloc = REGIME_ALLOCATION_TEMPLATES[rid];
                  return (
                    <tr key={rid} className="border-b border-border-subtle/50">
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: `linear-gradient(135deg, ${r.gradientFrom}, ${r.gradientTo})` }} />
                          <div>
                            <span className="text-text-primary">{r.nameKo}</span>
                            <span className="text-[9px] text-text-muted ml-1">
                              {r.growth === "high" ? "고" : "저"}성장/{r.inflation === "high" ? "고" : "저"}물가/{r.liquidity === "expanding" ? "확장" : "축소"}
                            </span>
                          </div>
                        </div>
                      </td>
                      {ASSET_CLASSES.map((ac) => {
                        const val = alloc[ac];
                        return (
                          <td key={ac} className="text-center py-2 px-1">
                            <div className="flex flex-col items-center">
                              <div className="w-full h-1 bg-bg-overlay rounded-full mb-0.5">
                                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(val / 55 * 100, 100)}%`, backgroundColor: ASSET_CLASS_COLORS_HEX[ac], opacity: 0.7 }} />
                              </div>
                              <span className={cn("font-mono tabular-nums", val >= 30 ? "text-accent font-semibold" : val <= 5 ? "text-text-muted" : "text-text-secondary")}>
                                {val}%
                              </span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-[10px] text-text-muted mt-2">
              ※ 인플레이션 레짐에서는 현물(금/구리/원유) 비중이 높고, 디플레 환경에서는 채권+현금 중심. 포트폴리오 배분 탭에서 수동 조정 가능.
            </p>
          </div>
        </AlgoSection>

        {/* ═══ 3. 레짐별 국가 배분 ═══ */}
        <AlgoSection
          id="country"
          title="레짐별 국가 자동 배분"
          subtitle="주식 자산군 내 국가 비중이 레짐에 따라 자동 조정됨"
          icon={<Globe className="w-5 h-5 text-accent" />}
          expanded={algoSections.has("country")}
          onToggle={() => toggleAlgoSection("country")}
        >
          <div className="space-y-3">
            <p className="text-xs text-text-muted">
              인플레이션 레짐에서는 원자재 수출국(인도) 비중 증가, 위기 시에는 안전자산(미국, 일본)에 집중합니다.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border-subtle">
                    <th className="text-left py-2 px-2 text-text-muted font-medium">레짐</th>
                    {(["US", "EU", "JP", "KR", "CN", "IN"] as const).map((c) => (
                      <th key={c} className="text-center py-2 px-1 text-text-muted font-medium">{COUNTRY_LABELS[c]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {REGIME_ORDER.map((rid) => {
                    const r = REGIMES[rid];
                    const cw = REGIME_COUNTRY_WEIGHTS[rid];
                    return (
                      <tr key={rid} className="border-b border-border-subtle/50">
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: `linear-gradient(135deg, ${r.gradientFrom}, ${r.gradientTo})` }} />
                            <span className="text-text-primary">{r.nameKo}</span>
                          </div>
                        </td>
                        {(["US", "EU", "JP", "KR", "CN", "IN"] as const).map((c) => {
                          const val = cw[c];
                          return (
                            <td key={c} className="text-center py-2 px-1">
                              <span className={cn(
                                "font-mono tabular-nums",
                                val >= 20 ? "text-accent font-semibold" : val <= 5 ? "text-text-muted" : "text-text-secondary"
                              )}>
                                {val}%
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </AlgoSection>

        {/* ═══ 4. 리스크 멀티플라이어 ═══ */}
        <AlgoSection
          id="risk"
          title="리스크 조정 멀티플라이어"
          subtitle="위험 선호도(1~5)에 따라 자산군별 가중치를 조정"
          icon={<Gauge className="w-5 h-5 text-accent" />}
          expanded={algoSections.has("risk")}
          onToggle={() => toggleAlgoSection("risk")}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left py-2 px-2 text-text-muted font-medium">레벨</th>
                  {ASSET_CLASSES.map((ac) => (
                    <th key={ac} className="text-center py-2 px-2 text-text-muted font-medium">{ASSET_CLASS_LABELS[ac].nameKo}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((level) => {
                  const mult = ALGORITHM_PARAMS.risk.multipliers[level];
                  return (
                    <tr key={level} className={cn("border-b border-border-subtle/50", level === 3 && "bg-accent/5")}>
                      <td className="py-2 px-2">
                        <span className={cn("font-medium", level === 3 ? "text-accent" : "text-text-primary")}>
                          {level === 1 ? "1 (보수적)" : level === 3 ? "3 (중립)" : level === 5 ? "5 (공격적)" : String(level)}
                        </span>
                      </td>
                      {ASSET_CLASSES.map((ac) => {
                        const v = mult[ac];
                        return (
                          <td key={ac} className="text-center py-2 px-2">
                            <span className={cn(
                              "font-mono tabular-nums",
                              v > 1.0 ? "text-positive" : v < 1.0 ? "text-negative" : "text-text-secondary"
                            )}>
                              ×{v.toFixed(1)}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-[10px] text-text-muted mt-2">
              ※ 레짐 기본 배분 × 멀티플라이어 → 100%로 재정규화. 레벨 3은 무조정.
            </p>
          </div>
        </AlgoSection>

        {/* ═══ 5. AI 알고리즘 업데이트 ═══ */}
        <AlgoSection
          id="update"
          title="알고리즘 업데이트"
          subtitle="새로운 시장 정보를 반영하여 AI로 알고리즘 파라미터를 개선"
          icon={<Sparkles className="w-5 h-5 text-accent" />}
          expanded={algoSections.has("update")}
          onToggle={() => toggleAlgoSection("update")}
        >
          <div className="space-y-4">
            <p className="text-xs text-text-muted">
              시장 환경 변화, 새로운 연구 결과, 전략 변경 등을 텍스트로 입력하면
              Gemini AI가 분석하여 레짐 판단 로직이나 배분 비율을 어떻게 개선할지 제안합니다.
            </p>
            <div className="space-y-2">
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="예: 연준이 양적긴축을 종료했으니 유동성 판단에서 Fed Balance Sheet 가중치를 높여야 해. 또한 금값이 사상 최고치인데 골디락스에서도 금 비중을 올리고 싶어."
                className="w-full px-4 py-3 rounded-xl bg-bg-overlay border border-border-subtle text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-accent/50 transition-colors resize-none"
                rows={3}
                disabled={analyzing || applying}
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={handleAnalyze}
                  disabled={!userInput.trim() || analyzing || applying}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {analyzing ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /><span>AI 분석 중...</span></>
                  ) : (
                    <><Sparkles className="w-4 h-4" /><span>AI 분석</span></>
                  )}
                </button>
              </div>

              {analyzeError && (
                <div className="p-3 rounded-lg bg-negative/10 border border-negative/20">
                  <p className="text-sm text-negative">{analyzeError}</p>
                </div>
              )}

              {analysisResult && (
                <div className="p-4 rounded-xl bg-bg-overlay/50 border border-accent/20 space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-accent" />
                    <h4 className="text-sm font-semibold text-text-primary">AI 분석 결과</h4>
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed">{analysisResult.analysis}</p>
                  {analysisResult.changes.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-xs font-semibold text-text-muted uppercase tracking-wider">제안된 변경사항</h5>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border-subtle">
                              <th className="text-left py-2 px-2 text-xs text-text-muted font-medium">레짐</th>
                              <th className="text-left py-2 px-2 text-xs text-text-muted font-medium">자산군</th>
                              <th className="text-right py-2 px-2 text-xs text-text-muted font-medium">현재</th>
                              <th className="text-right py-2 px-2 text-xs text-text-muted font-medium">변경</th>
                              <th className="text-right py-2 px-2 text-xs text-text-muted font-medium">차이</th>
                            </tr>
                          </thead>
                          <tbody>
                            {analysisResult.changes.map((change, i) => {
                              const regimeKey = change.regime as RegimeId;
                              const acKey = change.assetClass as AssetClass;
                              const currentVal = REGIMES[regimeKey] ? getEffectiveAllocation(regimeKey)[acKey] : 0;
                              const diff = change.newPct - currentVal;
                              return (
                                <tr key={i} className="border-b border-border-subtle/30">
                                  <td className="py-2 px-2 text-xs text-text-primary">{REGIMES[regimeKey]?.nameKo || change.regime}</td>
                                  <td className="py-2 px-2 text-xs text-text-secondary">{ASSET_CLASS_LABELS[acKey]?.nameKo || change.assetClass}</td>
                                  <td className="py-2 px-2 text-xs text-text-muted text-right font-mono tabular-nums">{currentVal}%</td>
                                  <td className="py-2 px-2 text-xs text-text-primary text-right font-mono tabular-nums font-semibold">{change.newPct}%</td>
                                  <td className={cn("py-2 px-2 text-xs text-right font-mono tabular-nums", diff > 0 ? "text-positive" : diff < 0 ? "text-negative" : "text-text-muted")}>
                                    {diff > 0 ? "+" : ""}{diff}%
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3 pt-2">
                    <button onClick={handleApplyChanges} disabled={applying} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-positive text-white text-sm font-medium hover:bg-positive/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                      {applying ? <><Loader2 className="w-4 h-4 animate-spin" /><span>적용 중...</span></> : <><Check className="w-4 h-4" /><span>적용</span></>}
                    </button>
                    <button onClick={handleDiscardAnalysis} disabled={applying} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-bg-overlay text-text-secondary text-sm font-medium hover:bg-bg-elevated transition-colors border border-border-subtle">
                      <X className="w-4 h-4" /><span>취소</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </AlgoSection>

        {/* ═══ 6. 변경 이력 ═══ */}
        <AlgoSection
          id="history"
          title="변경 이력"
          subtitle={changelog.length > 0 ? `총 ${changelog.length}건의 알고리즘 업데이트` : "아직 변경 이력 없음"}
          icon={<History className="w-5 h-5 text-text-muted" />}
          expanded={algoSections.has("history")}
          onToggle={() => toggleAlgoSection("history")}
        >
          {changelog.length === 0 ? (
            <div className="text-center py-6">
              <History className="w-8 h-8 text-text-muted mx-auto mb-2" />
              <p className="text-sm text-text-muted">아직 변경 이력이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-2">
              {changelog.map((entry) => {
                const isExpanded = expandedChangelog.has(entry.id);
                let parsedChanges: SuggestedChange[] = [];
                try { if (entry.appliedChanges) parsedChanges = JSON.parse(entry.appliedChanges); } catch { /* ignore */ }
                return (
                  <div key={entry.id} className="bg-bg-overlay/50 rounded-lg overflow-hidden">
                    <button onClick={() => toggleChangelog(entry.id)} className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-bg-overlay transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] text-text-muted">{formatDate(entry.createdAt)}</span>
                          {parsedChanges.length > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent">{parsedChanges.length}개 변경</span>
                          )}
                        </div>
                        <p className="text-xs text-text-primary truncate">{entry.userInput}</p>
                      </div>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-text-muted shrink-0 ml-2" /> : <ChevronDown className="w-3.5 h-3.5 text-text-muted shrink-0 ml-2" />}
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-3 border-t border-border-subtle/50 space-y-2">
                        {entry.aiAnalysis && (
                          <div className="mt-2">
                            <p className="text-[10px] text-text-muted mb-1 font-medium">AI 분석</p>
                            <p className="text-xs text-text-secondary leading-relaxed">{entry.aiAnalysis}</p>
                          </div>
                        )}
                        {parsedChanges.length > 0 && (
                          <div>
                            <p className="text-[10px] text-text-muted mb-1 font-medium">적용된 변경</p>
                            <div className="flex flex-wrap gap-1.5">
                              {parsedChanges.map((c, i) => (
                                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-bg-surface border border-border-subtle text-text-secondary">
                                  {REGIMES[c.regime as RegimeId]?.nameKo || c.regime} / {ASSET_CLASS_LABELS[c.assetClass as AssetClass]?.nameKo || c.assetClass} → <span className="font-mono tabular-nums font-semibold text-text-primary">{c.newPct}%</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="flex justify-end">
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteChangelog(entry.id); }} className="flex items-center gap-1 text-[10px] text-text-muted hover:text-negative transition-colors">
                            <Trash2 className="w-3 h-3" />삭제
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </AlgoSection>

        {/* ═══ 7. 참고자료 ═══ */}
        <AlgoSection
          id="references"
          title="참고자료"
          subtitle="알고리즘 설계의 근거가 되는 연구 및 자료"
          icon={<BookMarked className="w-5 h-5 text-text-muted" />}
          expanded={algoSections.has("references")}
          onToggle={() => toggleAlgoSection("references")}
          action={
            <button onClick={(e) => { e.stopPropagation(); setShowRefForm(!showRefForm); }} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-accent hover:bg-accent/10 transition-colors">
              <Plus className="w-3 h-3" />추가
            </button>
          }
        >
          <div className="space-y-2">
            {showRefForm && (
              <div className="bg-bg-overlay/50 rounded-lg p-3 space-y-2 mb-3">
                <input value={refTitle} onChange={(e) => setRefTitle(e.target.value)} placeholder="제목 *" className="w-full bg-bg-surface border border-border-subtle rounded px-2.5 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50" />
                <div className="grid grid-cols-2 gap-2">
                  <input value={refAuthor} onChange={(e) => setRefAuthor(e.target.value)} placeholder="저자" className="bg-bg-surface border border-border-subtle rounded px-2.5 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50" />
                  <input value={refYear} onChange={(e) => setRefYear(e.target.value)} placeholder="연도" type="number" className="bg-bg-surface border border-border-subtle rounded px-2.5 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50" />
                </div>
                <textarea value={refDescription} onChange={(e) => setRefDescription(e.target.value)} placeholder="설명" rows={2} className="w-full bg-bg-surface border border-border-subtle rounded px-2.5 py-1.5 text-sm text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:border-accent/50" />
                <input value={refUrl} onChange={(e) => setRefUrl(e.target.value)} placeholder="URL" className="w-full bg-bg-surface border border-border-subtle rounded px-2.5 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50" />
                <div className="flex gap-2">
                  <button onClick={handleAddRef} disabled={!refTitle.trim() || addingRef} className="flex items-center gap-1 px-3 py-1.5 bg-accent/10 hover:bg-accent/20 text-accent rounded text-xs font-medium transition-colors disabled:opacity-50">
                    {addingRef ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} 추가
                  </button>
                  <button onClick={() => setShowRefForm(false)} className="px-3 py-1.5 bg-bg-surface hover:bg-bg-overlay text-text-muted rounded text-xs transition-colors">취소</button>
                </div>
              </div>
            )}
            {references.length === 0 ? (
              <div className="text-center py-6">
                <BookMarked className="w-8 h-8 text-text-muted mx-auto mb-2" />
                <p className="text-sm text-text-muted">참고자료가 없습니다</p>
              </div>
            ) : (
              references.map((ref) => (
                <div key={ref.id} className="flex items-start gap-3 bg-bg-overlay/50 rounded-lg p-3 group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary">{ref.title}</span>
                      {ref.url && (
                        <a href={ref.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent/80 transition-colors">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <p className="text-[10px] text-text-muted mt-0.5">{[ref.author, ref.year].filter(Boolean).join(", ")}</p>
                    {ref.description && <p className="text-xs text-text-secondary mt-1">{ref.description}</p>}
                  </div>
                  <button onClick={() => handleDeleteRef(ref.id)} className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-negative transition-all p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </AlgoSection>
      </div>
    );
  }

  // ─── Tab: 포트폴리오 배분 ───────────────────────────────────────────────────

  function renderAllocationTab() {
    return <RegimeWeightEditor />;
  }

  // ─── Tab: 국가별 배분 ──────────────────────────────────────────────────────

  function renderCountryTab() {
    return <CountryWeightEditor />;
  }

  // ─── Tab: 자산 유니버스 ──────────────────────────────────────────────────────

  function renderUniverseTab() {
    return <AssetUniverseManager />;
  }

  // ─── Tab: 일반 설정 ─────────────────────────────────────────────────────────

  function renderGeneralTab() {
    return (
      <div className="space-y-6">
        {/* Investment Settings */}
        <GlassCard>
          <h3 className="text-base font-semibold text-text-primary mb-4">투자 설정</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-text-muted block mb-1.5">기본 투자 금액</label>
              <input
                type="text"
                defaultValue="100,000,000"
                className="w-full bg-bg-overlay border border-border-subtle rounded-lg px-4 py-2.5 text-text-primary font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm text-text-muted block mb-1.5">통화</label>
                <select className="w-full bg-bg-overlay border border-border-subtle rounded-lg px-4 py-2.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50">
                  <option value="KRW">KRW (원)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="text-sm text-text-muted block mb-1.5">자동 재계산</label>
                <div className="flex items-center gap-2 py-2.5">
                  <div className="relative w-10 h-5 bg-accent rounded-full cursor-pointer">
                    <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform" />
                  </div>
                  <span className="text-sm text-text-secondary">레짐 변경 시 자동 재계산</span>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Risk Tolerance */}
        <GlassCard>
          <h3 className="text-base font-semibold text-text-primary mb-4">리스크 허용도</h3>
          <div className="space-y-3">
            <input type="range" min="1" max="5" defaultValue="3" className="w-full accent-accent" />
            <div className="flex justify-between text-xs text-text-muted">
              <span>보수적</span><span>약보수</span><span>중립</span><span>약공격</span><span>공격적</span>
            </div>
          </div>
        </GlassCard>

        {/* Country Management */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-text-muted" />
              <h3 className="text-base font-semibold text-text-primary">국가 관리</h3>
            </div>
            <button className="text-sm text-accent hover:text-accent-hover transition-colors">+ 국가 추가</button>
          </div>
          <div className="space-y-1">
            {DEFAULT_COUNTRIES.map((country) => (
              <div key={country.code} className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-bg-overlay transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{country.flag}</span>
                  <span className="text-sm font-medium text-text-primary">{country.nameKo}</span>
                  <span className="text-xs text-text-muted">{country.code}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-4 bg-positive/20 rounded-full relative cursor-pointer">
                    <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-positive rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* API Keys */}
        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <Key className="w-4 h-4 text-text-muted" />
            <h3 className="text-base font-semibold text-text-primary">API 설정</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-text-muted block mb-1.5">FRED API Key</label>
              <input type="password" placeholder="FRED API 키를 입력하세요" className="w-full bg-bg-overlay border border-border-subtle rounded-lg px-4 py-2.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50" />
            </div>
            <div>
              <label className="text-sm text-text-muted block mb-1.5">Google Gemini API Key</label>
              <input type="password" placeholder="Gemini API 키를 입력하세요" className="w-full bg-bg-overlay border border-border-subtle rounded-lg px-4 py-2.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50" />
            </div>
            <div>
              <label className="text-sm text-text-muted block mb-1.5">데이터 새로고침 주기</label>
              <select className="w-full bg-bg-overlay border border-border-subtle rounded-lg px-4 py-2.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50">
                <option>6시간마다</option><option>12시간마다</option><option>매일</option><option>수동</option>
              </select>
            </div>
          </div>
        </GlassCard>
      </div>
    );
  }

  // ─── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <SectionHeader
        title="포트폴리오 설정"
        description="알고리즘, 레짐 배분 비율, 자산 유니버스, 일반 설정"
      />

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-bg-overlay/50 rounded-xl border border-border-subtle">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex-1 justify-center",
                activeTab === tab.id
                  ? "bg-accent/10 text-accent border border-accent/30"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-overlay border border-transparent"
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "algorithm" && renderAlgorithmTab()}
      {activeTab === "allocation" && renderAllocationTab()}
      {activeTab === "country" && renderCountryTab()}
      {activeTab === "universe" && renderUniverseTab()}
      {activeTab === "general" && renderGeneralTab()}
    </div>
  );
}

// ─── AlgoSection: collapsible card for algorithm tab ────────────────────────

function AlgoSection({
  id,
  title,
  subtitle,
  icon,
  expanded,
  onToggle,
  action,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <GlassCard className="!p-0 overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}
        className="flex items-center gap-3 w-full text-left px-5 py-4 hover:bg-bg-overlay/30 transition-colors cursor-pointer select-none"
      >
        {expanded ? <ChevronDown className="w-4 h-4 text-text-muted shrink-0" /> : <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />}
        {icon}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary">{title}</p>
          {subtitle && <p className="text-[11px] text-text-muted truncate">{subtitle}</p>}
        </div>
        {action && <div onClick={(e) => e.stopPropagation()}>{action}</div>}
      </div>
      {expanded && <div className="px-5 pb-5 border-t border-border-subtle/50 pt-4">{children}</div>}
    </GlassCard>
  );
}
