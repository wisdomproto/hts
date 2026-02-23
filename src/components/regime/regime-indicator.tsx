"use client";

import { GradientOrb } from "./gradient-orb";
import { GlassCard } from "@/components/shared/glass-card";
import { REGIMES } from "@/lib/regimes";
import type { RegimeId } from "@/types/regime";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

type LiquiditySignalData = {
  name: string;
  direction: "easing" | "tightening";
  value: number;
};

type RegimeIndicatorProps = {
  regimeId?: RegimeId;
  liquiditySignals?: LiquiditySignalData[];
};

function AxisPill({
  label,
  state,
  variant,
}: {
  label: string;
  state: string;
  variant: "up" | "down" | "expanding" | "contracting";
}) {
  const isPositive = variant === "up" || variant === "expanding";
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <div
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
        isPositive ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
      <span className="opacity-70">{state}</span>
    </div>
  );
}

const SIGNAL_LABELS: Record<string, string> = {
  fed_balance_sheet: "연준 B/S",
  reverse_repo: "역레포",
  nfci: "NFCI",
  hy_spread: "HY 스프레드",
  sofr: "SOFR",
};

export function RegimeIndicator({ regimeId = "goldilocks", liquiditySignals = [] }: RegimeIndicatorProps) {
  const regime = REGIMES[regimeId];

  const easingCount = liquiditySignals.filter((s) => s.direction === "easing").length;

  return (
    <GlassCard className="relative overflow-hidden">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <GradientOrb regime={regime} size={100} />
          <div>
            <p className="text-sm text-text-muted mb-1">현재 레짐 (미국)</p>
            <h1
              className="text-3xl font-bold mb-2"
              style={{
                background: `linear-gradient(135deg, ${regime.gradientFrom}, ${regime.gradientTo})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {regime.nameKo}
            </h1>
            <p className="text-sm text-text-secondary max-w-md">{regime.description}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <AxisPill label="성장" state={regime.growth === "high" ? "High" : "Low"} variant={regime.growth === "high" ? "up" : "down"} />
          <AxisPill label="물가" state={regime.inflation === "high" ? "High" : "Low"} variant={regime.inflation === "high" ? "up" : "down"} />
          <AxisPill label="유동성" state={`${easingCount}/${liquiditySignals.length} 완화`} variant={regime.liquidity} />
        </div>
      </div>

      {/* Liquidity sub-signals */}
      {liquiditySignals.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border-subtle/50">
          <p className="text-xs text-text-muted mb-2">유동성 신호 (3-of-5 규칙)</p>
          <div className="flex flex-wrap gap-2">
            {liquiditySignals.map((s) => (
              <div
                key={s.name}
                className={`text-xs px-2.5 py-1 rounded-full ${
                  s.direction === "easing" ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative"
                }`}
              >
                {SIGNAL_LABELS[s.name] ?? s.name}: {s.direction === "easing" ? "완화" : "긴축"}
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        className="absolute top-0 right-0 w-64 h-64 opacity-5 blur-3xl pointer-events-none"
        style={{ background: `radial-gradient(circle, ${regime.gradientFrom}, transparent)` }}
      />
    </GlassCard>
  );
}
