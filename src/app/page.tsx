import Link from "next/link";
import { GlassCard } from "@/components/shared/glass-card";
import { SectionHeader } from "@/components/shared/section-header";
import { StageOrb } from "@/components/campaign/stage-orb";
import { StageRoadmap } from "@/components/campaign/stage-roadmap";
import { AllocationBreakdown } from "@/components/campaign/allocation-breakdown";
import { SignalChips } from "@/components/campaign/signal-board";
import { PlaybookCard } from "@/components/campaign/playbook-card";
import { getCampaignState, getRecentNews } from "@/lib/db";
import { STAGES } from "@/lib/stages";
import { formatCurrency, formatRelativeTime } from "@/lib/format";

export const dynamic = "force-dynamic";

function campaignProgress(startDate: string, endDate: string) {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = Date.now();
  const total = Math.max(1, end - start);
  const elapsed = Math.min(Math.max(0, now - start), total);
  const pct = (elapsed / total) * 100;
  const daysLeft = Math.max(0, Math.ceil((end - now) / 86_400_000));
  return { pct, daysLeft };
}

export default async function CommandCenterPage() {
  const [{ config, signals, assessment }, news] = await Promise.all([
    getCampaignState(),
    getRecentNews(4),
  ]);

  const stage = STAGES[assessment.stageId] ?? STAGES.meltup;
  const { pct, daysLeft } = campaignProgress(config.startDate, config.endDate);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* [A] 단계 히어로 */}
      <GlassCard className="!p-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <StageOrb gradientFrom={stage.gradientFrom} gradientTo={stage.gradientTo} size={130} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-text-muted">
                AI 버블 1년 작전 · {assessment.isAuto ? "자동 판정" : "수동 고정"}
              </span>
              <span className="text-xs font-mono text-text-muted">신뢰도 {assessment.confidence}%</span>
            </div>
            <h1 className="text-3xl font-bold" style={{ color: stage.gradientFrom }}>
              {stage.nameKo}
            </h1>
            <p className="text-sm text-text-secondary mt-1">{stage.tagline}</p>

            <div className="flex flex-wrap gap-2 mt-3">
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: `${stage.gradientFrom}22`, color: stage.gradientFrom }}
              >
                자세: {stage.postureKo}
              </span>
              {assessment.rationale.slice(0, 2).map((r, i) => (
                <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-bg-overlay text-text-secondary">
                  {r}
                </span>
              ))}
            </div>

            {/* 다음 수 */}
            <div className="mt-4 p-3 rounded-lg bg-bg-overlay/70 border border-border-subtle/50">
              <p className="text-xs text-text-muted mb-0.5">▶ 다음 단계까지</p>
              <p className="text-sm text-text-primary">{assessment.distanceToNext}</p>
            </div>
          </div>

          {/* 작전 진행도 */}
          <div className="w-full lg:w-44 shrink-0">
            <p className="text-xs text-text-muted mb-1">작전 진행도</p>
            <div className="h-2 bg-bg-overlay rounded-full overflow-hidden mb-1">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${stage.gradientFrom}, ${stage.gradientTo})` }}
              />
            </div>
            <p className="text-xs text-text-secondary font-mono">D-{daysLeft} 남음</p>
            <div className="mt-3 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-text-muted">총 자본</span>
                <span className="font-mono text-text-primary">{formatCurrency(config.totalCapital)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-text-muted">기간</span>
                <span className="font-mono text-text-secondary text-[11px]">
                  {config.startDate} ~ {config.endDate}
                </span>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* [B] 5단계 로드맵 */}
      <div>
        <SectionHeader title="작전 타임라인" viewAllHref="/timeline" />
        <StageRoadmap currentStageId={assessment.stageId} />
      </div>

      {/* [C] 배분 + 시그널 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-text-primary">현재 단계 목표 배분</h3>
            <Link href="/portfolio" className="text-xs text-accent hover:underline">
              상세 →
            </Link>
          </div>
          <AllocationBreakdown allocation={stage.allocation} totalCapital={config.totalCapital} />
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-text-primary">시그널 보드</h3>
            <Link href="/signals" className="text-xs text-accent hover:underline">
              상세 →
            </Link>
          </div>
          <SignalChips signals={signals} />
          <div className="mt-4 p-3 rounded-lg bg-bg-overlay/60">
            <p className="text-xs text-text-muted mb-1">핵심 논리</p>
            <p className="text-xs text-text-secondary leading-relaxed">{stage.thesis}</p>
          </div>
        </GlassCard>
      </div>

      {/* [D] 플레이북 */}
      <div>
        <SectionHeader title={`${stage.nameKo} 플레이북`} />
        <GlassCard>
          <PlaybookCard playbook={stage.playbook} />
        </GlassCard>
      </div>

      {/* [E] 뉴스 */}
      <div>
        <SectionHeader title="최근 뉴스" viewAllHref="/news" />
        <GlassCard>
          {news.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">뉴스가 없습니다.</p>
          ) : (
            <div className="space-y-4">
              {news.map((a) => (
                <div
                  key={a.id}
                  className="flex items-start justify-between gap-4 pb-4 border-b border-border-subtle/50 last:border-0 last:pb-0"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary leading-relaxed">{a.title}</p>
                    {a.summary && <p className="text-xs text-text-secondary mt-1 line-clamp-2">{a.summary}</p>}
                    <p className="text-xs text-text-muted mt-1">
                      {a.source} &middot; {formatRelativeTime(a.publishedAt)}
                    </p>
                  </div>
                  <div
                    className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                      a.sentiment === "bullish" || a.sentiment === "very_bullish"
                        ? "bg-positive"
                        : a.sentiment === "bearish" || a.sentiment === "very_bearish"
                          ? "bg-negative"
                          : "bg-text-muted"
                    }`}
                  />
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
