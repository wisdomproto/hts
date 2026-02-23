"""
Backtest engine: Simulate portfolio allocation strategy over historical data.

Flow:
1. Load historical prices for all assets
2. For each rebalance period, determine the regime at that date
3. Apply regime-based allocation (with user overrides + risk adjustment)
4. Calculate daily returns and portfolio value
5. Compute performance metrics (Sharpe, MDD, etc.)
6. Store results in DB
"""

import sqlite3
import math
import json
from datetime import datetime, timedelta
from collections import defaultdict
from config import DB_PATH, REGIME_ALLOCATIONS

# Default asset weights within class — global market cap proportions
# Stocks: US ~63%, EU ~15%, JP ~6%, CN ~3%, IN ~2%, KR ~1.5%
DEFAULT_ASSETS = [
    {"ticker": "SPY", "asset_class": "stocks", "weight_within_class": 0.44},
    {"ticker": "QQQ", "asset_class": "stocks", "weight_within_class": 0.19},
    {"ticker": "VGK", "asset_class": "stocks", "weight_within_class": 0.15},
    {"ticker": "EWJ", "asset_class": "stocks", "weight_within_class": 0.07},
    {"ticker": "FXI", "asset_class": "stocks", "weight_within_class": 0.06},
    {"ticker": "INDA", "asset_class": "stocks", "weight_within_class": 0.05},
    {"ticker": "EWY", "asset_class": "stocks", "weight_within_class": 0.04},
    {"ticker": "SHY", "asset_class": "bonds", "weight_within_class": 0.15},
    {"ticker": "IEI", "asset_class": "bonds", "weight_within_class": 0.20},
    {"ticker": "IEF", "asset_class": "bonds", "weight_within_class": 0.25},
    {"ticker": "TLT", "asset_class": "bonds", "weight_within_class": 0.20},
    {"ticker": "BNDX", "asset_class": "bonds", "weight_within_class": 0.20},
    {"ticker": "VNQ", "asset_class": "realestate", "weight_within_class": 0.60},
    {"ticker": "VNQI", "asset_class": "realestate", "weight_within_class": 0.40},
    {"ticker": "GLD", "asset_class": "commodities", "weight_within_class": 0.50},
    {"ticker": "CPER", "asset_class": "commodities", "weight_within_class": 0.25},
    {"ticker": "USO", "asset_class": "commodities", "weight_within_class": 0.25},
    {"ticker": "IBIT", "asset_class": "crypto", "weight_within_class": 0.70},
    {"ticker": "BITO", "asset_class": "crypto", "weight_within_class": 0.30},
]

RISK_MULTIPLIERS = {
    1: {"stocks": 0.6, "bonds": 1.4, "realestate": 0.7, "commodities": 0.8, "crypto": 0.3, "cash": 1.5},
    2: {"stocks": 0.8, "bonds": 1.2, "realestate": 0.85, "commodities": 0.9, "crypto": 0.6, "cash": 1.3},
    3: {"stocks": 1.0, "bonds": 1.0, "realestate": 1.0, "commodities": 1.0, "crypto": 1.0, "cash": 1.0},
    4: {"stocks": 1.2, "bonds": 0.8, "realestate": 1.15, "commodities": 1.1, "crypto": 1.4, "cash": 0.7},
    5: {"stocks": 1.4, "bonds": 0.6, "realestate": 1.3, "commodities": 1.2, "crypto": 1.8, "cash": 0.5},
}


def init_backtest_tables(conn: sqlite3.Connection):
    """Create backtest tables if they don't exist."""
    conn.execute("""
        CREATE TABLE IF NOT EXISTS backtest_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            initial_capital REAL NOT NULL,
            risk_level INTEGER NOT NULL DEFAULT 3,
            rebalance_period TEXT NOT NULL DEFAULT 'monthly',
            final_value REAL,
            total_return_pct REAL,
            annualized_return_pct REAL,
            volatility_pct REAL,
            sharpe_ratio REAL,
            max_drawdown_pct REAL,
            max_drawdown_start TEXT,
            max_drawdown_end TEXT,
            benchmark_ticker TEXT DEFAULT 'SPY',
            benchmark_return_pct REAL,
            benchmark_sharpe REAL,
            benchmark_mdd_pct REAL,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS backtest_snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id INTEGER REFERENCES backtest_runs(id),
            date TEXT NOT NULL,
            portfolio_value REAL NOT NULL,
            benchmark_value REAL,
            regime_name TEXT,
            drawdown_pct REAL
        )
    """)
    conn.commit()


