"""Compute historical regimes from FRED economic data for backtesting.

Walks through historical economic data month-by-month and determines
what the regime would have been at each point in time using the same
3-axis model (Growth x Inflation x Liquidity).

This populates the `regimes` table with historical entries so the
backtest can use realistic regime transitions instead of defaulting
to a single regime.
"""

import sqlite3
import pandas as pd
from datetime import datetime
from config import DB_PATH
from regime_utils import (
    REGIME_NAMES,
    derive_regime_name,
    GROWTH_SERIES,
    CPI_SERIES,
    GROWTH_RATE_SERIES,
    GROWTH_THRESHOLDS,
    INFLATION_THRESHOLDS,
    COUNTRIES,
)


def load_series(conn, series_id):
    """Load a time series from economic_data as a DataFrame."""
    df = pd.read_sql_query(
        "SELECT date, value FROM economic_data WHERE series_id = ? ORDER BY date ASC",
        conn,
        params=(series_id,),
    )
    if not df.empty:
        df["date"] = pd.to_datetime(df["date"])
        df = df.set_index("date")
    return df


def compute_growth_at_date(conn, country, target_date):
    """
    Determine growth state at a given date.
    Uses GDP growth data available up to that date.
    """
    series_id = GROWTH_SERIES.get(country)
    if not series_id:
        return "low"  # default: conservative when data missing

    df = load_series(conn, series_id)
    if df.empty:
        return "low"

    # Filter to data available at this date
    available = df[df.index <= target_date]
    if len(available) < 2:
        return "low"

    threshold = GROWTH_THRESHOLDS.get(country, 2.0)

    if series_id in GROWTH_RATE_SERIES:
        # Already a growth rate (%) — use directly
        latest_val = available.iloc[-1]["value"]
        return "high" if latest_val > threshold else "low"
    else:
        # GDP level — compute YoY growth (4 quarters back)
        if len(available) < 5:
            return "low"
        vals = available["value"]
        yoy = vals.pct_change(periods=4) * 100
        latest_growth = yoy.iloc[-1]
        if pd.isna(latest_growth):
            return "low"
        return "high" if latest_growth > threshold else "low"


def compute_inflation_at_date(conn, country, target_date):
    """
    Determine inflation state at a given date.
    Uses CPI data available up to that date to compute YoY inflation.
    """
    series_id = CPI_SERIES.get(country)
    if not series_id:
        return "low"

    df = load_series(conn, series_id)
    if df.empty:
        return "low"

    # Filter to data available at this date
    available = df[df.index <= target_date]
    if len(available) < 13:
        return "low"  # Need at least 13 months for YoY

    # Compute YoY CPI
    vals = available["value"]
    yoy = vals.pct_change(periods=12) * 100

    latest_yoy = yoy.iloc[-1]
    if pd.isna(latest_yoy):
        return "low"

    threshold = INFLATION_THRESHOLDS.get(country, 2.5)

    return "high" if latest_yoy > threshold else "low"


