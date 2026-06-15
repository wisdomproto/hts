import { GlassCard } from "@/components/shared/glass-card";
import { SectionHeader } from "@/components/shared/section-header";
import { SignalDetailCard } from "@/components/campaign/signal-board";
import { getCampaignState } from "@/lib/db";
import { STAGES } from "@/lib/stages";

export const dynamic = "force-dynamic";

export default async function SignalsPage() {
  const { signals, assessment } = await getCampaignState();
  const stage = STAGES[assessment.stageId] ?? STAGES.meltup;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <SectionHeader
        title="시그널 보드"
        description="단계 전환을 판정하는 5개 실데이터 신호."
      />

      {/* 종합 판정 */}
      <GlassCard>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-text-muted mb-1">
              종합 판정 ({assessment.isAuto ? "자동" : "수동 고정"}) · 신뢰도 {assessment.confidence}%
            </p>
            <h3 className="text-xl font-bold" style={{ color: stage.gradientFrom }}>
              {stage.nameKo}
            </h3>
          </div>
          <ul className="flex-1 min-w-[240px] space-y-1">
            {assessment.rationale.map((r, i) => (
              <li key={i} className="text-xs text-text-secondary flex gap-1.5">
                <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: stage.gradientFrom }} />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-3 p-3 rounded-lg bg-bg-overlay/60">
          <p className="text-xs text-text-muted mb-0.5">▶ 다음 단계까지</p>
          <p className="text-sm text-text-primary">{assessment.distanceToNext}</p>
        </div>
      </GlassCard>

      {/* 개별 시그널 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {signals.map((s) => (
          <SignalDetailCard key={s.id} signal={s} />
        ))}
      </div>
    </div>
  );
}
