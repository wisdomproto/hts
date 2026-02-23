"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { TICKER_NAMES_KO, COUNTRY_NAMES_KO, ASSET_CLASS_LABELS, ASSET_CLASS_COLORS_HEX } from "@/lib/constants";
import type { AssetClass } from "@/types/portfolio";
import { formatCurrencyFull, formatPercent } from "@/lib/format";
import { GlassCard } from "@/components/shared/glass-card";

type AllocationItem = {
  ticker: string;
  assetClass: string;
  country: string;
  weightPct: number;
  amount: number;
};

type DashboardPortfolioTabsProps = {
  items: AllocationItem[];
  totalAmount: number;
};

type TabId = "all" | "asset" | "country";

const TABS: { id: TabId; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "asset", label: "자산별" },
  { id: "country", label: "국가별" },
];

const ASSET_CLASS_ORDER: AssetClass[] = ["stocks", "bonds", "realestate", "commodities", "crypto"];
const COUNTRY_ORDER = ["US", "EU", "IN", "CN", "KR", "JP", "GL"];

const COUNTRY_COLORS: Record<string, string> = {
  US: "#3b82f6",
  EU: "#8b5cf6",
  IN: "#f97316",
  CN: "#ef4444",
  KR: "#06b6d4",
  JP: "#ec4899",
  GL: "#64748b",
};

/* ── Leaf row (individual asset) ── */
function ItemRow({ item, indent }: { item: AllocationItem; indent?: boolean }) {
  const color = ASSET_CLASS_COLORS_HEX[item.assetClass as keyof typeof ASSET_CLASS_COLORS_HEX] ?? "#94a3b8";
  const tickerName = TICKER_NAMES_KO[item.ticker] ?? item.ticker;

  return (
    <div className="flex items-center gap-2 px-4 py-2 hover:bg-bg-overlay/50 transition-colors border-b border-border-subtle/30 last:border-b-0">
      {indent && <div className="w-5 shrink-0" />}
      <div
        className="w-1 h-5 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary truncate">{tickerName}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-14 h-1.5 bg-bg-overlay rounded-full overflow-hidden hidden sm:block">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(item.weightPct * 4, 100)}%`,
              backgroundColor: color,
            }}
          />
        </div>
        <span className="font-mono tabular-nums text-text-primary text-sm w-12 text-right">
          {formatPercent(item.weightPct)}
        </span>
      </div>
      <span className="font-mono tabular-nums text-text-secondary text-sm w-28 text-right shrink-0 hidden md:inline">
        {formatCurrencyFull(Math.round(item.amount))}
      </span>
    </div>
  );
}

/* ── Collapsible tree group ── */
function TreeGroup({
  groupKey,
  label,
  color,
  items,
  defaultOpen,
}: {
  groupKey: string;
  label: string;
  color: string;
  items: AllocationItem[];
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const totalWeight = items.reduce((sum, i) => sum + i.weightPct, 0);
  const totalAmt = items.reduce((sum, i) => sum + i.amount, 0);
  const sorted = [...items].sort((a, b) => b.weightPct - a.weightPct);

  return (
    <div>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-bg-overlay/40 hover:bg-bg-overlay/60 transition-colors border-b border-border-subtle/50 cursor-pointer select-none"
      >
        {open ? (
          <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
        )}
        <div
          className="w-2.5 h-2.5 rounded-sm shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="text-sm font-semibold text-text-primary flex-1 text-left">
          {label}
        </span>
        <span className="text-xs text-text-muted bg-bg-overlay rounded-full px-2 py-0.5 shrink-0">
          {items.length}
        </span>
        <span className="font-mono tabular-nums text-text-primary text-sm font-semibold w-12 text-right shrink-0">
          {formatPercent(totalWeight)}
        </span>
        <span className="font-mono tabular-nums text-text-secondary text-sm w-28 text-right shrink-0 hidden md:inline">
          {formatCurrencyFull(Math.round(totalAmt))}
        </span>
      </button>
      {open && (
        <div className="bg-bg-surface/30">
          {sorted.map((item) => (
            <ItemRow key={`${groupKey}-${item.ticker}`} item={item} indent />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Tab: 전체 ── */
function AllTab({ items }: { items: AllocationItem[] }) {
  const sorted = [...items].sort((a, b) => b.weightPct - a.weightPct);
  return (
    <div>
      {sorted.map((item) => (
        <ItemRow key={item.ticker} item={item} />
      ))}
    </div>
  );
}

/* ── Tab: 자산별 (tree by asset class) ── */
function AssetTab({ items }: { items: AllocationItem[] }) {
  const groups = new Map<string, AllocationItem[]>();
  for (const item of items) {
    const list = groups.get(item.assetClass) ?? [];
    list.push(item);
    groups.set(item.assetClass, list);
  }

  return (
    <div>
      {ASSET_CLASS_ORDER.filter((cls) => groups.has(cls)).map((cls, idx) => (
        <TreeGroup
          key={cls}
          groupKey={cls}
          label={ASSET_CLASS_LABELS[cls]?.nameKo ?? cls}
          color={ASSET_CLASS_COLORS_HEX[cls] ?? "#94a3b8"}
          items={groups.get(cls)!}
          defaultOpen={idx === 0}
        />
      ))}
    </div>
  );
}

/* ── Tab: 국가별 (tree by country, sorted by weight) ── */
function CountryTab({ items }: { items: AllocationItem[] }) {
  const groups = new Map<string, AllocationItem[]>();
  for (const item of items) {
    const list = groups.get(item.country) ?? [];
    list.push(item);
    groups.set(item.country, list);
  }

  const orderedCountries = COUNTRY_ORDER.filter((c) => groups.has(c)).sort((a, b) => {
    const totalA = groups.get(a)!.reduce((sum, i) => sum + i.weightPct, 0);
    const totalB = groups.get(b)!.reduce((sum, i) => sum + i.weightPct, 0);
    return totalB - totalA;
  });

  return (
    <div>
      {orderedCountries.map((code, idx) => (
        <TreeGroup
          key={code}
          groupKey={code}
          label={COUNTRY_NAMES_KO[code] ?? code}
          color={COUNTRY_COLORS[code] ?? "#64748b"}
          items={groups.get(code)!}
          defaultOpen={idx === 0}
        />
      ))}
    </div>
  );
}

/* ── Main component ── */
export function DashboardPortfolioTabs({ items, totalAmount }: DashboardPortfolioTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("all");

  if (items.length === 0) {
    return (
      <GlassCard>
        <p className="text-sm text-text-muted text-center py-8">배분 데이터가 없습니다.</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="!p-0 overflow-hidden">
      {/* Tab Buttons */}
      <div className="flex gap-1 p-2 border-b border-border-subtle">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-accent/10 text-accent border border-accent/30"
                : "bg-bg-overlay text-text-secondary hover:text-text-primary border border-transparent"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="max-h-[480px] overflow-y-auto">
        {activeTab === "all" && <AllTab items={items} />}
        {activeTab === "asset" && <AssetTab items={items} />}
        {activeTab === "country" && <CountryTab items={items} />}
      </div>
    </GlassCard>
  );
}
