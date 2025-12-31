# Kroaddy 프로젝트 최종 구조

## 📁 프로젝트 개요

Kroaddy는 마이크로서비스 아키텍처 기반의 여행 플랫폼입니다.

### 최종 폴더 구조

```
kroaddy_project_dacon/
├── admin.kroaddy.site/      # 관리자 대시보드 (Next.js)
├── www.kroaddy.site/         # 사용자 웹사이트 (Next.js)
├── api.kroaddy.site/         # API Gateway (Spring Cloud Gateway)
├── core.kroaddy.site/        # 핵심 비즈니스 서비스 (Spring Boot)
└── ai.kroaddy.site/          # AI/ML 서비스 (FastAPI)
```

---

## 🏢 admin.kroaddy.site - 관리자 대시보드

**기술 스택:** Next.js 16.0.3, TypeScript 5.x, Tailwind CSS 4.x, Zustand  
**포트:** 4000

### 디렉토리 구조

```
admin.kroaddy.site/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # 메인 페이지 (로그인 리다이렉트)
│   ├── layout.tsx                # 루트 레이아웃
│   ├── globals.css               # 글로벌 스타일
│   ├── login/
│   │   └── page.tsx              # 로그인 페이지
│   └── dashboard/                # 대시보드 영역
│       ├── layout.tsx            # 대시보드 레이아웃
│       ├── page.tsx              # 대시보드 메인
│       ├── customers/            # 고객 관리
│       ├── orders/               # 주문 관리
│       ├── inventory/            # 재고 관리
│       ├── finance/              # 재무 관리
│       ├── reports/              # 리포트
│       └── settings/             # 설정
│
├── src/                          # 소스 코드
│   ├── components/               # 컴포넌트 (Atomic Design)
│   │   ├── atoms/                # 기본 컴포넌트
│   │   ├── molecules/            # 조합 컴포넌트
│   │   ├── organisms/            # 복합 컴포넌트
│   │   └── templates/            # 페이지 템플릿
│   │
│   ├── lib/                      # 유틸리티 및 헬퍼
│   │   ├── api/                  # API 클라이언트
│   │   │   └── client.ts
│   │   ├── constants/
│   │   │   └── endpoints.ts
│   │   └── utils/
│   │
│   ├── store/                    # Zustand 상태 관리
│   │   └── slices/               # 상태 슬라이스
│   │
│   └── app/                      # App Router 전용
│       ├── hooks/                # 커스텀 훅
│       ├── services/             # 비즈니스 로직
│       └── types/
│
├── service/                      # IIFE 패턴 서비스
├── public/                       # 정적 파일
├── package.json
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
└── Dockerfile
```

---

## 🌐 www.kroaddy.site - 사용자 웹사이트

**기술 스택:** Next.js 16.0.3, TypeScript 5.x, Tailwind CSS 4.x  
**포트:** 3000

### 주요 기능
- 소셜 로그인 (Google, Kakao, Naver)
- 사용자 대시보드
- 여행 정보 제공

### 디렉토리 구조

```
www.kroaddy.site/
├── app/
│   ├── page.tsx                  # 메인 페이지
│   ├── layout.tsx
│   ├── globals.css
│   ├── login/                    # 로그인 페이지
│   ├── onboarding/               # 온보딩
│   ├── mypage/                   # 마이페이지
│   └── api/
│       └── auth/                 # OAuth 콜백 처리
│
├── components/                   # 재사용 컴포넌트
│   ├── Chatbot.tsx
│   ├── KakaoMap.tsx
│   ├── WeatherWidget.tsx
│   └── ui/                       # shadcn/ui 컴포넌트
│
├── lib/                          # 라이브러리
│   ├── api.ts
│   ├── kakao.ts
│   └── tourApi.ts
│
├── service/
│   └── mainservice.ts            # IIFE 패턴 소셜 로그인
│
├── store/
│   └── authStore.ts              # 인증 상태 관리
│
└── public/                       # 정적 파일
```

---

## 🔐 api.kroaddy.site - API Gateway

