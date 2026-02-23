"""Summarize news articles using Google Gemini API."""

import sqlite3
import json
from config import DB_PATH, GEMINI_API_KEY

try:
    import google.generativeai as genai
except ImportError:
    genai = None


def summarize_articles(limit: int = 20):
    """Summarize unsummarized news articles using Gemini."""
    if not GEMINI_API_KEY:
        print("  WARNING: GEMINI_API_KEY not set. Skipping summarization.")
        return 0

    if genai is None:
        print("  WARNING: google-generativeai not installed. Skipping.")
        return 0

    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-2.5-flash-lite")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Get unsummarized articles
    cursor.execute(
        """SELECT id, title, source FROM news_articles
           WHERE summary IS NULL
           ORDER BY published_at DESC
           LIMIT ?""",
        (limit,),
    )
    articles = cursor.fetchall()

    if not articles:
        print("  No articles to summarize.")
        return 0

    total = 0
    for article_id, title, source in articles:
        try:
            prompt = f"""다음 경제 뉴스 제목을 분석해주세요:

제목: {title}
출처: {source}

다음 JSON 형식으로 응답해주세요 (JSON만 출력, 다른 텍스트 없이):
{{
    "summary": "2-3문장 한국어 요약",
    "sentiment": "very_bearish | bearish | neutral | bullish | very_bullish 중 하나",
    "regime_relevance": "supports | contradicts | shift_signal | neutral 중 하나 (현재 경제 레짐에 대한 영향)",
    "related_tickers": ["관련 ETF 티커 리스트, 예: SPY, GLD, IBIT"]
}}"""

            response = model.generate_content(prompt)
            text = response.text.strip()

            # Clean up response - remove markdown code blocks if present
            if text.startswith("```"):
                text = text.split("\n", 1)[1]
                if text.endswith("```"):
                    text = text[:-3]
                text = text.strip()

            data = json.loads(text)

            cursor.execute(
                """UPDATE news_articles
                   SET summary = ?, sentiment = ?, regime_relevance = ?, related_tickers = ?
                   WHERE id = ?""",
                (
                    data.get("summary", ""),
                    data.get("sentiment", "neutral"),
                    data.get("regime_relevance", "neutral"),
                    json.dumps(data.get("related_tickers", [])),
                    article_id,
                ),
            )
            total += 1
            print(f"  Summarized: {title[:50]}...")

        except Exception as e:
            print(f"  ERROR summarizing article {article_id}: {e}")

    conn.commit()
    conn.close()
    print(f"  Total summarized: {total}")
    return total


if __name__ == "__main__":
    print("=== Summarizing News ===")
    summarize_articles()
