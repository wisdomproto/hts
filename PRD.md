# HTS - 자동 포트폴리오 배분 시스템 기획서

## Context

성장률 × 인플레이션 × 유동성 3축 레짐 모델(총 8개 조합) 기반으로 자동 포트폴리오를 생성하는 Next.js 풀스택 애플리케이션. 사용자가 총 투자금액을 입력하면 현재 거시경제 레짐에 따라 자산군별/국가별 최적 배분을 자동 계산한다. 매매 기능은 제외하고, 데이터 수집 + 레짐 판정 + 포트폴리오 계산 + 뉴스 분석에 집중한다.

---

## 1. 기술 스택

| 영역 | 기술 | 비고 |
|------|------|------|
| 프레임워크 | Next.js 15 (App Router) | TypeScript |
| 스타일링 | Tailwind CSS v4 + shadcn/ui | Dark-first 디자인 |
| 차트 | Tremor (Recharts 기반) | 금융 대시보드 최적 |
| 애니메이션 | Framer Motion | 마이크로 인터랙션 |
| DB | SQLite (better-sqlite3 + Drizzle ORM) | WAL 모드 |
| 데이터 파이프라인 | Python 스크립트 | FRED API 호출, 데이터 가공 |
| 경제 데이터 | FRED API (무료) | 미국 중심, 글로벌 보완 |
| 뉴스 | RSS 피드 수집 + Gemini 요약 | 주요 경제 매체 |
| AI | Google Gemini API | 뉴스 분석, 레짐 코멘터리 |
| 상태관리 | Zustand + TanStack Query | 클라이언트/서버 분리 |
| 테마 | next-themes | 다크/라이트 토글 |

---

## 2. 핵심 기능

### 2.1 레짐 판정 엔진 (3축 × 2상태 = 8개 레짐)

**3축:**
- **성장(Growth)**: GDP 성장률, PMI 등 → High / Low
- **물가(Inflation)**: CPI YoY, PCE 등 → High / Low
- **유동성(Liquidity)**: NFCI, 신용스프레드, SOFR, 중앙은행 B/S, 준비금 → Expanding / Contracting

**유동성 판정: "3-of-5" 규칙** - 5개 지표 중 3개 이상 완화 방향이면 Expanding:
1. 중앙은행 대차대조표 축소 속도 완화/중단
2. 준비금 충분(ample reserves) 유지
3. NFCI/ANFCI 음(-) 방향 이동 (완화)
4. 하이일드/IG 스프레드 축소
5. SOFR 정상화, 레포 스트레스 없음

**8개 레짐:**

| # | 성장 | 물가 | 유동성 | 이름 | 색상 |
|---|------|------|--------|------|------|
| 1 | High | High | Expanding | 인플레 가속 (확장) | Orange-Gold |
| 2 | High | High | Contracting | 과열 긴축 | Red-Orange |
| 3 | Low | High | Expanding | 스태그 완화 | Purple-Magenta |
| 4 | Low | High | Contracting | 스태그플레이션 | Deep Red-Crimson |
| 5 | Low | Low | Expanding | 침체 완화 (리플레이션) | Blue-Indigo |
| 6 | Low | Low | Contracting | 디플레 경색 | Slate-Gray |
| 7 | High | Low | Expanding | 골디락스 | Green-Emerald |
| 8 | High | Low | Contracting | 디스인플레 긴축 | Teal-Cyan |

### 2.2 포트폴리오 배분 엔진

**자산 분류 (5대 자산군 - 사용자 커스터마이징 가능):**

1. **주식** (지수 ETF) - SPY, QQQ, VGK, EEM, FXI, INDA, EWY, EWJ 등
2. **채권** (3yr/5yr/10yr) - SHY, IEI, IEF, TLT 등
3. **부동산** (REITs) - VNQ, VNQI 등
4. **현물** (Gold, Copper, Oil) - GLD, CPER, USO 등
5. **암호화폐** (Bitcoin) - IBIT, BITO 등

**국가: US, 유럽, 인도, 중국, 한국, 일본** (사용자 추가/삭제 가능)

**레짐별 배분 템플릿 (기본값 - 조정 가능):**