def load_prices(conn: sqlite3.Connection, tickers: list[str], start_date: str, end_date: str):
    """Load historical prices into a dict: {ticker: {date: adj_close}}."""
    prices = defaultdict(dict)
    placeholders = ",".join("?" * len(tickers))
    rows = conn.execute(
        f"""SELECT ticker, date, adj_close FROM historical_prices
            WHERE ticker IN ({placeholders})
            AND date >= ? AND date <= ?
            ORDER BY date""",
        (*tickers, start_date, end_date),
    ).fetchall()

    for ticker, date, adj_close in rows:
        prices[ticker][date] = adj_close

    return dict(prices)


def get_all_dates(prices: dict[str, dict[str, float]]) -> list[str]:
    """Get sorted unique trading dates across all tickers."""
    all_dates = set()
    for ticker_dates in prices.values():
        all_dates.update(ticker_dates.keys())
    return sorted(all_dates)


def get_regime_for_date(conn: sqlite3.Connection, date: str) -> str:
    """Look up the regime for a given date from the regimes table.
    Falls back to the most recent regime before the date, or 'goldilocks' default.
    """
    row = conn.execute(
        "SELECT regime_name FROM regimes WHERE date <= ? ORDER BY date DESC LIMIT 1",
        (date,),
    ).fetchone()
    return row[0] if row else "goldilocks"


def get_allocation_weights(
    conn: sqlite3.Connection,
    regime_name: str,
    risk_level: int,
    assets: list[dict],
) -> dict[str, float]:
    """Calculate per-ticker weight percentages for a given regime and risk level."""
    # Base template
    template = dict(REGIME_ALLOCATIONS.get(regime_name, REGIME_ALLOCATIONS["goldilocks"]))

    # Apply user overrides
    try:
        rows = conn.execute(
            "SELECT asset_class, weight_pct FROM user_regime_overrides WHERE regime_name = ?",
            (regime_name,),
        ).fetchall()
        for ac, wp in rows:
            template[ac] = wp
    except Exception:
        pass

    # Apply risk multiplier
    multipliers = RISK_MULTIPLIERS.get(risk_level, RISK_MULTIPLIERS[3])
    adjusted = {}
    total_pct = 0
    for ac, pct in template.items():
        adj = pct * multipliers.get(ac, 1.0)
        adjusted[ac] = adj
        total_pct += adj

    # Normalize to 100%
    if total_pct > 0:
        for ac in adjusted:
            adjusted[ac] = (adjusted[ac] / total_pct) * 100

    # Calculate per-ticker weights
    ticker_weights = {}
    for asset in assets:
        ac = asset["asset_class"]
        class_pct = adjusted.get(ac, 0)
        if class_pct == 0:
            continue
        weight_within = asset.get("weight_within_class", 0)
        if not weight_within:
            same_class = [a for a in assets if a["asset_class"] == ac]
            weight_within = 1.0 / len(same_class) if same_class else 0
        ticker_weights[asset["ticker"]] = class_pct * weight_within / 100.0

    return ticker_weights


def is_rebalance_date(date: str, prev_date: str | None, period: str) -> bool:
    """Check if this date should trigger rebalancing."""
    if prev_date is None:
        return True  # Always rebalance on first date

    dt = datetime.strptime(date, "%Y-%m-%d")
    prev_dt = datetime.strptime(prev_date, "%Y-%m-%d")

    if period == "daily":
        return True
    elif period == "weekly":
        return dt.isocalendar()[1] != prev_dt.isocalendar()[1]
    elif period == "monthly":
        return dt.month != prev_dt.month
    elif period == "quarterly":
        return (dt.month - 1) // 3 != (prev_dt.month - 1) // 3
    elif period == "yearly":
        return dt.year != prev_dt.year
    return False


