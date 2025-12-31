# 404 에러 해결 가이드

## 🔍 문제 분석

**에러 메시지:**
```
타이타닉 API 에러: 404 "Not Found"
요청 URL: "/api/titanic/top10"
```

## 🔄 전체 요청 흐름

```
1. 챗봇: GET /api/titanic/top10
   ↓
2. Next.js API Route: /api/titanic/[...path]/route.ts
   → 변환: GET http://localhost:8080/api/ai/titanic/top10
   ↓
3. API Gateway: /api/ai/titanic/**
   → 리라이트: GET http://mlservice:9006/titanic/top10
   ↓
4. ML Service: GET /titanic/top10
   → 응답: {passengers: [...], count: 10}
```

## ✅ 해결 방법

### 1. 서비스 재시작

```bash
# ML Service 재시작
docker compose restart mlservice

# API Gateway 재시작
docker compose restart api-gateway

# Next.js 개발 서버 재시작 (프론트엔드)
# 터미널에서 Ctrl+C로 중지 후 다시 시작
cd www.kroaddy.site
pnpm run dev
```

### 2. 엔드포인트 확인

**ML Service 직접 테스트:**
```bash
# 브라우저에서 직접 접근
http://localhost:9006/titanic/top10
http://localhost:9006/titanic/stats
```

**API Gateway를 통한 테스트:**
```bash
# 브라우저에서 직접 접근
http://localhost:8080/api/ai/titanic/top10
http://localhost:8080/api/ai/titanic/stats
```

### 3. Next.js API Route 확인

**Next.js 개발 서버 콘솔에서 확인:**
- `[Titanic API Route] Calling: http://localhost:8080/api/ai/titanic/top10`
- `[Titanic API Route] Response status: 200` (또는 에러 코드)

### 4. 경로 매칭 순서 확인

`router.py`에서 `/titanic/top10`이 다른 동적 경로보다 먼저 정의되어 있는지 확인:

```python
# ✅ 올바른 순서
@router.get("/top10", ...)  # 구체적인 경로 먼저
@router.get("/stats", ...)
@router.get("/passengers/top/{top_n}", ...)  # 동적 경로 나중에
@router.get("/passengers/{passenger_id}", ...)  # 가장 나중에
```

## 🔧 수정된 파일

1. **`router.py`**: `/titanic/top10` 엔드포인트를 `/stats` 앞으로 이동
2. **`application.yaml`**: `/api/ai/titanic/**` 라우팅 추가

## 📝 체크리스트

- [ ] ML Service 재시작 완료
- [ ] API Gateway 재시작 완료
- [ ] Next.js 개발 서버 재시작 완료
- [ ] `http://localhost:9006/titanic/top10` 직접 접근 테스트
- [ ] `http://localhost:8080/api/ai/titanic/top10` API Gateway 테스트
- [ ] 챗봇에서 "타이타닉 상위 10명 알려줘" 테스트

## 🐛 추가 디버깅

### Next.js API Route 로그 확인

Next.js 개발 서버 콘솔에서 다음 로그를 확인:
```
[Titanic API Route] Calling: http://localhost:8080/api/ai/titanic/top10
[Titanic API Route] Response status: 200
```

### API Gateway 로그 확인

```bash
docker logs api-gateway --tail 50
```

### ML Service 로그 확인

```bash
docker logs mlservice --tail 50
```

## 💡 예상 원인

1. **서비스 미재시작**: 코드 변경 후 서비스가 재시작되지 않음
2. **경로 매칭 순서**: FastAPI 경로 매칭 순서 문제
3. **Next.js 캐시**: Next.js 개발 서버가 변경사항을 인식하지 못함

## ✅ 해결 확인

모든 서비스를 재시작한 후:
1. 브라우저에서 `http://localhost:9006/titanic/top10` 접근 → 200 OK
2. 브라우저에서 `http://localhost:8080/api/ai/titanic/top10` 접근 → 200 OK
3. 챗봇에서 "타이타닉 상위 10명 알려줘" 입력 → 정상 응답

---

**작성일**: 2024-12-05  
**버전**: 1.0.0

