"""Fetch hyperscaler quarterly capex from SEC EDGAR XBRL API (no API key).

하이퍼스케일러(MSFT/GOOGL/AMZN/META)의 분기별 capex를 공시 원천(SEC EDGAR)에서
직접 수집한다. 현금흐름표 capex는 10-Q에서 누적(YTD)으로 보고되므로, 회계분기(fp)
순서로 디큐뮬레이션하여 단일 분기 값으로 변환한다.

- 태그: us-gaap:PaymentsToAcquirePropertyPlantAndEquipment (폴백: ...ProductiveAssets)
- 분기말 날짜는 각 사 회계분기에 따라 캘린더 분기말에 정렬됨(MSFT FY 6월 포함).
- TS 계층(db.ts getCapexReading)이 캘린더 분기별로 합산·YoY·가속을 계산한다.
"""

import sqlite3
import time
from datetime import date, datetime

import requests

from config import DB_PATH

# SEC EDGAR는 식별 가능한 User-Agent를 요구함
SEC_HEADERS = {"User-Agent": "HTS Portfolio Research (contact: kil210@tangobook.co.kr)"}

# 하이퍼스케일러 CIK (10자리 zero-pad)
HYPERSCALERS = {
    "MSFT": "0000789019",
    "GOOGL": "0001652044",  # Alphabet
    "AMZN": "0001018724",
    "META": "0001326801",
}

CAPEX_TAGS = [
    "PaymentsToAcquirePropertyPlantAndEquipment",
    "PaymentsToAcquireProductiveAssets",
]

# fp별 기대 YTD 기간(일) — YTD 엔트리 선별용
EXPECTED_YTD_DAYS = {"Q1": 90, "Q2": 181, "Q3": 273, "FY": 365}


def init_capex_table(conn: sqlite3.Connection):
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS capex_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company TEXT NOT NULL,
            period TEXT NOT NULL,
            capex REAL NOT NULL,
            fetched_at TEXT NOT NULL
        )
        """
    )
    try:
        conn.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_capex_company_period ON capex_data(company, period)"
        )
    except Exception:
        pass
    conn.commit()


def _fetch_concept(cik: str, tag: str) -> list[dict]:
    url = f"https://data.sec.gov/api/xbrl/companyconcept/CIK{cik}/us-gaap/{tag}.json"
    resp = requests.get(url, headers=SEC_HEADERS, timeout=30)
    if resp.status_code != 200:
        return []
    data = resp.json()
    return data.get("units", {}).get("USD", [])


def _duration_days(entry: dict) -> int:
    try:
        s = datetime.strptime(entry["start"], "%Y-%m-%d").date()
        e = datetime.strptime(entry["end"], "%Y-%m-%d").date()
        return (e - s).days
    except Exception:
        return -1


def _quarterly_from_ytd(entries: list[dict]) -> dict[str, float]:
    """YTD 엔트리들을 (fy, fp)로 정리 후 분기 단위로 디큐뮬레이션.

    반환: {period_end(YYYY-MM-DD): quarterly_capex}
    """
    # 분기/연간 10-Q·10-K만, 기대 YTD 기간에 가장 근접한 엔트리 선택
    best: dict[tuple[int, str], dict] = {}
    for e in entries:
        fp = e.get("fp")
        fy = e.get("fy")
        form = e.get("form", "")
        if fp not in EXPECTED_YTD_DAYS or fy is None:
            continue
        if form not in ("10-Q", "10-K", "10-K/A", "10-Q/A"):
            continue
        dur = _duration_days(e)
        if dur <= 0:
            continue
        # YTD 길이와의 오차로 적합도 판단
        err = abs(dur - EXPECTED_YTD_DAYS[fp])
        if err > 45:  # 분기 단위(약 90일)나 비정상 기간 제외
            continue
        key = (int(fy), fp)
        prev = best.get(key)
        # 오차 작은 것 우선, 동률이면 최근 제출본
        if (
            prev is None
            or err < prev["_err"]
            or (err == prev["_err"] and e.get("filed", "") > prev.get("filed", ""))
        ):
            e2 = dict(e)
            e2["_err"] = err
            best[key] = e2

    # fy별 YTD 누적값 {fp: (val, end)}
    by_fy: dict[int, dict[str, tuple[float, str]]] = {}
    for (fy, fp), e in best.items():
        by_fy.setdefault(fy, {})[fp] = (float(e["val"]), e["end"])

    out: dict[str, float] = {}
    for fy, fps in by_fy.items():
        q1 = fps.get("Q1")
        q2 = fps.get("Q2")
        q3 = fps.get("Q3")
        full = fps.get("FY")
        if q1:
            out[q1[1]] = q1[0]
        if q1 and q2:
            out[q2[1]] = q2[0] - q1[0]
        if q2 and q3:
            out[q3[1]] = q3[0] - q2[0]
        if q3 and full:
            out[full[1]] = full[0] - q3[0]
    return out


def fetch_company_capex(conn: sqlite3.Connection, ticker: str, cik: str) -> int:
    entries: list[dict] = []
    for tag in CAPEX_TAGS:
        entries = _fetch_concept(cik, tag)
        if entries:
            break
        time.sleep(0.3)

    if not entries:
        print(f"  {ticker}: capex 데이터 없음")
        return 0

    quarterly = _quarterly_from_ytd(entries)
    if not quarterly:
        print(f"  {ticker}: 분기 변환 실패")
        return 0

    now = datetime.now().isoformat()
    count = 0
    for period, val in quarterly.items():
        if val is None:
            continue
        conn.execute(
            """INSERT OR REPLACE INTO capex_data (company, period, capex, fetched_at)
               VALUES (?, ?, ?, ?)""",
            (ticker, period, float(val), now),
        )
        count += 1
    conn.commit()
    print(f"  {ticker}: {count}개 분기 capex 저장 (최근 {max(quarterly)})")
    return count


def fetch_all_capex() -> int:
    conn = sqlite3.connect(DB_PATH)
    init_capex_table(conn)

    print(f"=== Fetching hyperscaler capex for {len(HYPERSCALERS)} companies (SEC EDGAR) ===")
    total = 0
    for ticker, cik in HYPERSCALERS.items():
        try:
            total += fetch_company_capex(conn, ticker, cik)
        except Exception as e:
            print(f"  {ticker}: error: {e}")
        time.sleep(0.5)  # SEC 권장 rate limit (<10 req/s)

    conn.close()
    print(f"\n=== Total: {total} quarterly capex rows saved ===")
    return total


if __name__ == "__main__":
    fetch_all_capex()
