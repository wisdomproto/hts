import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env.local from project root
env_path = Path(__file__).parent.parent / ".env.local"
load_dotenv(env_path)

FRED_API_KEY = os.getenv("FRED_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Railway: DB_DIR env → persistent volume mount point
_db_dir = os.getenv("DB_DIR", str(Path(__file__).parent.parent / "db"))
DB_PATH = str(Path(_db_dir) / "hts.db")

# FRED Series Configuration
FRED_SERIES = {
    "US": {
        "growth": [
            {"id": "A191RL1Q225SBEA", "name": "Real GDP Growth", "unit": "%"},
            {"id": "MPMISA", "name": "ISM Manufacturing PMI", "unit": "index"},
        ],
        "inflation": [
            {"id": "CPIAUCSL", "name": "CPI All Items", "unit": "index"},
            {"id": "PCEPILFE", "name": "Core PCE", "unit": "index"},
        ],
        "liquidity": [
            {"id": "NFCI", "name": "Financial Conditions Index", "unit": "index"},
            {"id": "ANFCI", "name": "Adjusted NFCI", "unit": "index"},
            {"id": "BAMLH0A0HYM2", "name": "HY OAS Spread", "unit": "%"},
            {"id": "BAMLC0A0CM", "name": "IG OAS Spread", "unit": "%"},
            {"id": "SOFR", "name": "SOFR Rate", "unit": "%"},
            {"id": "WALCL", "name": "Fed Balance Sheet", "unit": "M$"},
            {"id": "RRPONTSYD", "name": "Reverse Repo", "unit": "B$"},
        ],
    },
    "EU": {
        "growth": [{"id": "CLVMNACSCAB1GQEA19", "name": "Euro Area GDP", "unit": "M€"}],
        "inflation": [{"id": "CP0000EZ19M086NEST", "name": "HICP", "unit": "index"}],
        "liquidity": [{"id": "ECBASSETSW", "name": "ECB Balance Sheet", "unit": "M€"}],
    },
    "JP": {
        "growth": [
            {"id": "JPNGDPRQPSMEI", "name": "Japan GDP Growth YoY", "unit": "%"},  # OECD quarterly YoY growth rate
            {"id": "JPNRGDPEXP", "name": "Japan GDP Level", "unit": "B¥"},  # Keep for reference
        ],
        "inflation": [
            {"id": "FPCPITOTLZGJPN", "name": "Japan Inflation YoY", "unit": "%"},  # World Bank annual inflation (active)
            {"id": "JPNCPIALLMINMEI", "name": "Japan CPI", "unit": "index"},  # Discontinued 2021-06
        ],
        "liquidity": [{"id": "JPNASSETS", "name": "BOJ Balance Sheet", "unit": "B¥"}],
    },
    "KR": {
        "growth": [{"id": "NGDPRSAXDCKRQ", "name": "Korea GDP Level", "unit": "BW"}],
        "inflation": [{"id": "KORCPIALLMINMEI", "name": "Korea CPI", "unit": "index"}],
        "liquidity": [],
    },
    "CN": {
        "growth": [
            {"id": "CHNGDPRAPSMEI", "name": "China GDP Growth YoY", "unit": "%"},  # OECD annual YoY growth rate
        ],
        "inflation": [{"id": "CHNCPIALLMINMEI", "name": "China CPI", "unit": "index"}],
        "liquidity": [],
    },
    "IN": {
        "growth": [
            {"id": "INDGDPRQPSMEI", "name": "India GDP Growth YoY", "unit": "%"},  # OECD quarterly YoY growth rate
        ],
        "inflation": [{"id": "INDCPIALLMINMEI", "name": "India CPI", "unit": "index"}],
        "liquidity": [],
    },
}

# RSS Feed Sources
RSS_FEEDS = [
    {"url": "https://feeds.reuters.com/reuters/businessNews", "source": "Reuters", "lang": "en"},
    {"url": "https://feeds.bloomberg.com/markets/news.rss", "source": "Bloomberg", "lang": "en"},
    {"url": "https://www.cnbc.com/id/100003114/device/rss/rss.html", "source": "CNBC", "lang": "en"},
    {"url": "https://www.ft.com/rss/home", "source": "Financial Times", "lang": "en"},
]

# Regime Allocation Templates
# Design principles:
# - High inflation → commodities (gold/copper/oil) as inflation hedge, NOT cash
# - Cash loses purchasing power during inflation — minimize in inflationary regimes
# - Low growth → bonds (especially long-term) for safety + yield
# - Expanding liquidity → more risk assets (stocks, crypto, realestate)
# - Contracting liquidity → reduce risk, increase defensive (bonds, gold)
REGIME_ALLOCATIONS = {
    # High growth + Low inflation + Expanding liquidity → best for risk assets
    "goldilocks":              {"stocks": 50, "bonds": 15, "realestate": 10, "commodities": 5,  "crypto": 10, "cash": 10},
    # High growth + Low inflation + Contracting liquidity → quality stocks + bonds
    "disinflation_tightening": {"stocks": 35, "bonds": 30, "realestate": 8,  "commodities": 7,  "crypto": 5,  "cash": 15},
    # High growth + High inflation + Expanding liquidity → commodities boom, stocks OK
    "inflation_boom":          {"stocks": 20, "bonds": 5,  "realestate": 8,  "commodities": 40, "crypto": 12, "cash": 15},
    # High growth + High inflation + Contracting liquidity → gold/commodities, reduce risk
    "overheating":             {"stocks": 12, "bonds": 10, "realestate": 5,  "commodities": 40, "crypto": 5,  "cash": 28},
    # Low growth + High inflation + Expanding liquidity → gold/commodities + some risk
    "stagflation_lite":        {"stocks": 8,  "bonds": 10, "realestate": 5,  "commodities": 45, "crypto": 7,  "cash": 25},
    # Low growth + High inflation + Contracting liquidity → max defensive, gold heavy
    "stagflation":             {"stocks": 5,  "bonds": 10, "realestate": 2,  "commodities": 50, "crypto": 3,  "cash": 30},
    # Low growth + Low inflation + Expanding liquidity → long bonds rally, reflation trade
    "reflation":               {"stocks": 25, "bonds": 35, "realestate": 10, "commodities": 8,  "crypto": 7,  "cash": 15},
    # Low growth + Low inflation + Contracting liquidity → safety, long bonds + cash
    "deflation_crisis":        {"stocks": 5,  "bonds": 40, "realestate": 2,  "commodities": 8,  "crypto": 2,  "cash": 43},
}
