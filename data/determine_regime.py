"""Determine macroeconomic regime using 3-axis model (Growth x Inflation x Liquidity)."""

import sqlite3
from datetime import datetime
from config import DB_PATH
from regime_utils import (
    REGIME_NAMES,
    derive_regime_name,
    LIQUIDITY_SIGNALS,
    MIN_EASING_FOR_EXPANDING,
    COUNTRIES,
)


def assess_liquidity(conn) -> str:
    """
    Assess liquidity state using "3-of-5" rule.
    Returns 'expanding' or 'contracting'.

    5 signals:
    1. Fed Balance Sheet: expanding if growing or QT slowing
    2. Reserves/Repo: stable if reverse repo declining normally
    3. NFCI: easing if < 0 and moving more negative
    4. Credit Spreads: easing if HY spread narrowing
    5. SOFR: normal if stable, not spiking
    """
    cursor = conn.cursor()
    easing_count = 0
    signals = []

    # Signal 1: Fed Balance Sheet (WALCL) - expanding if recent trend up or flat
    cursor.execute(
        """SELECT value FROM economic_data
           WHERE series_id = 'WALCL' ORDER BY date DESC LIMIT 12""",
    )
    rows = cursor.fetchall()
    if len(rows) >= 2:
        recent = rows[0][0]
        older = rows[-1][0]
        direction = "easing" if recent >= older * 0.99 else "tightening"
        if direction == "easing":
            easing_count += 1
        signals.append(("fed_balance_sheet", direction, recent))

    # Signal 2: Reverse Repo (RRPONTSYD) - declining RRP = liquidity releasing
    cursor.execute(
        """SELECT value FROM economic_data
           WHERE series_id = 'RRPONTSYD' ORDER BY date DESC LIMIT 12""",
    )
    rows = cursor.fetchall()
    if len(rows) >= 2:
        recent = rows[0][0]
        older = rows[-1][0]
        direction = "easing" if recent <= older else "tightening"
        if direction == "easing":
            easing_count += 1
        signals.append(("reverse_repo", direction, recent))

    # Signal 3: NFCI - negative = easing, positive = tightening
    cursor.execute(
        """SELECT value FROM economic_data
           WHERE series_id = 'NFCI' ORDER BY date DESC LIMIT 4""",
    )
    rows = cursor.fetchall()
    if rows:
        latest_nfci = rows[0][0]
        direction = "easing" if latest_nfci < 0 else "tightening"
        if direction == "easing":
            easing_count += 1
        signals.append(("nfci", direction, latest_nfci))

    # Signal 4: HY Spread (BAMLH0A0HYM2) - narrowing = easing
    cursor.execute(
        """SELECT value FROM economic_data
           WHERE series_id = 'BAMLH0A0HYM2' ORDER BY date DESC LIMIT 12""",
    )
    rows = cursor.fetchall()
    if len(rows) >= 2:
        recent = rows[0][0]
        older = rows[-1][0]
        direction = "easing" if recent <= older else "tightening"
        if direction == "easing":
            easing_count += 1
        signals.append(("hy_spread", direction, recent))

    # Signal 5: SOFR - stable/declining = normal
    cursor.execute(
        """SELECT value FROM economic_data
           WHERE series_id = 'SOFR' ORDER BY date DESC LIMIT 12""",
    )
    rows = cursor.fetchall()
    if len(rows) >= 2:
        recent = rows[0][0]
        older = rows[-1][0]
        direction = "easing" if recent <= older else "tightening"
        if direction == "easing":
            easing_count += 1
        signals.append(("sofr", direction, recent))

    # Store signals
    now = datetime.now().strftime("%Y-%m-%d")
    for signal_name, direction, value in signals:
        cursor.execute(
            """INSERT OR REPLACE INTO liquidity_signals (date, signal_name, direction, raw_value)
               VALUES (?, ?, ?, ?)""",
            (now, signal_name, direction, value),
        )

    # 3-of-5 rule
    total_signals = len(signals)
    if total_signals == 0:
        return "expanding"  # Default fallback

    liquidity_state = "expanding" if easing_count >= MIN_EASING_FOR_EXPANDING else "contracting"
    print(f"  Liquidity: {easing_count}/{total_signals} easing signals -> {liquidity_state}")
    return liquidity_state


def determine_regime(conn, country: str, growth_state: str, inflation_state: str, liquidity_state: str):
    """Store the determined regime in the database."""
    cursor = conn.cursor()
    now = datetime.now().strftime("%Y-%m-%d")

    regime_name = derive_regime_name(growth_state, inflation_state, liquidity_state)

    cursor.execute(
        """INSERT OR REPLACE INTO regimes (date, growth_state, inflation_state, liquidity_state, regime_name, country)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (now, growth_state, inflation_state, liquidity_state, regime_name, country),
    )

    print(f"  Regime for {country}: {regime_name} (G={growth_state}, I={inflation_state}, L={liquidity_state})")
    return regime_name


def determine_all_regimes(indicator_results: dict):
    """Determine regimes for all countries."""
    conn = sqlite3.connect(DB_PATH)

    # Get liquidity state (primarily US-based)
    liquidity_state = assess_liquidity(conn)

    # Fallback defaults: use US values when a country's data is missing
    us_indicators = indicator_results.get("US", {})
    us_growth = us_indicators.get("growth", "low")
    us_inflation = us_indicators.get("inflation", "low")

    regimes = {}
    for country, indicators in indicator_results.items():
        growth = indicators.get("growth")
        inflation = indicators.get("inflation")

        if growth is None:
            # Missing data → use US as proxy rather than blindly assuming "high"
            growth = us_growth if us_growth is not None else "low"
            print(f"  {country}: Growth data missing, using US proxy ({growth})")
        if inflation is None:
            inflation = us_inflation if us_inflation is not None else "low"
            print(f"  {country}: Inflation data missing, using US proxy ({inflation})")

        # Non-US countries use US liquidity as proxy
        regime = determine_regime(conn, country, growth, inflation, liquidity_state)
        regimes[country] = regime

    conn.commit()
    conn.close()
    return regimes


if __name__ == "__main__":
    print("=== Determining Regimes ===")
    # Requires compute_indicators to have run first
    from compute_indicators import compute_all
    results = compute_all()
    determine_all_regimes(results)
