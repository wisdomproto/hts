import { GlassCard } from "@/components/shared/glass-card";
import { SectionHeader } from "@/components/shared/section-header";
import { getRecentNews } from "@/lib/db";
import { formatRelativeTime } from "@/lib/format";

export const dynamic = "force-dynamic";

function getSentimentDotCount(sentiment: string | null): { count: number; color: string } {
  switch (sentiment) {
    case "very_bullish":
      return { count: 5, color: "bg-positive" };
    case "bullish":
      return { count: 4, color: "bg-positive" };
    case "neutral":
      return { count: 3, color: "bg-text-muted" };
    case "bearish":
      return { count: 2, color: "bg-negative" };
    case "very_bearish":
      return { count: 1, color: "bg-negative" };
    default:
      return { count: 3, color: "bg-text-muted" };
  }
}

function getRelevanceBadge(relevance: string | null): { label: string; className: string } {
  switch (relevance) {
    case "supports":
      return { label: "레짐 지지", className: "bg-positive/10 text-positive" };
    case "contradicts":
      return { label: "레짐 반대", className: "bg-negative/10 text-negative" };
    default:
      return { label: "중립", className: "bg-bg-overlay text-text-muted" };
  }
}

export default async function NewsPage() {
  const articles = await getRecentNews(30);

  const bullishCount = articles.filter(
    (a) => a.sentiment === "bullish" || a.sentiment === "very_bullish"
  ).length;
  const bearishCount = articles.filter(
    (a) => a.sentiment === "bearish" || a.sentiment === "very_bearish"
  ).length;
  const totalSentimentCount = bullishCount + bearishCount;
  const bullishPct =
    totalSentimentCount > 0 ? Math.round((bullishCount / totalSentimentCount) * 100) : 50;
  const bearishPct = totalSentimentCount > 0 ? 100 - bullishPct : 50;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <SectionHeader
        title="뉴스 & 분석"
        description="AI 요약 경제 뉴스 및 레짐 영향 분석"
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {["전체", "성장", "물가", "유동성", "주식", "채권", "현물", "암호화폐"].map(
          (filter) => (
            <button
              key={filter}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-bg-overlay text-text-secondary hover:bg-bg-elevated transition-colors first:bg-accent/10 first:text-accent"
            >
              {filter}
            </button>
          )
        )}
      </div>

      {/* Sentiment Bar */}
      <GlassCard className="!p-3">
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted">센티먼트</span>
          <div className="flex-1 h-2 bg-bg-overlay rounded-full overflow-hidden flex">
            <div className="h-full bg-positive" style={{ width: `${bullishPct}%` }} />
            <div className="h-full bg-negative" style={{ width: `${bearishPct}%` }} />
          </div>
          <span className="text-xs text-text-secondary">
            강세 {bullishPct}% | 약세 {bearishPct}%
          </span>
        </div>
      </GlassCard>

      {/* News Cards */}
      <div className="space-y-3">
        {articles.length === 0 ? (
          <GlassCard>
            <p className="text-sm text-text-muted text-center py-8">
              뉴스가 없습니다.
            </p>
          </GlassCard>
        ) : (
          articles.map((article) => {
            const { count: dotCount, color: dotColor } = getSentimentDotCount(article.sentiment);
            const { label: relevanceLabel, className: relevanceClassName } = getRelevanceBadge(
              article.regimeRelevance
            );
            const tickers = article.relatedTickers as string[];

            return (
              <GlassCard key={article.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-text-muted">{article.source}</span>
                      <span className="text-xs text-text-muted">&middot;</span>
                      <span className="text-xs text-text-muted">
                        {formatRelativeTime(article.publishedAt)}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${relevanceClassName}`}
                      >
                        {relevanceLabel}
                      </span>
                    </div>
                    <h3 className="text-sm font-medium text-text-primary mb-2">
                      {article.url ? (
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-accent transition-colors"
                        >
                          {article.title}
                        </a>
                      ) : (
                        article.title
                      )}
                    </h3>
                    {article.summary && (
                      <p className="text-sm text-text-secondary leading-relaxed">
                        {article.summary}
                      </p>
                    )}
                    {tickers.length > 0 && (
                      <div className="flex gap-1.5 mt-3">
                        {tickers.map((ticker) => (
                          <span
                            key={ticker}
                            className="text-xs px-2 py-0.5 rounded bg-bg-overlay text-text-secondary"
                          >
                            {ticker}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Sentiment dots */}
                  <div className="flex gap-0.5 mt-1 shrink-0">
                    {[1, 2, 3, 4, 5].map((dot) => (
                      <div
                        key={dot}
                        className={`w-1.5 h-1.5 rounded-full ${
                          dot <= dotCount ? dotColor : "bg-bg-overlay"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </GlassCard>
            );
          })
        )}
      </div>
    </div>
  );
}
