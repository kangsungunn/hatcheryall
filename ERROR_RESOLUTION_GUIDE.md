# 🐛 에러 해결 가이드

이 문서는 프로젝트 개발 중 발생한 주요 에러들과 해결 과정을 정리한 것입니다.

---

## 📋 목차

1. [Google 로그인 500 오류](#1-google-로그인-500-오류)
2. [Admin 사이트 의존성 누락](#2-admin-사이트-의존성-누락)
3. [포트 충돌 문제](#3-포트-충돌-문제)

---

## 1. Google 로그인 500 오류

### 🔴 문제 상황

**에러 메시지:**
```
응답 상태: 500
응답 데이터: {}
응답 헤더: {}
HTTP 500: {"timestamp":"2025-12-04T01:10:50.345+00:00","path":"/api/auth/google/login","status":500,"error":"Internal Server Error","requestId":"9423a737-10"}
```

**발생 위치:**
- 프론트엔드: `lib/api.ts` - `getSocialLoginUrl()` 함수
- 백엔드: `/api/auth/google/login` 엔드포인트

---

### 🔍 원인 분석

#### 1.1 포트 불일치 문제 (주요 원인)

**발견 과정:**
```powershell
docker logs oauthservice --tail 50
```

**로그 분석:**
```
Line 24, 38-39: Tomcat started on port 8080 (http)  ❌
설정 파일: spring.server.port: 8081                  ✅
API Gateway: uri: http://oauthservice:8081          ✅
```

**문제:**
- `oauthservice`가 **8080 포트**에서 실행 중
- `API Gateway`는 **8081 포트**로 요청 전송
- **포트 불일치로 연결 실패** → 500 오류 발생

#### 1.2 환경 변수 미설정

- `.env` 파일이 없음
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` 미설정
- `@Value` 주입 시 빈 문자열 처리 필요

#### 1.3 예외 처리 부족

- Spring Boot 기본 오류 핸들러만 동작
- 명확한 오류 메시지 부재
- 전역 예외 핸들러 없음

---

### ✅ 해결 과정

#### 1.1 포트 설정 수정

**파일: `docker-compose.yaml`**
```yaml
# 수정 전
oauthservice:
  environment:
    - REDIS_HOST=redis
    # SERVER_PORT 없음

# 수정 후
oauthservice:
  environment:
    - SERVER_PORT=8081  # ← 추가
    - REDIS_HOST=redis
```

**파일: `core.kroaddy.site/oauthservice/src/main/resources/application.yaml`**
```yaml
# 수정 전
spring:
  server:
    port: 8081

# 수정 후
server:
  port: ${SERVER_PORT:8081}  # 환경 변수 우선, 기본값 8081
```

**이유:**
- Docker 환경에서 환경 변수로 포트 제어
- 설정 파일과 환경 변수 일치 보장

#### 1.2 전역 예외 핸들러 추가

**파일: `core.kroaddy.site/oauthservice/src/main/java/com/labzang/api/config/GlobalExceptionHandler.java`** (신규 생성)

```java
package com.labzang.api.config;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalStateException(IllegalStateException e) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", e.getMessage());
        response.put("error", "Configuration Error");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGenericException(Exception e) {
        System.err.println("예상치 못한 오류 발생: " + e.getMessage());
        e.printStackTrace();
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", "서버 오류가 발생했습니다: " + e.getMessage());
        response.put("error", "Internal Server Error");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }
}
```

**효과:**
- 모든 예외를 일관된 형식으로 처리
- 명확한 오류 메시지 제공
- Spring Boot 기본 오류 형식 대신 커스텀 응답

#### 1.3 GoogleController 예외 처리 강화

**파일: `core.kroaddy.site/oauthservice/src/main/java/com/labzang/api/google/GoogleController.java`**

```java
// 수정 전
@GetMapping("/login")
public ResponseEntity<Map<String, String>> getGoogleAuthUrl() {
    String authUrl = googleService.getAuthorizationUrl();
    Map<String, String> response = new HashMap<>();
    response.put("authUrl", authUrl);
    return ResponseEntity.ok(response);
}

// 수정 후
@GetMapping("/login")
public ResponseEntity<?> getGoogleAuthUrl() {
    try {
        String authUrl = googleService.getAuthorizationUrl();
        if (authUrl == null || authUrl.isEmpty()) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", 
                            "구글 인가 URL 생성 실패: 설정이 올바르지 않습니다. GOOGLE_CLIENT_ID를 확인하세요."));
        }
        Map<String, String> response = new HashMap<>();
        response.put("authUrl", authUrl);
        return ResponseEntity.ok(response);
    } catch (Exception e) {
        System.err.println("구글 인가 URL 생성 중 오류 발생: " + e.getMessage());
        e.printStackTrace();
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("success", false, "message", 
                        "구글 인가 URL 생성 실패: " + e.getMessage() + 
                        ". GOOGLE_CLIENT_ID 및 GOOGLE_CLIENT_SECRET 환경 변수를 확인하세요."));
    }
}
```

#### 1.4 GoogleService null 체크 추가

**파일: `core.kroaddy.site/oauthservice/src/main/java/com/labzang/api/google/GoogleService.java`**

```java
// 수정 전
@Value("${google.client-id}")
private String googleClientId;

