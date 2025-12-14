# Predict.fun Trading - Community Edition

Predict.fun API를 이용한 예측 마켓 거래 페이지입니다.

## 기능

- BNB Testnet / Mainnet 지원
- 마켓 목록 및 검색
- 마켓 상세 정보 및 오더북
- LIMIT/MARKET 주문 생성
- 포지션 관리
- 주문 내역 조회 및 취소

## 기술 스택

- **Framework**: Next.js 14 (App Router)
- **Runtime**: Bun
- **Wallet**: RainbowKit + wagmi
- **State**: TanStack Query
- **Styling**: TailwindCSS + shadcn/ui
- **Language**: TypeScript

## 시작하기

### 1. 의존성 설치

```bash
bun install
```

### 2. 환경 변수 설정

`.env.local` 파일을 생성하고 WalletConnect Project ID를 설정합니다:

```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

WalletConnect Project ID는 [WalletConnect Cloud](https://cloud.walletconnect.com/)에서 발급받을 수 있습니다.

### 3. 개발 서버 실행

```bash
bun dev
```

[http://localhost:3000](http://localhost:3000)에서 확인할 수 있습니다.

## 네트워크 설정

### Testnet (BNB Testnet)
- API 키 불필요
- 분당 240 requests 제한
- 테스트 및 개발용

### Mainnet (BNB Mainnet)
- API 키 필수 (Settings 페이지에서 입력)
- 분당 240 requests 제한
- [Predict.fun 개발자 포털](https://dev.predict.fun)에서 API 키 발급

## Vercel 배포

### 1. GitHub 리포지토리 생성 및 푸시

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/predictdotfun.git
git push -u origin main
```

### 2. Vercel에서 배포

1. [Vercel](https://vercel.com)에 로그인
2. "New Project" 클릭
3. GitHub 리포지토리 연결
4. 환경 변수 설정:
   - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: WalletConnect Project ID
5. Deploy 클릭

## 프로젝트 구조

```
src/
├── app/                    # Next.js App Router 페이지
├── components/             # React 컴포넌트
│   ├── ui/                # shadcn/ui 컴포넌트
│   ├── layout/            # 레이아웃 컴포넌트
│   ├── market/            # 마켓 관련 컴포넌트
│   └── trading/           # 거래 관련 컴포넌트
├── providers/             # React Context Providers
├── lib/
│   ├── api/              # API 클라이언트 및 함수
│   ├── wagmi/            # wagmi 설정
│   └── utils/            # 유틸리티 함수
├── hooks/                # Custom React Hooks
└── types/                # TypeScript 타입 정의
```

## 라이선스

MIT
