# HTS - 자동 포트폴리오 배분 시스템

## 프로젝트 개요
성장률 x 인플레이션 x 유동성 3축 레짐 모델(8개 조합) 기반 자동 포트폴리오 배분 시스템.
상세 기획은 `PRD.md` 참조.

## 기술 스택
- **Framework**: Next.js 15 (App Router, TypeScript)
- **Styling**: Tailwind CSS v4 + shadcn/ui (Dark-first)
- **Charts**: Tremor (Recharts 기반)
- **Animation**: Framer Motion
- **DB**: SQLite (better-sqlite3 + Drizzle ORM, WAL mode)
- **Data Pipeline**: Python (FRED API, RSS, Gemini)
- **State**: Zustand (client) + TanStack Query (server)
- **Theme**: next-themes

## 프로젝트 구조
```
hts/
├── data/                    # Python 데이터 파이프라인
│   ├── regime_utils.py      # 공유 상수/유틸 (REGIME_NAMES, 임계값, 시리즈 매핑)
│   ├── config.py            # FRED API 키, DB 경로, 시리즈 설정
│   ├── fetch_fred.py        # FRED 데이터 수집
│   ├── fetch_news.py        # RSS 뉴스 수집
│   ├── compute_indicators.py       # 지표 가공 (YoY, 성장률)
│   ├── determine_regime.py         # 실시간 레짐 판정
│   ├── compute_historical_regimes.py # 과거 레짐 계산 (백테스트용)
│   ├── generate_allocation.py      # 포트폴리오 배분 계산
│   ├── summarize_news.py           # Gemini 뉴스 요약
│   └── run_pipeline.py             # 전체 파이프라인 실행
├── db/                      # Drizzle ORM 스키마, 마이그레이션
├── src/
│   ├── app/                 # Next.js App Router 페이지 + API 라우트
│   │   ├── page.tsx         # 대시보드 (메인)
│   │   ├── algorithm/       # 알고리즘 설명 페이지
│   │   ├── backtest/        # 백테스트 페이지
│   │   ├── economy/         # 경제 데이터 페이지
│   │   ├── news/            # 뉴스 페이지
│   │   ├── portfolio/       # 포트폴리오 상세
│   │   ├── portfolio-settings/ # 포트폴리오 설정
│   │   ├── settings/        # 설정 페이지
│   │   ├── study/           # 학습 페이지
│   │   └── api/             # API 라우트
│   ├── components/          # UI 컴포넌트 (layout/, regime/, portfolio/, economy/, news/, settings/, shared/)
│   ├── lib/                 # 유틸리티
│   │   ├── regimes.ts       # 레짐 정의 + REGIME_NAMES + deriveRegimeName() (TS 단일 소스)
│   │   ├── db.ts            # DB 쿼리 + 실시간 유동성 보정
│   │   ├── constants.ts     # 자산군, 국가, 색상, 티커 매핑
│   │   └── format.ts        # 숫자/통화/날짜 포맷
│   ├── hooks/               # React hooks
│   ├── stores/              # Zustand stores
│   └── types/               # TypeScript 타입 정의
└── public/
```

## 아키텍처 핵심 원칙

### AI 버블 1년 작전 시스템 (메인, Phase 1)
- 제품의 메인 경험은 **5단계 버블 생애주기 작전**(멜트업 → 분산 → 붕괴 → 바닥 → 회복).
  서사: "멜트업 라이드 → 탈출 → 폭락 매수". 투자 유니버스는 AI/테크 집중 + 헤지.
- **단계 정의 SSOT**: `src/lib/stages.ts` → `STAGES`, `STAGE_ORDER`, `determineStage()`(순수 함수, 신호→단계 자동 판정)
- **시그널 SSOT**: `src/lib/signals.ts` → `SIGNAL_DEFS`, `buildReading()`, `classifySignal()`
  - 5개 신호: 나스닥 200일선 이격도, 고점 대비 낙폭(52주), VIX, 하이일드 스프레드, 유동성 배경(3-of-5 재활용)
