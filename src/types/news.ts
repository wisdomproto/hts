export type Sentiment = "very_bearish" | "bearish" | "neutral" | "bullish" | "very_bullish";

export type RegimeRelevance = "supports" | "contradicts" | "shift_signal" | "neutral";

export type NewsArticle = {
  id: number;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  summary: string;
  sentiment: Sentiment;
  regimeRelevance: RegimeRelevance;
  relatedTickers: string[];
  category: string;
};
