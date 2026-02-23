"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { GlassCard } from "@/components/shared/glass-card";
import { DEFAULT_COUNTRIES } from "@/lib/constants";
import { REGIMES, REGIME_COUNTRY_WEIGHTS } from "@/lib/regimes";
import type { RegimeId } from "@/types/regime";
import { Globe, RotateCcw, Loader2, Info } from "lucide-react";
import { cn } from "@/lib/cn";

type CountryRow = {
  id: number;
  code: string;
  name: string;
  nameKo: string;
  flag: string;
  weightOverride: number | null;
  isActive: boolean;
};

const REGIME_ORDER: RegimeId[] = [
  "goldilocks", "disinflation_tightening", "inflation_boom", "overheating",
  "stagflation_lite", "stagflation", "reflation", "deflation_crisis",
];

const COUNTRY_CODES = ["US", "EU", "JP", "KR", "CN", "IN"] as const;

export function CountryWeightEditor() {
  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [currentRegime, setCurrentRegime] = useState<RegimeId | null>(null);

  // Fetch countries + current regime
  useEffect(() => {
    async function load() {
      try {
        const [countriesRes, regimeRes] = await Promise.all([
          fetch("/api/countries"),
          fetch("/api/regime"),
        ]);
        const countriesData = await countriesRes.json();
        const regimeData = await regimeRes.json();

        if (countriesData.countries && countriesData.countries.length > 0) {
          setCountries(countriesData.countries);
        } else {
          for (const c of DEFAULT_COUNTRIES) {
            await fetch("/api/countries", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                code: c.code, name: c.name, nameKo: c.nameKo, flag: c.flag,
              }),
            });
          }
          const res2 = await fetch("/api/countries");
          const data2 = await res2.json();
          setCountries(data2.countries || []);
        }

        if (regimeData.currentRegime?.regimeName) {
          setCurrentRegime(regimeData.currentRegime.regimeName as RegimeId);
        }
      } catch {
        // fallback
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const activeCountries = useMemo(
    () => countries.filter((c) => c.isActive),
    [countries]
  );

  // Auto weight from current regime
  const getAutoWeight = useCallback(
    (code: string) => {
      if (!currentRegime) return null;
      const cw = REGIME_COUNTRY_WEIGHTS[currentRegime];
      return cw[code as keyof typeof cw] ?? null;
    },
    [currentRegime]
  );

  const getEffectiveWeight = useCallback(
    (c: CountryRow) => {
      if (!c.isActive) return 0;
      if (c.weightOverride !== null) return c.weightOverride;
      const auto = getAutoWeight(c.code);
      if (auto !== null) return auto;
      if (activeCountries.length === 0) return 0;
      return Math.round((100 / activeCountries.length) * 10) / 10;
    },
    [activeCountries, getAutoWeight]
  );

  const totalWeight = useMemo(() => {
    return activeCountries.reduce((sum, c) => sum + getEffectiveWeight(c), 0);
  }, [activeCountries, getEffectiveWeight]);

  const handleWeightChange = (id: number, value: number | null) => {
    setCountries((prev) =>
      prev.map((c) => (c.id === id ? { ...c, weightOverride: value } : c))
    );
    setSaveMessage(null);
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    setCountries((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isActive } : c))
    );
    try {
      await fetch("/api/countries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive }),
      });
    } catch {
      setCountries((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isActive: !isActive } : c))
      );
    }
  };

  const handleResetWeights = async () => {
    setCountries((prev) =>
      prev.map((c) => ({ ...c, weightOverride: null }))
    );
    for (const c of countries) {
      if (c.weightOverride !== null) {
        try {
          await fetch("/api/countries", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: c.id, weightOverride: null }),
          });
        } catch { /* ignore */ }
      }
    }
    setSaveMessage("레짐 기반 자동 배분으로 초기화되었습니다.");
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      for (const c of countries) {
        await fetch("/api/countries", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: c.id, weightOverride: c.weightOverride }),
        });
      }
      setSaveMessage("저장되었습니다.");
    } catch {
      setSaveMessage("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const isNotHundred = Math.abs(Math.round(totalWeight) - 100) > 0;
  const regimeInfo = currentRegime ? REGIMES[currentRegime] : null;

  return (
    <div className="space-y-6">
      {/* Current regime info */}
      {regimeInfo && (
        <GlassCard className="!p-4">
          <div className="flex items-center gap-3">
            <Info className="w-4 h-4 text-accent shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-text-secondary">
                현재 레짐:{" "}
                <span className="font-semibold text-text-primary">{regimeInfo.nameKo}</span>
                <span className="text-xs text-text-muted ml-1">({regimeInfo.name})</span>
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                국가 비중이 레짐에 따라 자동 결정됩니다. 수동 오버라이드도 가능합니다.
              </p>
            </div>
            <div className="w-3 h-3 rounded-full shrink-0" style={{ background: `linear-gradient(135deg, ${regimeInfo.gradientFrom}, ${regimeInfo.gradientTo})` }} />
          </div>
        </GlassCard>
      )}

      {/* Regime country weights overview */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-accent" />
            <h3 className="text-base font-semibold text-text-primary">레짐별 국가 배분 기준</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-left py-1.5 px-2 text-text-muted font-medium">레짐</th>
                {COUNTRY_CODES.map((c) => (
                  <th key={c} className="text-center py-1.5 px-1 text-text-muted font-medium">
                    {DEFAULT_COUNTRIES.find((dc) => dc.code === c)?.flag} {DEFAULT_COUNTRIES.find((dc) => dc.code === c)?.nameKo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {REGIME_ORDER.map((rid) => {
                const r = REGIMES[rid];
                const cw = REGIME_COUNTRY_WEIGHTS[rid];
                const isCurrent = rid === currentRegime;
                return (
                  <tr key={rid} className={cn("border-b border-border-subtle/50", isCurrent && "bg-accent/5")}>
                    <td className="py-1.5 px-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: `linear-gradient(135deg, ${r.gradientFrom}, ${r.gradientTo})` }} />
                        <span className={cn("text-text-primary", isCurrent && "font-semibold")}>{r.nameKo}</span>
                        {isCurrent && <span className="text-[9px] text-accent bg-accent/10 px-1 py-0.5 rounded">현재</span>}
                      </div>
                    </td>
                    {COUNTRY_CODES.map((c) => {
                      const val = cw[c];
                      return (
                        <td key={c} className="text-center py-1.5 px-1">
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
      </GlassCard>

      {/* Manual overrides */}
      <GlassCard>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-text-muted" />
            <h3 className="text-base font-semibold text-text-primary">수동 배분 오버라이드</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetWeights}
              className="text-sm text-text-muted hover:text-text-secondary transition-colors px-3 py-1.5 rounded-lg hover:bg-bg-overlay flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              자동 배분
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

        <p className="text-xs text-text-muted mb-4">
          비중을 비우면 현재 레짐에 따라 자동 배분됩니다. 값을 입력하면 수동 오버라이드로 적용됩니다.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-text-muted text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            불러오는 중...
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {countries.map((c) => {
                const effectiveWeight = getEffectiveWeight(c);
                const isOverridden = c.weightOverride !== null;
                const autoWeight = getAutoWeight(c.code);

                return (
                  <div
                    key={c.id}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                      c.isActive ? "bg-bg-overlay/30" : "bg-bg-overlay/10 opacity-50"
                    )}
                  >
                    <button
                      onClick={() => handleToggleActive(c.id, !c.isActive)}
                      className={cn(
                        "relative w-9 h-5 rounded-full transition-colors shrink-0",
                        c.isActive ? "bg-positive" : "bg-bg-elevated"
                      )}
                    >
                      <div className={cn(
                        "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform",
                        c.isActive ? "right-0.5" : "left-0.5"
                      )} />
                    </button>

                    <div className="flex items-center gap-2 w-24 shrink-0">
                      <span className="text-lg">{c.flag}</span>
                      <div>
                        <span className="text-sm font-medium text-text-primary">{c.nameKo}</span>
                        <span className="text-xs text-text-muted ml-1">{c.code}</span>
                      </div>
                    </div>

                    <div className="flex-1 h-7 bg-bg-overlay rounded-lg overflow-hidden relative">
                      <div
                        className="h-full rounded-lg transition-all duration-200"
                        style={{
                          width: `${Math.min(effectiveWeight, 100)}%`,
                          backgroundColor: isOverridden ? "var(--color-warning)" : "var(--color-accent)",
                          opacity: 0.5,
                        }}
                      />
                      {effectiveWeight > 3 && (
                        <span className="absolute inset-0 flex items-center pl-2 text-xs font-medium text-white/90">
                          {effectiveWeight.toFixed(1)}%
                          {!isOverridden && c.isActive && autoWeight !== null && (
                            <span className="ml-1 text-white/50">(자동)</span>
                          )}
                          {isOverridden && (
                            <span className="ml-1 text-white/50">(수동)</span>
                          )}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        value={c.weightOverride ?? ""}
                        placeholder={autoWeight !== null ? String(autoWeight) : "auto"}
                        disabled={!c.isActive}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "") {
                            handleWeightChange(c.id, null);
                          } else {
                            const parsed = parseFloat(val);
                            handleWeightChange(c.id, isNaN(parsed) ? null : Math.max(0, Math.min(100, parsed)));
                          }
                        }}
                        className="w-18 bg-bg-overlay border border-border-subtle rounded-lg px-2 py-1.5 text-sm text-text-primary font-mono tabular-nums text-center focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-40"
                      />
                      <span className="text-xs text-text-muted">%</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border-subtle">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text-primary">합계</span>
                <span className={cn("text-sm font-mono tabular-nums font-semibold", isNotHundred ? "text-negative" : "text-positive")}>
                  {totalWeight.toFixed(1)}%
                </span>
                {isNotHundred && <span className="text-xs text-negative">(합계가 100%가 아닙니다)</span>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-text-muted">활성: {activeCountries.length}개국</span>
                {saveMessage && (
                  <span className={cn("text-xs", saveMessage.includes("오류") ? "text-negative" : "text-positive")}>
                    {saveMessage}
                  </span>
                )}
              </div>
            </div>
          </>
        )}
      </GlassCard>
    </div>
  );
}