**기술 스택:** Spring Cloud Gateway 2025.0.0, Java 21  
**포트:** 8080

### 역할
- 모든 백엔드 요청의 진입점
- 라우팅 및 로드밸런싱
- CORS 처리

### 디렉토리 구조

```
api.kroaddy.site/
├── gateway/
│   ├── src/main/
│   │   ├── java/com/kroaddy/api/
│   │   │   ├── ApiApplication.java
│   │   │   └── config/
│   │   │       └── CorsConfig.java
│   │   └── resources/
│   │       └── application.yaml
│   ├── build.gradle
│   └── Dockerfile
│
├── build.gradle                   # 루트 빌드 설정
├── settings.gradle
└── docker-compose.yaml
```

### 라우팅 설정

```yaml
routes:
  - id: oauth-service-route
    uri: http://oauthservice:8081
    predicates:
      - Path=/api/auth/**
  
  - id: user-service-route
    uri: http://userservice:8082
    predicates:
      - Path=/api/users/**
```

---

## ⚙️ core.kroaddy.site - 핵심 비즈니스 서비스

**기술 스택:** Spring Boot 3.5.7, Java 21, Redis  
**빌드 도구:** Gradle (멀티 프로젝트)

### 서비스 구성

#### 1. oauthservice (포트: 8081)
OAuth 인증 및 JWT 토큰 관리

```
core.kroaddy.site/oauthservice/
├── src/main/java/com/labzang/api/
│   ├── ApiApplication.java
│   ├── config/
│   │   ├── RedisConfig.java
│   │   └── WebClientConfig.java
│   ├── google/
│   │   ├── GoogleController.java
│   │   ├── GoogleService.java
│   │   └── dto/
│   ├── kakao/
│   │   ├── KakaoController.java
│   │   ├── KakaoService.java
│   │   └── dto/
│   ├── naver/
│   │   ├── NaverController.java
│   │   ├── NaverService.java
│   │   └── dto/
│   ├── jwt/
│   │   ├── JwtTokenProvider.java
│   │   └── JwtProperties.java
│   └── auth/
│       └── AuthController.java
│
├── src/main/resources/
│   └── application.yaml
├── build.gradle
└── Dockerfile
```

#### 2. userservice (포트: 8082)
사용자 관리 서비스 (기본 구조)

```
core.kroaddy.site/userservice/
├── src/main/java/com/labzang/api/
│   └── ApiApplication.java
├── src/main/resources/
│   └── application.yaml
├── build.gradle
└── Dockerfile
```

---

## 🤖 ai.kroaddy.site - AI/ML 서비스

**기술 스택:** FastAPI 0.104.1+, Python 3.11, Uvicorn

### 서비스 구성

```
ai.kroaddy.site/
├── common/                        # 공통 라이브러리
│   ├── __init__.py
│   ├── config.py                  # 공통 설정
│   ├── exceptions.py              # 공통 예외
│   ├── middleware.py              # 공통 미들웨어
│   └── utils.py                   # 유틸리티
│
├── gateway/                       # AI 서비스 게이트웨이 (포트: 9000)
│   ├── app/
│   │   ├── main.py                # FastAPI 게이트웨이
│   │   └── agent/                 # Agent 모듈
│   │       ├── main.py
│   │       ├── llm_api.py
│   │       └── sllm_db.py
│   ├── Dockerfile
│   └── requirements.txt
│
└── services/
    ├── crawlerservice/            # 포트: 9001
    │   ├── app/
    │   │   ├── main.py
    │   │   ├── bs_demo/           # BeautifulSoup 크롤러
    │   │   │   ├── bugsmusic.py
    │   │   │   ├── aggregate.py
    │   │   │   └── hazard_analyzer.py
    │   │   └── sel_demo/          # Selenium 크롤러
    │   │       └── danawa.py
    │   ├── Dockerfile
    │   └── requirements.txt
    │
    ├── authservice/               # 포트: 9002
    │   ├── app/
    │   │   ├── main.py
    │   │   ├── config.py
    │   │   └── routers/
    │   │       └── auth.py
    │   ├── Dockerfile
    │   └── requirements.txt
    │
    ├── chatbotservice/            # 포트: 9003
    │   ├── app/
    │   │   ├── main.py
    │   │   ├── config.py
    │   │   └── price_analyzer.py
    │   ├── Dockerfile
    │   └── requirements.txt
    │
    └── ragservice/                # 포트: 9004
        ├── app/
        │   ├── main.py
        │   ├── config.py
        │   ├── embeddings.py
        │   ├── vector_store.py
        │   └── rag_engine.py
        ├── Dockerfile
        └── requirements.txt
```

