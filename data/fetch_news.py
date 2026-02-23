"""Fetch news from RSS feeds and store in SQLite."""

import sqlite3
from datetime import datetime
import feedparser
from config import DB_PATH, RSS_FEEDS


def fetch_all_news():
    """Fetch news from all configured RSS feeds."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    total = 0

    for feed_config in RSS_FEEDS:
        try:
            print(f"  Fetching from {feed_config['source']}...")
            feed = feedparser.parse(feed_config["url"])

            for entry in feed.entries[:20]:  # Max 20 per source
                title = entry.get("title", "")
                link = entry.get("link", "")
                published = entry.get("published", "")

                # Parse published date
                if published:
                    try:
                        # feedparser provides parsed time
                        if hasattr(entry, "published_parsed") and entry.published_parsed:
                            dt = datetime(*entry.published_parsed[:6])
                            published = dt.isoformat()
                        else:
                            published = datetime.now().isoformat()
                    except Exception:
                        published = datetime.now().isoformat()
                else:
                    published = datetime.now().isoformat()

                # Check if already exists
                cursor.execute(
                    "SELECT id FROM news_articles WHERE url = ?", (link,)
                )
                if cursor.fetchone():
                    continue

                cursor.execute(
                    """INSERT INTO news_articles
                       (title, source, url, published_at, category)
                       VALUES (?, ?, ?, ?, ?)""",
                    (title, feed_config["source"], link, published, "macro"),
                )
                total += 1

        except Exception as e:
            print(f"  ERROR fetching {feed_config['source']}: {e}")

    conn.commit()
    conn.close()
    print(f"  Total new articles: {total}")
    return total


if __name__ == "__main__":
    print("=== Fetching News ===")
    fetch_all_news()
