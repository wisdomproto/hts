"""Shared regime utilities — single source of truth for Python data pipeline.

All regime name mappings, thresholds, and series configurations live here.
Used by: compute_indicators.py, determine_regime.py, compute_historical_regimes.py
"""

# ─── Regime name mapping ────────────────────────────────────────────────────
# 3-axis model: (growth, inflation, liquidity) → regime name

REGIME_NAMES = {
    ("high", "low", "expanding"): "goldilocks",
    ("high", "low", "contracting"): "disinflation_tightening",
    ("high", "high", "expanding"): "inflation_boom",
    ("high", "high", "contracting"): "overheating",
    ("low", "high", "expanding"): "stagflation_lite",
    ("low", "high", "contracting"): "stagflation",
    ("low", "low", "expanding"): "reflation",
    ("low", "low", "contracting"): "deflation_crisis",
}


def derive_regime_name(growth: str, inflation: str, liquidity: str) -> str:
    """Derive regime name from 3-axis states."""
    return REGIME_NAMES.get((growth, inflation, liquidity), "goldilocks")


# ─── Series that are already growth rates (%) ────────────────────────────────
# No need to compute QoQ/YoY for these

GROWTH_RATE_SERIES = {
    "JPNGDPRQPSMEI",    # Japan GDP YoY %
    "CHNGDPRAPSMEI",    # China GDP YoY %
    "INDGDPRQPSMEI",    # India GDP YoY %
    "A191RL1Q225SBEA",  # US GDP annualized rate %
}

# ─── Series that are already inflation rates (%) ─────────────────────────────
# Value is already YoY inflation % — use directly, no YoY computation needed

INFLATION_RATE_SERIES = {
    "FPCPITOTLZGJPN",   # Japan annual inflation % (World Bank)
}


# ─── Growth series per country ───────────────────────────────────────────────

GROWTH_SERIES = {
    "US": "A191RL1Q225SBEA",
    "EU": "CLVMNACSCAB1GQEA19",
    "JP": "JPNGDPRQPSMEI",
    "KR": "NGDPRSAXDCKRQ",
    "CN": "CHNGDPRAPSMEI",
    "IN": "INDGDPRQPSMEI",
}


# ─── CPI series per country ─────────────────────────────────────────────────

CPI_SERIES = {
    "US": "CPIAUCSL",
    "EU": "CP0000EZ19M086NEST",
    "JP": "FPCPITOTLZGJPN",       # World Bank annual inflation % (JPNCPIALLMINMEI discontinued 2021)
    "KR": "KORCPIALLMINMEI",
    "CN": "CHNCPIALLMINMEI",
    "IN": "INDCPIALLMINMEI",
}


# ─── Growth thresholds per country ───────────────────────────────────────────

GROWTH_THRESHOLDS = {
    "US": 2.0,   # US long-run avg ~2%
    "EU": 1.5,   # EU long-run avg ~1.5%
    "JP": 1.0,   # Japan long-run avg ~1%
    "KR": 2.5,   # Korea long-run avg ~2.5%
    "CN": 5.0,   # China target ~5%
    "IN": 6.0,   # India long-run avg ~6%
}


# ─── Inflation thresholds per country ────────────────────────────────────────

INFLATION_THRESHOLDS = {
    "US": 2.5,
    "EU": 2.5,
    "JP": 2.0,
    "KR": 2.5,
    "CN": 3.0,
    "IN": 4.0,
}


# ─── Liquidity signal configs ───────────────────────────────────────────────

LIQUIDITY_SIGNALS = [
    {"series_id": "WALCL",         "name": "fed_balance_sheet", "lookback": 12},
    {"series_id": "RRPONTSYD",     "name": "reverse_repo",     "lookback": 12},
    {"series_id": "NFCI",          "name": "nfci",             "lookback": 4},
    {"series_id": "BAMLH0A0HYM2",  "name": "hy_spread",        "lookback": 12},
    {"series_id": "SOFR",          "name": "sofr",             "lookback": 12},
]

MIN_EASING_FOR_EXPANDING = 3  # 3-of-5 rule


# ─── All countries ───────────────────────────────────────────────────────────

COUNTRIES = ["US", "EU", "JP", "KR", "CN", "IN"]