| 레짐 | 주식 | 채권 | 부동산 | 현물 | 암호화폐 | 현금 |
|------|------|------|--------|------|----------|------|
| 골디락스(확장) | 45% | 20% | 10% | 5% | 7% | 13% |
| 디스인플레(긴축) | 30% | 25% | 5% | 8% | 5% | 27% |
| 인플레가속(확장) | 25% | 10% | 5% | 25% | 7% | 28% |
| 과열긴축 | 15% | 10% | 3% | 22% | 3% | 47% |
| 스태그완화 | 10% | 15% | 3% | 30% | 5% | 37% |
| 스태그플레이션 | 5% | 10% | 2% | 35% | 3% | 45% |
| 침체완화 | 20% | 40% | 5% | 8% | 5% | 22% |
| 디플레경색 | 5% | 30% | 2% | 10% | 2% | 51% |

### 2.3 사용자 커스터마이징 기능 (핵심 추가 기능)

사용자가 포트폴리오 유니버스를 직접 관리할 수 있음:

- **국가 관리**: 국가 추가/삭제, 국가별 가중치 수동 조정
- **자산 리스트 관리**:
  - 주식 지수 ETF: 추가/삭제 (티커 + 이름 + 국가 + 자산군)
  - 채권 ETF: 만기별 추가/삭제
  - 현물 ETF: 금, 구리, 원유 외 추가 가능
  - 암호화폐: BTC 외 추가 가능 (ETH 등)
  - REITs: 추가/삭제
- **레짐별 배분 비율 오버라이드**: 기본 템플릿을 사용자가 미세 조정
- **리스크 허용도 슬라이더**: 5단계 (보수적 ~ 공격적), 배분 비율에 가중치 적용

### 2.4 뉴스 수집 및 AI 분석

- RSS 피드 소스: Reuters, Bloomberg, Financial Times, CNBC, 한경, 매일경제 등
- Gemini API로 뉴스 요약 (2-3문장)
- 레짐 관련성 태깅 (현재 레짐 지지/반대/전환 신호)
- 감성 분석 (매우 비관 ~ 매우 낙관 5단계)

---

## 3. FRED API 데이터 시리즈

### 미국 (US)
| 지표 | FRED Series ID | 용도 |
|------|---------------|------|
| Real GDP Growth | A191RL1Q225SBEA | 성장 판정 |
| CPI YoY | CPIAUCSL | 물가 판정 |
| Core PCE | PCEPILFE | 물가 보조 |
| NFCI | NFCI | 유동성(금융여건) |
| ANFCI | ANFCI | 유동성(조정) |
| HY Spread | BAMLH0A0HYM2 | 유동성(신용) |
| IG Spread | BAMLC0A0CM | 유동성(신용) |
| SOFR | SOFR | 유동성(레포) |
| Fed B/S | WALCL | 유동성(공적) |
| Reserves | RRPONTSYD | 유동성(준비금) |
| PMI | MPMISA | 성장 보조 |

### 유럽 (EU)
| 지표 | FRED Series ID | 용도 |
|------|---------------|------|
| GDP Growth | CLVMNACSCAB1GQEA19 | 성장 |
| HICP | CP0000EZ19M086NEST | 물가 |
| ECB B/S | ECBASSETSW | 유동성 |

### 일본 (JP)
| 지표 | FRED Series ID | 용도 | 비고 |
|------|---------------|------|------|
| GDP Growth YoY | JPNGDPRQPSMEI | 성장 | OECD 분기 YoY % (이미 성장률) |
| CPI | JPNCPIALLMINMEI | 물가 | YoY 계산 필요 |
| BOJ B/S | JPNASSETS | 유동성 | |

### 한국 (KR)
| 지표 | FRED Series ID | 용도 | 비고 |
|------|---------------|------|------|
| GDP Level | NGDPRSAXDCKRQ | 성장 | GDP 수준 → QoQ 계산 필요 |
| CPI | KORCPIALLMINMEI | 물가 | YoY 계산 필요 |

### 중국 (CN)
| 지표 | FRED Series ID | 용도 | 비고 |
|------|---------------|------|------|
| GDP Growth YoY | CHNGDPRAPSMEI | 성장 | OECD 연간 YoY % (이미 성장률) |
| CPI | CHNCPIALLMINMEI | 물가 | YoY 계산 필요 |

