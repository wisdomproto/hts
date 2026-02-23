"""Fetch historical ETF prices from Yahoo Finance and store in SQLite."""

import sqlite3
import time
from datetime import datetime, timedelta
from config import DB_PATH

try:
    import yfinance as yf
except ImportError:
    print("yfinance not installed. Run: pip install yfinance")
    raise

# All ETF tickers used in portfolio
DEFAULT_TICKERS = [
    "SPY", "QQQ", "VGK", "FXI", "INDA", "EWY", "EWJ",  # Stocks
    "SHY", "IEI", "IEF", "TLT", "BNDX",                  # Bonds
    "VNQ", "VNQI",                                          # Real Estate
    "GLD", "CPER", "USO",                                   # Commodities
    "IBIT", "BITO",                                         # Crypto
]

# Benchmark tickers
BENCHMARK_TICKERS = ["SPY"]


def init_price_table(conn: sqlite3.Connection):
    """Create historical_prices table if it doesn't exist."""
    conn.execute("""
        CREATE TABLE IF NOT EXISTS historical_prices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticker TEXT NOT NULL,
            date TEXT NOT NULL,
            open REAL,
            high REAL,
            low REAL,
            close REAL NOT NULL,
            adj_close REAL NOT NULL,
            volume INTEGER
        )
    """)
    # Unique constraint on (ticker, date)
    try:
        conn.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_prices_ticker_date ON historical_prices(ticker, date)"
        )
    except Exception:
        pass
    conn.commit()


def get_latest_date(conn: sqlite3.Connection, ticker: str) -> str | None:
    """Get the latest date for a ticker in DB."""
    row = conn.execute(
        "SELECT MAX(date) FROM historical_prices WHERE ticker = ?",
        (ticker,),
    ).fetchone()
    return row[0] if row and row[0] else None


def fetch_ticker_prices(
    conn: sqlite3.Connection,
    ticker: str,
    start_date: str = "2010-01-01",
    end_date: str | None = None,
):
    """Fetch prices for one ticker from Yahoo Finance."""
    if end_date is None:
        end_date = datetime.now().strftime("%Y-%m-%d")

    # Check for existing data - only fetch new dates
    latest = get_latest_date(conn, ticker)
    if latest:
        # Start from next day after latest
        next_day = (datetime.strptime(latest, "%Y-%m-%d") + timedelta(days=1)).strftime(
            "%Y-%m-%d"
        )
        if next_day >= end_date:
            print(f"  {ticker}: Already up-to-date (latest: {latest})")
            return 0
        start_date = next_day

    print(f"  {ticker}: Fetching from {start_date} to {end_date}...")

    try:
        data = yf.download(
            ticker,
            start=start_date,
            end=end_date,
            progress=False,
            auto_adjust=False,
        )

        if data.empty:
            print(f"  {ticker}: No data returned")
            return 0

        count = 0
        for date_idx, row in data.iterrows():
            date_str = date_idx.strftime("%Y-%m-%d")
            try:
                # Handle both single and multi-level columns
                open_val = float(row["Open"].iloc[0]) if hasattr(row["Open"], "iloc") else float(row["Open"])
                high_val = float(row["High"].iloc[0]) if hasattr(row["High"], "iloc") else float(row["High"])
                low_val = float(row["Low"].iloc[0]) if hasattr(row["Low"], "iloc") else float(row["Low"])
                close_val = float(row["Close"].iloc[0]) if hasattr(row["Close"], "iloc") else float(row["Close"])
                volume_val = int(row["Volume"].iloc[0]) if hasattr(row["Volume"], "iloc") else int(row["Volume"])

                # Use Close as adj_close (yfinance auto_adjust=False gives Adj Close separately)
                try:
                    adj_close = float(row["Adj Close"].iloc[0]) if hasattr(row["Adj Close"], "iloc") else float(row["Adj Close"])
                except (KeyError, Exception):
                    adj_close = close_val

                conn.execute(
                    """INSERT OR REPLACE INTO historical_prices
                       (ticker, date, open, high, low, close, adj_close, volume)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                    (ticker, date_str, open_val, high_val, low_val, close_val, adj_close, volume_val),
                )
                count += 1
            except Exception as e:
                print(f"  {ticker}: Error on {date_str}: {e}")
                continue

        conn.commit()
        print(f"  {ticker}: Saved {count} rows")
        return count

    except Exception as e:
        print(f"  {ticker}: Download error: {e}")
        return 0


def fetch_all_prices(
    start_date: str = "2010-01-01",
    end_date: str | None = None,
    tickers: list[str] | None = None,
):
    """Fetch prices for all portfolio tickers."""
    if tickers is None:
        tickers = list(set(DEFAULT_TICKERS + BENCHMARK_TICKERS))

    conn = sqlite3.connect(DB_PATH)
    init_price_table(conn)

    total = 0
    print(f"=== Fetching prices for {len(tickers)} tickers ===")

    for ticker in tickers:
        count = fetch_ticker_prices(conn, ticker, start_date, end_date)
        total += count
        time.sleep(0.5)  # Rate limit

    conn.close()
    print(f"\n=== Total: {total} price rows saved ===")
    return total


if __name__ == "__main__":
    fetch_all_prices()
