"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { GlassCard } from "@/components/shared/glass-card";
import { REGIMES, REGIME_ALLOCATION_TEMPLATES } from "@/lib/regimes";
import { ASSET_CLASS_LABELS, ASSET_CLASS_COLORS_HEX } from "@/lib/constants";
import type { RegimeId } from "@/types/regime";
import type { AssetClass } from "@/types/portfolio";

const REGIME_IDS: RegimeId[] = [
  "goldilocks",
  "disinflation_tightening",
  "inflation_boom",
  "overheating",
  "stagflation_lite",
  "stagflation",
  "reflation",
  "deflation_crisis",
];

const ASSET_CLASSES: AssetClass[] = [
  "stocks",
  "bonds",
  "realestate",
  "commodities",
  "crypto",
  "cash",
];

type WeightMap = Record<RegimeId, Record<AssetClass, number>>;

type Override = {
  regimeName: string;
  assetClass: string;
  weightPct: number;
};

function buildInitialWeights(): WeightMap {
  const weights = {} as WeightMap;
  for (const rid of REGIME_IDS) {
    const template = REGIME_ALLOCATION_TEMPLATES[rid];
    weights[rid] = {
      stocks: template.stocks,
      bonds: template.bonds,
      realestate: template.realestate,
      commodities: template.commodities,
      crypto: template.crypto,
      cash: template.cash,
    };
  }
  return weights;
}