def compute_metrics(
    daily_values: list[float],
    dates: list[str],
    initial_capital: float,
    risk_free_rate: float = 0.04,
):
    """Compute performance metrics from daily portfolio values."""
    if len(daily_values) < 2:
        return {}

    final_value = daily_values[-1]
    total_return = (final_value / initial_capital - 1) * 100

    # Annualized return
    days = (datetime.strptime(dates[-1], "%Y-%m-%d") - datetime.strptime(dates[0], "%Y-%m-%d")).days
    years = max(days / 365.25, 0.01)
    annualized_return = ((final_value / initial_capital) ** (1 / years) - 1) * 100

    # Daily returns for volatility/Sharpe
    daily_returns = []
    for i in range(1, len(daily_values)):
        if daily_values[i - 1] > 0:
            daily_returns.append(daily_values[i] / daily_values[i - 1] - 1)

    if not daily_returns:
        return {
            "final_value": final_value,
            "total_return_pct": total_return,
            "annualized_return_pct": annualized_return,
        }

    # Annualized volatility
    mean_daily = sum(daily_returns) / len(daily_returns)
    variance = sum((r - mean_daily) ** 2 for r in daily_returns) / len(daily_returns)
    daily_vol = math.sqrt(variance)
    annualized_vol = daily_vol * math.sqrt(252) * 100

    # Sharpe ratio
    daily_rf = risk_free_rate / 252
    excess_returns = [r - daily_rf for r in daily_returns]
    mean_excess = sum(excess_returns) / len(excess_returns)
    sharpe = (mean_excess / daily_vol * math.sqrt(252)) if daily_vol > 0 else 0

    # Max Drawdown
    peak = daily_values[0]
    max_dd = 0
    max_dd_start = dates[0]
    max_dd_end = dates[0]
    current_dd_start = dates[0]

    drawdowns = []
    for i, val in enumerate(daily_values):
        if val > peak:
            peak = val
            current_dd_start = dates[i]
        dd = (peak - val) / peak * 100 if peak > 0 else 0
        drawdowns.append(dd)
        if dd > max_dd:
            max_dd = dd
            max_dd_start = current_dd_start
            max_dd_end = dates[i]

    return {
        "final_value": round(final_value, 2),
        "total_return_pct": round(total_return, 2),
        "annualized_return_pct": round(annualized_return, 2),
        "volatility_pct": round(annualized_vol, 2),
        "sharpe_ratio": round(sharpe, 4),
        "max_drawdown_pct": round(max_dd, 2),
        "max_drawdown_start": max_dd_start,
        "max_drawdown_end": max_dd_end,
        "drawdowns": drawdowns,
    }


