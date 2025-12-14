# Project Name (e.g., Predict.fun)
- Predict.fun Community site with API(Not Official site)

## Build/Run Commands
- Using `bun`

## Tech Stack
- Language: TypeScript
- Frontend: Tanstack Query
- Backend: Bun
- MCP: Context7
- Design: TailwindCSS, shadcn/ui

## Code Style & Rules
- **Formatting**: Use Prettier and ESLint.
- **Naming**: camelCase for functions/vars, PascalCase for components/classes.
- **Typing**: Use strict TypeScript types if applicable. Avoid `any`.
- **Commits**: Conventional Commits (e.g., `feat: add login`, `fix: resolve bug`).
- **Error Handling**: Use try/catch blocks and proper logging.

## Core Concepts/Architecture
1. 일반 문서 (Docs)
개발자 계약 주소 (Deployed Contracts)
가이드:
오더북(Orderbook) 이해하기
API 요청 인증 방법 (Authentication)
주문 생성 및 취소 방법
2. API 엔드포인트 (API Docs)
주요 기능별로 엔드포인트가 나열되어 있습니다.

인증 (Authorization): 메시 서명 생성 및 JWT 토큰 발급.
계정 (Accounts): 연결된 계정 정보 조회, 추천인 코드(Referral) 설정.
주문 (Orders):
내 주문 조회 (목록 또는 해시별)
주문 생성 (LIMIT/MARKET)
주문 취소 (Orderbook에서 제거)
카테고리 (Categories): 카테고리 목록 및 슬러그(slug)로 상세 조회.
마켓 (Markets):
마켓 목록 및 ID별 상세 조회
마켓 통계, 마지막 거래 정보, 오더북 조회.
포지션 (Positions): 현재 보유 포지션 조회.
OAuth (내부용/제한됨): OAuth 연결 및 관련 주문/포지션 관리 (일반 사용자용 아님).
### Architecture Overview
- **Frontend Architecture**:
  - **Core**: TypeScript + React.
  - **State/Data**: **TanStack Query** for efficient server-state management (caching, synchronization) with the Predict.fun API.
  - **Routing/UI**: Structured component-based architecture.
- **Backend/Integration**:
  - **Runtime**: **Bun** for high-performance execution.
  - **API Integration**: Direct calls to Predict.fun endpoints (Markets, Orders, Auth) as detailed in `llm.txt`.
- **Data Flow**:
  1. **Auth**: User wallet signature -> Predict.fun Auth message -> JWT.
  2. **Fetch**: Markets/Orderbook data fetched on-demand/cached.
  3. **Action**: Signed transactions/orders sent to Predict.fun API.

## MCP
- Use Context7
- Predict TypeScript SDK: https://context7.com/predictdotfun/sdk?tab=chat
- Predict Python SDK: https://context7.com/predictdotfun/sdk-python?tab=chat
- Predict REST API: https://context7.com/llmstxt/dev_predict_fun_llms_txt?tab=chat