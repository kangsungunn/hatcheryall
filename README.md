# Kroaddy Project

> 마이크로서비스 아키텍처 기반 여행 플랫폼

## 📋 목차

- [프로젝트 개요](#프로젝트-개요)
- [아키텍처](#아키텍처)
- [서비스 구성](#서비스-구성)
- [시작하기](#시작하기)
- [개발 가이드](#개발-가이드)
- [문서](#문서)

---

## 프로젝트 개요

Kroaddy는 다음과 같은 기능을 제공하는 여행 플랫폼입니다:

- 🔐 소셜 로그인 (Google, Kakao, Naver)
- 🗺️ 여행 정보 및 지도 서비스
- 🤖 AI 챗봇 및 RAG 기반 질의응답
- 📊 관리자 대시보드
- 🕷️ 웹 크롤링 및 데이터 수집

---

## 아키텍처

### 마이크로서비스 구조

```
┌─────────────────────────────────────────────────────────────┐
│                        사용자/관리자                          │
└──────────────┬──────────────────────────┬───────────────────┘
               │                          │
        ┌──────▼──────┐          ┌────────▼────────┐
        │ www (3000)  │          │ admin (4000)    │
        │  Next.js    │          │   Next.js       │
        └──────┬──────┘          └────────┬────────┘
               │                          │
               └──────────┬───────────────┘
                          │
                   ┌──────▼──────┐
                   │ API Gateway │
                   │   (8080)    │
                   └──────┬──────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
   ┌────▼────┐      ┌─────▼─────┐    ┌────▼────┐
   │  OAuth  │      │   User    │    │   AI    │
   │ (8081)  │      │  (8082)   │    │ Gateway │
   │ Spring  │      │  Spring   │    │ (9000)  │
   └─────────┘      └───────────┘    └────┬────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
               ┌────▼────┐          ┌─────▼─────┐         ┌──────▼──────┐
               │ Crawler │          │  Chatbot  │         │     RAG     │
               │ (9001)  │          │  (9003)   │         │   (9004)    │
               │ FastAPI │          │  FastAPI  │         │   FastAPI   │
               └─────────┘          └───────────┘         └─────────────┘
```

---

## 서비스 구성

### 프론트엔드

| 서비스 | 포트 | 기술 스택 | 설명 |
|--------|------|-----------|------|
| **www.kroaddy.site** | 3000 | Next.js 16, TypeScript | 사용자 웹사이트 |
| **admin.kroaddy.site** | 4000 | Next.js 16, TypeScript | 관리자 대시보드 |

### 백엔드 (Java/Spring)

| 서비스 | 포트 | 기술 스택 | 설명 |
|--------|------|-----------|------|
| **api.kroaddy.site** | 8080 | Spring Cloud Gateway | API 게이트웨이 |
| **oauthservice** | 8081 | Spring Boot 3.5, Redis | OAuth 인증 |
| **userservice** | 8082 | Spring Boot 3.5 | 사용자 관리 |

### AI/ML (Python/FastAPI)

| 서비스 | 포트 | 기술 스택 | 설명 |
|--------|------|-----------|------|
| **gateway** | 9000 | FastAPI | AI 서비스 게이트웨이 |
| **crawlerservice** | 9001 | FastAPI, BeautifulSoup | 웹 크롤링 |
| **authservice** | 9002 | FastAPI | AI 인증 |
| **chatbotservice** | 9003 | FastAPI, OpenAI | 챗봇 |
| **ragservice** | 9004 | FastAPI, LangChain | RAG 서비스 |

---

## 시작하기

### 필수 요구사항

- **Node.js** 20+
- **Java** 21
- **Python** 3.11+
- **Docker** & **Docker Compose**
- **Redis**

### 환경 변수 설정

각 서비스별로 `.env` 파일을 생성하세요:

#### core.kroaddy.site/oauthservice/.env
```env
KAKAO_REST_API_KEY=your_kakao_key
KAKAO_CLIENT_SECRET=your_kakao_secret
KAKAO_REDIRECT_URI=http://localhost:8080/api/auth/kakao/callback

NAVER_CLIENT_ID=your_naver_id
NAVER_CLIENT_SECRET=your_naver_secret
NAVER_REDIRECT_URI=http://localhost:8080/api/auth/naver/callback

GOOGLE_CLIENT_ID=your_google_id
GOOGLE_CLIENT_SECRET=your_google_secret
GOOGLE_REDIRECT_URI=http://localhost:8080/api/auth/google/callback

JWT_SECRET=your_jwt_secret_key_min_32_characters
REDIS_HOST=localhost
REDIS_PORT=6379
```

#### ai.kroaddy.site/.env
```env
OPENAI_API_KEY=your_openai_key
HUGGINGFACE_API_KEY=your_huggingface_key
```

### 로컬 개발 환경 실행

#### 1. 프론트엔드

```bash
# 사용자 웹사이트
cd www.kroaddy.site
npm install
npm run dev

# 관리자 대시보드
cd admin.kroaddy.site
npm install
npm run dev
```

#### 2. API Gateway

```bash
cd api.kroaddy.site
./gradlew :gateway:bootRun
```

#### 3. OAuth Service

```bash
cd core.kroaddy.site
./gradlew :oauthservice:bootRun
```

#### 4. AI Services

```bash
cd ai.kroaddy.site
docker-compose up
```

### Docker Compose로 전체 실행

```bash
# 전체 서비스 실행
docker-compose up -d

# 특정 서비스만 실행
docker-compose up -d www admin api-gateway

# 로그 확인
docker-compose logs -f

# 중지
docker-compose down
```

---

## 개발 가이드

### 브랜치 전략

- `main` - 프로덕션
- `develop` - 개발
- `feature/*` - 기능 개발
- `hotfix/*` - 긴급 수정

### 코드 스타일

#### TypeScript/JavaScript
```typescript
// 컴포넌트: PascalCase
export default function UserProfile() { }

// 함수: camelCase
function getUserData() { }

// 상수: UPPER_SNAKE_CASE
const API_BASE_URL = "http://localhost:8080";
```

#### Java
```java
// 패키지: 소문자
package com.kroaddy.api;

// 클래스: PascalCase
public class UserService { }

// 메서드: camelCase
public void getUserData() { }

// 상수: UPPER_SNAKE_CASE
private static final String API_VERSION = "v1";
```

#### Python
```python
# 클래스: PascalCase
class UserService:
    pass

# 함수: snake_case
def get_user_data():
    pass

# 상수: UPPER_SNAKE_CASE
API_BASE_URL = "http://localhost:8080"
```

### API 엔드포인트

#### 인증 (OAuth)
```
POST   /api/auth/kakao/login
GET    /api/auth/kakao/callback
POST   /api/auth/google/login
GET    /api/auth/google/callback
POST   /api/auth/naver/login
GET    /api/auth/naver/callback
GET    /api/auth/me
POST   /api/auth/logout
POST   /api/auth/refresh
```

#### AI 서비스
```
# 크롤링
GET    /crawler/bugsmusic
GET    /crawler/danawa
GET    /crawler/news?keywords=키워드

# 챗봇
POST   /chatbot/chat
POST   /chatbot/analyze

# RAG
POST   /rag/query
POST   /rag/search
POST   /rag/documents
```

---

## 문서

- [📁 프로젝트 구조 상세](./PROJECT_STRUCTURE.md)
- [🔄 재구성 작업 내역](./RESTRUCTURE_NOTES.md)
- [🔐 OAuth 설정 가이드](./core.kroaddy.site/oauthservice/README.md)
- [🤖 AI 서비스 가이드](./ai.kroaddy.site/README.md)

---

## 트러블슈팅

### 포트 충돌
```bash
# 사용 중인 포트 확인 (Windows)
netstat -ano | findstr :3000

# 프로세스 종료
taskkill /PID <PID> /F
```

### Redis 연결 오류
```bash
# Redis 실행 확인
redis-cli ping

# Docker로 Redis 실행
docker run -d -p 6379:6379 redis
```

### CORS 오류
- `api.kroaddy.site/gateway`의 `CorsConfig.java` 확인
- 허용된 Origin에 프론트엔드 URL 추가

---

## 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.

---

## 기여

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

**최종 업데이트:** 2025-12-03

