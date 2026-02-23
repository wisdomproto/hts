"""Compute derived indicators (YoY, moving averages, thresholds) from raw economic data."""

import sqlite3
import pandas as pd
from datetime import datetime
from config import DB_PATH
from regime_utils import (
    GROWTH_RATE_SERIES,
    INFLATION_RATE_SERIES,
    GROWTH_SERIES,
    CPI_SERIES,
    GROWTH_THRESHOLDS,
    INFLATION_THRESHOLDS,
    COUNTRIES,
)


def compute_yoy(values: pd.Series) -> pd.Series:
    """Compute Year-over-Year percentage change."""
    return values.pct_change(periods=12) * 100  # Monthly data, 12 months back


def compute_growth_indicator(conn, country: str):
    """Compute growth state (high/low) for a country."""
    cursor = conn.cursor()

    series_id = GROWTH_SERIES.get(country)
    if not series_id:
        print(f"  {country}: No growth series configured")
        return None

    cursor.execute(
        """SELECT date, value FROM economic_data
           WHERE series_id = ? AND country = ?
           ORDER BY date ASC""",
        (series_id, country),
    )
    rows = cursor.fetchall()

    if not rows:
        # Fallback: try fetching without country filter (some series are not tagged)
        cursor.execute(
            """SELECT date, value FROM economic_data
               WHERE series_id = ?
               ORDER BY date ASC""",
            (series_id,),
        )
        rows = cursor.fetchall()

    if len(rows) < 2:
        print(f"  {country}: Insufficient growth data for {series_id} ({len(rows)} rows)")
        return None

    df = pd.DataFrame(rows, columns=["date", "value"])
    threshold = GROWTH_THRESHOLDS.get(country, 2.0)

    if series_id in GROWTH_RATE_SERIES:
        # Already a growth rate (%) — use directly
        latest_value = df.iloc[-1]["value"]
        latest_date = df.iloc[-1]["date"]
    else:
        # GDP level — compute QoQ annualized growth
        df["growth"] = df["value"].pct_change(periods=4) * 100
        valid = df.dropna(subset=["growth"])
        if valid.empty:
            print(f"  {country}: Cannot compute QoQ growth for {series_id}")
            return None
        latest_value = valid.iloc[-1]["growth"]
        latest_date = valid.iloc[-1]["date"]

    state = "high" if latest_value > threshold else "low"

    cursor.execute(
        """INSERT OR REPLACE INTO computed_indicators
           (indicator_name, date, value, country, axis)
           VALUES (?, ?, ?, ?, ?)""",
        ("gdp_growth", latest_date, float(latest_value), country, "growth"),
    )

    print(f"  {country}: GDP growth = {latest_value:.2f}% (threshold={threshold}%) → {state}")
    return state


def compute_inflation_indicator(conn, country: str):
    """Compute inflation state (high/low) for a country."""
    cursor = conn.cursor()

    series_id = CPI_SERIES.get(country)
    if not series_id:
        print(f"  {country}: No CPI series configured")
        return None

    cursor.execute(
        """SELECT date, value FROM economic_data
           WHERE series_id = ? AND country = ?
           ORDER BY date ASC""",
        (series_id, country),
    )
    rows = cursor.fetchall()

    if not rows:
        # Fallback: try without country filter
        cursor.execute(
            """SELECT date, value FROM economic_data
               WHERE series_id = ?
               ORDER BY date ASC""",
            (series_id,),
        )
        rows = cursor.fetchall()

    threshold = INFLATION_THRESHOLDS.get(country, 2.5)

    if series_id in INFLATION_RATE_SERIES:
        # Already inflation rate (%) — use directly, no YoY computation needed
        if len(rows) < 1:
            print(f"  {country}: No inflation data for {series_id}")
            return None
        df = pd.DataFrame(rows, columns=["date", "value"])
        latest_value = df.iloc[-1]["value"]
        latest_date = df.iloc[-1]["date"]
    else:
        # CPI index — compute YoY
        if len(rows) < 13:
            print(f"  {country}: Insufficient CPI data for {series_id} ({len(rows)} rows, need 13+)")
            return None

        df = pd.DataFrame(rows, columns=["date", "value"])
        df["yoy"] = compute_yoy(df["value"])

        valid = df.dropna(subset=["yoy"])
        if valid.empty:
            print(f"  {country}: Cannot compute CPI YoY for {series_id}")
            return None

        latest_value = valid.iloc[-1]["yoy"]
        latest_date = valid.iloc[-1]["date"]

    state = "high" if latest_value > threshold else "low"

    cursor.execute(
        """INSERT OR REPLACE INTO computed_indicators
           (indicator_name, date, value, country, axis)
           VALUES (?, ?, ?, ?, ?)""",
        ("cpi_yoy", latest_date, float(latest_value), country, "inflation"),
    )

    print(f"  {country}: CPI YoY = {latest_value:.2f}% (threshold={threshold}%) → {state}")
    return state


def compute_all():
    """Compute all indicators for all countries."""
    conn = sqlite3.connect(DB_PATH)
    results = {}

    print("=== Computing Indicators ===")
    for country in COUNTRIES:
        growth = compute_growth_indicator(conn, country)
        inflation = compute_inflation_indicator(conn, country)
        results[country] = {"growth": growth, "inflation": inflation}

    conn.commit()
    conn.close()
    return results


if __name__ == "__main__":
    compute_all()