@Value("${google.redirect-uri}")
private String googleRedirectUri;

public String getAuthorizationUrl() {
    return UriComponentsBuilder.fromUriString("https://accounts.google.com/o/oauth2/v2/auth")
            .queryParam("client_id", googleClientId)
            .queryParam("redirect_uri", googleRedirectUri)
            // ...
}

// 수정 후
@Value("${google.client-id:}")
private String googleClientId;  // 기본값 빈 문자열

@Value("${google.redirect-uri:}")
private String googleRedirectUri;  // 기본값 빈 문자열

public String getAuthorizationUrl() {
    if (googleClientId == null || googleClientId.isEmpty()) {
        throw new IllegalStateException("GOOGLE_CLIENT_ID가 설정되지 않았습니다. 환경 변수를 확인하세요.");
    }
    if (googleRedirectUri == null || googleRedirectUri.isEmpty()) {
        throw new IllegalStateException("GOOGLE_REDIRECT_URI가 설정되지 않았습니다. 환경 변수를 확인하세요.");
    }
    return UriComponentsBuilder.fromUriString("https://accounts.google.com/o/oauth2/v2/auth")
            .queryParam("client_id", googleClientId)
            .queryParam("redirect_uri", googleRedirectUri)
            // ...
}
```

---

### 🎯 해결 결과

#### 수정 전
```json
{
  "timestamp": "2025-12-04T01:10:50.345+00:00",
  "path": "/api/auth/google/login",
  "status": 500,
  "error": "Internal Server Error",
  "requestId": "9423a737-10"
}
```
- ❌ 포트 불일치로 연결 실패
- ❌ 빈 응답 데이터
- ❌ 원인 파악 어려움

#### 수정 후
```json
{
  "success": false,
  "message": "GOOGLE_CLIENT_ID가 설정되지 않았습니다. 환경 변수를 확인하세요.",
  "error": "Configuration Error"
}
```
- ✅ 포트 일치 (8081)
- ✅ 명확한 오류 메시지
- ✅ 원인 파악 용이

---

### 📝 재시작 명령어

```powershell
# oauthservice 재빌드 및 재시작
docker-compose up -d --build oauthservice

# 로그 확인
docker logs oauthservice --tail 20