### 인도 (IN)
| 지표 | FRED Series ID | 용도 | 비고 |
|------|---------------|------|------|
| GDP Growth YoY | INDGDPRQPSMEI | 성장 | OECD 분기 YoY % (이미 성장률) |
| CPI | INDCPIALLMINMEI | 물가 | YoY 계산 필요 |

### 성장률 시리즈 유형
- **이미 성장률(%)인 시리즈**: A191RL1Q225SBEA (US), JPNGDPRQPSMEI (JP), CHNGDPRAPSMEI (CN), INDGDPRQPSMEI (IN)
- **GDP 수준 → 성장률 계산 필요**: CLVMNACSCAB1GQEA19 (EU), NGDPRSAXDCKRQ (KR)

### 국가별 성장률 임계값
| 국가 | 임계값 (%) | 근거 |
|------|-----------|------|
| US | 2.0 | 장기 평균 ~2% |
| EU | 1.5 | 장기 평균 ~1.5% |
| JP | 1.0 | 장기 평균 ~1% |
| KR | 2.5 | 장기 평균 ~2.5% |
| CN | 5.0 | 정책 목표 ~5% |
| IN | 6.0 | 장기 평균 ~6% |

### 국가별 물가 임계값
| 국가 | 임계값 (%) |
|------|-----------|
| US | 2.5 |
| EU | 2.5 |
| JP | 2.0 |
| KR | 2.5 |
| CN | 3.0 |
| IN | 4.0 |

> 비미국 국가 유동성은 미국 데이터 프록시 사용 (3-of-5 규칙)
> 데이터 누락 시 미국 값을 프록시로 사용 (기존: 무조건 "고성장" 기본값 → 수정됨)

---

## 4. DB 스키마 (SQLite + Drizzle ORM)

### 테이블 구조

```
economic_data          // 경제 지표 원시 데이터
  - id, series_id, date, value, country, category, fetched_at

computed_indicators    // 가공된 지표 (YoY, 이동평균 등)
  - id, indicator_name, date, value, country, axis(growth/inflation/liquidity)

liquidity_signals      // 유동성 5개 서브시그널
  - id, date, signal_name, direction(easing/tightening), raw_value

regimes                // 판정된 레짐
  - id, date, growth_state, inflation_state, liquidity_state, regime_name, country

allocations            // 포트폴리오 배분 결과
  - id, regime_id, total_amount, risk_level, created_at

allocation_items       // 개별 자산 배분
  - id, allocation_id, ticker, asset_class, country, weight_pct, amount

news_articles          // 뉴스 데이터
  - id, title, source, url, published_at, summary, sentiment, regime_relevance

series_config          // FRED 시리즈 설정
  - id, series_id, name, country, category, axis, is_active

pipeline_runs          // 데이터 파이프라인 실행 로그
  - id, pipeline_name, started_at, finished_at, status, records_processed

user_assets            // 사용자 커스텀 자산 유니버스
  - id, ticker, name, asset_class, country, maturity, is_active, sort_order

user_countries         // 사용자 커스텀 국가 목록
  - id, code, name, weight_override, is_active

user_regime_overrides  // 사용자 레짐별 배분 비율 오버라이드
  - id, regime_name, asset_class, weight_pct

user_settings          // 사용자 설정
  - id, key, value (JSON)
```

---

## 5. UI/UX 디자인

### 디자인 컨셉
- **Dark-first** (Vercel/Linear/Stripe 대시보드 미학)
- **Glassmorphism** 카드 (backdrop-blur, 반투명 배경)
- **Framer Motion** 마이크로 애니메이션
- **모바일 반응형** (하단 탭 바)

### 컬러 팔레트 (Dark Mode)
```
배경:     #080b12 (base) → #0d1117 (surface) → #141b27 (elevated)
텍스트:   #f0f4f8 (primary) / #94a3b8 (secondary) / #64748b (muted)
액센트:   #3b82f6 (blue) / #8b5cf6 (purple)
금융:     #22c55e (상승/green) / #ef4444 (하락/red) / #f59e0b (주의/amber)
글래스:   rgba(13,17,23,0.6) + backdrop-blur-xl
```

### 폰트
- 본문: Inter Variable (+ Pretendard Variable for 한글)
- 숫자: Geist Mono (tabular-nums)
- 제목: Geist Sans

