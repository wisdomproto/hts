"use client";

import { useState, useMemo } from "react";
import { GlassCard } from "@/components/shared/glass-card";
import {
  ASSET_CLASS_LABELS,
  ASSET_CLASS_COLORS_HEX,
  DEFAULT_COUNTRIES,
  TICKER_NAMES_KO,
  COUNTRY_NAMES_KO,
} from "@/lib/constants";
import { formatPercent, formatCurrencyFull } from "@/lib/format";
import type { AssetClass } from "@/types/portfolio";

type PortfolioItem = {
  ticker: string;
  assetClass: string;
  country: string;
  weightPct: number;
  amount: number;
};

type PortfolioTabsProps = {
  items: PortfolioItem[];
  totalAmount: number;
  regimeNameKo: string;
  regimeColor: string;
  allRegimes: Record<string, { regimeName: string }>;
};

type MainTab = "전체 배분" | "국가별";

export function PortfolioTabs({
  items,
  totalAmount,
  regimeNameKo,
  regimeColor,
  allRegimes,
}: PortfolioTabsProps) {
  const [activeTab, setActiveTab] = useState<MainTab>("전체 배분");
  const [activeCountry, setActiveCountry] = useState<string>("전체");

  // Compute class totals for allocation bar + legend
  const classTotals = useMemo(() => {
    const map = new Map<string, { pct: number; amount: number }>();
    for (const item of items) {
      const prev = map.get(item.assetClass) ?? { pct: 0, amount: 0 };
      map.set(item.assetClass, {
        pct: prev.pct + item.weightPct,
        amount: prev.amount + item.amount,
      });
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1].pct - a[1].pct);
  }, [items]);

  // Derive unique countries that have allocations
  const countriesWithAllocations = useMemo(() => {
    const codes = new Set(items.map((i) => i.country));
    const matched = DEFAULT_COUNTRIES.filter((c) => codes.has(c.code));
    // Include countries not in DEFAULT_COUNTRIES (e.g. "GL")
    const unmatched = Array.from(codes).filter(
      (code) => !DEFAULT_COUNTRIES.some((c) => c.code === code)
    );
    const extra = unmatched.map((code) => ({
      code,
      name: code,
      nameKo: COUNTRY_NAMES_KO[code] ?? code,
      flag: "🌐",
      isActive: true,
      weightOverride: null,
    }));
    return [...matched, ...extra];
  }, [items]);

  // Filter items by country for the country tab
  const filteredItems = useMemo(() => {
    if (activeCountry === "전체") return items;
    return items.filter((i) => i.country === activeCountry);
  }, [items, activeCountry]);

  // Country totals for filtered view
  const filteredTotalPct = filteredItems.reduce((s, i) => s + i.weightPct, 0);
  const filteredTotalAmt = filteredItems.reduce((s, i) => s + i.amount, 0);

  // Country-level class breakdown for the filtered set
  const filteredClassTotals = useMemo(() => {
    const map = new Map<string, { pct: number; amount: number }>();
    for (const item of filteredItems) {
      const prev = map.get(item.assetClass) ?? { pct: 0, amount: 0 };
      map.set(item.assetClass, {
        pct: prev.pct + item.weightPct,
        amount: prev.amount + item.amount,
      });
    }
    return Array.from(map.entries()).sort((a, b) => b[1].pct - a[1].pct);
  }, [filteredItems]);

  const mainTabs: MainTab[] = ["전체 배분", "국가별"];

  return (
    <div className="space-y-5">
      {/* Main tab pills */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-bg-overlay/60 backdrop-blur-sm border border-border-subtle w-fit">
        {mainTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
              relative px-5 py-2 text-sm font-medium rounded-lg transition-all duration-200
              ${
                activeTab === tab
                  ? "bg-white/10 text-text-primary shadow-sm"
                  : "text-text-muted hover:text-text-secondary hover:bg-white/5"
              }
            `}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="transition-all duration-300">
        {activeTab === "전체 배분" && (
          <div className="space-y-5">
            {/* Visual allocation bar */}
            <GlassCard>
              <h3 className="text-sm font-medium text-text-muted mb-4">
                전체 배분 비율
              </h3>
              <div className="flex h-10 rounded-lg overflow-hidden mb-4">
                {classTotals.map(([cls, data]) => (
                  <div
                    key={cls}
                    className="flex items-center justify-center text-xs font-medium text-white transition-all duration-300"
                    style={{
                      width: `${data.pct}%`,
                      backgroundColor:
                        ASSET_CLASS_COLORS_HEX[
                          cls as keyof typeof ASSET_CLASS_COLORS_HEX
                        ] ?? "#94a3b8",
                      minWidth: data.pct > 3 ? undefined : "0",
                    }}
                  >
                    {data.pct > 5 && (
                      <span>
                        {ASSET_CLASS_LABELS[cls as AssetClass]?.nameKo ?? cls}{" "}
                        {formatPercent(data.pct, 0)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-3">
                {classTotals.map(([cls, data]) => (
                  <div key={cls} className="flex items-center gap-2 text-xs">
                    <div
                      className="w-3 h-3 rounded"
                      style={{
                        backgroundColor:
                          ASSET_CLASS_COLORS_HEX[
                            cls as keyof typeof ASSET_CLASS_COLORS_HEX
                          ] ?? "#94a3b8",
                      }}
                    />
                    <span className="text-text-secondary">
                      {ASSET_CLASS_LABELS[cls as AssetClass]?.nameKo ?? cls}
                    </span>
                    <span className="font-mono text-text-primary">
                      {formatPercent(data.pct)}
                    </span>
                    <span className="text-text-muted">
                      ({formatCurrencyFull(Math.round(data.amount))})
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Full allocation table */}
            <GlassCard className="!p-0 overflow-hidden">
              <div className="px-5 py-4 border-b border-border-subtle">
                <h3 className="text-sm font-medium text-text-primary">
                  전체 배분 테이블
                </h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle bg-bg-overlay/30">
                    <th className="text-left px-5 py-3 text-text-muted font-medium">
                      티커
                    </th>
                    <th className="text-left px-5 py-3 text-text-muted font-medium">
                      자산군
                    </th>
                    <th className="text-left px-5 py-3 text-text-muted font-medium">
                      국가
                    </th>
                    <th className="text-right px-5 py-3 text-text-muted font-medium">
                      비중
                    </th>
                    <th className="text-right px-5 py-3 text-text-muted font-medium">
                      금액
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...items]
                    .sort((a, b) => b.weightPct - a.weightPct)
                    .map((item) => (
                      <tr
                        key={item.ticker}
                        className="border-b border-border-subtle/50 hover:bg-bg-overlay/50 transition-colors"
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-1.5 h-5 rounded-full"
                              style={{
                                backgroundColor:
                                  ASSET_CLASS_COLORS_HEX[
                                    item.assetClass as keyof typeof ASSET_CLASS_COLORS_HEX
                                  ] ?? "#94a3b8",
                              }}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium text-text-primary">
                                {item.ticker}
                              </span>
                              <span className="text-xs text-text-muted">
                                {TICKER_NAMES_KO[item.ticker] ?? item.ticker}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-text-secondary">
                          {ASSET_CLASS_LABELS[item.assetClass as AssetClass]
                            ?.nameKo ?? item.assetClass}
                        </td>
                        <td className="px-5 py-3 text-text-secondary">
                          {COUNTRY_NAMES_KO[item.country] ?? item.country}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-20 h-2 bg-bg-overlay rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{
                                  width: `${Math.min(item.weightPct * 4, 100)}%`,
                                  backgroundColor:
                                    ASSET_CLASS_COLORS_HEX[
                                      item.assetClass as keyof typeof ASSET_CLASS_COLORS_HEX
                                    ] ?? "#94a3b8",
                                }}
                              />
                            </div>
                            <span className="font-mono tabular-nums text-text-primary w-14 text-right">
                              {formatPercent(item.weightPct)}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right font-mono tabular-nums text-text-primary">
                          {formatCurrencyFull(Math.round(item.amount))}
                        </td>
                      </tr>
                    ))}
                </tbody>
                <tfoot>
                  <tr className="bg-bg-overlay/30 font-medium">
                    <td className="px-5 py-3 text-text-primary" colSpan={3}>
                      합계
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-text-primary">
                      {formatPercent(
                        items.reduce((a, b) => a + b.weightPct, 0)
                      )}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-text-primary">
                      {formatCurrencyFull(
                        Math.round(items.reduce((a, b) => a + b.amount, 0))
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </GlassCard>
          </div>
        )}

        {activeTab === "국가별" && (
          <div className="space-y-5">
            {/* Country sub-tab pills */}
            <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-bg-overlay/60 backdrop-blur-sm border border-border-subtle">
              <button
                onClick={() => setActiveCountry("전체")}
                className={`
                  px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
                  ${
                    activeCountry === "전체"
                      ? "bg-white/10 text-text-primary shadow-sm"
                      : "text-text-muted hover:text-text-secondary hover:bg-white/5"
                  }
                `}
              >
                🌍 전체
              </button>
              {countriesWithAllocations.map((c) => {
                const countryItems = items.filter(
                  (i) => i.country === c.code
                );
                const countryPct = countryItems.reduce(
                  (s, i) => s + i.weightPct,
                  0
                );
                return (
                  <button
                    key={c.code}
                    onClick={() => setActiveCountry(c.code)}
                    className={`
                      flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
                      ${
                        activeCountry === c.code
                          ? "bg-white/10 text-text-primary shadow-sm"
                          : "text-text-muted hover:text-text-secondary hover:bg-white/5"
                      }
                    `}
                  >
                    <span>{c.flag}</span>
                    <span>{c.nameKo}</span>
                    <span className="text-xs font-mono opacity-60">
                      {formatPercent(countryPct, 0)}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Country summary header */}
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {activeCountry === "전체" ? (
                    <span className="text-2xl">🌍</span>
                  ) : (
                    <span className="text-2xl">
                      {countriesWithAllocations.find(
                        (c) => c.code === activeCountry
                      )?.flag ?? "🌐"}
                    </span>
                  )}
                  <div>
                    <h3 className="text-base font-semibold text-text-primary">
                      {activeCountry === "전체"
                        ? "전체 국가"
                        : countriesWithAllocations.find(
                            (c) => c.code === activeCountry
                          )?.nameKo ?? activeCountry}
                    </h3>
                    <p className="text-xs text-text-muted">
                      {filteredItems.length}개 종목 |{" "}
                      {formatPercent(filteredTotalPct)} 비중
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold font-mono tabular-nums text-text-primary">
                    {formatCurrencyFull(Math.round(filteredTotalAmt))}
                  </p>
                  <p className="text-xs text-text-muted">배분 금액</p>
                </div>
              </div>

              {/* Mini allocation bar for filtered items */}
              {filteredClassTotals.length > 0 && (
                <>
                  <div className="flex h-3 rounded-md overflow-hidden mb-3">
                    {filteredClassTotals.map(([cls, data]) => (
                      <div
                        key={cls}
                        className="transition-all duration-300"
                        style={{
                          width:
                            filteredTotalPct > 0
                              ? `${(data.pct / filteredTotalPct) * 100}%`
                              : "0%",
                          backgroundColor:
                            ASSET_CLASS_COLORS_HEX[
                              cls as keyof typeof ASSET_CLASS_COLORS_HEX
                            ] ?? "#94a3b8",
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {filteredClassTotals.map(([cls, data]) => (
                      <div
                        key={cls}
                        className="flex items-center gap-1.5 text-xs"
                      >
                        <div
                          className="w-2.5 h-2.5 rounded"
                          style={{
                            backgroundColor:
                              ASSET_CLASS_COLORS_HEX[
                                cls as keyof typeof ASSET_CLASS_COLORS_HEX
                              ] ?? "#94a3b8",
                          }}
                        />
                        <span className="text-text-secondary">
                          {ASSET_CLASS_LABELS[cls as AssetClass]?.nameKo ?? cls}
                        </span>
                        <span className="font-mono text-text-primary">
                          {formatPercent(data.pct)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </GlassCard>

            {/* Country item cards */}
            {activeCountry === "전체" ? (
              /* Show cards per country when viewing all */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {countriesWithAllocations
                  .map((c) => {
                    const countryItems = items.filter(
                      (i) => i.country === c.code
                    );
                    const totalPct = countryItems.reduce(
                      (s, i) => s + i.weightPct,
                      0
                    );
                    const totalAmt = countryItems.reduce(
                      (s, i) => s + i.amount,
                      0
                    );
                    return { country: c, items: countryItems, totalPct, totalAmt };
                  })
                  .sort((a, b) => b.totalPct - a.totalPct)
                  .map(({ country, items: countryItems, totalPct, totalAmt }) => (
                    <GlassCard key={country.code} hover>
                      <button
                        onClick={() => setActiveCountry(country.code)}
                        className="w-full text-left"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-lg">{country.flag}</span>
                          <h4 className="text-sm font-semibold text-text-primary">
                            {country.nameKo}
                          </h4>
                          <span className="text-xs text-text-muted ml-auto font-mono">
                            {formatPercent(totalPct)}
                          </span>
                        </div>
                        <p className="text-base font-bold font-mono tabular-nums text-text-primary mb-3">
                          {formatCurrencyFull(Math.round(totalAmt))}
                        </p>
                        <div className="space-y-1.5">
                          {countryItems
                            .sort((a, b) => b.weightPct - a.weightPct)
                            .map((item) => (
                              <div
                                key={item.ticker}
                                className="flex items-center justify-between text-xs"
                              >
                                <div className="flex items-center gap-1.5">
                                  <div
                                    className="w-2 h-2 rounded-full"
                                    style={{
                                      backgroundColor:
                                        ASSET_CLASS_COLORS_HEX[
                                          item.assetClass as keyof typeof ASSET_CLASS_COLORS_HEX
                                        ] ?? "#94a3b8",
                                    }}
                                  />
                                  <span className="text-text-primary">
                                    {item.ticker}
                                  </span>
                                  <span className="text-text-muted">
                                    {TICKER_NAMES_KO[item.ticker] ??
                                      item.ticker}
                                  </span>
                                </div>
                                <span className="font-mono text-text-secondary">
                                  {formatPercent(item.weightPct)}
                                </span>
                              </div>
                            ))}
                        </div>
                      </button>
                    </GlassCard>
                  ))}
              </div>
            ) : (
              /* Show detailed list when a specific country is selected */
              <GlassCard className="!p-0 overflow-hidden">
                <div className="px-5 py-4 border-b border-border-subtle">
                  <h3 className="text-sm font-medium text-text-primary">
                    {countriesWithAllocations.find(
                      (c) => c.code === activeCountry
                    )?.nameKo ?? activeCountry}{" "}
                    배분 상세
                  </h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-subtle bg-bg-overlay/30">
                      <th className="text-left px-5 py-3 text-text-muted font-medium">
                        티커
                      </th>
                      <th className="text-left px-5 py-3 text-text-muted font-medium">
                        자산군
                      </th>
                      <th className="text-right px-5 py-3 text-text-muted font-medium">
                        비중
                      </th>
                      <th className="text-right px-5 py-3 text-text-muted font-medium">
                        금액
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...filteredItems]
                      .sort((a, b) => b.weightPct - a.weightPct)
                      .map((item) => (
                        <tr
                          key={item.ticker}
                          className="border-b border-border-subtle/50 hover:bg-bg-overlay/50 transition-colors"
                        >
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-1.5 h-5 rounded-full"
                                style={{
                                  backgroundColor:
                                    ASSET_CLASS_COLORS_HEX[
                                      item.assetClass as keyof typeof ASSET_CLASS_COLORS_HEX
                                    ] ?? "#94a3b8",
                                }}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium text-text-primary">
                                  {item.ticker}
                                </span>
                                <span className="text-xs text-text-muted">
                                  {TICKER_NAMES_KO[item.ticker] ?? item.ticker}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-text-secondary">
                            {ASSET_CLASS_LABELS[item.assetClass as AssetClass]
                              ?.nameKo ?? item.assetClass}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-20 h-2 bg-bg-overlay rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-300"
                                  style={{
                                    width: `${Math.min(item.weightPct * 4, 100)}%`,
                                    backgroundColor:
                                      ASSET_CLASS_COLORS_HEX[
                                        item.assetClass as keyof typeof ASSET_CLASS_COLORS_HEX
                                      ] ?? "#94a3b8",
                                  }}
                                />
                              </div>
                              <span className="font-mono tabular-nums text-text-primary w-14 text-right">
                                {formatPercent(item.weightPct)}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-right font-mono tabular-nums text-text-primary">
                            {formatCurrencyFull(Math.round(item.amount))}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-bg-overlay/30 font-medium">
                      <td
                        className="px-5 py-3 text-text-primary"
                        colSpan={2}
                      >
                        소계
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-text-primary">
                        {formatPercent(filteredTotalPct)}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-text-primary">
                        {formatCurrencyFull(Math.round(filteredTotalAmt))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </GlassCard>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
