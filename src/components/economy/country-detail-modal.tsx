"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/shared/glass-card";

type SeriesData = {
  title: string;
  value: number | null;
  date: string | null;
  unit: string;
  color: string;
  sparkData: number[];
  description?: string;
};

type LiquiditySignal = {
  name: string;
  direction: "easing" | "tightening";
  rawValue: number;
};

type CountryDetailProps = {
  countryCode: string;
  countryName: string;
  flag: string;
  regimeName: string | null;
  regimeColor: string | null;
  growthState: string | null;
  inflationState: string | null;
  liquidityState: string | null;
  growthValue: number | null;
  inflationValue: number | null;
  series: SeriesData[];
  liquiditySignals?: LiquiditySignal[];
};

function MiniSparkBars({ data, color }: { data: number[]; color: string }) {
  if (data.length === 0) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  return (
    <div className="flex items-end gap-px h-8 w-20">
      {data.map((v, i) => {
        const height = ((v - min) / range) * 100;
        return (
          <div
            key={i}
            className="flex-1 rounded-t-sm"
            style={{ height: `${Math.max(height, 8)}%`, backgroundColor: color, opacity: 0.4 + (i / data.length) * 0.6 }}
          />
        );
      })}
    </div>
  );
}

function fmt(v: number | null, decimals = 2): string {
  if (v == null) return "—";
  return v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function CountryDetailModal({ country, onClose }: { country: CountryDetailProps; onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-bg-surface border border-border-subtle rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle sticky top-0 bg-bg-surface z-10">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{country.flag}</span>
              <div>
                <h2 className="text-lg font-bold text-text-primary">{country.countryName} 경제 지표 상세</h2>
                {country.regimeName && (
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full inline-block mt-1"
                    style={{
                      background: country.regimeColor ? `${country.regimeColor}20` : undefined,
                      color: country.regimeColor ?? undefined,
                    }}
                  >
                    {country.regimeName}
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-bg-overlay text-text-muted hover:text-text-primary transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 3축 판정 요약 */}
          <div className="px-6 py-4 grid grid-cols-3 gap-3">
            <div className={`rounded-xl p-3 text-center ${country.growthState === "high" ? "bg-positive/10" : "bg-negative/10"}`}>
              <p className="text-xs text-text-muted mb-1">성장</p>
              <p className={`text-lg font-bold font-mono ${country.growthState === "high" ? "text-positive" : "text-negative"}`}>
                {country.growthValue != null ? `${country.growthValue.toFixed(1)}%` : "—"}
              </p>
              <p className={`text-xs font-semibold mt-1 ${country.growthState === "high" ? "text-positive" : "text-negative"}`}>
                {country.growthState === "high" ? "고성장 ↑" : "저성장 ↓"}
              </p>
            </div>
            <div className={`rounded-xl p-3 text-center ${country.inflationState === "high" ? "bg-negative/10" : "bg-positive/10"}`}>
              <p className="text-xs text-text-muted mb-1">물가</p>
              <p className={`text-lg font-bold font-mono ${country.inflationState === "high" ? "text-negative" : "text-positive"}`}>
                {country.inflationValue != null ? `${country.inflationValue.toFixed(1)}%` : "—"}
              </p>
              <p className={`text-xs font-semibold mt-1 ${country.inflationState === "high" ? "text-negative" : "text-positive"}`}>
                {country.inflationState === "high" ? "고물가 ↑" : "저물가 ↓"}
              </p>
            </div>
            <div className={`rounded-xl p-3 text-center ${country.liquidityState === "expanding" ? "bg-positive/10" : "bg-negative/10"}`}>
              <p className="text-xs text-text-muted mb-1">유동성</p>
              <p className={`text-lg font-bold ${country.liquidityState === "expanding" ? "text-positive" : "text-negative"}`}>
                {country.liquidityState === "expanding" ? "확장" : "축소"}
              </p>
              <p className={`text-xs font-semibold mt-1 ${country.liquidityState === "expanding" ? "text-positive" : "text-negative"}`}>
                {country.liquidityState === "expanding" ? "Expanding ↑" : "Contracting ↓"}
              </p>
            </div>
          </div>

          {/* 시리즈 상세 */}
          {country.series.length > 0 && (
            <div className="px-6 pb-4">
              <h3 className="text-sm font-semibold text-text-muted mb-3">주요 지표</h3>
              <div className="space-y-2">
                {country.series.map((s) => (
                  <div key={s.title} className="flex items-center justify-between py-2 px-3 rounded-lg bg-bg-overlay/50">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-text-primary">{s.title}</p>
                      {s.description && <p className="text-xs text-text-muted">{s.description}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <MiniSparkBars data={s.sparkData} color={s.color} />
                      <div className="text-right min-w-[80px]">
                        <p className="text-sm font-bold font-mono tabular-nums text-text-primary">
                          {fmt(s.value, s.unit === "%" || s.unit === "index" ? 2 : 0)}
                        </p>
                        <p className="text-xs text-text-muted">{s.unit}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 유동성 신호 상세 (미국만) */}
          {country.liquiditySignals && country.liquiditySignals.length > 0 && (
            <div className="px-6 pb-6">
              <h3 className="text-sm font-semibold text-text-muted mb-3">유동성 신호 상세 (3-of-5 규칙)</h3>
              <div className="grid grid-cols-1 gap-2">
                {country.liquiditySignals.map((sig) => {
                  const isEasing = sig.direction === "easing";
                  const nameMap: Record<string, string> = {
                    fed_balance_sheet: "연준 대차대조표",
                    reverse_repo: "역레포 (RRP)",
                    nfci: "금융여건지수 (NFCI)",
                    hy_spread: "하이일드 스프레드",
                    sofr: "SOFR 금리",
                  };
                  return (
                    <div key={sig.name} className="flex items-center justify-between py-2 px-3 rounded-lg bg-bg-overlay/50">
                      <span className="text-sm text-text-primary">{nameMap[sig.name] ?? sig.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono tabular-nums text-text-secondary">{sig.rawValue.toFixed(2)}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isEasing ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative"}`}>
                          {isEasing ? "✓ 완화" : "✗ 긴축"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function CountryDetailButton({
  country,
  children,
}: {
  country: CountryDetailProps;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className="w-full text-left">
        {children}
      </button>
      {open && <CountryDetailModal country={country} onClose={() => setOpen(false)} />}
    </>
  );
}
