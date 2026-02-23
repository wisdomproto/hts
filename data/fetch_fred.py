"""Fetch economic data from FRED API and store in SQLite."""

import sqlite3
from datetime import datetime, timedelta
from fredapi import Fred
from config import FRED_API_KEY, DB_PATH, FRED_SERIES


def fetch_all_series():
    """Fetch all configured FRED series and store in DB."""
    if not FRED_API_KEY:
        print("ERROR: FRED_API_KEY not set. Please set it in .env.local")
        return 0

    fred = Fred(api_key=FRED_API_KEY)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    total_records = 0
    now = datetime.now().isoformat()

    # Fetch data for last 5 years
    start_date = (datetime.now() - timedelta(days=5 * 365)).strftime("%Y-%m-%d")

    for country, categories in FRED_SERIES.items():
        for category, series_list in categories.items():
            for series_info in series_list:
                series_id = series_info["id"]
                try:
                    print(f"  Fetching {series_id} ({series_info['name']}) for {country}...")
                    data = fred.get_series(series_id, observation_start=start_date)

                    if data is None or data.empty:
                        print(f"  WARNING: No data for {series_id}")
                        continue

                    # Insert data
                    for date, value in data.items():
                        if value is not None and str(value) != "nan":
                            cursor.execute(
                                """INSERT OR REPLACE INTO economic_data
                                   (series_id, date, value, country, category, fetched_at)
                                   VALUES (?, ?, ?, ?, ?, ?)""",
                                (series_id, str(date.date()), float(value), country, category, now),
                            )
                            total_records += 1

                    # Also insert/update series_config
                    cursor.execute(
                        """INSERT OR REPLACE INTO series_config
                           (series_id, name, country, category, axis, is_active)
                           VALUES (?, ?, ?, ?, ?, 1)""",
                        (series_id, series_info["name"], country, category, category),
                    )

                except Exception as e:
                    print(f"  ERROR fetching {series_id}: {e}")

    conn.commit()
    conn.close()
    print(f"  Total records fetched: {total_records}")
    return total_records


if __name__ == "__main__":
    print("=== Fetching FRED Data ===")
    fetch_all_series()
