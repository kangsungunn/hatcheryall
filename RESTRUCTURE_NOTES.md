# 프로젝트 재구성 완료 노트

## 완료된 작업

### 1. core.kroaddy.site 생성
- ✅ oauthservice: `api.kroaddy.site/services/auth-service`에서 이동
  - 패키지명 변경: `site.protoa.api` → `com.labzang.api`
  - 포트: 8081
  - application.yaml에서 서비스명을 `oauthservice`로 변경
- ✅ userservice: 새로 생성 (기본 구조만)
  - 포트: 8082
  - 패키지명: `com.labzang.api`

### 2. ai.kroaddy.site 재구성
- ✅ common 디렉토리 생성
  - config.py, exceptions.py, middleware.py, utils.py
- ✅ feed.kroaddy.site → crawlerservice 통합
  - feed.kroaddy.site의 코드를 crawlerservice/app으로 이동
  - 포트: 9001
- ✅ authservice 생성
  - 포트: 9002
  - 기본 구조 및 라우터 생성

### 3. admin.kroaddy.site 생성
- ✅ Next.js 16.0.3 프로젝트 구조 생성
- ✅ 포트: 4000
- ✅ 기본 페이지 및 레이아웃 생성
- ✅ 디렉토리 구조: app/, src/components/, src/lib/, src/store/

### 4. api.kroaddy.site gateway 업데이트
- ✅ 패키지명 변경: `site.protoa.api` → `com.kroaddy.api`
- ✅ application.yaml 업데이트
  - oauthservice:8081로 라우팅 변경
  - userservice:8082 라우팅 추가

### 5. www.kroaddy.site
- ✅ 구조 확인 완료 (이미 올바른 구조)

## 최종 처리 완료

### rag.kroaddy.site
- ✅ ai.kroaddy.site/services/ragservice로 통합 완료
- ✅ 포트: 9004로 변경
- ✅ 원본 디렉토리 제거 완료

### feed.kroaddy.site
- ✅ ai.kroaddy.site/services/crawlerservice로 통합 완료
- ✅ 포트: 9001로 변경
- ✅ 원본 디렉토리 제거 완료

### ai.kroaddy.site/gateway
- ✅ 유지 (AI 서비스 전용 게이트웨이로 사용)
- ✅ 포트: 9000
- ✅ 라우팅 업데이트 완료 (crawler, auth, chatbot, rag)

## 다음 단계

1. Docker Compose 파일 업데이트
   - 서비스명 변경 (authservice → oauthservice)
   - 새 서비스 추가 (userservice, authservice)
   - 포트 매핑 확인

2. 환경 변수 업데이트
   - API Gateway 라우팅 설정 확인
   - 각 서비스의 환경 변수 확인

3. 빌드 및 테스트
   - 각 서비스 빌드 확인
   - 통합 테스트

4. 문서 업데이트
   - README 파일 업데이트
   - API 문서 업데이트