### 8개 레짐별 고유 색상
```
골디락스(확장):      Green-Emerald 그라디언트
디스인플레(긴축):    Teal-Cyan 그라디언트
인플레가속(확장):    Orange-Gold 그라디언트
과열긴축:           Red-Orange 그라디언트
스태그완화:         Purple-Magenta 그라디언트
스태그플레이션:      Deep Red-Crimson 그라디언트
침체완화:           Blue-Indigo 그라디언트
디플레경색:         Slate-Gray 그라디언트
```

### 네비게이션
- **데스크톱**: 왼쪽 사이드바 (접기 가능, 240px↔64px) + 상단 바
- **모바일**: 하단 탭 바 (대시보드 | 포트폴리오 | 경제 | 뉴스 | 더보기)
- **상단 바**: 브레드크럼 + 레짐 표시 Pill + 테마 토글 + 새로고침

### 페이지 구성

#### Page 1: 대시보드 (메인)
```
┌─────────────────────────────────────────────┐
│ [A] 레짐 인디케이터 히어로 카드 (전체 폭)      │
│     - 그라디언트 Orb 애니메이션 (숨쉬기 효과)   │
│     - 레짐 이름 (대형 텍스트)                   │
│     - 3축 상태 Pill (Growth▲ Inflation▼ Liq+) │
│     - 각 축 미니 스파크라인 (12개월)             │
├──────────────────────┬──────────────────────┤
│ [B] 투자금액 입력     │ [C] 포트폴리오 요약    │
│     + 빠른 통계       │     도넛 차트          │
│     (예상 수익률/     │     (5자산군 비율)     │
│      리스크/자산수)   │     + 중앙값 애니메이션 │
├──────────────────────┼──────────────────────┤
│ [D] 경제 지표 카드    │ [E] 상위 배분 테이블   │
│     (6국가, 2x3)     │     (상위 10개 자산)   │
│     국기+GDP+CPI     │     티커/비중/금액/변동 │
├──────────────────────┴──────────────────────┤
│ [F] 최근 뉴스 피드 (5건, 스크롤)               │
└─────────────────────────────────────────────┘
```

#### Page 2: 포트폴리오 상세
```
┌─────────────────────────────────────────────┐
│ [A] 탭: [자산군별 | 국가별 | 리스크별]         │
├──────────────────────┬──────────────────────┤
│ [B] 트리맵 시각화     │ [C] 전체 배분 테이블   │
│     (자산별 면적)     │     정렬/필터/검색     │
│     호버→상세 툴팁    │     CSV 내보내기      │
├──────────────────────┴──────────────────────┤
│ [D] 자산군별 카드 (수평 스크롤 스냅)            │
│     [주식][채권][부동산][현물][암호화폐]         │
│     각 카드: 국가별 바 차트 + 상위 보유        │
├─────────────────────────────────────────────┤
│ [E] 국가별 배분 (3x2 그리드)                   │
│     각 국가 카드: 자산군 스택드 바 차트          │
├─────────────────────────────────────────────┤
│ [F] 레짐 히스토리 타임라인 (2-5년)             │
│     색상 블록 + 호버시 해당 시기 성과 표시      │
└─────────────────────────────────────────────┘
```

#### Page 3: 경제 데이터
```
┌─────────────────────────────────────────────┐
│ [A] 국가 선택 탭: [전체|US|EU|IN|CN|KR|JP]   │
├─────────────────────────────────────────────┤
│ [B] 성장 지표 섹션 (GDP, PMI, 산업생산)        │
│     시계열 차트 + 임계선 + 시간 범위 선택기     │
├─────────────────────────────────────────────┤
│ [C] 물가 지표 섹션 (CPI, PPI, PCE)            │
│     목표선(2%) 표시 + 이벤트 주석              │
├─────────────────────────────────────────────┤
│ [D] 유동성 지표 섹션 (NFCI, 스프레드, SOFR, BS)│
│     각 지표 카드 + 완화/긴축 존 표시           │
├─────────────────────────────────────────────┤
│ [E] 레짐 판정 로직 패널 (접기/펼치기)          │
│     현재 값 → 판정 과정 시각화                 │
└─────────────────────────────────────────────┘
```