export function RegimeWeightEditor() {
  const [activeRegime, setActiveRegime] = useState<RegimeId>("goldilocks");
  const [weights, setWeights] = useState<WeightMap>(buildInitialWeights);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load overrides from API
  useEffect(() => {
    async function loadOverrides() {
      try {
        const res = await fetch("/api/algorithm");
        const data = await res.json();
        if (data.overrides && data.overrides.length > 0) {
          setWeights((prev) => {
            const next = { ...prev };
            for (const rid of REGIME_IDS) {
              next[rid] = { ...prev[rid] };
            }
            for (const o of data.overrides as Override[]) {
              const rid = o.regimeName as RegimeId;
              const ac = o.assetClass as AssetClass;
              if (next[rid] && ASSET_CLASSES.includes(ac)) {
                next[rid][ac] = o.weightPct;
              }
            }
            return next;
          });
        }
      } catch {
        // Silently fail - defaults are already set
      } finally {
        setLoading(false);
      }
    }
    loadOverrides();
  }, []);

  const currentWeights = weights[activeRegime];

  const total = useMemo(() => {
    return ASSET_CLASSES.reduce((sum, ac) => sum + (currentWeights[ac] ?? 0), 0);
  }, [currentWeights]);

  const handleWeightChange = useCallback(
    (assetClass: AssetClass, value: number) => {
      const clamped = Math.max(0, Math.min(100, value));
      setWeights((prev) => ({
        ...prev,
        [activeRegime]: {
          ...prev[activeRegime],
          [assetClass]: clamped,
        },
      }));
      setSaveMessage(null);
    },
    [activeRegime]
  );

  const handleReset = useCallback(async () => {
    const template = REGIME_ALLOCATION_TEMPLATES[activeRegime];
    setWeights((prev) => ({
      ...prev,
      [activeRegime]: {
        stocks: template.stocks,
        bonds: template.bonds,
        realestate: template.realestate,
        commodities: template.commodities,
        crypto: template.crypto,
        cash: template.cash,
      },
    }));

    try {
      await fetch("/api/algorithm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resetOverrides",
          regimeName: activeRegime,
        }),
      });
      setSaveMessage("추천값으로 초기화되었습니다.");
    } catch {
      setSaveMessage("초기화 중 오류가 발생했습니다.");
    }
  }, [activeRegime]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveMessage(null);

    const overrides: Override[] = [];
    for (const rid of REGIME_IDS) {
      for (const ac of ASSET_CLASSES) {
        overrides.push({
          regimeName: rid,
          assetClass: ac,
          weightPct: weights[rid][ac],
        });
      }
    }

    try {
      const res = await fetch("/api/algorithm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "saveOverrides", overrides }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveMessage("저장되었습니다.");
      } else {
        setSaveMessage("저장에 실패했습니다.");
      }
    } catch {
      setSaveMessage("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }, [weights]);

  const isNotHundred = total !== 100;

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-text-primary">
          레짐별 자산배분 비중
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="text-sm text-text-muted hover:text-text-secondary transition-colors px-3 py-1.5 rounded-lg hover:bg-bg-overlay"
          >
            추천값으로 초기화
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-sm font-medium text-white bg-accent hover:bg-accent-hover disabled:opacity-50 transition-colors px-4 py-1.5 rounded-lg"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>

      {/* Regime tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-bg-overlay/60 backdrop-blur-sm border border-border-subtle mb-5">
        {REGIME_IDS.map((rid) => {
          const regime = REGIMES[rid];
          const isActive = activeRegime === rid;
          return (
            <button
              key={rid}
              onClick={() => setActiveRegime(rid)}
              className={`
                relative px-3 py-2 text-xs font-medium rounded-lg transition-all duration-200
                ${
                  isActive
                    ? "text-white shadow-sm"
                    : "text-text-muted hover:text-text-secondary hover:bg-white/5"
                }
              `}
              style={
                isActive
                  ? {
                      background: `linear-gradient(135deg, ${regime.gradientFrom}, ${regime.gradientTo})`,
                    }
                  : undefined
              }
            >
              {regime.nameKo}
            </button>
          );
        })}
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-text-muted text-sm">
          불러오는 중...
        </div>
      ) : (
        <>
          {/* Regime description */}
          <p className="text-sm text-text-muted mb-4">
            {REGIMES[activeRegime].description}
          </p>

          {/* Asset class rows */}
          <div className="space-y-3">
            {ASSET_CLASSES.map((ac) => {
              const label = ASSET_CLASS_LABELS[ac];
              const color = ASSET_CLASS_COLORS_HEX[ac];
              const value = currentWeights[ac] ?? 0;

              return (
                <div
                  key={ac}
                  className="flex items-center gap-3"
                >
                  {/* Color dot + label */}
                  <div className="flex items-center gap-2 w-24 shrink-0">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-sm text-text-secondary">
                      {label.nameKo}
                    </span>
                  </div>

                  {/* Visual bar */}
                  <div className="flex-1 h-7 bg-bg-overlay rounded-lg overflow-hidden relative">
                    <div
                      className="h-full rounded-lg transition-all duration-200"
                      style={{
                        width: `${Math.min(value, 100)}%`,
                        backgroundColor: color,
                        opacity: 0.6,
                      }}
                    />
                    {value > 5 && (
                      <span className="absolute inset-0 flex items-center pl-2 text-xs font-medium text-white/90">
                        {value}%
                      </span>
                    )}
                  </div>

                  {/* Number input */}
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={value}
                      onChange={(e) => {
                        const parsed = parseInt(e.target.value, 10);
                        handleWeightChange(ac, isNaN(parsed) ? 0 : parsed);
                      }}
                      className="w-16 bg-bg-overlay border border-border-subtle rounded-lg px-2 py-1.5 text-sm text-text-primary font-mono tabular-nums text-center focus:outline-none focus:ring-2 focus:ring-accent/50"
                    />
                    <span className="text-xs text-text-muted">%</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total row */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border-subtle">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-text-primary">합계</span>
              <span
                className={`text-sm font-mono tabular-nums font-semibold ${
                  isNotHundred ? "text-negative" : "text-positive"
                }`}
              >
                {total}%
              </span>
              {isNotHundred && (
                <span className="text-xs text-negative">
                  (합계가 100%가 아닙니다)
                </span>
              )}
            </div>
            {saveMessage && (
              <span
                className={`text-xs ${
                  saveMessage.includes("실패") || saveMessage.includes("오류")
                    ? "text-negative"
                    : "text-positive"
                }`}
              >
                {saveMessage}
              </span>
            )}
          </div>
        </>
      )}
    </GlassCard>
  );
}
