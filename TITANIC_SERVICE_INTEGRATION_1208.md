# 타이타닉 서비스 통합 가이드

> 타이타닉 승객 데이터 서비스를 AI 서비스, API Gateway, 프론트엔드와 연결하는 전체 과정

---

## 📋 목차

1. [전체 아키텍처](#전체-아키텍처)
2. [서비스 생성 과정](#서비스-생성-과정)
3. [Docker Compose 설정](#docker-compose-설정)
4. [API Gateway 라우팅 설정](#api-gateway-라우팅-설정)
5. [프론트엔드 연동](#프론트엔드-연동)
6. [데이터 흐름](#데이터-흐름)
7. [실제 사용 예시](#실제-사용-예시)

---

## 전체 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                         프론트엔드 계층                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  www.kroaddy.site (포트 3000)                                   │
│  ├── page.tsx          - 메인 페이지 로직                       │
│  └── Chatbot.tsx       - 챗봇 UI 컴포넌트                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP 요청 (포트 8080)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       API Gateway 계층                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  api.kroaddy.site/gateway (Spring Cloud Gateway)               │
│  ├── application.yaml  - 라우팅 설정                            │
│  └── 포트: 8080                                                 │
│                                                                 │
│  라우팅 규칙:                                                    │
│  /api/auth/**         → oauthservice:8081                      │
│  /api/users/**        → userservice:8082                       │
│  /api/ai/crawler/**   → crawlerservice:9001                    │
│  /api/ai/rag/**       → ragservice:9004                        │
│  /api/ai/chatbot/**   → chatbotservice:9003                    │
│  /api/ai/titanic/**   → titanicservice:9005  ⭐ 새로 추가      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 라우팅
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       백엔드 서비스 계층                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ai.kroaddy.site/services/titanicservice                       │
│  ├── app/                                                       │
│  │   ├── main.py       - FastAPI 애플리케이션                  │
│  │   └── train.csv     - 타이타닉 승객 데이터                  │
│  ├── Dockerfile         - 컨테이너 빌드 설정                    │
│  └── requirements.txt   - Python 의존성                        │
│                                                                 │
│  포트: 9005                                                      │
│  기능: 타이타닉 승객 데이터 조회, 검색, 통계                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 서비스 생성 과정

### 1. 타이타닉 서비스 파일 구조

```
ai.kroaddy.site/services/titanicservice/
├── app/
│   ├── __init__.py
│   ├── main.py          # FastAPI 메인 애플리케이션
│   ├── train.csv        # 타이타닉 승객 데이터 (891명)
│   └── test.csv         # 테스트 데이터 (선택)
├── Dockerfile           # Docker 이미지 빌드 설정
└── requirements.txt     # Python 패키지 의존성
```

### 2. main.py - FastAPI 애플리케이션

```python
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
import pandas as pd
import os

app = FastAPI(title="Titanic Service", version="1.0.0")

# CORS 설정 (모든 origin 허용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# CSV 파일 경로
CSV_FILE_PATH = os.path.join(os.path.dirname(__file__), "train.csv")

def load_dataframe():
    """CSV 파일을 읽어서 DataFrame 반환"""
    try:
        return pd.read_csv(CSV_FILE_PATH)
    except Exception as e:
        print(f"Error reading CSV: {e}")
        return pd.DataFrame()

# API 엔드포인트
@app.get("/")
async def root():
    """서비스 상태 확인"""
    return {
        "service": "Titanic Service",
        "status": "running",
        "version": "1.0.0"
    }

@app.get("/top10")
async def get_top10():
    """요금 기준 상위 10명 승객 조회"""
    df = load_dataframe()
    top_10 = df.nlargest(10, 'Fare')
    result = top_10[['PassengerId', 'Name', 'Sex', 'Age', 'Fare', 'Survived', 'Pclass']].to_dict('records')
    return {
        "count": len(result),
        "passengers": result
    }

@app.get("/search")
async def search(
    name: Optional[str] = None,
    sex: Optional[str] = None,
    survived: Optional[int] = None,
    pclass: Optional[int] = None,
    limit: int = 20
):
    """승객 검색"""
    df = load_dataframe()
    # 필터링 로직...
    return {
        "count": len(result),
        "passengers": result
    }

@app.get("/stats")
async def get_stats():
    """타이타닉 승객 통계"""
    df = load_dataframe()
    return {
        "total_passengers": len(df),
        "survived": df['Survived'].sum(),
        "survival_rate": (df['Survived'].sum() / len(df) * 100)
        # ...
    }
```

**핵심 포인트:**
- FastAPI를 사용한 RESTful API
- Pandas로 CSV 데이터 처리
- CORS 설정으로 브라우저 요청 허용
- 3개의 주요 엔드포인트: `/top10`, `/search`, `/stats`

### 3. Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# 공통 라이브러리 복사
COPY common /app/common

# 서비스 코드 복사
COPY services/titanicservice/app /app/app
COPY services/titanicservice/requirements.txt /app/

# 의존성 설치
RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 9005

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "9005"]
```

**핵심 포인트:**
- Python 3.11 slim 이미지 사용
- 포트 9005 노출
- Uvicorn ASGI 서버로 FastAPI 실행

### 4. requirements.txt

```
fastapi>=0.104.1
uvicorn[standard]>=0.24.0
pydantic>=2.0.0
pydantic-settings>=2.0.0
pandas>=2.0.0
```

---

## Docker Compose 설정

### 루트 docker-compose.yaml에 서비스 추가

```yaml
services:
  # ... 기존 서비스들 ...

  # Titanic Service
  titanicservice:
    build:
      context: ./ai.kroaddy.site
      dockerfile: services/titanicservice/Dockerfile
    ports:
      - "9005:9005"
    container_name: titanicservice
    restart: unless-stopped
    networks:
      - kroaddy-network

  # ... API Gateway, 프론트엔드 등 ...

networks:
  kroaddy-network:
    driver: bridge
```

**핵심 포인트:**
- `build.context`: ai.kroaddy.site 디렉토리를 빌드 컨텍스트로 지정
- `build.dockerfile`: 상대 경로로 Dockerfile 지정
- `ports`: 호스트 9005 → 컨테이너 9005 매핑
- `networks`: 다른 서비스와 동일한 네트워크에 연결

**네트워크 구조:**
```
kroaddy-network (Docker Bridge Network)
├── api-gateway (8080)
├── titanicservice (9005)
├── chatbotservice (9003)
├── crawlerservice (9001)
└── ... 기타 서비스
```

---

## API Gateway 라우팅 설정

### api.kroaddy.site/gateway/src/main/resources/application.yaml

```yaml
spring:
  cloud:
    gateway:
      routes:
        # ... 기존 라우팅 ...

        # Titanic Service 라우팅 (새로 추가)
        - id: titanic-service-route
          uri: http://titanicservice:9005
          predicates:
            - Path=/api/ai/titanic/**
```

**라우팅 동작 원리:**

1. **클라이언트 요청:**
   ```
   GET http://localhost:8080/api/ai/titanic/top10
   ```

2. **Gateway 처리:**
   - `Path=/api/ai/titanic/**` 조건 매칭 확인
   - `uri: http://titanicservice:9005`로 요청 전달
   - 경로 유지: `/api/ai/titanic/top10`

3. **실제 호출:**
   ```
   GET http://titanicservice:9005/api/ai/titanic/top10
   ```

4. **문제 발생:**
   - titanicservice는 `/api/ai/titanic` prefix를 기대하지 않음
   - 실제 엔드포인트: `/top10`, `/search`, `/stats`

5. **해결 방법 (옵션):**
   
   **Option A: StripPrefix 필터 사용 (권장)**
   ```yaml
   - id: titanic-service-route
     uri: http://titanicservice:9005
     predicates:
       - Path=/api/ai/titanic/**
     filters:
       - StripPrefix=3  # /api/ai/titanic 제거 (3개 경로 세그먼트)
   ```
   
   **동작:**
   ```
   요청: /api/ai/titanic/top10
   → StripPrefix=3 적용
   → 실제 호출: /top10
   ```

   **Option B: RewritePath 필터 사용**
   ```yaml
   - id: titanic-service-route
     uri: http://titanicservice:9005
     predicates:
       - Path=/api/ai/titanic/**
     filters:
       - RewritePath=/api/ai/titanic/(?<segment>.*), /$\{segment}
   ```

**현재 구현에서는:**
- Gateway가 전체 경로를 그대로 전달
- titanicservice가 `/api/ai/titanic/**` 경로를 처리하도록 설정되어야 함
- 또는 StripPrefix 필터 추가 필요

---

## 프론트엔드 연동

### www.kroaddy.site/app/home/page.tsx

#### 1. 타이타닉 키워드 감지

```typescript
const handleSendMessage = (message: string) => {
  const newMessages = [...messages, { role: 'user', content: message }];
  setMessages(newMessages);

  // 타이타닉 관련 키워드 감지
  const titanicKeywords = [
    '타이타닉', 'titanic', 
    '승객', 'passenger', 
    '생존', 'survived', 
    '요금', 'fare'
  ];
  
  const isTitanicQuery = titanicKeywords.some(keyword => 
    message.toLowerCase().includes(keyword.toLowerCase())
  );

  if (isTitanicQuery) {
    // 타이타닉 API 호출 로직
    handleTitanicQuery(message, newMessages);
    return;
  }

  // ... 다른 키워드 처리 ...
}
```

#### 2. API 호출 로직

```typescript
const handleTitanicQuery = async (message: string, newMessages: Message[]) => {
  // 작성중 메시지 표시
  const typingMessage = createTypingMessage();
  setMessages([...newMessages, typingMessage]);

  // API URL 구성 (환경 변수 사용)
  const TITANIC_API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
  const apiUrl = `${TITANIC_API_URL}/api/ai/titanic`;

  // 메시지 내용에 따라 엔드포인트 선택
  let fetchUrl = '';
  if (message.toLowerCase().includes('top10') || message.includes('상위')) {
    fetchUrl = `${apiUrl}/top10`;
  } else if (message.toLowerCase().includes('통계') || message.includes('stats')) {
    fetchUrl = `${apiUrl}/stats`;
  } else {
    fetchUrl = `${apiUrl}/top10`; // 기본값
  }

  // API 호출
  try {
    const response = await fetch(fetchUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();
    
    // 응답 포맷팅
    const formattedResponse = formatTitanicResponse(data);
    
    // 메시지 업데이트
    setMessages(prev => replaceTypingMessage(prev, typingMessage, formattedResponse));
  } catch (error) {
    console.error('타이타닉 API 호출 실패:', error);
    setMessages(prev => replaceTypingMessage(prev, typingMessage, '오류가 발생했습니다.'));
  }
};
```

#### 3. 응답 포맷팅

```typescript
const formatTitanicResponse = (data: any): string => {
  if (data.passengers && Array.isArray(data.passengers)) {
    // 승객 목록 포맷팅
    let response = `## 🚢 타이타닉 승객 정보 (${data.count}명)\n\n`;
    
    data.passengers.forEach((passenger: any, index: number) => {
      const name = passenger.Name || 'N/A';
      const sex = passenger.Sex === 'male' ? '남성' : '여성';
      const age = passenger.Age ? passenger.Age.toFixed(0) : 'N/A';
      const fare = passenger.Fare ? passenger.Fare.toFixed(2) : '0.00';
      const survived = passenger.Survived === 1 ? '생존' : '사망';
      const pclass = passenger.Pclass || 'N/A';

      response += `**${index + 1}. ${name}**\n`;
      response += `- 성별: ${sex} | 나이: ${age}세 | 요금: $${fare}\n`;
      response += `- 생존 여부: ${survived} | 등급: ${pclass}등급\n\n`;
    });
    
    return response;
  } else if (data.total_passengers !== undefined) {
    // 통계 포맷팅
    return `## 🚢 타이타닉 승객 통계\n\n` +
           `- **전체 승객**: ${data.total_passengers}명\n` +
           `- **생존자**: ${data.survived}명\n` +
           `- **생존률**: ${data.survival_rate}%\n`;
  }
  
  return '타이타닉 승객 정보를 찾을 수 없습니다.';
};
```

---

## 데이터 흐름

### 완전한 요청-응답 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│ 1단계: 사용자 입력                                               │
└─────────────────────────────────────────────────────────────────┘
   사용자가 챗봇에 "타이타닉 승객 정보 알려줘" 입력
   │
   ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2단계: 프론트엔드 처리 (page.tsx)                               │
└─────────────────────────────────────────────────────────────────┘
   ├─ handleSendMessage() 호출
   ├─ 키워드 감지: '타이타닉' → isTitanicQuery = true
   ├─ 작성중 메시지 표시: "답변을 작성중입니다..."
   └─ API 호출 준비
   │
   ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3단계: HTTP 요청 (브라우저 → API Gateway)                       │
└─────────────────────────────────────────────────────────────────┘
   GET http://localhost:8080/api/ai/titanic/top10
   Headers: {
     "Content-Type": "application/json"
   }
   │
   ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4단계: API Gateway 라우팅 (Spring Cloud Gateway)               │
└─────────────────────────────────────────────────────────────────┘
   ├─ 요청 URL 분석: /api/ai/titanic/top10
   ├─ 라우팅 규칙 매칭: Path=/api/ai/titanic/**
   ├─ 대상 서비스 확인: http://titanicservice:9005
   └─ 요청 전달 (Docker 내부 네트워크 사용)
   │
   ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5단계: 백엔드 서비스 처리 (titanicservice)                      │
└─────────────────────────────────────────────────────────────────┘
   ├─ FastAPI 라우터가 요청 수신
   ├─ @app.get("/top10") 엔드포인트 실행
   ├─ CSV 파일 읽기: train.csv
   ├─ Pandas로 데이터 처리:
   │  └─ df.nlargest(10, 'Fare') - 요금 기준 상위 10명
   ├─ JSON 응답 생성:
   │  {
   │    "count": 10,
   │    "passengers": [
   │      {
   │        "PassengerId": 259,
   │        "Name": "Ward, Miss. Anna",
   │        "Sex": "female",
   │        "Age": 35.0,
   │        "Fare": 512.3292,
   │        "Survived": 1,
   │        "Pclass": 1
   │      },
   │      // ... 9명 더
   │    ]
   │  }
   └─ 응답 반환
   │
   ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6단계: API Gateway 응답 전달                                    │
└─────────────────────────────────────────────────────────────────┘
   ├─ titanicservice로부터 응답 수신
   ├─ CORS 헤더 처리 (필요시)
   └─ 브라우저에 응답 전달
   │
   ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7단계: 프론트엔드 응답 처리 (page.tsx)                          │
└─────────────────────────────────────────────────────────────────┘
   ├─ response.json() 파싱
   ├─ formatTitanicResponse() 호출
   ├─ 마크다운 형식으로 포맷팅:
   │  "## 🚢 타이타닉 승객 정보 (10명)
   │   
   │   **1. Ward, Miss. Anna**
   │   - 성별: 여성 | 나이: 35세 | 요금: $512.33
   │   - 생존 여부: 생존 | 등급: 1등급
   │   ..."
   └─ setMessages() 호출로 UI 업데이트
   │
   ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8단계: UI 렌더링 (Chatbot.tsx)                                  │
└─────────────────────────────────────────────────────────────────┘
   ├─ messages 배열에서 새 메시지 감지
   ├─ 타이핑 효과 적용 (10ms 간격)
   ├─ 마크다운 렌더링:
   │  └─ renderMarkdown() 함수로 제목, 볼드 등 처리
   └─ 화면에 표시
```

### 시간별 흐름

```
T=0ms    : 사용자 입력 "타이타닉 승객 정보"
T=10ms   : 키워드 감지 및 API 호출 시작
T=20ms   : HTTP 요청 전송 (localhost:8080)
T=30ms   : Gateway 라우팅 처리
T=40ms   : titanicservice 요청 수신
T=50ms   : CSV 파일 읽기 시작
T=100ms  : Pandas 데이터 처리
T=120ms  : JSON 응답 생성
T=130ms  : Gateway를 통해 응답 반환
T=140ms  : 프론트엔드 응답 수신
T=150ms  : 포맷팅 완료
T=160ms~ : 타이핑 효과로 화면에 표시 (10자당 ~10ms)
```

---

## 실제 사용 예시

### 예시 1: 상위 10명 승객 조회

**사용자 입력:**
```
타이타닉 승객 정보 알려줘
```

**API 호출:**
```bash
GET http://localhost:8080/api/ai/titanic/top10
```

**백엔드 응답:**
```json
{
  "count": 10,
  "passengers": [
    {
      "PassengerId": 259,
      "Name": "Ward, Miss. Anna",
      "Sex": "female",
      "Age": 35.0,
      "Fare": 512.3292,
      "Survived": 1,
      "Pclass": 1
    },
    {
      "PassengerId": 680,
      "Name": "Cardeza, Mr. Thomas Drake Martinez",
      "Sex": "male",
      "Age": 36.0,
      "Fare": 512.3292,
      "Survived": 1,
      "Pclass": 1
    }
    // ... 8명 더
  ]
}
```

**챗봇 표시:**
```
## 🚢 타이타닉 승객 정보 (10명)

**1. Ward, Miss. Anna**
- 성별: 여성 | 나이: 35세 | 요금: $512.33
- 생존 여부: 생존 | 등급: 1등급

**2. Cardeza, Mr. Thomas Drake Martinez**
- 성별: 남성 | 나이: 36세 | 요금: $512.33
- 생존 여부: 생존 | 등급: 1등급

...
```

### 예시 2: 통계 조회

**사용자 입력:**
```
타이타닉 통계 보여줘
```

**API 호출:**
```bash
GET http://localhost:8080/api/ai/titanic/stats
```

**백엔드 응답:**
```json
{
  "total_passengers": 891,
  "survived": 342,
  "died": 549,
  "survival_rate": 38.38,
  "average_fare": 32.20,
  "average_age": 29.70
}
```

**챗봇 표시:**
```
## 🚢 타이타닉 승객 통계

- **전체 승객**: 891명
- **생존자**: 342명
- **사망자**: 549명
- **생존률**: 38.38%
- **평균 요금**: $32.20
- **평균 나이**: 29.7세
```

### 예시 3: 승객 검색 (향후 확장)

**사용자 입력:**
```
타이타닉에서 생존한 여성 승객 찾아줘
```

**API 호출:**
```bash
GET http://localhost:8080/api/ai/titanic/search?sex=female&survived=1&limit=10
```

---

## 핵심 개념 정리

### 1. 마이크로서비스 아키텍처

```
독립적인 서비스들이 네트워크로 통신

장점:
- 각 서비스를 독립적으로 개발/배포
- 기술 스택 자유 선택 (Python, Java 등)
- 장애 격리 (한 서비스 다운 시 전체 시스템은 유지)
- 확장성 (필요한 서비스만 스케일링)
```

### 2. API Gateway 패턴

```
클라이언트와 백엔드 서비스 사이의 중개자

역할:
- 라우팅: 요청을 적절한 서비스로 전달
- 인증/인가: JWT 토큰 검증 등
- 로드 밸런싱: 여러 인스턴스에 요청 분산
- 응답 캐싱: 성능 향상
- CORS 처리: 브라우저 보안 정책 처리
```

### 3. Docker 컨테이너화

```
애플리케이션과 의존성을 하나의 패키지로

장점:
- 환경 일관성: 개발/테스트/운영 환경 동일
- 격리: 각 서비스가 독립적인 환경
- 이식성: 어떤 환경에서든 동일하게 실행
- 빠른 배포: 이미지 기반 배포
```

### 4. RESTful API 설계

```
HTTP 메서드와 URL로 리소스 조작

원칙:
- GET /top10        : 조회 (읽기)
- POST /passengers  : 생성
- PUT /passenger/1  : 전체 수정
- PATCH /passenger/1: 부분 수정
- DELETE /passenger/1: 삭제
```

---

## 트러블슈팅

### 문제 1: 404 Not Found

**증상:**
```
GET http://localhost:8080/api/ai/titanic/top10
404 Not Found
```

**원인 및 해결:**
1. Gateway 라우팅 설정 확인
   ```yaml
   # application.yaml에 라우팅 규칙 추가했는지 확인
   - Path=/api/ai/titanic/**
   ```

2. Gateway 재시작
   ```bash
   docker-compose restart api-gateway
   ```

3. titanicservice 실행 확인
   ```bash
   docker ps | grep titanicservice
   curl http://localhost:9005/
   ```

### 문제 2: CORS 에러

**증상:**
```
Access to fetch at 'http://localhost:8080/api/ai/titanic/top10' 
from origin 'http://localhost:3000' has been blocked by CORS policy
```

**해결:**
```python
# main.py에 CORS 설정 확인
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 또는 특정 origin만
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 문제 3: 네트워크 연결 실패

**증상:**
```
Connection refused to titanicservice:9005
```

**해결:**
```yaml
# docker-compose.yaml에서 네트워크 설정 확인
networks:
  - kroaddy-network
```

---

## 학습 포인트

### 🎯 배운 내용

1. **마이크로서비스 통합**
   - 독립적인 서비스를 API Gateway로 연결
   - Docker 네트워크를 통한 서비스 간 통신

2. **API Gateway 라우팅**
   - Spring Cloud Gateway의 라우팅 규칙 설정
   - Path 패턴 매칭과 URI 매핑

3. **프론트엔드-백엔드 통합**
   - 키워드 기반 서비스 선택
   - REST API 호출 및 응답 처리
   - 사용자 친화적 UI 포맷팅

4. **Docker 컨테이너 관리**
   - 멀티 컨테이너 애플리케이션 구성
   - 네트워크와 포트 매핑
   - 빌드 컨텍스트와 Dockerfile 경로

### 🚀 다음 단계

1. **검색 기능 강화**
   - 자연어 쿼리를 API 파라미터로 변환
   - "30세 이상 생존자" → `/search?min_age=30&survived=1`

2. **캐싱 추가**
   - Redis로 자주 조회되는 데이터 캐싱
   - API 응답 속도 향상

3. **데이터 시각화**
   - Chart.js로 생존률 그래프
   - 등급별, 성별, 나이대별 통계

4. **실시간 업데이트**
   - WebSocket으로 실시간 데이터 스트리밍
   - SSE (Server-Sent Events) 활용

---

## 참고 자료

- [FastAPI 공식 문서](https://fastapi.tiangolo.com/)
- [Spring Cloud Gateway 가이드](https://spring.io/projects/spring-cloud-gateway)
- [Docker Compose 문서](https://docs.docker.com/compose/)
- [Pandas 데이터 처리](https://pandas.pydata.org/docs/)

---

**작성일:** 2025-12-05  
**버전:** 1.0  
**작성자:** AI Assistant

