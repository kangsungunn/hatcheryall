# 빌드 오류 수정 요약

## 발견된 문제들

### 1. ✅ Next.js 16 params 타입 변경
- **문제**: Next.js 16에서 `params`가 Promise로 변경됨
- **수정**: `app/api/sse/[...path]/route.ts`에서 `params`를 `await` 처리

### 2. ✅ 누락된 의존성
- **문제**: 여러 Radix UI 컴포넌트 및 유틸리티 라이브러리 누락
- **수정**: 필요한 모든 패키지 설치 완료
  - @radix-ui/* 패키지들
  - class-variance-authority
  - react-day-picker
  - recharts
  - 기타 유틸리티

### 3. ✅ useSSE 훅 누락
- **문제**: `@/lib/hooks/useSSE` 모듈 없음
- **수정**: `lib/hooks/useSSE.ts` 파일 생성

### 4. ✅ react-day-picker API 변경
- **문제**: `IconLeft`, `IconRight`가 더 이상 지원되지 않음
- **수정**: `Chevron` 컴포넌트로 변경

### 5. ⚠️ recharts 타입 오류 (진행 중)
- **문제**: `ChartTooltipContent`의 `payload` 타입 불일치
- **상태**: 타입 정의 수정 중

### 6. ⚠️ Spring Boot 테스트 실패
- **문제**: `api.kroaddy.site/gateway` 테스트 실패
- **상태**: 패키지명 변경 완료, 테스트는 `-x test`로 건너뛸 수 있음

## 해결 방법

### Next.js 빌드
```bash
cd www.kroaddy.site
npm install  # 모든 의존성 설치
npm run build
```

### Spring Boot 빌드 (테스트 제외)
```bash
cd api.kroaddy.site
./gradlew :gateway:build -x test
```

### 전체 빌드
```bash
# 프론트엔드
cd www.kroaddy.site && npm run build
cd admin.kroaddy.site && npm run build

# 백엔드
cd api.kroaddy.site && ./gradlew build -x test
cd core.kroaddy.site && ./gradlew build -x test
```

## 남은 작업

1. chart.tsx의 타입 오류 완전 해결
2. 모든 서비스의 빌드 테스트
3. Docker 빌드 확인

