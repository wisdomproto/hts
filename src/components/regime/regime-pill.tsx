"use client";

import { REGIMES } from "@/lib/regimes";
import type { RegimeId } from "@/types/regime";

type RegimePillProps = {
  regimeId?: RegimeId;
  size?: "sm" | "md";
};

export function RegimePill({ regimeId = "goldilocks", size = "sm" }: RegimePillProps) {
  const regime = REGIMES[regimeId];

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border-subtle"
      style={{
        background: `linear-gradient(135deg, ${regime.gradientFrom}20, ${regime.gradientTo}20)`,
      }}
    >
      <div
        className="w-2 h-2 rounded-full animate-pulse"
        style={{
          background: `linear-gradient(135deg, ${regime.gradientFrom}, ${regime.gradientTo})`,
        }}
      />
      <span className={`font-medium text-text-primary ${size === "sm" ? "text-xs" : "text-sm"}`}>
        {regime.nameKo}
      </span>
    </div>
  );
}
