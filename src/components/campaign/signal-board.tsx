import { SIGNAL_STATUS_META } from "@/lib/signals";
import type { SignalReading } from "@/types/campaign";

function formatValue(r: SignalReading): string {
  if (r.value == null) return "—";
  if (r.id === "liquidity") return r.status === "healthy" ? "확장" : "수축";
  const decimals = r.id === "volatility" ? 0 : 1;
  const sign = r.id === "nasdaq_trend" && r.value > 0 ? "+" : "";
  return `${sign}${r.value.toFixed(decimals)}${r.unit}`;
}

/** 컴팩트 시그널 칩 (대시보드용) */
export function SignalChips({ signals }: { signals: SignalReading[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
      {signals.map((s) => {
        const meta = SIGNAL_STATUS_META[s.status];
        return (
          <div key={s.id} className="rounded-lg bg-bg-overlay p-2.5 border border-border-subtle/50">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[10px] text-text-muted truncate">{s.nameKo.split(" ")[0]}</span>
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: meta.color }}
              />
            </div>
            <div className="text-sm font-mono tabular-nums text-text-primary">{formatValue(s)}</div>
            <div className="text-[10px]" style={{ color: meta.color }}>
              {s.statusKo}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** 상세 시그널 카드 (시그널 보드 페이지용) */
export function SignalDetailCard({ signal }: { signal: SignalReading }) {
  const meta = SIGNAL_STATUS_META[signal.status];
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-elevated p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">{signal.nameKo}</h3>
          {signal.asOf && <p className="text-[10px] text-text-muted mt-0.5">기준일 {signal.asOf}</p>}
        </div>
        <span
          className="text-xs font-bold px-2 py-1 rounded-full shrink-0"
          style={{ backgroundColor: `${meta.color}22`, color: meta.color }}
        >
          {signal.statusKo}
        </span>
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-2xl font-bold font-mono tabular-nums text-text-primary">
          {formatValue(signal)}
        </span>
      </div>

      <p className="text-xs text-text-secondary leading-relaxed mb-3">{signal.detail}</p>

      {/* 구간 밴드 */}
      <div className="flex flex-wrap gap-1">
        {signal.bands.map((b, i) => {
          const bMeta = SIGNAL_STATUS_META[b.status];
          const active = b.status === signal.status;
          return (
            <span
              key={i}
              className="text-[10px] px-1.5 py-0.5 rounded border"
              style={{
                borderColor: active ? bMeta.color : "transparent",
                backgroundColor: active ? `${bMeta.color}22` : "var(--color-bg-overlay)",
                color: active ? bMeta.color : "var(--color-text-muted)",
              }}
            >
              {b.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
