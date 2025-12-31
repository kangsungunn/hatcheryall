# API 에러 수정 요약

## 🔍 발견된 문제

### 1. 타이타닉 API 404 에러
- **에러**: `타이타닉 API 에러: 404 "Not Found"`
- **요청 URL**: `/api/titanic/top10`
- **원인**: Next.js API Route가 제대로 작동하지 않거나, 경로가 매칭되지 않음

### 2. 챗봇 API "Failed to fetch" 에러
- **에러**: `TypeError: Failed to fetch`
- **요청 URL**: `http://localhost:9000/chatbot/chat`
- **원인**: 잘못된 API URL (API Gateway를 통해 접근해야 함)

---

## ✅ 수정 사항

### 1. 챗봇 API URL 수정

**이전:**
```typescript
const CHATBOT_API_URL = process.env.NEXT_PUBLIC_CHATBOT_API_URL || 'http://localhost:9000/chatbot';
```

**수정 후:**
```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
const CHATBOT_API_URL = `${API_BASE_URL}/api/ai/chatbot`;
```

### 2. 타이타닉 API URL 수정

**이전:**
```typescript
const apiUrl = '/api/titanic';  // Next.js API Route 사용
```

**수정 후:**
```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
const apiUrl = `${API_BASE_URL}/api/ai/titanic`;  // API Gateway 직접 호출
```

### 3. API_BASE_URL 전역 상수화

컴포넌트 상단에 전역 상수로 정의하여 중복 제거:

```typescript
// API Base URL (전역 상수)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
```

---

## 🔗 전체 요청 흐름

### 타이타닉 API
```
1. 챗봇: GET http://localhost:3000 (프론트엔드)
   ↓
2. 브라우저: GET http://localhost:8080/api/ai/titanic/top10
   ↓
3. API Gateway: /api/ai/titanic/** → mlservice:9006
   ↓
4. RewritePath: /api/ai/titanic/top10 → /titanic/top10
   ↓
5. ML Service: GET /titanic/top10
   ↓
6. 응답: {passengers: [...], count: 10}
```

### 챗봇 API
```
1. 챗봇: POST http://localhost:3000 (프론트엔드)
   ↓
2. 브라우저: POST http://localhost:8080/api/ai/chatbot/chat
   ↓
3. API Gateway: /api/ai/chatbot/** → chatbotservice:9003
   ↓
4. Chatbot Service: POST /chat
   ↓
5. 응답: {response: "..."}
```

---

## 🔧 수정된 파일

### `www.kroaddy.site/app/home/page.tsx`

1. **API_BASE_URL 전역 상수 추가** (라인 31)
2. **타이타닉 API URL 수정** (라인 355-356)
3. **챗봇 API URL 수정** (라인 574-575)

---

## ✅ CORS 설정 확인

API Gateway의 CORS 설정이 이미 되어 있습니다:

```java
// CorsConfig.java
corsConfig.setAllowedOriginPatterns(Arrays.asList(
    "http://localhost:*",
    "http://127.0.0.1:*"
));
```

따라서 `http://localhost:3000`에서 `http://localhost:8080`으로의 요청은 허용됩니다.

---

## 🧪 테스트 방법

### 1. 타이타닉 API 테스트

브라우저 콘솔에서:
```javascript
fetch('http://localhost:8080/api/ai/titanic/top10')
  .then(res => res.json())
  .then(data => console.log(data));
```

### 2. 챗봇 API 테스트

브라우저 콘솔에서:
```javascript
fetch('http://localhost:8080/api/ai/chatbot/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: '안녕하세요' })
})
  .then(res => res.json())
  .then(data => console.log(data));
```

### 3. 챗봇 UI 테스트

1. 프론트엔드 실행: `http://localhost:3000`
2. 챗봇에 입력:
   - "타이타닉 상위 10명 알려줘" → 타이타닉 API 호출
   - "안녕하세요" → 챗봇 API 호출

---

## 📝 체크리스트

- [x] 챗봇 API URL 수정 완료
- [x] 타이타닉 API URL 수정 완료
- [x] API_BASE_URL 전역 상수화 완료
- [x] CORS 설정 확인 완료
- [ ] 프론트엔드 재시작 (필수)
- [ ] 브라우저에서 직접 테스트
- [ ] 챗봇 UI에서 테스트

---

## 🚀 다음 단계

1. **프론트엔드 재시작** (필수)
   ```bash
   # Next.js 개발 서버 재시작
   cd www.kroaddy.site
   # Ctrl+C로 중지 후
   pnpm run dev
   ```

2. **브라우저 캐시 클리어**
   - 개발자 도구 (F12) → Network 탭 → "Disable cache" 체크
   - 또는 하드 리프레시: `Ctrl+Shift+R` (Windows) / `Cmd+Shift+R` (Mac)

3. **테스트**
   - 챗봇에서 "타이타닉 상위 10명 알려줘" 입력
   - 챗봇에서 "안녕하세요" 입력

---

**작성일**: 2024-12-05  
**버전**: 1.0.0

