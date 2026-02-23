"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { GlassCard } from "@/components/shared/glass-card";
import {
  TICKER_NAMES_KO,
  COUNTRY_NAMES_KO,
  ASSET_CLASS_LABELS,
  ASSET_CLASS_COLORS_HEX,
} from "@/lib/constants";
import type { AssetClass } from "@/types/portfolio";
import { cn } from "@/lib/cn";
import {
  Plus,
  X,
  Loader2,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";

// ─── Available ETFs that can be added ────────────────────────────────────────

const AVAILABLE_ETFS: {
  ticker: string;
  name: string;
  nameKo: string;
  assetClass: AssetClass;
  country: string;
}[] = [
  // Stocks - US
  { ticker: "SPY", name: "S&P 500", nameKo: "S&P 500 지수", assetClass: "stocks", country: "US" },
  { ticker: "QQQ", name: "NASDAQ 100", nameKo: "나스닥 100 지수", assetClass: "stocks", country: "US" },
  { ticker: "VOO", name: "Vanguard S&P 500", nameKo: "뱅가드 S&P 500", assetClass: "stocks", country: "US" },
  { ticker: "VTI", name: "Total Stock Market", nameKo: "미국 전체시장", assetClass: "stocks", country: "US" },
  { ticker: "IWM", name: "Russell 2000", nameKo: "러셀 2000 소형주", assetClass: "stocks", country: "US" },
  { ticker: "DIA", name: "Dow Jones", nameKo: "다우존스 30", assetClass: "stocks", country: "US" },
  { ticker: "XLK", name: "Technology Select", nameKo: "기술 섹터", assetClass: "stocks", country: "US" },
  { ticker: "XLF", name: "Financial Select", nameKo: "금융 섹터", assetClass: "stocks", country: "US" },
  { ticker: "XLE", name: "Energy Select", nameKo: "에너지 섹터", assetClass: "stocks", country: "US" },
  { ticker: "XLV", name: "Healthcare Select", nameKo: "헬스케어 섹터", assetClass: "stocks", country: "US" },
  { ticker: "ARKK", name: "ARK Innovation", nameKo: "ARK 혁신", assetClass: "stocks", country: "US" },
  // Stocks - US Sector/Thematic
  { ticker: "SMH", name: "Semiconductor", nameKo: "반도체 지수", assetClass: "stocks", country: "US" },
  { ticker: "SOXX", name: "Semiconductor Index", nameKo: "반도체 인덱스", assetClass: "stocks", country: "US" },
  { ticker: "BOTZ", name: "Robotics & AI", nameKo: "로봇·AI", assetClass: "stocks", country: "US" },
  { ticker: "AIQ", name: "AI & Big Data", nameKo: "AI·빅데이터", assetClass: "stocks", country: "US" },
  { ticker: "QCLN", name: "Clean Energy", nameKo: "클린 에너지", assetClass: "stocks", country: "US" },
  { ticker: "ICLN", name: "Global Clean Energy", nameKo: "글로벌 클린에너지", assetClass: "stocks", country: "US" },
  { ticker: "XBI", name: "Biotech", nameKo: "바이오테크", assetClass: "stocks", country: "US" },
  { ticker: "IGV", name: "Software", nameKo: "소프트웨어", assetClass: "stocks", country: "US" },
  { ticker: "SKYY", name: "Cloud Computing", nameKo: "클라우드 컴퓨팅", assetClass: "stocks", country: "US" },
  { ticker: "HACK", name: "Cybersecurity", nameKo: "사이버보안", assetClass: "stocks", country: "US" },
  { ticker: "XLC", name: "Communication Services", nameKo: "커뮤니케이션 서비스", assetClass: "stocks", country: "US" },
  { ticker: "XLI", name: "Industrials Select", nameKo: "산업재 섹터", assetClass: "stocks", country: "US" },
  { ticker: "XLP", name: "Consumer Staples", nameKo: "필수소비재 섹터", assetClass: "stocks", country: "US" },
  { ticker: "XLY", name: "Consumer Discretionary", nameKo: "경기소비재 섹터", assetClass: "stocks", country: "US" },
  { ticker: "XLU", name: "Utilities Select", nameKo: "유틸리티 섹터", assetClass: "stocks", country: "US" },
  { ticker: "XLB", name: "Materials Select", nameKo: "소재 섹터", assetClass: "stocks", country: "US" },
  { ticker: "LIT", name: "Lithium & Battery", nameKo: "리튬·배터리", assetClass: "stocks", country: "GL" },
  { ticker: "DRIV", name: "Autonomous & EV", nameKo: "자율주행·전기차", assetClass: "stocks", country: "GL" },
  { ticker: "BLOK", name: "Blockchain", nameKo: "블록체인", assetClass: "stocks", country: "GL" },
  { ticker: "REMX", name: "Rare Earth/Strategic Metals", nameKo: "희토류·전략금속", assetClass: "stocks", country: "GL" },
  // Stocks - EU
  { ticker: "VGK", name: "FTSE Europe", nameKo: "FTSE 유럽 지수", assetClass: "stocks", country: "EU" },
  { ticker: "EZU", name: "MSCI Eurozone", nameKo: "MSCI 유로존", assetClass: "stocks", country: "EU" },
  { ticker: "FEZ", name: "EURO STOXX 50", nameKo: "유로스톡스 50", assetClass: "stocks", country: "EU" },
  { ticker: "IEUR", name: "iShares Core MSCI Europe", nameKo: "iShares 유럽 코어", assetClass: "stocks", country: "EU" },
  { ticker: "EWG", name: "MSCI Germany", nameKo: "MSCI 독일", assetClass: "stocks", country: "EU" },
  { ticker: "EWQ", name: "MSCI France", nameKo: "MSCI 프랑스", assetClass: "stocks", country: "EU" },
  { ticker: "EWU", name: "MSCI United Kingdom", nameKo: "MSCI 영국", assetClass: "stocks", country: "EU" },
  { ticker: "EWI", name: "MSCI Italy", nameKo: "MSCI 이탈리아", assetClass: "stocks", country: "EU" },
  { ticker: "EWP", name: "MSCI Spain", nameKo: "MSCI 스페인", assetClass: "stocks", country: "EU" },
  { ticker: "EWL", name: "MSCI Switzerland", nameKo: "MSCI 스위스", assetClass: "stocks", country: "EU" },
  { ticker: "EWD", name: "MSCI Sweden", nameKo: "MSCI 스웨덴", assetClass: "stocks", country: "EU" },
  { ticker: "EWN", name: "MSCI Netherlands", nameKo: "MSCI 네덜란드", assetClass: "stocks", country: "EU" },
  { ticker: "HEDJ", name: "Europe Hedged Equity", nameKo: "유럽 헤지 주식", assetClass: "stocks", country: "EU" },
  { ticker: "EUFN", name: "Europe Financials", nameKo: "유럽 금융주", assetClass: "stocks", country: "EU" },
  // Stocks - JP
  { ticker: "EWJ", name: "MSCI Japan", nameKo: "MSCI 일본", assetClass: "stocks", country: "JP" },
  { ticker: "DXJ", name: "Japan Hedged", nameKo: "일본 헤지", assetClass: "stocks", country: "JP" },
  { ticker: "BBJP", name: "JPMorgan BetaBuilders Japan", nameKo: "JPMorgan 일본", assetClass: "stocks", country: "JP" },
  { ticker: "JPXN", name: "Nikkei 400", nameKo: "닛케이 400", assetClass: "stocks", country: "JP" },
  { ticker: "HEWJ", name: "Japan Hedged MSCI", nameKo: "일본 MSCI 헤지", assetClass: "stocks", country: "JP" },
  { ticker: "DBJP", name: "Xtrackers Japan", nameKo: "Xtrackers 일본", assetClass: "stocks", country: "JP" },
  { ticker: "FLJP", name: "Franklin FTSE Japan", nameKo: "프랭클린 일본", assetClass: "stocks", country: "JP" },
  { ticker: "SCJ", name: "Japan Small Cap", nameKo: "일본 소형주", assetClass: "stocks", country: "JP" },
  // Stocks - KR
  { ticker: "EWY", name: "MSCI South Korea", nameKo: "MSCI 한국", assetClass: "stocks", country: "KR" },
  { ticker: "FLKR", name: "Franklin FTSE South Korea", nameKo: "프랭클린 한국", assetClass: "stocks", country: "KR" },
  { ticker: "069500.KS", name: "KODEX 200", nameKo: "KODEX 200 (코스피)", assetClass: "stocks", country: "KR" },
  { ticker: "229200.KS", name: "KODEX KOSDAQ 150", nameKo: "KODEX 코스닥150", assetClass: "stocks", country: "KR" },
  { ticker: "091160.KS", name: "KODEX Inverse", nameKo: "KODEX 인버스", assetClass: "stocks", country: "KR" },
  { ticker: "305720.KS", name: "KODEX 2nd Battery", nameKo: "KODEX 2차전지산업", assetClass: "stocks", country: "KR" },
  { ticker: "091180.KS", name: "KODEX Leverage", nameKo: "KODEX 레버리지", assetClass: "stocks", country: "KR" },
  { ticker: "252670.KS", name: "KODEX Semiconductor", nameKo: "KODEX 반도체", assetClass: "stocks", country: "KR" },
  { ticker: "364690.KS", name: "KODEX Biotech", nameKo: "KODEX K-바이오", assetClass: "stocks", country: "KR" },
  { ticker: "371460.KS", name: "TIGER Secondary Battery", nameKo: "TIGER 2차전지테마", assetClass: "stocks", country: "KR" },
  { ticker: "139260.KS", name: "TIGER Media & Telecom", nameKo: "TIGER 미디어통신", assetClass: "stocks", country: "KR" },
  { ticker: "102110.KS", name: "TIGER 200", nameKo: "TIGER 200 (코스피)", assetClass: "stocks", country: "KR" },
  { ticker: "292150.KS", name: "TIGER KOSPI Growth", nameKo: "TIGER 성장주", assetClass: "stocks", country: "KR" },
  { ticker: "143850.KS", name: "TIGER S&P500", nameKo: "TIGER 미국S&P500", assetClass: "stocks", country: "KR" },
  { ticker: "133690.KS", name: "TIGER US NASDAQ", nameKo: "TIGER 미국나스닥100", assetClass: "stocks", country: "KR" },
  // Stocks - CN
  { ticker: "FXI", name: "China Large-Cap", nameKo: "중국 대형주", assetClass: "stocks", country: "CN" },
  { ticker: "MCHI", name: "MSCI China", nameKo: "MSCI 중국", assetClass: "stocks", country: "CN" },
  { ticker: "KWEB", name: "China Internet", nameKo: "중국 인터넷", assetClass: "stocks", country: "CN" },
  { ticker: "GXC", name: "S&P China 500", nameKo: "S&P 중국 500", assetClass: "stocks", country: "CN" },
  { ticker: "CXSE", name: "China ex-SOE", nameKo: "중국 민간기업", assetClass: "stocks", country: "CN" },
  { ticker: "ASHR", name: "CSI 300 (A-Shares)", nameKo: "CSI 300 A주", assetClass: "stocks", country: "CN" },
  { ticker: "CQQQ", name: "China Technology", nameKo: "중국 기술주", assetClass: "stocks", country: "CN" },
  { ticker: "CHIQ", name: "China Consumer", nameKo: "중국 소비재", assetClass: "stocks", country: "CN" },
  { ticker: "CNXT", name: "China Next Gen", nameKo: "중국 차세대 기업", assetClass: "stocks", country: "CN" },
  { ticker: "PGJ", name: "China ADR Golden Dragon", nameKo: "중국 ADR 골든드래곤", assetClass: "stocks", country: "CN" },
  // Stocks - IN
  { ticker: "INDA", name: "MSCI India", nameKo: "MSCI 인도", assetClass: "stocks", country: "IN" },
  { ticker: "SMIN", name: "India Small-Cap", nameKo: "인도 소형주", assetClass: "stocks", country: "IN" },
  { ticker: "EPI", name: "India Earnings", nameKo: "인도 실적기반", assetClass: "stocks", country: "IN" },
  { ticker: "INDY", name: "India Nifty 50", nameKo: "인도 니프티50", assetClass: "stocks", country: "IN" },
  { ticker: "GLIN", name: "India Total Market", nameKo: "인도 전체시장", assetClass: "stocks", country: "IN" },
  { ticker: "DGIN", name: "India Growth Innovators", nameKo: "인도 성장혁신", assetClass: "stocks", country: "IN" },
  { ticker: "FLIN", name: "Franklin India", nameKo: "프랭클린 인도", assetClass: "stocks", country: "IN" },
  { ticker: "PIN", name: "India PowerShares", nameKo: "인도 파워셰어스", assetClass: "stocks", country: "IN" },
  // Stocks - GL
  { ticker: "EEM", name: "Emerging Markets", nameKo: "신흥국 지수", assetClass: "stocks", country: "GL" },
  { ticker: "VEA", name: "Developed Markets", nameKo: "선진국 지수", assetClass: "stocks", country: "GL" },
  { ticker: "ACWI", name: "All World", nameKo: "전세계 지수", assetClass: "stocks", country: "GL" },
  { ticker: "VT", name: "Total World Stock", nameKo: "전세계 전체시장", assetClass: "stocks", country: "GL" },
  { ticker: "VXUS", name: "Total Intl Stock", nameKo: "미국 외 전세계", assetClass: "stocks", country: "GL" },
  { ticker: "IEMG", name: "EM Core", nameKo: "신흥국 코어", assetClass: "stocks", country: "GL" },
  { ticker: "VWO", name: "FTSE Emerging", nameKo: "FTSE 신흥국", assetClass: "stocks", country: "GL" },
  { ticker: "FM", name: "Frontier Markets", nameKo: "프론티어 마켓", assetClass: "stocks", country: "GL" },
  { ticker: "EWZ", name: "MSCI Brazil", nameKo: "MSCI 브라질", assetClass: "stocks", country: "GL" },
  { ticker: "EWT", name: "MSCI Taiwan", nameKo: "MSCI 대만", assetClass: "stocks", country: "GL" },
  { ticker: "EWA", name: "MSCI Australia", nameKo: "MSCI 호주", assetClass: "stocks", country: "GL" },
  { ticker: "EWC", name: "MSCI Canada", nameKo: "MSCI 캐나다", assetClass: "stocks", country: "GL" },
  { ticker: "EWW", name: "MSCI Mexico", nameKo: "MSCI 멕시코", assetClass: "stocks", country: "GL" },
  { ticker: "EWS", name: "MSCI Singapore", nameKo: "MSCI 싱가포르", assetClass: "stocks", country: "GL" },
  { ticker: "THD", name: "MSCI Thailand", nameKo: "MSCI 태국", assetClass: "stocks", country: "GL" },
  { ticker: "EIDO", name: "MSCI Indonesia", nameKo: "MSCI 인도네시아", assetClass: "stocks", country: "GL" },
  { ticker: "EWM", name: "MSCI Malaysia", nameKo: "MSCI 말레이시아", assetClass: "stocks", country: "GL" },
  { ticker: "VNM", name: "VanEck Vietnam", nameKo: "베트남", assetClass: "stocks", country: "GL" },
  { ticker: "TUR", name: "MSCI Turkey", nameKo: "MSCI 터키", assetClass: "stocks", country: "GL" },
  { ticker: "KSA", name: "MSCI Saudi Arabia", nameKo: "MSCI 사우디", assetClass: "stocks", country: "GL" },
  { ticker: "ERUS", name: "MSCI Russia (suspended)", nameKo: "MSCI 러시아 (거래정지)", assetClass: "stocks", country: "GL" },
  { ticker: "AFK", name: "MSCI Africa", nameKo: "MSCI 아프리카", assetClass: "stocks", country: "GL" },
  { ticker: "GNR", name: "Global Natural Resources", nameKo: "글로벌 천연자원", assetClass: "stocks", country: "GL" },
  { ticker: "GUNR", name: "Global Upstream Resources", nameKo: "글로벌 상류 자원", assetClass: "stocks", country: "GL" },
  // ─── Bonds - US ────────────────────────────────────────────────────────────
  { ticker: "SHY", name: "1-3yr Treasury", nameKo: "미국 단기국채 1-3년", assetClass: "bonds", country: "US" },
  { ticker: "IEI", name: "3-7yr Treasury", nameKo: "미국 중기국채 3-7년", assetClass: "bonds", country: "US" },
  { ticker: "IEF", name: "7-10yr Treasury", nameKo: "미국 중장기국채 7-10년", assetClass: "bonds", country: "US" },
  { ticker: "TLT", name: "20+yr Treasury", nameKo: "미국 장기국채 20년+", assetClass: "bonds", country: "US" },
  { ticker: "TIP", name: "TIPS", nameKo: "물가연동채 TIPS", assetClass: "bonds", country: "US" },
  { ticker: "LQD", name: "Invest Grade Corp", nameKo: "투자등급 회사채", assetClass: "bonds", country: "US" },
  { ticker: "HYG", name: "High Yield Corp", nameKo: "하이일드 회사채", assetClass: "bonds", country: "US" },
  { ticker: "AGG", name: "US Aggregate Bond", nameKo: "미국 종합채권", assetClass: "bonds", country: "US" },
  { ticker: "BND", name: "Total Bond Market", nameKo: "미국 전체채권", assetClass: "bonds", country: "US" },
  { ticker: "GOVT", name: "US Treasury", nameKo: "미국 국채 전체", assetClass: "bonds", country: "US" },
  { ticker: "MBB", name: "Mortgage-Backed", nameKo: "모기지 채권", assetClass: "bonds", country: "US" },
  { ticker: "VCSH", name: "Short-Term Corp", nameKo: "미국 단기 회사채", assetClass: "bonds", country: "US" },
  { ticker: "VCLT", name: "Long-Term Corp", nameKo: "미국 장기 회사채", assetClass: "bonds", country: "US" },
  { ticker: "JNK", name: "High Yield (SPDR)", nameKo: "하이일드 (SPDR)", assetClass: "bonds", country: "US" },
  { ticker: "BKLN", name: "Senior Loan", nameKo: "시니어 론", assetClass: "bonds", country: "US" },
  { ticker: "FLOT", name: "Floating Rate", nameKo: "변동금리 채권", assetClass: "bonds", country: "US" },
  { ticker: "STIP", name: "0-5yr TIPS", nameKo: "단기 물가연동채", assetClass: "bonds", country: "US" },
  // Bonds - EU
  { ticker: "BNDX", name: "Intl Bond Hedged", nameKo: "글로벌 채권 헤지", assetClass: "bonds", country: "EU" },
  { ticker: "IGOV", name: "Intl Treasury", nameKo: "선진국 국채", assetClass: "bonds", country: "EU" },
  { ticker: "BWX", name: "Intl Treasury (SPDR)", nameKo: "선진국 국채 (SPDR)", assetClass: "bonds", country: "EU" },
  { ticker: "IAGG", name: "Intl Aggregate Bond", nameKo: "글로벌 종합채권", assetClass: "bonds", country: "EU" },
  // Bonds - JP
  { ticker: "BNDW", name: "Total World Bond", nameKo: "전세계 채권", assetClass: "bonds", country: "JP" },
  // Bonds - KR
  { ticker: "148070.KS", name: "KOSEF KTB 10Y", nameKo: "KOSEF 국고채10년", assetClass: "bonds", country: "KR" },
  { ticker: "114820.KS", name: "KODEX KTB 3Y", nameKo: "KODEX 국고채3년", assetClass: "bonds", country: "KR" },
  { ticker: "451530.KS", name: "KODEX US Treasury 30Y", nameKo: "KODEX 미국30년국채", assetClass: "bonds", country: "KR" },
  { ticker: "385560.KS", name: "KBSTAR KTB 10Y", nameKo: "KBSTAR 국고채10년", assetClass: "bonds", country: "KR" },
  { ticker: "365780.KS", name: "ACE US Treasury 30Y", nameKo: "ACE 미국30년국채", assetClass: "bonds", country: "KR" },
  // Bonds - GL
  { ticker: "EMB", name: "EM Bond (USD)", nameKo: "신흥국 달러채권", assetClass: "bonds", country: "GL" },
  { ticker: "EMLC", name: "EM Local Currency Bond", nameKo: "신흥국 현지통화채권", assetClass: "bonds", country: "GL" },
  { ticker: "PCY", name: "EM Sovereign Debt", nameKo: "신흥국 국채", assetClass: "bonds", country: "GL" },
  { ticker: "VWOB", name: "EM Government Bond", nameKo: "신흥국 정부채", assetClass: "bonds", country: "GL" },
  { ticker: "HYEM", name: "EM High Yield", nameKo: "신흥국 하이일드", assetClass: "bonds", country: "GL" },
  // ─── Real Estate - US ─────────────────────────────────────────────────────
  { ticker: "VNQ", name: "US REITs", nameKo: "미국 부동산 리츠", assetClass: "realestate", country: "US" },
  { ticker: "IYR", name: "US Real Estate", nameKo: "미국 부동산", assetClass: "realestate", country: "US" },
  { ticker: "XLRE", name: "Real Estate Select", nameKo: "부동산 섹터", assetClass: "realestate", country: "US" },
  { ticker: "SCHH", name: "Schwab US REIT", nameKo: "슈왑 미국 리츠", assetClass: "realestate", country: "US" },
  { ticker: "RWR", name: "Dow Jones US REIT", nameKo: "다우존스 리츠", assetClass: "realestate", country: "US" },
  { ticker: "MORT", name: "Mortgage REITs", nameKo: "모기지 리츠", assetClass: "realestate", country: "US" },
  { ticker: "PPTY", name: "Diversified Real Assets", nameKo: "다각화 실물자산", assetClass: "realestate", country: "US" },
  // Real Estate - EU
  { ticker: "VNQI", name: "Intl REITs", nameKo: "글로벌 부동산 리츠", assetClass: "realestate", country: "EU" },
  { ticker: "IFGL", name: "Intl Developed Real Estate", nameKo: "선진국 부동산", assetClass: "realestate", country: "EU" },
  { ticker: "RWX", name: "Intl REIT (SPDR)", nameKo: "글로벌 리츠 (SPDR)", assetClass: "realestate", country: "EU" },
  // Real Estate - JP
  { ticker: "1343.T", name: "NEXT FUNDS J-REIT", nameKo: "일본 J-REIT", assetClass: "realestate", country: "JP" },
  // Real Estate - KR
  { ticker: "329200.KS", name: "TIGER REIT Infra", nameKo: "TIGER 부동산인프라", assetClass: "realestate", country: "KR" },
  // Real Estate - GL
  { ticker: "REET", name: "Global REIT", nameKo: "글로벌 리츠", assetClass: "realestate", country: "GL" },
  { ticker: "WPS", name: "Intl Developed Property", nameKo: "선진국 부동산 펀드", assetClass: "realestate", country: "GL" },
  // ─── Commodities ──────────────────────────────────────────────────────────
  { ticker: "GLD", name: "Gold", nameKo: "금", assetClass: "commodities", country: "GL" },
  { ticker: "IAU", name: "Gold (iShares)", nameKo: "금 (iShares)", assetClass: "commodities", country: "GL" },
  { ticker: "GLDM", name: "Gold Mini", nameKo: "금 미니", assetClass: "commodities", country: "GL" },
  { ticker: "SLV", name: "Silver", nameKo: "은", assetClass: "commodities", country: "GL" },
  { ticker: "CPER", name: "Copper", nameKo: "구리", assetClass: "commodities", country: "GL" },
  { ticker: "PPLT", name: "Platinum", nameKo: "백금 (플래티넘)", assetClass: "commodities", country: "GL" },
  { ticker: "PALL", name: "Palladium", nameKo: "팔라듐", assetClass: "commodities", country: "GL" },
  { ticker: "USO", name: "Crude Oil", nameKo: "원유 (WTI)", assetClass: "commodities", country: "GL" },
  { ticker: "BNO", name: "Brent Crude Oil", nameKo: "원유 (브렌트)", assetClass: "commodities", country: "GL" },
  { ticker: "DBC", name: "Commodity Index", nameKo: "원자재 종합지수", assetClass: "commodities", country: "GL" },
  { ticker: "PDBC", name: "Optimum Commodity", nameKo: "최적 원자재", assetClass: "commodities", country: "GL" },
  { ticker: "GSG", name: "S&P GSCI Commodity", nameKo: "S&P GSCI 원자재", assetClass: "commodities", country: "GL" },
  { ticker: "UNG", name: "Natural Gas", nameKo: "천연가스", assetClass: "commodities", country: "GL" },
  { ticker: "WEAT", name: "Wheat", nameKo: "밀", assetClass: "commodities", country: "GL" },
  { ticker: "CORN", name: "Corn", nameKo: "옥수수", assetClass: "commodities", country: "GL" },
  { ticker: "SOYB", name: "Soybean", nameKo: "대두", assetClass: "commodities", country: "GL" },
  { ticker: "CANE", name: "Sugar", nameKo: "설탕", assetClass: "commodities", country: "GL" },
  { ticker: "COW", name: "Livestock", nameKo: "축산물", assetClass: "commodities", country: "GL" },
  { ticker: "NIB", name: "Cocoa", nameKo: "코코아", assetClass: "commodities", country: "GL" },
  { ticker: "JO", name: "Coffee", nameKo: "커피", assetClass: "commodities", country: "GL" },
  { ticker: "URA", name: "Uranium", nameKo: "우라늄", assetClass: "commodities", country: "GL" },
  { ticker: "WOOD", name: "Timber & Forestry", nameKo: "목재·산림", assetClass: "commodities", country: "GL" },
  // Commodities - KR
  { ticker: "132030.KS", name: "KODEX Gold Futures", nameKo: "KODEX 골드선물", assetClass: "commodities", country: "KR" },
  { ticker: "261220.KS", name: "KODEX WTI Crude", nameKo: "KODEX WTI원유선물", assetClass: "commodities", country: "KR" },
  // ─── Crypto ───────────────────────────────────────────────────────────────
  { ticker: "IBIT", name: "iShares Bitcoin", nameKo: "iShares 비트코인 현물", assetClass: "crypto", country: "GL" },
  { ticker: "FBTC", name: "Fidelity Bitcoin", nameKo: "피델리티 비트코인", assetClass: "crypto", country: "GL" },
  { ticker: "ARKB", name: "ARK 21Shares Bitcoin", nameKo: "ARK 비트코인", assetClass: "crypto", country: "GL" },
  { ticker: "GBTC", name: "Grayscale Bitcoin", nameKo: "그레이스케일 비트코인", assetClass: "crypto", country: "GL" },
  { ticker: "BITO", name: "Bitcoin Strategy", nameKo: "비트코인 선물 ETF", assetClass: "crypto", country: "GL" },
  { ticker: "ETHE", name: "Grayscale Ethereum", nameKo: "그레이스케일 이더리움", assetClass: "crypto", country: "GL" },
  { ticker: "FETH", name: "Fidelity Ethereum", nameKo: "피델리티 이더리움", assetClass: "crypto", country: "GL" },
  { ticker: "ETHA", name: "iShares Ethereum", nameKo: "iShares 이더리움", assetClass: "crypto", country: "GL" },
  { ticker: "BITQ", name: "Crypto Industry", nameKo: "크립토 산업 지수", assetClass: "crypto", country: "GL" },
  { ticker: "DAPP", name: "Digital Entertainment", nameKo: "디지털 자산 생태계", assetClass: "crypto", country: "GL" },
];

const ASSET_CLASS_TABS: AssetClass[] = ["stocks", "bonds", "realestate", "commodities", "crypto"];

const COUNTRY_TABS = [
  { code: "US", label: "미국", flag: "🇺🇸" },
  { code: "EU", label: "유럽", flag: "🇪🇺" },
  { code: "IN", label: "인도", flag: "🇮🇳" },
  { code: "CN", label: "중국", flag: "🇨🇳" },
  { code: "KR", label: "한국", flag: "🇰🇷" },
  { code: "JP", label: "일본", flag: "🇯🇵" },
  { code: "GL", label: "글로벌", flag: "🌐" },
];

type ViewMode = "asset" | "country";

type DbAsset = {
  id: number;
  ticker: string;
  name: string;
  assetClass: string;
  country: string;
  maturity: string | null;
  isActive: boolean;
  sortOrder: number;
};

type PriceChartData = {
  ticker: string;
  period: string;
  loading: boolean;
  error: string | null;
  data: { date: string; close: number }[];
};

export function AssetUniverseManager() {
  const [viewMode, setViewMode] = useState<ViewMode>("country");
  const [activeTab, setActiveTab] = useState<AssetClass>("stocks");
  const [activeCountry, setActiveCountry] = useState("US");
  const [assets, setAssets] = useState<DbAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());

  // Chart state
  const [chartState, setChartState] = useState<PriceChartData | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);

  const fetchAssets = useCallback(async () => {
    try {
      const res = await fetch("/api/assets");
      const data = await res.json();
      if (data.assets) setAssets(data.assets);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  const filteredAssets = useMemo(() => {
    if (viewMode === "asset") return assets.filter((a) => a.assetClass === activeTab);
    return assets.filter((a) => a.country === activeCountry);
  }, [assets, activeTab, activeCountry, viewMode]);

  const countByClass = useMemo(() => {
    const map: Partial<Record<AssetClass, number>> = {};
    for (const a of assets) { map[a.assetClass as AssetClass] = (map[a.assetClass as AssetClass] ?? 0) + 1; }
    return map;
  }, [assets]);

  const countByCountry = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of assets) { map[a.country] = (map[a.country] ?? 0) + 1; }
    return map;
  }, [assets]);

  // Available ETFs not yet added
  const addableETFs = useMemo(() => {
    const existingTickers = new Set(assets.map((a) => a.ticker.toUpperCase()));
    let filtered = AVAILABLE_ETFS.filter((e) => !existingTickers.has(e.ticker));
    // Filter by current view context
    if (viewMode === "country") {
      filtered = filtered.filter((e) => e.country === activeCountry);
    } else {
      filtered = filtered.filter((e) => e.assetClass === activeTab);
    }
    // Search filter
    if (addSearch.trim()) {
      const q = addSearch.toLowerCase();
      filtered = filtered.filter((e) =>
        e.ticker.toLowerCase().includes(q) ||
        e.name.toLowerCase().includes(q) ||
        e.nameKo.includes(q)
      );
    }
    return filtered;
  }, [assets, viewMode, activeCountry, activeTab, addSearch]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleToggle = useCallback(async (asset: DbAsset) => {
    const newIsActive = !asset.isActive;
    setTogglingIds((prev) => new Set(prev).add(asset.id));
    setAssets((prev) => prev.map((a) => (a.id === asset.id ? { ...a, isActive: newIsActive } : a)));
    try {
      await fetch("/api/assets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: asset.id, isActive: newIsActive }),
      });
    } catch {
      setAssets((prev) => prev.map((a) => (a.id === asset.id ? { ...a, isActive: !newIsActive } : a)));
    } finally {
      setTogglingIds((prev) => { const n = new Set(prev); n.delete(asset.id); return n; });
    }
  }, []);

  const handleDelete = useCallback(async (asset: DbAsset) => {
    setDeletingIds((prev) => new Set(prev).add(asset.id));
    try {
      const res = await fetch(`/api/assets?id=${asset.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) setAssets((prev) => prev.filter((a) => a.id !== asset.id));
    } catch { /* silent */ }
    finally {
      setDeletingIds((prev) => { const n = new Set(prev); n.delete(asset.id); return n; });
    }
  }, []);

  const handleAddETF = useCallback(async (etf: typeof AVAILABLE_ETFS[number]) => {
    try {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: etf.ticker,
          name: etf.name,
          assetClass: etf.assetClass,
          country: etf.country,
        }),
      });
      const data = await res.json();
      if (data.success) await fetchAssets();
    } catch { /* silent */ }
  }, [fetchAssets]);

  const handleAssetClick = useCallback(async (asset: DbAsset) => {
    if (selectedAssetId === asset.id) {
      setSelectedAssetId(null);
      setChartState(null);
      return;
    }
    setSelectedAssetId(asset.id);
    setChartState({ ticker: asset.ticker, period: "1Y", loading: true, error: null, data: [] });
    fetchChartData(asset.ticker, "1Y");
  }, [selectedAssetId]);

  const fetchChartData = async (ticker: string, period: string) => {
    setChartState((prev) => prev ? { ...prev, period, loading: true, error: null } : null);
    try {
      const res = await fetch(`/api/chart?ticker=${ticker}&period=${period}`);
      if (!res.ok) {
        setChartState((prev) => prev ? { ...prev, loading: false, error: "차트 데이터를 불러올 수 없습니다" } : null);
        return;
      }
      const data = await res.json();
      setChartState((prev) => prev ? { ...prev, loading: false, data: data.prices || [] } : null);
    } catch {
      setChartState((prev) => prev ? { ...prev, loading: false, error: "네트워크 오류" } : null);
    }
  };

  const handlePeriodChange = (period: string) => {
    if (chartState) fetchChartData(chartState.ticker, period);
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-text-primary">포트폴리오 유니버스 관리</h3>
        <button
          onClick={() => { setShowAddPicker(!showAddPicker); setAddSearch(""); }}
          className="flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover transition-colors"
        >
          {showAddPicker ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showAddPicker ? "닫기" : "자산 추가"}
        </button>
      </div>

      {/* View mode toggle */}
      <div className="flex items-center gap-1 mb-3">
        <button
          onClick={() => { setViewMode("asset"); setShowAddPicker(false); setSelectedAssetId(null); setChartState(null); }}
          className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors", viewMode === "asset" ? "bg-accent/10 text-accent border border-accent/30" : "text-text-muted hover:text-text-secondary border border-transparent")}
        >
          자산별
        </button>
        <button
          onClick={() => { setViewMode("country"); setShowAddPicker(false); setSelectedAssetId(null); setChartState(null); }}
          className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors", viewMode === "country" ? "bg-accent/10 text-accent border border-accent/30" : "text-text-muted hover:text-text-secondary border border-transparent")}
        >
          국가별
        </button>
      </div>

      {/* Sub-tabs */}
      {viewMode === "asset" ? (
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-bg-overlay/60 backdrop-blur-sm border border-border-subtle mb-5">
          {ASSET_CLASS_TABS.map((ac) => {
            const label = ASSET_CLASS_LABELS[ac];
            const color = ASSET_CLASS_COLORS_HEX[ac];
            const count = countByClass[ac] ?? 0;
            return (
              <button
                key={ac}
                onClick={() => { setActiveTab(ac); setShowAddPicker(false); setSelectedAssetId(null); setChartState(null); }}
                className={cn("flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all", activeTab === ac ? "bg-white/10 text-text-primary shadow-sm" : "text-text-muted hover:text-text-secondary hover:bg-white/5")}
              >
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span>{label.nameKo}</span>
                {count > 0 && <span className="text-[10px] font-mono opacity-60">{count}</span>}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-bg-overlay/60 backdrop-blur-sm border border-border-subtle mb-5">
          {COUNTRY_TABS.map((ct) => {
            const count = countByCountry[ct.code] ?? 0;
            return (
              <button
                key={ct.code}
                onClick={() => { setActiveCountry(ct.code); setShowAddPicker(false); setSelectedAssetId(null); setChartState(null); }}
                className={cn("flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all", activeCountry === ct.code ? "bg-white/10 text-text-primary shadow-sm" : "text-text-muted hover:text-text-secondary hover:bg-white/5")}
              >
                <span>{ct.flag}</span>
                <span>{ct.label}</span>
                {count > 0 && <span className="text-[10px] font-mono opacity-60">{count}</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Add ETF picker */}
      {showAddPicker && (
        <div className="mb-5 p-4 rounded-lg bg-bg-overlay/80 border border-accent/20">
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={addSearch}
              onChange={(e) => setAddSearch(e.target.value)}
              placeholder="티커 또는 이름으로 검색..."
              className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
            />
          </div>
          {addableETFs.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-4">추가 가능한 자산이 없습니다.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-60 overflow-y-auto">
              {addableETFs.map((etf) => {
                const acColor = ASSET_CLASS_COLORS_HEX[etf.assetClass];
                return (
                  <button
                    key={etf.ticker}
                    onClick={() => handleAddETF(etf)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-bg-surface transition-colors text-left group"
                  >
                    <div className="w-1.5 h-6 rounded-full shrink-0" style={{ backgroundColor: acColor }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono font-medium text-text-primary">{etf.ticker}</span>
                        <span className="text-[10px] text-text-muted">{COUNTRY_NAMES_KO[etf.country] || etf.country}</span>
                      </div>
                      <p className="text-[10px] text-text-secondary truncate">{etf.nameKo}</p>
                    </div>
                    <Plus className="w-3.5 h-3.5 text-accent opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Asset list */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-text-muted text-sm gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          불러오는 중...
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-text-muted text-sm gap-2">
          <p>
            {viewMode === "asset"
              ? `${ASSET_CLASS_LABELS[activeTab].nameKo} 자산이 없습니다.`
              : `${COUNTRY_TABS.find((c) => c.code === activeCountry)?.label ?? activeCountry} 자산이 없습니다.`}
          </p>
          <button onClick={() => setShowAddPicker(true)} className="text-accent hover:text-accent-hover text-xs flex items-center gap-1">
            <Plus className="w-3 h-3" /> 자산 추가
          </button>
        </div>
      ) : (
        <div className="space-y-1">
          {filteredAssets.map((asset) => {
            const displayName = TICKER_NAMES_KO[asset.ticker] ?? asset.name;
            const acColor = ASSET_CLASS_COLORS_HEX[asset.assetClass as AssetClass] || "#64748b";
            const acLabel = ASSET_CLASS_LABELS[asset.assetClass as AssetClass];
            const countryName = COUNTRY_NAMES_KO[asset.country] ?? asset.country;
            const isToggling = togglingIds.has(asset.id);
            const isDeleting = deletingIds.has(asset.id);
            const isSelected = selectedAssetId === asset.id;

            return (
              <div key={asset.id}>
                <div
                  className={cn(
                    "flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors cursor-pointer",
                    isSelected ? "bg-accent/10 border border-accent/20" : "hover:bg-bg-overlay",
                    isDeleting && "opacity-50"
                  )}
                  onClick={() => handleAssetClick(asset)}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Asset class color bar */}
                    <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: acColor }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text-primary font-mono">{asset.ticker}</span>
                        <span className="text-xs text-text-secondary truncate">{displayName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: `${acColor}15`, color: acColor }}
                        >
                          {acLabel?.nameKo ?? asset.assetClass}
                        </span>
                        {viewMode === "asset" && (
                          <span className="text-[10px] text-text-muted">{countryName}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggle(asset); }}
                      disabled={isToggling}
                      className="relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none"
                      style={{ backgroundColor: asset.isActive ? "var(--color-positive)" : "var(--color-bg-overlay)" }}
                    >
                      <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200", asset.isActive ? "translate-x-4" : "translate-x-0.5")} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(asset); }}
                      disabled={isDeleting}
                      className="text-text-muted hover:text-negative transition-colors p-1 rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Price chart */}
                {isSelected && chartState && (
                  <div className="mx-3 mb-2 mt-1 p-3 rounded-lg bg-bg-overlay/80 border border-border-subtle">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-accent" />
                        <span className="text-sm font-medium text-text-primary">{asset.ticker} 가격 추이</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {["1Y", "3Y", "5Y", "10Y"].map((p) => (
                          <button
                            key={p}
                            onClick={() => handlePeriodChange(p)}
                            className={cn(
                              "px-2 py-1 rounded text-[10px] font-medium transition-colors",
                              chartState.period === p
                                ? "bg-accent/20 text-accent"
                                : "text-text-muted hover:text-text-secondary hover:bg-bg-surface"
                            )}
                          >
                            {p === "1Y" ? "1년" : p === "3Y" ? "3년" : p === "5Y" ? "5년" : "10년"}
                          </button>
                        ))}
                      </div>
                    </div>
                    {chartState.loading ? (
                      <div className="flex items-center justify-center py-8 gap-2 text-text-muted text-xs">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> 차트 로딩 중...
                      </div>
                    ) : chartState.error ? (
                      <div className="text-center py-8 text-xs text-text-muted">{chartState.error}</div>
                    ) : chartState.data.length > 0 ? (
                      <MiniChart data={chartState.data} color={acColor} />
                    ) : (
                      <div className="text-center py-8 text-xs text-text-muted">데이터 없음</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}

// ─── Mini SVG Chart ──────────────────────────────────────────────────────────

function MiniChart({ data, color }: { data: { date: string; close: number }[]; color: string }) {
  if (data.length < 2) return <p className="text-xs text-text-muted text-center py-4">데이터 부족</p>;

  const prices = data.map((d) => d.close);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const range = maxP - minP || 1;

  const width = 600;
  const height = 120;
  const paddingX = 0;
  const paddingY = 8;

  const points = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1)) * (width - paddingX * 2);
    const y = paddingY + (1 - (d.close - minP) / range) * (height - paddingY * 2);
    return { x, y };
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaD = pathD + ` L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  const firstP = prices[0];
  const lastP = prices[prices.length - 1];
  const returnPct = ((lastP - firstP) / firstP * 100).toFixed(2);
  const isPositive = lastP >= firstP;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-text-muted">{data[0].date}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-text-primary">${lastP.toFixed(2)}</span>
          <span className={cn("text-xs font-mono font-semibold", isPositive ? "text-positive" : "text-negative")}>
            {isPositive ? "+" : ""}{returnPct}%
          </span>
        </div>
        <span className="text-[10px] text-text-muted">{data[data.length - 1].date}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[120px]">
        <defs>
          <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#grad-${color.replace("#", "")})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