#### Page 4: 뉴스 & 분석
```
┌─────────────────────────────────────────────┐
│ [A] 필터: 축별 + 자산군별 멀티셀렉트 Pill     │
├─────────────────────────────────────────────┤
│ [B] 센티먼트 오버뷰 바 (강세 62% | 약세 38%) │
├─────────────────────────────────────────────┤
│ [C] 뉴스 카드 리스트 (무한 스크롤)             │
│     - 소스 + 헤드라인 + 시간 + 카테고리 태그   │
│     - AI 요약 (2-3문장)                       │
│     - 레짐 영향 배지 (지지/전환신호/반대)       │
│     - 감성 인디케이터 (5단계 도트)              │
│     - 관련 자산 Pill (SPY, GLD, BTC 등)       │
└─────────────────────────────────────────────┘
```

#### Page 5: 설정
```
┌─────────────────────────────────────────────┐
│ [A] 투자 설정: 기본금액, 통화, 자동재계산 토글 │
├─────────────────────────────────────────────┤
│ [B] 리스크 허용도 슬라이더 (5단계)             │
├─────────────────────────────────────────────┤
│ [C] 포트폴리오 유니버스 관리 ⭐ 핵심 기능      │
│     ┌─ 국가 관리 (추가/삭제/가중치 조정)       │
│     ├─ 주식 지수 관리 (티커 추가/삭제)         │
│     ├─ 채권 ETF 관리 (만기별)                 │
│     ├─ 현물 ETF 관리 (금/구리/원유/기타)       │
│     ├─ 암호화폐 관리 (BTC/ETH/기타)           │
│     └─ REITs 관리                            │
│     각 항목: 드래그 정렬, 토글 활성화, 삭제    │
├─────────────────────────────────────────────┤
│ [D] 레짐별 배분 비율 커스터마이징              │
│     8개 레짐 각각의 자산군별 % 수동 조정       │
├─────────────────────────────────────────────┤
│ [E] API 키 관리 (FRED, Gemini)               │
│     + 데이터 새로고침 주기 설정               │
├─────────────────────────────────────────────┤
│ [F] 표시 설정 (테마, 언어, 숫자 포맷)         │
└─────────────────────────────────────────────┘
```

### 주요 애니메이션
| 인터랙션 | 효과 | 시간 |
|---------|------|------|
| 카드 호버 | translateY(-2px) + 그림자 증가 | 150ms |
| 카드 진입 (스태거) | fadeIn + slideUp | 300ms, 50ms간격 |
| 숫자 변경 | 카운트업/다운 | 800ms |
| 레짐 전환 | Orb 색상 모핑 + 스케일 펄스 | 600ms |
| 도넛 호버 | 세그먼트 scale(1.05) | 200ms |
| 사이드바 접기 | width 보간 | 250ms |
| 스파크라인 그리기 | SVG pathLength 0→1 | 1000ms |
| 로딩 스켈레톤 | 시머 그라디언트 스윕 | 1500ms loop |

---

## 6. 프로젝트 구조