- **유니버스 SSOT**: `src/lib/campaign-universe.ts` → `ROLE_META`, `CAMPAIGN_ASSETS`(역할: semis/core_ai/broad/crypto/hedge_*)
- **데이터 계층**: `db.ts`의 `getCampaignState()` = 설정 + `computeStageSignals()`(historical_prices/economic_data 기반) + `determineStage()` + 전환 이력
- **DB**: `campaign`(작전 설정 단일 행), `stage_transitions`(전환 이력). 단계 배분/트리거는 DB가 아닌 TS(`stages.ts`)에 둠.
- **페이지**: `/`(작전 본부), `/timeline`(5단계 로드맵), `/signals`(시그널 보드)
- 기존 8레짐 엔진은 폐기하지 않고 **내부 유동성 배경 신호**로 재활용(`getRealTimeLiquidityState`).
- Phase 2(예정): Python에서 QQQ/^VIX/NVDA/SMH 가격 수집 + 단계 자동화, 작전 설정 페이지.

### 레짐 판정 (Single Source of Truth)
- **TypeScript**: `src/lib/regimes.ts` → `REGIME_NAMES`, `deriveRegimeName()`
  - `db.ts`와 `api/regime/route.ts`는 여기서 import
- **Python**: `data/regime_utils.py` → `REGIME_NAMES`, `derive_regime_name()`, 임계값, 시리즈 매핑
  - `compute_indicators.py`, `determine_regime.py`, `compute_historical_regimes.py`는 여기서 import

### 실시간 유동성 보정
- `liquidity_signals` 테이블이 `regimes` 테이블보다 최신일 수 있음
- `db.ts`의 `getRealTimeLiquidityState()` → 3-of-5 룰 재계산
- `applyLiquidityCorrection()` → 레짐 레코드 보정
- `api/regime/route.ts`는 `db.ts` 함수를 재사용 (중복 없음)

### 경제 지표 표시
- GDP 성장률: `computed_indicators` 테이블의 가공된 값 사용 (YoY%)
- CPI: `computed_indicators` 테이블의 YoY% 사용
- 원시 FRED 데이터는 스파크라인에만 사용

### FRED 시리즈 ID (주요)
- US GDP: `A191RL1Q225SBEA` (이미 연율화 성장률 %)
- JP GDP: `JPNGDPRQPSMEI` (OECD 분기 YoY %)
- CN GDP: `CHNGDPRAPSMEI` (OECD 연간 YoY %)
- IN GDP: `INDGDPRQPSMEI` (OECD 분기 YoY %)
- EU GDP: `CLVMNACSCAB1GQEA19` (GDP 수준 → QoQ 계산 필요)
- KR GDP: `NGDPRSAXDCKRQ` (GDP 수준 → QoQ 계산 필요)

## 코딩 컨벤션

### TypeScript
- 엄격한 타입 사용 (`strict: true`), `any` 사용 금지
- 인터페이스보다 `type` 키워드 선호
- 컴포넌트 props는 `type XxxProps = { ... }` 형식

### 컴포넌트
- 함수형 컴포넌트 + `"use client"` 지시어는 필요한 경우에만
- 파일명: kebab-case (예: `regime-indicator.tsx`)
- 컴포넌트명: PascalCase (예: `RegimeIndicator`)
- `export default` 대신 `export function` 사용

### 스타일링
- Tailwind utility classes 사용, 인라인 style 지양
- 다크모드: `dark:` prefix 또는 CSS 변수
- 글래스모피즘: `backdrop-blur-xl bg-surface/60 border border-white/10`
- 금융 숫자: `font-mono tabular-nums` 클래스

### 파일 구조
- 컴포넌트는 역할별 폴더 (layout, regime, portfolio 등)
- 공유 컴포넌트는 `shared/` 폴더
- 한 파일에 하나의 주요 컴포넌트
- 중복 코드 금지: 상수/유틸은 반드시 공유 모듈에서 import

### DB
- Drizzle ORM 사용, 직접 SQL 지양
- 마이그레이션: `npx drizzle-kit generate` → `npx drizzle-kit migrate`

### Python 데이터 파이프라인
- `data/` 디렉토리에 위치
- 공유 상수/유틸: `regime_utils.py` (REGIME_NAMES, 임계값, 시리즈 매핑)
- 설정은 `config.py` 또는 `.env`
- 패키지: `fredapi`, `pandas`, `feedparser`, `google-generativeai`, `requests`

## 주요 명령어
```bash
npm run dev          # 개발 서버 실행
npm run build        # 프로덕션 빌드
npx drizzle-kit generate  # DB 마이그레이션 생성
npx drizzle-kit migrate   # DB 마이그레이션 실행
python data/run_pipeline.py  # 데이터 파이프라인 실행
```

## 환경 변수 (.env.local)
```
FRED_API_KEY=xxx
GEMINI_API_KEY=xxx
```