### AI 서비스 포트 배정

| 서비스 | 포트 | 설명 |
|--------|------|------|
| gateway | 9000 | AI 서비스 게이트웨이 |
| crawlerservice | 9001 | 웹 크롤링 |
| authservice | 9002 | AI 인증 |
| chatbotservice | 9003 | 챗봇 |
| ragservice | 9004 | RAG (검색 증강 생성) |

---

## 📦 전체 포트 요약

| 서비스 | 포트 | 설명 |
|--------|------|------|
| **프론트엔드** |
| www.kroaddy.site | 3000 | 사용자 웹사이트 |
| admin.kroaddy.site | 4000 | 관리자 대시보드 |
| **백엔드 (Java/Spring)** |
| api.kroaddy.site | 8080 | API Gateway |
| oauthservice | 8081 | OAuth 인증 |
| userservice | 8082 | 사용자 관리 |
| **AI/ML (Python/FastAPI)** |
| gateway | 9000 | AI 게이트웨이 |
| crawlerservice | 9001 | 웹 크롤링 |
| authservice | 9002 | AI 인증 |
| chatbotservice | 9003 | 챗봇 |
| ragservice | 9004 | RAG 서비스 |

---

## 🔄 아키텍처 흐름

### 사용자 요청 흐름

```
사용자 브라우저
    ↓
www.kroaddy.site (3000)
    ↓
api.kroaddy.site (8080) - API Gateway
    ↓
    ├─→ oauthservice (8081) - OAuth 인증
    ├─→ userservice (8082) - 사용자 정보
    └─→ ai.kroaddy.site/gateway (9000)
            ↓
            ├─→ crawlerservice (9001)
            ├─→ chatbotservice (9003)
            └─→ ragservice (9004)
```

### 관리자 요청 흐름

```
관리자 브라우저
    ↓
admin.kroaddy.site (4000)
    ↓
api.kroaddy.site (8080) - API Gateway
    ↓
    ├─→ oauthservice (8081)
    └─→ userservice (8082)
```

---

## 💡 네이밍 컨벤션

### TypeScript/JavaScript
- 파일명: `camelCase.ts`, `PascalCase.tsx` (컴포넌트)
- 컴포넌트: `PascalCase`
- 함수: `camelCase`
- 상수: `UPPER_SNAKE_CASE`

### Java
- 패키지: `com.kroaddy.서비스명`, `com.labzang.api`
- 클래스: `PascalCase`
- 메서드: `camelCase`
- 상수: `UPPER_SNAKE_CASE`

### Python
- 파일명: `snake_case.py`
- 클래스: `PascalCase`
- 함수: `snake_case`
- 상수: `UPPER_SNAKE_CASE`

---

## 🚀 빌드 및 실행

### 개발 환경

```bash
# 프론트엔드 (Next.js)
cd www.kroaddy.site
npm install
npm run dev

# 관리자 대시보드
cd admin.kroaddy.site
npm install
npm run dev

# API Gateway
cd api.kroaddy.site
./gradlew :gateway:bootRun

# OAuth Service
cd core.kroaddy.site
./gradlew :oauthservice:bootRun

# AI Services
cd ai.kroaddy.site
docker-compose up
```

### 프로덕션 환경

```bash
# Docker Compose로 전체 실행
docker-compose up -d
```

---

## 📝 추가 문서

- `RESTRUCTURE_NOTES.md` - 재구성 작업 내역
- 각 서비스별 README.md 참고

---

**최종 업데이트:** 2025-12-03

