"""Main pipeline runner. Executes all data collection and processing steps."""

import sqlite3
import sys
from datetime import datetime
from config import DB_PATH


def log_pipeline(conn, name: str, status: str, records: int = 0):
    """Log pipeline run to database."""
    cursor = conn.cursor()
    now = datetime.now().isoformat()
    cursor.execute(
        """INSERT INTO pipeline_runs (pipeline_name, started_at, finished_at, status, records_processed)
           VALUES (?, ?, ?, ?, ?)""",
        (name, now, now if status != "running" else None, status, records),
    )
    conn.commit()
    return cursor.lastrowid


def run_full_pipeline():
    """Run the complete data pipeline."""
    print("=" * 60)
    print(f"  HTS Data Pipeline - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    conn = sqlite3.connect(DB_PATH)

    # Step 1: Fetch FRED data
    print("\n[1/7] Fetching FRED economic data...")
    try:
        from fetch_fred import fetch_all_series
        records = fetch_all_series()
        log_pipeline(conn, "fetch_fred", "success", records)
    except Exception as e:
        print(f"  FAILED: {e}")
        log_pipeline(conn, "fetch_fred", "failed")

    # Step 2: Compute indicators
    print("\n[2/7] Computing indicators...")
    try:
        from compute_indicators import compute_all
        indicator_results = compute_all()
        log_pipeline(conn, "compute_indicators", "success")
    except Exception as e:
        print(f"  FAILED: {e}")
        log_pipeline(conn, "compute_indicators", "failed")
        indicator_results = {}

    # Step 3: Determine regimes
    print("\n[3/7] Determining regimes...")
    try:
        from determine_regime import determine_all_regimes
        regimes = determine_all_regimes(indicator_results)
        log_pipeline(conn, "determine_regime", "success")
    except Exception as e:
        print(f"  FAILED: {e}")
        log_pipeline(conn, "determine_regime", "failed")
        regimes = {"US": "goldilocks"}

    # Step 4: Fetch prices (작전 시그널/유니버스용 — QQQ/^VIX/반도체/엣지 등)
    print("\n[4/7] Fetching prices (campaign signals)...")
    try:
        from fetch_prices import fetch_all_prices
        price_count = fetch_all_prices()
        log_pipeline(conn, "fetch_prices", "success", price_count)
    except Exception as e:
        print(f"  FAILED: {e}")
        log_pipeline(conn, "fetch_prices", "failed")

    # Step 5: Fetch hyperscaler capex (선행 천장 시그널, SEC EDGAR)
    print("\n[5/7] Fetching hyperscaler capex (SEC EDGAR)...")
    try:
        from fetch_capex import fetch_all_capex
        capex_count = fetch_all_capex()
        log_pipeline(conn, "fetch_capex", "success", capex_count)
    except Exception as e:
        print(f"  FAILED: {e}")
        log_pipeline(conn, "fetch_capex", "failed")

    # Step 6: Fetch news
    print("\n[6/7] Fetching news...")
    try:
        from fetch_news import fetch_all_news
        news_count = fetch_all_news()
        log_pipeline(conn, "fetch_news", "success", news_count)
    except Exception as e:
        print(f"  FAILED: {e}")
        log_pipeline(conn, "fetch_news", "failed")

    # Step 7: Summarize news with Gemini
    print("\n[7/7] Summarizing news with AI...")
    try:
        from summarize_news import summarize_articles
        summaries = summarize_articles(limit=10)
        log_pipeline(conn, "summarize_news", "success", summaries)
    except Exception as e:
        print(f"  FAILED: {e}")
        log_pipeline(conn, "summarize_news", "failed")

    # Generate allocation for US regime
    print("\n[Bonus] Generating portfolio allocation...")
    try:
        from generate_allocation import generate_allocation
        us_regime = regimes.get("US", "goldilocks")
        generate_allocation(us_regime, 100_000_000, risk_level=3)
    except Exception as e:
        print(f"  FAILED: {e}")

    conn.close()
    print("\n" + "=" * 60)
    print("  Pipeline complete!")
    print("=" * 60)


if __name__ == "__main__":
    run_full_pipeline()
