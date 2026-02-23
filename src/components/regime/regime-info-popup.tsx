"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { REGIMES, REGIME_ALLOCATION_TEMPLATES } from "@/lib/regimes";
import { ASSET_CLASS_LABELS, ASSET_CLASS_COLORS_HEX } from "@/lib/constants";
import type { RegimeId } from "@/types/regime";
import type { AssetClass } from "@/types/portfolio";

type RegimeInfoPopupProps = {
  regimeId: RegimeId;
  children: React.ReactNode;
};

function RegimeModal({ regimeId, onClose }: { regimeId: RegimeId; onClose: () => void }) {
  const regime = REGIMES[regimeId];
  const template = REGIME_ALLOCATION_TEMPLATES[regimeId];

  if (!regime) return null;

  const allocationEntries = Object.entries(template)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .filter(([, v]) => (v as number) > 0);

  return (
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
        className="bg-bg-surface border border-border-subtle rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient */}
        <div
          className="px-6 py-5 relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${regime.gradientFrom}15, ${regime.gradientTo}15)` }}
        >
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10 text-text-muted hover:text-text-primary transition-colors">
            <X className="w-4 h-4" />
          </button>
          <h2
            className="text-2xl font-bold mb-1"
            style={{
              background: `linear-gradient(135deg, ${regime.gradientFrom}, ${regime.gradientTo})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {regime.nameKo}
          </h2>
          <p className="text-sm text-text-muted">{regime.name}</p>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Description */}
          <p className="text-sm text-text-secondary leading-relaxed">{regime.description}</p>

          {/* 3축 상태 */}
          <div className="grid grid-cols-3 gap-3">
            <div className={`rounded-xl p-3 text-center ${regime.growth === "high" ? "bg-positive/10" : "bg-negative/10"}`}>
              <p className="text-xs text-text-muted mb-1">성장</p>
              <p className={`text-sm font-bold ${regime.growth === "high" ? "text-positive" : "text-negative"}`}>
                {regime.growth === "high" ? "고성장 ↑" : "저성장 ↓"}
              </p>
            </div>
            <div className={`rounded-xl p-3 text-center ${regime.inflation === "high" ? "bg-negative/10" : "bg-positive/10"}`}>
              <p className="text-xs text-text-muted mb-1">물가</p>
              <p className={`text-sm font-bold ${regime.inflation === "high" ? "text-negative" : "text-positive"}`}>
                {regime.inflation === "high" ? "고물가 ↑" : "저물가 ↓"}
              </p>
            </div>
            <div className={`rounded-xl p-3 text-center ${regime.liquidity === "expanding" ? "bg-positive/10" : "bg-negative/10"}`}>
              <p className="text-xs text-text-muted mb-1">유동성</p>
              <p className={`text-sm font-bold ${regime.liquidity === "expanding" ? "text-positive" : "text-negative"}`}>
                {regime.liquidity === "expanding" ? "확장 ↑" : "축소 ↓"}
              </p>
            </div>
          </div>

          {/* 추천 배분 비율 */}
          <div>
            <h3 className="text-sm font-semibold text-text-muted mb-3">추천 자산 배분</h3>
            {/* Visual bar */}
            <div className="flex h-6 rounded-lg overflow-hidden mb-3">
              {allocationEntries.map(([cls, pct]) => (
                <div
                  key={cls}
                  className="flex items-center justify-center text-xs font-medium text-white"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: ASSET_CLASS_COLORS_HEX[cls as keyof typeof ASSET_CLASS_COLORS_HEX] ?? "#94a3b8",
                  }}
                >
                  {(pct as number) > 8 ? `${pct}%` : ""}
                </div>
              ))}
            </div>
            {/* Legend */}
            <div className="space-y-1.5">
              {allocationEntries.map(([cls, pct]) => (
                <div key={cls} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: ASSET_CLASS_COLORS_HEX[cls as keyof typeof ASSET_CLASS_COLORS_HEX] ?? "#94a3b8" }} />
                    <span className="text-sm text-text-secondary">{ASSET_CLASS_LABELS[cls as AssetClass]?.nameKo ?? cls}</span>
                  </div>
                  <span className="text-sm font-mono tabular-nums text-text-primary font-semibold">{pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function RegimeInfoPopup({ regimeId, children }: RegimeInfoPopupProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="cursor-pointer hover:opacity-80 transition-opacity"
      >
        {children}
      </button>
      <AnimatePresence>
        {open && <RegimeModal regimeId={regimeId} onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
