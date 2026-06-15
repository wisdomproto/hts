import { ROLE_META, ROLE_ORDER, assetsForRole } from "@/lib/campaign-universe";
import { formatCurrency, formatPercent } from "@/lib/format";
import type { StageAllocation } from "@/types/campaign";

type AllocationBreakdownProps = {
  allocation: StageAllocation;
  totalCapital: number;
  showTickers?: boolean;
};

export function AllocationBreakdown({ allocation, totalCapital, showTickers = true }: AllocationBreakdownProps) {
  const offenseTotal = ROLE_ORDER.filter((r) => ROLE_META[r].group === "offense").reduce(
    (s, r) => s + (allocation[r] ?? 0),
    0
  );
  const hedgeTotal = ROLE_ORDER.filter((r) => ROLE_META[r].group === "hedge").reduce(
    (s, r) => s + (allocation[r] ?? 0),
    0
  );

  return (
    <div className="space-y-4">
      {/* 공격 vs 헤지 요약 바 */}
      <div className="flex h-2.5 rounded-full overflow-hidden">
        <div className="h-full bg-positive" style={{ width: `${offenseTotal}%` }} />
        <div className="h-full bg-text-muted" style={{ width: `${hedgeTotal}%` }} />
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-positive font-medium">공격 {formatPercent(offenseTotal, 0)}</span>
        <span className="text-text-muted font-medium">헤지 {formatPercent(hedgeTotal, 0)}</span>
      </div>

      {/* 역할별 상세 */}
      <div className="space-y-2.5">
        {ROLE_ORDER.map((role) => {
          const pct = allocation[role] ?? 0;
          if (pct <= 0) return null;
          const meta = ROLE_META[role];
          const amount = (totalCapital * pct) / 100;
          const tickers = assetsForRole(role);
          return (
            <div key={role}>
              <div className="flex items-center gap-3">
                <span className="text-xs text-text-secondary w-24 shrink-0 truncate" title={meta.nameKo}>
                  {meta.nameKo}
                </span>
                <div className="flex-1 h-3 bg-bg-overlay rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: meta.color }}
                  />
                </div>
                <span className="text-xs font-mono tabular-nums text-text-primary w-10 text-right">
                  {formatPercent(pct, 0)}
                </span>
                <span className="text-xs font-mono tabular-nums text-text-muted w-16 text-right shrink-0">
                  {formatCurrency(amount)}
                </span>
              </div>
              {showTickers && tickers.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1 ml-[6.75rem]">
                  {tickers.map((t) => (
                    <span
                      key={t.ticker}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-bg-overlay text-text-muted"
                      title={t.note}
                    >
                      {t.ticker} {Math.round(t.weightInRole * 100)}%
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
