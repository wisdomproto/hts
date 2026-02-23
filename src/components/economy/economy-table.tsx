"use client";

import { useState } from "react";
import { CountryDetailModal } from "./country-detail-modal";

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

type CountryRow = {
  countryCode: string;
  countryName: string;
  flag: string;
  regimeName: string | null;
  regimeColor: string | null;
  regimeColorTo: string | null;
  growthState: string | null;
  inflationState: string | null;
  liquidityState: string | null;
  growthValue: number | null;
  inflationValue: number | null;
  gdpSparkData: number[];
  cpiSparkData: number[];
  series: SeriesData[];
  liquiditySignals?: LiquiditySignal[];
};

function MiniSparkBars({ data, color }: { data: number[]; color: string }) {
  if (data.length === 0) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  return (
    <div className="flex items-end gap-px h-6 w-16">
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

export function EconomyTable({ countries }: { countries: CountryRow[] }) {
  const [selectedCountry, setSelectedCountry] = useState<CountryRow | null>(null);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle bg-bg-overlay/30">
              <th className="text-left px-5 py-3 text-text-muted font-medium">국가</th>
              <th className="text-left px-4 py-3 text-text-muted font-medium">레짐</th>
              <th className="text-center px-4 py-3 text-text-muted font-medium">성장률</th>
              <th className="text-center px-3 py-3 text-text-muted font-medium">판정</th>
              <th className="px-2 py-3 w-16" />
              <th className="text-center px-4 py-3 text-text-muted font-medium">물가 (YoY)</th>
              <th className="text-center px-3 py-3 text-text-muted font-medium">판정</th>
              <th className="px-2 py-3 w-16" />
              <th className="text-center px-4 py-3 text-text-muted font-medium">유동성</th>
            </tr>
          </thead>
          <tbody>
            {countries.map((c) => {
              const isHighGrowth = c.growthState === "high";
              const isHighInflation = c.inflationState === "high";
              const isExpanding = c.liquidityState === "expanding";

              return (
                <tr
                  key={c.countryCode}
                  className="border-b border-border-subtle/50 hover:bg-bg-overlay/40 transition-colors cursor-pointer"
                  onClick={() => setSelectedCountry(c)}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{c.flag}</span>
                      <span className="font-medium text-text-primary">{c.countryName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    {c.regimeName ? (
                      <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                        style={{
                          background: c.regimeColor ? `linear-gradient(135deg, ${c.regimeColor}20, ${c.regimeColorTo ?? c.regimeColor}20)` : undefined,
                          color: c.regimeColor ?? undefined,
                        }}
                      >
                        {c.regimeName}
                      </span>
                    ) : (
                      <span className="text-xs text-text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="font-mono tabular-nums text-text-primary font-semibold">
                      {c.growthValue != null ? `${c.growthValue.toFixed(1)}%` : "—"}
                    </span>
                  </td>
                  <td className="px-3 py-3.5 text-center">
                    {c.growthState ? (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isHighGrowth ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative"}`}>
                        {isHighGrowth ? "고성장" : "저성장"}
                      </span>
                    ) : <span className="text-xs text-text-muted">—</span>}
                  </td>
                  <td className="px-2 py-3.5">
                    <MiniSparkBars data={c.gdpSparkData} color={isHighGrowth ? "#22c55e" : "#ef4444"} />
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="font-mono tabular-nums text-text-primary font-semibold">
                      {c.inflationValue != null ? `${c.inflationValue.toFixed(1)}%` : "—"}
                    </span>
                  </td>
                  <td className="px-3 py-3.5 text-center">
                    {c.inflationState ? (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isHighInflation ? "bg-negative/10 text-negative" : "bg-positive/10 text-positive"}`}>
                        {isHighInflation ? "고물가" : "저물가"}
                      </span>
                    ) : <span className="text-xs text-text-muted">—</span>}
                  </td>
                  <td className="px-2 py-3.5">
                    <MiniSparkBars data={c.cpiSparkData} color={isHighInflation ? "#f59e0b" : "#3b82f6"} />
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {c.liquidityState ? (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isExpanding ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative"}`}>
                        {isExpanding ? "확장 ↑" : "축소 ↓"}
                      </span>
                    ) : <span className="text-xs text-text-muted">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {selectedCountry && (
        <CountryDetailModal
          country={selectedCountry}
          onClose={() => setSelectedCountry(null)}
        />
      )}
    </>
  );
}