```
hts/
├── CLAUDE.md                          # 프로젝트 컨벤션/규칙
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── drizzle.config.ts
├── tsconfig.json
│
├── data/                              # Python 데이터 파이프라인
│   ├── requirements.txt               # pandas, fredapi, feedparser, requests
│   ├── regime_utils.py                # 공유 상수/유틸 (REGIME_NAMES, 임계값, 시리즈 매핑)
│   ├── config.py                      # FRED API키, DB 경로, 시리즈 설정
│   ├── fetch_fred.py                  # FRED 데이터 수집
│   ├── fetch_news.py                  # RSS 뉴스 수집
│   ├── compute_indicators.py          # 지표 가공 (YoY, 성장률)
│   ├── determine_regime.py            # 실시간 레짐 판정
│   ├── compute_historical_regimes.py  # 과거 레짐 계산 (백테스트용)
│   ├── generate_allocation.py         # 포트폴리오 배분 계산
│   ├── summarize_news.py             # Gemini 뉴스 요약
│   └── run_pipeline.py               # 전체 파이프라인 실행 (스케줄러)
│
├── db/
│   ├── schema.ts                      # Drizzle ORM 스키마
│   ├── index.ts                       # DB 연결 인스턴스
│   ├── migrations/                    # Drizzle 마이그레이션
│   └── hts.db                         # SQLite 파일 (gitignore)
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # 루트 레이아웃 (폰트, 테마, 사이드바)
│   │   ├── template.tsx               # 페이지 전환 애니메이션
│   │   ├── globals.css                # CSS 변수, 글래스모피즘 유틸
│   │   ├── page.tsx                   # 대시보드 (메인)
│   │   ├── portfolio/page.tsx         # 포트폴리오 상세
│   │   ├── economy/page.tsx           # 경제 데이터
│   │   ├── news/page.tsx              # 뉴스 & 분석
│   │   ├── settings/page.tsx          # 설정
│   │   └── api/                       # API 라우트
│   │       ├── regime/route.ts        # 현재 레짐 조회
│   │       ├── allocation/route.ts    # 포트폴리오 배분 계산
│   │       ├── economic-data/route.ts # 경제 지표 조회
│   │       ├── news/route.ts          # 뉴스 조회
│   │       ├── pipeline/route.ts      # 파이프라인 수동 트리거
│   │       ├── assets/route.ts        # 자산 유니버스 CRUD
│   │       ├── countries/route.ts     # 국가 설정 CRUD
│   │       └── settings/route.ts      # 사용자 설정 CRUD
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── sidebar.tsx            # 접기 가능 사이드바
│   │   │   ├── top-bar.tsx            # 상단 바 (레짐Pill, 테마토글)
│   │   │   └── bottom-tab-bar.tsx     # 모바일 하단 탭
│   │   │
│   │   ├── regime/
│   │   │   ├── regime-indicator.tsx    # 히어로 카드 (Orb + 3축 Pill)
│   │   │   ├── regime-pill.tsx         # 컴팩트 레짐 배지
│   │   │   ├── regime-cube.tsx         # 2x2 그리드 시각화
│   │   │   ├── regime-timeline.tsx     # 히스토리 타임라인
│   │   │   └── gradient-orb.tsx        # 애니메이션 그라디언트 구체
│   │   │
│   │   ├── portfolio/
│   │   │   ├── allocation-donut.tsx    # 도넛 차트
│   │   │   ├── allocation-table.tsx    # 전체 배분 테이블
│   │   │   ├── allocation-treemap.tsx  # 트리맵 시각화
│   │   │   ├── asset-class-card.tsx    # 자산군별 카드
│   │   │   ├── country-card.tsx        # 국가별 카드
│   │   │   └── currency-input.tsx      # 통화 포맷 입력
│   │   │
│   │   ├── economy/
│   │   │   ├── time-series-chart.tsx   # 시계열 차트 (임계존)
│   │   │   ├── indicator-card.tsx      # 지표 통계 카드
│   │   │   ├── country-selector.tsx    # 국가 탭/드롭다운
│   │   │   └── regime-logic-panel.tsx  # 판정 로직 시각화
│   │   │
│   │   ├── news/
│   │   │   ├── news-card.tsx           # AI 요약 뉴스 카드
│   │   │   ├── sentiment-bar.tsx       # 강세/약세 비율 바
│   │   │   └── filter-pills.tsx        # 멀티셀렉트 필터
│   │   │
│   │   ├── settings/
│   │   │   ├── asset-manager.tsx       # 자산 유니버스 관리 UI
│   │   │   ├── country-manager.tsx     # 국가 관리 UI
│   │   │   ├── regime-weight-editor.tsx # 레짐별 배분 편집기
│   │   │   └── risk-slider.tsx         # 리스크 허용도 슬라이더
│   │   │
│   │   └── shared/
│   │       ├── glass-card.tsx          # 글래스모피즘 카드
│   │       ├── stat-card.tsx           # 통계 표시 카드
│   │       ├── spark-line.tsx          # 미니 인라인 차트
│   │       ├── animated-number.tsx     # 카운트업/다운 숫자
│   │       ├── data-freshness.tsx      # 데이터 신선도 표시
│   │       ├── loading-skeleton.tsx    # 로딩 스켈레톤
│   │       ├── section-header.tsx      # 섹션 제목
│   │       └── time-range-selector.tsx # 기간 선택 버튼
│   │
│   ├── lib/
│   │   ├── regimes.ts                 # 레짐 정의, 색상, 그라디언트
│   │   ├── format.ts                  # 숫자/통화/날짜 포맷 유틸
│   │   ├── constants.ts               # 자산군, 국가, 색상 매핑
│   │   └── db.ts                      # DB 쿼리 헬퍼
│   │
│   ├── hooks/
│   │   ├── use-regime.ts              # 현재 레짐 상태
│   │   ├── use-portfolio.ts           # 포트폴리오 배분 계산
│   │   ├── use-economic-data.ts       # TanStack Query 경제 데이터
│   │   └── use-news.ts               # 뉴스 데이터
│   │
│   ├── stores/
│   │   ├── portfolio-store.ts         # 투자금액, 리스크 레벨
│   │   └── settings-store.ts          # 설정 상태
│   │
│   └── types/
│       ├── regime.ts                  # 레짐 타입 정의
│       ├── portfolio.ts               # 배분, 자산, 국가 타입
│       ├── economy.ts                 # 경제 지표 타입
│       └── news.ts                    # 뉴스 아이템 타입
│
├── public/
│   └── fonts/                         # Inter, Geist, Pretendard
│
└── 1. 참고문서/                        # 기존 참고 PDF
```