# 포트 확인 (8081이어야 함)
docker logs oauthservice | findstr "port"
```

---

## 2. Admin 사이트 의존성 누락

### 🔴 문제 상황

**에러 메시지:**
```
'next'은(는) 내부 또는 외부 명령, 실행할 수 있는 프로그램, 또는 배치 파일이 아닙니다.
ELIFECYCLE  Command failed with exit code 1
WARN   Local package.json exists, but node_modules missing, did you mean to install?
```

**발생 위치:**
- `admin.kroaddy.site` 디렉토리
- `pnpm run dev` 실행 시

---

### 🔍 원인 분석

**문제:**
- `package.json`은 존재하지만 `node_modules` 폴더가 없음
- Next.js 및 모든 의존성 패키지가 설치되지 않음
- `next` 명령어를 찾을 수 없음

**원인:**
- 프로젝트 클론 후 의존성 설치를 하지 않음
- `.gitignore`에 `node_modules`가 포함되어 있어 Git에 커밋되지 않음

---

### ✅ 해결 과정

#### 2.1 의존성 설치

```powershell
cd admin.kroaddy.site
pnpm install
```

**설치 결과:**
```
Packages: +350
Progress: resolved 403, reused 336, downloaded 19, added 350, done
```

**설치된 주요 패키지:**
- `next 16.0.3`
- `react 18.3.1`
- `react-dom 18.3.1`
- `typescript 5.9.3`
- `tailwindcss 4.1.17`

#### 2.2 개발 서버 실행

```powershell
pnpm run dev
```

---

### 🎯 해결 결과

#### 수정 전
- ❌ `next` 명령어를 찾을 수 없음
- ❌ 서버 시작 실패

#### 수정 후
- ✅ 350개 패키지 설치 완료
- ✅ 개발 서버 정상 실행 (포트 4000)
- ✅ `http://localhost:4000` 접속 가능

---

### 📝 참고사항

**경고 메시지 (무시 가능):**
```
WARN  deprecated eslint@8.57.1
WARN  Issues with peer dependencies found
```
- 개발 환경에서는 문제없음
- 프로덕션 배포 전 업데이트 권장

---

## 3. 포트 충돌 문제

### 🔴 문제 상황

**에러 메시지:**
```
Error: listen EADDRINUSE: address already in use :::4000
    at <unknown> (Error: listen EADDRINUSE: address already in use :::4000)
  code: 'EADDRINUSE',
  errno: -4091,
  syscall: 'listen',
  address: '::',
  port: 4000
```

**발생 위치:**
- `admin.kroaddy.site` 디렉토리
- `pnpm run dev` 실행 시

---

### 🔍 원인 분석

#### 3.1 Docker 컨테이너 충돌

**확인 과정:**
```powershell
netstat -ano | findstr ":4000"
```

**결과:**
```
TCP    0.0.0.0:4000           0.0.0.0:0              LISTENING       6472
TCP    [::]:4000              [::]:0                 LISTENING       6472
```

**프로세스 확인:**
```powershell
tasklist | findstr "6472"
```

**결과:**
```
com.docker.backend.exe        6472
```

**Docker 컨테이너 확인:**
```powershell
docker ps --filter "name=admin"
```

**결과:**
```
NAMES           STATUS       PORTS
admin-kroaddy   Up 2 hours   0.0.0.0:4000->4000/tcp
```

**문제:**
- Docker 컨테이너 `admin-kroaddy`가 포트 4000 사용 중
- 로컬에서 `pnpm run dev` 실행 시 포트 충돌 발생

#### 3.2 백그라운드 프로세스 충돌

**상황:**
- 이전에 백그라운드로 실행한 `pnpm run dev` 프로세스가 아직 실행 중
- 같은 포트로 다시 실행 시도 → 충돌

---

### ✅ 해결 과정

#### 3.1 Docker 컨테이너 중지 (로컬 개발 시)

```powershell
docker stop admin-kroaddy
```

**이유:**
- 로컬 개발 환경에서 Hot Reload 사용
- 코드 변경 시 즉시 반영
- 디버깅 용이

#### 3.2 기존 프로세스 확인 및 종료 (필요 시)

```powershell
# 포트 사용 중인 프로세스 확인
netstat -ano | findstr ":4000"

# 프로세스 종료 (PID 확인 후)
taskkill /F /PID [PID번호]
```

#### 3.3 개발 서버 실행

```powershell
cd admin.kroaddy.site
pnpm run dev
```

---

### 🎯 해결 결과

#### 수정 전
- ❌ 포트 4000 사용 중 (Docker 컨테이너)
- ❌ 로컬 서버 시작 실패

