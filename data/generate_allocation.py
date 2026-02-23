"""Generate portfolio allocation based on current regime."""

import sqlite3
from datetime import datetime
from config import DB_PATH, REGIME_ALLOCATIONS

# Default asset universe — global market cap proportions
# Stocks: US ~63%, EU ~15%, JP ~6%, CN ~3%, IN ~2%, KR ~1.5%
DEFAULT_ASSETS = [
    {"ticker": "SPY", "name": "S&P 500", "asset_class": "stocks", "country": "US", "weight_within_class": 0.44},
    {"ticker": "QQQ", "name": "NASDAQ 100", "asset_class": "stocks", "country": "US", "weight_within_class": 0.19},
    {"ticker": "VGK", "name": "FTSE Europe", "asset_class": "stocks", "country": "EU", "weight_within_class": 0.15},
    {"ticker": "EWJ", "name": "MSCI Japan", "asset_class": "stocks", "country": "JP", "weight_within_class": 0.07},
    {"ticker": "FXI", "name": "China Large-Cap", "asset_class": "stocks", "country": "CN", "weight_within_class": 0.06},
    {"ticker": "INDA", "name": "MSCI India", "asset_class": "stocks", "country": "IN", "weight_within_class": 0.05},
    {"ticker": "EWY", "name": "MSCI Korea", "asset_class": "stocks", "country": "KR", "weight_within_class": 0.04},
    {"ticker": "SHY", "name": "1-3yr Treasury", "asset_class": "bonds", "country": "US", "weight_within_class": 0.15},
    {"ticker": "IEI", "name": "3-7yr Treasury", "asset_class": "bonds", "country": "US", "weight_within_class": 0.20},
    {"ticker": "IEF", "name": "7-10yr Treasury", "asset_class": "bonds", "country": "US", "weight_within_class": 0.25},
    {"ticker": "TLT", "name": "20+yr Treasury", "asset_class": "bonds", "country": "US", "weight_within_class": 0.20},
    {"ticker": "BNDX", "name": "Intl Bond", "asset_class": "bonds", "country": "EU", "weight_within_class": 0.20},
    {"ticker": "VNQ", "name": "US REITs", "asset_class": "realestate", "country": "US", "weight_within_class": 0.60},
    {"ticker": "VNQI", "name": "Intl REITs", "asset_class": "realestate", "country": "EU", "weight_within_class": 0.40},
    {"ticker": "GLD", "name": "Gold", "asset_class": "commodities", "country": "GL", "weight_within_class": 0.50},
    {"ticker": "CPER", "name": "Copper", "asset_class": "commodities", "country": "GL", "weight_within_class": 0.25},
    {"ticker": "USO", "name": "Crude Oil", "asset_class": "commodities", "country": "GL", "weight_within_class": 0.25},
    {"ticker": "IBIT", "name": "Bitcoin ETF", "asset_class": "crypto", "country": "GL", "weight_within_class": 0.70},
    {"ticker": "BITO", "name": "Bitcoin Strategy", "asset_class": "crypto", "country": "GL", "weight_within_class": 0.30},
]