---

## 7. 구현 순서

### Phase 1: 프로젝트 초기 설정
- Next.js 프로젝트 생성 (TypeScript, Tailwind, App Router)
- CLAUDE.md 작성
- SQLite + Drizzle ORM 설정, 스키마 정의 및 마이그레이션
- shadcn/ui 설치 및 기본 테마 설정 (다크모드)
- 기본 레이아웃 (사이드바 + 상단바 + 라우팅)

### Phase 2: 데이터 파이프라인 (Python)
- FRED API 연결 및 데이터 수집 스크립트
- 지표 가공 스크립트 (YoY, 이동평균, 임계값 계산)
- 레짐 판정 로직 구현 (3-of-5 규칙)
- RSS 뉴스 수집 스크립트
- Gemini API 뉴스 요약 스크립트
- 통합 파이프라인 실행기

### Phase 3: API 라우트
- 경제 데이터 조회 API
- 레짐 조회 API
- 포트폴리오 배분 계산 API
- 뉴스 조회 API
- 자산/국가 CRUD API
- 설정 CRUD API
- 파이프라인 트리거 API

### Phase 4: 공통 UI 컴포넌트
- GlassCard, StatCard, SparkLine, AnimatedNumber
- LoadingSkeleton, SectionHeader, TimeRangeSelector
- CurrencyInput, DataFreshness

### Phase 5: 대시보드 페이지
- RegimeIndicator 히어로 카드 (GradientOrb 포함)
- 포트폴리오 입력 + 도넛 차트
- 경제 지표 국가 카드 그리드
- 상위 배분 테이블
- 뉴스 피드 미리보기

### Phase 6: 서브 페이지들
- 포트폴리오 상세 (트리맵, 국가별, 타임라인)
- 경제 데이터 (시계열 차트, 레짐 로직 패널)
- 뉴스 & 분석 (필터, 센티먼트, AI 요약 카드)

### Phase 7: 설정 페이지 + 커스터마이징
- 자산 유니버스 관리 UI (추가/삭제/토글/드래그정렬)
- 국가 관리 UI
- 레짐별 배분 비율 편집기
- 리스크 슬라이더
- API 키 관리

### Phase 8: 마무리
- 모바일 반응형 최적화
- 스케줄러 설정 (데이터 자동 갱신)
- 에러 핸들링 및 빈 상태 UI
- 전체 테스트

---

## 8. 검증 방법

1. **데이터 파이프라인**: `python data/run_pipeline.py` 실행 → SQLite DB에 데이터 적재 확인
2. **레짐 판정**: 알려진 과거 시점(예: 2020년 3월 코로나 → 디플레경색, 2022년 → 스태그 구간)의 데이터로 레짐 판정 정확도 검증
3. **포트폴리오 배분**: 1억원 입력 → 각 자산별 금액 합계 = 1억원 확인, 레짐 변경 시 배분 변화 확인
4. **UI**: `npm run dev` → 각 페이지 접근, 다크/라이트 모드 전환, 모바일 뷰포트 테스트
5. **커스터마이징**: 자산 추가/삭제 → 포트폴리오 재계산 반영 확인
6. **뉴스**: RSS 수집 → Gemini 요약 → 카드 렌더링 확인