#### 수정 후
- ✅ Docker 컨테이너 중지
- ✅ 로컬 서버 정상 실행
- ✅ `http://localhost:4000` 접속 가능

---

### 📝 Docker vs 로컬 실행 선택 가이드

#### Docker 사용 시 (프로덕션 환경)
```powershell
# admin 컨테이너 시작
docker start admin-kroaddy
# 또는 전체 재시작
docker-compose up -d
```

**장점:**
- 프로덕션 환경과 동일
- 의존성 관리 용이
- 배포 준비 완료

#### 로컬 실행 시 (개발 환경) ⭐ 권장
```powershell
# Docker 중지
docker stop admin-kroaddy
# 로컬 실행
cd admin.kroaddy.site
pnpm run dev
```

**장점:**
- ✅ 코드 변경 시 즉시 반영 (Hot Reload)
- ✅ 디버깅 용이
- ✅ 재빌드 불필요
- ✅ 빠른 개발 속도

---

## 📚 학습 포인트

### 1. 포트 설정의 중요성
- **문제:** 설정 파일과 실제 실행 포트 불일치
- **해결:** 환경 변수로 포트 제어, 설정 파일과 일치 확인
- **교훈:** Docker 환경에서는 환경 변수 활용이 중요

### 2. 예외 처리의 중요성
- **문제:** 기본 오류 메시지로 원인 파악 어려움
- **해결:** 전역 예외 핸들러 추가, 명확한 오류 메시지 제공
- **교훈:** 사용자 친화적인 오류 메시지는 디버깅 시간을 크게 단축

### 3. 의존성 관리
- **문제:** `node_modules` 없이 실행 시도
- **해결:** `pnpm install`로 의존성 설치
- **교훈:** 프로젝트 클론 후 반드시 의존성 설치 필요

### 4. 포트 충돌 관리
- **문제:** 같은 포트를 여러 프로세스가 사용
- **해결:** 실행 중인 프로세스 확인 후 중지
- **교훈:** 개발 환경과 프로덕션 환경 분리 필요

---

## 🔧 유용한 명령어 모음

### Docker 관련
```powershell
# 컨테이너 상태 확인
docker ps

# 로그 확인
docker logs [container-name] --tail 50

# 컨테이너 재시작
docker restart [container-name]

# 컨테이너 재빌드 및 재시작
docker-compose up -d --build [service-name]

# 컨테이너 중지
docker stop [container-name]
```

### 포트 확인
```powershell
# 포트 사용 중인 프로세스 확인
netstat -ano | findstr ":4000"

# 프로세스 정보 확인
tasklist | findstr [PID]

# 프로세스 종료
taskkill /F /PID [PID]
```

### Node.js 관련
```powershell
# 의존성 설치
pnpm install

# 개발 서버 실행
pnpm run dev

# 프로덕션 빌드
pnpm run build
```

---

## 🎓 추가 학습 자료

### Spring Boot
- [Spring Boot 공식 문서](https://spring.io/projects/spring-boot)
- [Spring Cloud Gateway](https://spring.io/projects/spring-cloud-gateway)

### Next.js
- [Next.js 공식 문서](https://nextjs.org/docs)
- [Next.js Docker 배포](https://nextjs.org/docs/deployment#docker-image)

### Docker
- [Docker Compose 공식 문서](https://docs.docker.com/compose/)
- [Docker 네트워킹](https://docs.docker.com/network/)

---

## 📝 체크리스트

새로운 환경에서 프로젝트를 실행할 때:

- [ ] `.env` 파일 생성 및 환경 변수 설정
- [ ] `pnpm install` 실행 (프론트엔드)
- [ ] Docker 컨테이너 상태 확인
- [ ] 포트 충돌 확인
- [ ] 서비스 재빌드 (코드 변경 시)
- [ ] 로그 확인으로 문제 진단

---

**작성일:** 2025-12-04  
**작성자:** AI Assistant  
**프로젝트:** kroaddy_project_dacon

