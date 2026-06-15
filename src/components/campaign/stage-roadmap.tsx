import { STAGE_ORDER, STAGES } from "@/lib/stages";
import type { StageId } from "@/types/campaign";
import { cn } from "@/lib/cn";

type StageRoadmapProps = {
  currentStageId: StageId;
};

/** 5단계 가로 로드맵 스트립. 현재 단계 강조. */
export function StageRoadmap({ currentStageId }: StageRoadmapProps) {
  const currentOrder = STAGES[currentStageId]?.order ?? 1;

  return (
    <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
      {STAGE_ORDER.map((id, idx) => {
        const stage = STAGES[id];
        const isCurrent = id === currentStageId;
        const isPast = stage.order < currentOrder;
        return (
          <div
            key={id}
            className={cn(
              "relative flex-1 min-w-[150px] rounded-xl border p-3 transition-all",
              isCurrent ? "border-transparent" : "border-border-subtle",
              !isCurrent && !isPast && "opacity-60"
            )}
            style={
              isCurrent
                ? {
                    background: `linear-gradient(135deg, ${stage.gradientFrom}22, ${stage.gradientTo}10)`,
                    borderColor: `${stage.gradientFrom}66`,
                  }
                : undefined
            }
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                style={{ background: `linear-gradient(135deg, ${stage.gradientFrom}, ${stage.gradientTo})` }}
              >
                {idx + 1}
              </span>
              <span
                className="text-xs font-semibold truncate"
                style={{ color: isCurrent ? stage.gradientFrom : undefined }}
              >
                {stage.nameKo}
              </span>
            </div>
            <p className="text-[10px] text-text-muted leading-snug line-clamp-2">{stage.tagline}</p>
            {isCurrent && (
              <span className="absolute -top-1.5 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-bg-elevated border border-border-subtle text-text-secondary">
                현재
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