def compute_liquidity_at_date(conn, target_date):
    """
    Assess liquidity state at a given date using the "3-of-5" rule.
    Uses only data available up to that date (no look-ahead bias).

    5 signals:
    1. Fed Balance Sheet (WALCL): expanding if growing or flat over trailing window
    2. Reverse Repo (RRPONTSYD): easing if declining
    3. NFCI: easing if < 0
    4. HY Spread (BAMLH0A0HYM2): easing if narrowing
    5. SOFR: easing if stable/declining
    """
    easing_count = 0
    total_signals = 0

    # Load all liquidity series once
    series_configs = [
        ("WALCL", "fed_balance_sheet", 12),
        ("RRPONTSYD", "reverse_repo", 12),
        ("NFCI", "nfci", 4),
        ("BAMLH0A0HYM2", "hy_spread", 12),
        ("SOFR", "sofr", 12),
    ]

    for series_id, signal_name, lookback in series_configs:
        df = load_series(conn, series_id)
        if df.empty:
            continue

        available = df[df.index <= target_date]
        if len(available) < 2:
            continue

        # Get the most recent 'lookback' observations
        window = available.tail(lookback)
        recent = window.iloc[-1]["value"]
        older = window.iloc[0]["value"]

        if signal_name == "nfci":
            # NFCI: negative = easing
            direction = "easing" if recent < 0 else "tightening"
        elif signal_name == "reverse_repo":
            # Declining RRP = liquidity releasing
            direction = "easing" if recent <= older else "tightening"
        elif signal_name == "fed_balance_sheet":
            # Growing or flat (within 1%) = easing
            direction = "easing" if recent >= older * 0.99 else "tightening"
        elif signal_name == "hy_spread":
            # Narrowing spread = easing
            direction = "easing" if recent <= older else "tightening"
        elif signal_name == "sofr":
            # Stable/declining = easing
            direction = "easing" if recent <= older else "tightening"
        else:
            continue

        total_signals += 1
        if direction == "easing":
            easing_count += 1

    if total_signals == 0:
        return "expanding"  # default fallback

    # 3-of-5 rule (or majority if fewer signals available)
    threshold = max(3, (total_signals + 1) // 2)
    return "expanding" if easing_count >= threshold else "contracting"


def compute_historical_regimes():
    """
    Walk through history month-by-month and compute regimes for each country.
    Stores results in the regimes table.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Clear existing historical regimes (keep running fresh)
    cursor.execute("DELETE FROM regimes")
    print("Cleared existing regime data.")

    # Determine date range from available economic data
    cursor.execute("SELECT MIN(date), MAX(date) FROM economic_data")
    row = cursor.fetchone()
    if not row or not row[0]:
        print("No economic data found!")
        conn.close()
        return

    data_start = pd.Timestamp(row[0])
    data_end = pd.Timestamp(row[1])

    # Start from 13 months after data start (need 12 months for YoY CPI)
    regime_start = data_start + pd.DateOffset(months=13)
    # Generate monthly dates (first of each month)
    dates = pd.date_range(start=regime_start, end=data_end, freq="MS")

    total_entries = 0
    regime_counts = {}

    print(f"Computing regimes from {regime_start.strftime('%Y-%m-%d')} to {data_end.strftime('%Y-%m-%d')}")
    print(f"Total months to process: {len(dates)}")
    print()

    for dt in dates:
        # Compute liquidity (US-based, shared across countries)
        liquidity = compute_liquidity_at_date(conn, dt)

        for country in COUNTRIES:
            growth = compute_growth_at_date(conn, country, dt)
            inflation = compute_inflation_at_date(conn, country, dt)

            regime_name = derive_regime_name(growth, inflation, liquidity)

            date_str = dt.strftime("%Y-%m-%d")
            cursor.execute(
                """INSERT INTO regimes (date, growth_state, inflation_state, liquidity_state, regime_name, country)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (date_str, growth, inflation, liquidity, regime_name, country),
            )
            total_entries += 1

            # Track regime counts
            key = f"{country}:{regime_name}"
            regime_counts[key] = regime_counts.get(key, 0) + 1

        # Print progress every quarter
        if dt.month in (1, 4, 7, 10):
            us_growth = compute_growth_at_date(conn, "US", dt)
            us_inflation = compute_inflation_at_date(conn, "US", dt)
            us_regime = derive_regime_name(us_growth, us_inflation, liquidity)
            print(f"  {date_str}: US regime={us_regime} (G={us_growth}, I={us_inflation}, L={liquidity})")

    conn.commit()
    conn.close()

    print(f"\nTotal regime entries created: {total_entries}")
    print(f"\n=== Regime Distribution ===")
    for country in COUNTRIES:
        print(f"\n  {country}:")
        country_regimes = {k.split(":")[1]: v for k, v in regime_counts.items() if k.startswith(f"{country}:")}
        for regime, count in sorted(country_regimes.items(), key=lambda x: -x[1]):
            pct = count / len(dates) * 100
            print(f"    {regime}: {count} months ({pct:.0f}%)")


if __name__ == "__main__":
    print("=== Computing Historical Regimes ===\n")
    compute_historical_regimes()
    print("\nDone! Run the backtest again to see regime variation.")