def run_backtest(
    start_date: str = "2015-01-01",
    end_date: str | None = None,
    initial_capital: float = 100_000_000,
    risk_level: int = 3,
    rebalance_period: str = "monthly",
    benchmark_ticker: str = "SPY",
    name: str | None = None,
) -> dict:
    """Run a full backtest simulation.

    Returns dict with run_id and metrics.
    """
    if end_date is None:
        end_date = datetime.now().strftime("%Y-%m-%d")

    if name is None:
        name = f"Backtest {start_date} ~ {end_date}"

    conn = sqlite3.connect(DB_PATH)
    init_backtest_tables(conn)

    # Get asset universe
    assets = DEFAULT_ASSETS
    try:
        rows = conn.execute(
            "SELECT ticker, asset_class FROM user_assets WHERE is_active = 1"
        ).fetchall()
        if rows:
            # Build from user assets with equal within-class weights
            user_tickers = {}
            for ticker, ac in rows:
                if ac not in user_tickers:
                    user_tickers[ac] = []
                user_tickers[ac].append(ticker)

            assets = []
            for ac, tickers_list in user_tickers.items():
                w = 1.0 / len(tickers_list)
                for t in tickers_list:
                    assets.append({
                        "ticker": t,
                        "asset_class": ac,
                        "weight_within_class": w,
                    })
    except Exception:
        pass

    all_tickers = [a["ticker"] for a in assets]
    if benchmark_ticker not in all_tickers:
        all_tickers.append(benchmark_ticker)

    # Load prices
    prices = load_prices(conn, all_tickers, start_date, end_date)

    # Filter tickers with actual price data
    available_tickers = set(prices.keys())
    assets = [a for a in assets if a["ticker"] in available_tickers]

    if not assets:
        conn.close()
        raise ValueError("No price data available for any portfolio asset")

    # Recalculate within-class weights for available assets
    class_counts = defaultdict(list)
    for a in assets:
        class_counts[a["asset_class"]].append(a)

    for ac, ac_assets in class_counts.items():
        total_w = sum(a["weight_within_class"] for a in ac_assets)
        if total_w > 0:
            for a in ac_assets:
                a["weight_within_class"] = a["weight_within_class"] / total_w

    # Get all trading dates
    all_dates = get_all_dates(prices)
    if not all_dates:
        conn.close()
        raise ValueError("No trading dates found in price data")

    print(f"=== Running Backtest: {name} ===")
    print(f"  Period: {all_dates[0]} ~ {all_dates[-1]}")
    print(f"  Assets: {len(assets)} tickers")
    print(f"  Trading days: {len(all_dates)}")
    print(f"  Rebalance: {rebalance_period}")
    print(f"  Risk level: {risk_level}")

    # Create backtest run record
    now = datetime.now().isoformat()
    cursor = conn.execute(
        """INSERT INTO backtest_runs
           (name, start_date, end_date, initial_capital, risk_level,
            rebalance_period, benchmark_ticker, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'running', ?)""",
        (name, all_dates[0], all_dates[-1], initial_capital, risk_level,
         rebalance_period, benchmark_ticker, now),
    )
    run_id = cursor.lastrowid
    conn.commit()

    # === Simulation ===
    portfolio_value = initial_capital
    holdings = {}  # ticker -> shares
    prev_date = None
    daily_values = []
    daily_dates = []
    daily_regimes = []

    # Benchmark tracking
    benchmark_initial_price = None
    benchmark_values = []

    for date in all_dates:
        # Benchmark value
        if benchmark_ticker in prices and date in prices[benchmark_ticker]:
            bp = prices[benchmark_ticker][date]
            if benchmark_initial_price is None:
                benchmark_initial_price = bp
            bv = initial_capital * (bp / benchmark_initial_price)
            benchmark_values.append(bv)
        elif benchmark_values:
            benchmark_values.append(benchmark_values[-1])
        else:
            benchmark_values.append(initial_capital)

        # Check rebalance
        should_rebalance = is_rebalance_date(date, prev_date, rebalance_period)

        if should_rebalance:
            # Calculate current portfolio value first (if we have holdings)
            if holdings:
                pv = 0
                for ticker, shares in holdings.items():
                    if ticker in prices and date in prices[ticker]:
                        pv += shares * prices[ticker][date]
                    elif ticker in prices:
                        # Use last known price
                        latest_price = max(
                            (d for d in prices[ticker] if d <= date),
                            default=None,
                        )
                        if latest_price:
                            pv += shares * prices[ticker][latest_price]
                portfolio_value = pv if pv > 0 else portfolio_value

            # Determine regime and get weights
            regime = get_regime_for_date(conn, date)
            weights = get_allocation_weights(conn, regime, risk_level, assets)

            # Rebalance: convert portfolio value to new holdings
            holdings = {}
            for ticker, weight in weights.items():
                if ticker in prices and date in prices[ticker]:
                    price = prices[ticker][date]
                    if price > 0:
                        amount = portfolio_value * weight
                        holdings[ticker] = amount / price

        # Calculate current portfolio value
        pv = 0
        for ticker, shares in holdings.items():
            if ticker in prices and date in prices[ticker]:
                pv += shares * prices[ticker][date]
            elif ticker in prices:
                latest_price = max(
                    (d for d in prices[ticker] if d <= date),
                    default=None,
                )
                if latest_price:
                    pv += shares * prices[ticker][latest_price]

        if pv > 0:
            portfolio_value = pv

        daily_values.append(portfolio_value)
        daily_dates.append(date)
        regime = get_regime_for_date(conn, date)
        daily_regimes.append(regime)
        prev_date = date

    # === Compute Metrics ===
    metrics = compute_metrics(daily_values, daily_dates, initial_capital)
    benchmark_metrics = compute_metrics(benchmark_values, daily_dates, initial_capital)

    print(f"\n  === Results ===")
    print(f"  Final Value: {metrics.get('final_value', 0):,.0f}")
    print(f"  Total Return: {metrics.get('total_return_pct', 0):.2f}%")
    print(f"  Annualized Return: {metrics.get('annualized_return_pct', 0):.2f}%")
    print(f"  Volatility: {metrics.get('volatility_pct', 0):.2f}%")
    print(f"  Sharpe Ratio: {metrics.get('sharpe_ratio', 0):.4f}")
    print(f"  Max Drawdown: {metrics.get('max_drawdown_pct', 0):.2f}%")
    print(f"\n  === Benchmark ({benchmark_ticker}) ===")
    print(f"  Benchmark Return: {benchmark_metrics.get('total_return_pct', 0):.2f}%")
    print(f"  Benchmark Sharpe: {benchmark_metrics.get('sharpe_ratio', 0):.4f}")
    print(f"  Benchmark MDD: {benchmark_metrics.get('max_drawdown_pct', 0):.2f}%")

    # Store snapshots (sample every 5th day to keep DB small)
    drawdowns = metrics.get("drawdowns", [])
    for i in range(0, len(daily_dates), 5):
        dd = drawdowns[i] if i < len(drawdowns) else 0
        bv = benchmark_values[i] if i < len(benchmark_values) else None
        conn.execute(
            """INSERT INTO backtest_snapshots
               (run_id, date, portfolio_value, benchmark_value, regime_name, drawdown_pct)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (run_id, daily_dates[i], daily_values[i], bv, daily_regimes[i], dd),
        )

    # Also store the last date if not already included
    if len(daily_dates) % 5 != 1 and len(daily_dates) > 0:
        i = len(daily_dates) - 1
        dd = drawdowns[i] if i < len(drawdowns) else 0
        bv = benchmark_values[i] if i < len(benchmark_values) else None
        conn.execute(
            """INSERT INTO backtest_snapshots
               (run_id, date, portfolio_value, benchmark_value, regime_name, drawdown_pct)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (run_id, daily_dates[i], daily_values[i], bv, daily_regimes[i], dd),
        )

    # Update run with metrics
    conn.execute(
        """UPDATE backtest_runs SET
           final_value = ?, total_return_pct = ?, annualized_return_pct = ?,
           volatility_pct = ?, sharpe_ratio = ?, max_drawdown_pct = ?,
           max_drawdown_start = ?, max_drawdown_end = ?,
           benchmark_return_pct = ?, benchmark_sharpe = ?, benchmark_mdd_pct = ?,
           status = 'completed'
           WHERE id = ?""",
        (
            metrics.get("final_value"),
            metrics.get("total_return_pct"),
            metrics.get("annualized_return_pct"),
            metrics.get("volatility_pct"),
            metrics.get("sharpe_ratio"),
            metrics.get("max_drawdown_pct"),
            metrics.get("max_drawdown_start"),
            metrics.get("max_drawdown_end"),
            benchmark_metrics.get("total_return_pct"),
            benchmark_metrics.get("sharpe_ratio"),
            benchmark_metrics.get("max_drawdown_pct"),
            run_id,
        ),
    )
    conn.commit()
    conn.close()

    return {
        "run_id": run_id,
        "name": name,
        **metrics,
        "benchmark_return_pct": benchmark_metrics.get("total_return_pct"),
        "benchmark_sharpe": benchmark_metrics.get("sharpe_ratio"),
        "benchmark_mdd_pct": benchmark_metrics.get("max_drawdown_pct"),
    }


if __name__ == "__main__":
    import sys

    start = sys.argv[1] if len(sys.argv) > 1 else "2020-01-01"
    end = sys.argv[2] if len(sys.argv) > 2 else None

    result = run_backtest(
        start_date=start,
        end_date=end,
        initial_capital=100_000_000,
        risk_level=3,
        rebalance_period="monthly",
    )
    print(f"\nBacktest run ID: {result['run_id']}")