def generate_allocation(regime_name: str, total_amount: float, risk_level: int = 3):
    """Generate portfolio allocation based on regime and total amount."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Get allocation template for the regime
    template = dict(REGIME_ALLOCATIONS.get(regime_name, REGIME_ALLOCATIONS["goldilocks"]))

    # Apply user regime overrides if any exist
    try:
        cursor.execute(
            "SELECT asset_class, weight_pct FROM user_regime_overrides WHERE regime_name = ?",
            (regime_name,),
        )
        overrides = cursor.fetchall()
        if overrides:
            for asset_class, weight_pct in overrides:
                template[asset_class] = weight_pct
            print(f"  Applied {len(overrides)} user override(s) for regime '{regime_name}'")
    except Exception as e:
        print(f"  Warning: Could not read user_regime_overrides: {e}")

    # Apply risk adjustment (1=conservative, 5=aggressive)
    risk_multiplier = {
        1: {"stocks": 0.6, "bonds": 1.4, "realestate": 0.7, "commodities": 0.8, "crypto": 0.3, "cash": 1.5},
        2: {"stocks": 0.8, "bonds": 1.2, "realestate": 0.85, "commodities": 0.9, "crypto": 0.6, "cash": 1.3},
        3: {"stocks": 1.0, "bonds": 1.0, "realestate": 1.0, "commodities": 1.0, "crypto": 1.0, "cash": 1.0},
        4: {"stocks": 1.2, "bonds": 0.8, "realestate": 1.15, "commodities": 1.1, "crypto": 1.4, "cash": 0.7},
        5: {"stocks": 1.4, "bonds": 0.6, "realestate": 1.3, "commodities": 1.2, "crypto": 1.8, "cash": 0.5},
    }

    multipliers = risk_multiplier.get(risk_level, risk_multiplier[3])

    # Apply multipliers and normalize to 100%
    adjusted = {}
    total_pct = 0
    for asset_class, pct in template.items():
        adj_pct = pct * multipliers.get(asset_class, 1.0)
        adjusted[asset_class] = adj_pct
        total_pct += adj_pct

    # Normalize
    for asset_class in adjusted:
        adjusted[asset_class] = (adjusted[asset_class] / total_pct) * 100

    # Get latest regime ID
    cursor.execute(
        "SELECT id FROM regimes WHERE regime_name = ? ORDER BY date DESC LIMIT 1",
        (regime_name,),
    )
    regime_row = cursor.fetchone()
    regime_id = regime_row[0] if regime_row else None

    # Create allocation record
    now = datetime.now().isoformat()
    cursor.execute(
        """INSERT INTO allocations (regime_id, total_amount, risk_level, created_at)
           VALUES (?, ?, ?, ?)""",
        (regime_id, total_amount, risk_level, now),
    )
    allocation_id = cursor.lastrowid

    # Get user assets or use defaults
    cursor.execute("SELECT ticker, name, asset_class, country FROM user_assets WHERE is_active = 1")
    user_assets = cursor.fetchall()

    if user_assets:
        assets = [
            {"ticker": r[0], "name": r[1], "asset_class": r[2], "country": r[3]}
            for r in user_assets
        ]
    else:
        assets = DEFAULT_ASSETS

    # Calculate individual allocations
    items = []
    for asset in assets:
        asset_class = asset["asset_class"]
        class_pct = adjusted.get(asset_class, 0)

        if class_pct == 0:
            continue

        # Weight within class
        weight_within = asset.get("weight_within_class", 1.0)
        # Count assets in same class
        same_class = [a for a in assets if a["asset_class"] == asset_class]
        if not weight_within:
            weight_within = 1.0 / len(same_class)

        final_pct = class_pct * weight_within
        amount = total_amount * (final_pct / 100)

        cursor.execute(
            """INSERT INTO allocation_items
               (allocation_id, ticker, asset_class, country, weight_pct, amount)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (allocation_id, asset["ticker"], asset_class, asset["country"], final_pct, amount),
        )
        items.append({
            "ticker": asset["ticker"],
            "asset_class": asset_class,
            "country": asset["country"],
            "weight_pct": round(final_pct, 2),
            "amount": round(amount),
        })

    conn.commit()
    conn.close()

    print(f"  Generated allocation for regime '{regime_name}': {len(items)} items, total={total_amount:,.0f}")
    for item in sorted(items, key=lambda x: x["weight_pct"], reverse=True):
        print(f"    {item['ticker']:6s} {item['asset_class']:12s} {item['weight_pct']:6.2f}%  {item['amount']:>15,.0f}")

    return items


if __name__ == "__main__":
    print("=== Generating Allocation ===")
    generate_allocation("goldilocks", 100_000_000, risk_level=3)
