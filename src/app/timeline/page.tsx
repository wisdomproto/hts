import { GlassCard } from "@/components/shared/glass-card";
import { SectionHeader } from "@/components/shared/section-header";
import { AllocationBreakdown } from "@/components/campaign/allocation-breakdown";
import { PlaybookCard } from "@/components/campaign/playbook-card";
import { getCampaignState } from "@/lib/db";
import { STAGES, STAGE_ORDER } from "@/lib/stages";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

export default async function TimelinePage() {
  const { config, assessment } = await getCampaignState();
  const currentStageId = assessment.stageId;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <SectionHeader
        title="작전 타임라인"
        description="멜트업 → 분산 → 붕괴 → 바닥 → 회복. 각 단계의 배분·트리거·플레이북."
      />

      <div className="relative space-y-4">
        {STAGE_ORDER.map((id, idx) => {
          const stage = STAGES[id];
          const isCurrent = id === currentStageId;
          return (
            <GlassCard
              key={id}
              className={cn("!p-5 relative", isCurrent && "ring-1")}
            >
              {isCurrent && (
                <span
                  className="absolute inset-0 rounded-xl pointer-events-none"
                  style={{ boxShadow: `inset 0 0 0 1px ${stage.gradientFrom}66` }}
                />
              )}
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
                  style={{ background: `linear-gradient(135deg, ${stage.gradientFrom}, ${stage.gradientTo})` }}
                >
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold" style={{ color: stage.gradientFrom }}>
                      {stage.nameKo}
                    </h3>
                    {isCurrent && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-bg-elevated border border-border-subtle text-text-secondary">
                        현재 단계
                      </span>
                    )}
                    <span className="text-xs text-text-muted">· {stage.postureKo}</span>
                  </div>
                  <p className="text-sm text-text-secondary">{stage.tagline}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 좌: 배분 + 트리거 */}
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-text-secondary mb-2">목표 배분</p>
                    <AllocationBreakdown
                      allocation={stage.allocation}
                      totalCapital={config.totalCapital}
                      showTickers={false}
                    />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-text-secondary mb-2">진입 트리거</p>
                    <ul className="space-y-1">
                      {stage.entryTriggers.map((t, i) => (
                        <li key={i} className="text-xs text-text-secondary flex gap-1.5">
                          <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: stage.gradientFrom }} />
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* 우: 플레이북 + 논리 */}
                <div className="space-y-4">
                  <PlaybookCard playbook={stage.playbook} />
                  <div className="p-3 rounded-lg bg-bg-overlay/60">
                    <p className="text-xs text-text-muted mb-1">핵심 논리</p>
                    <p className="text-xs text-text-secondary leading-relaxed">{stage.thesis}</p>
                  </div>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
