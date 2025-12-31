# Postman 테스트 가이드

ML Service의 모든 API 엔드포인트를 Postman에서 테스트하는 방법입니다.

## ⚠️ 중요: 경로 순서 문제 해결

### 문제
`/titanic/passengers/search`를 호출하면 422 에러가 발생할 수 있습니다:
```json
{
  "detail": [
    {
      "type": "int_parsing",
      "loc": ["path", "passenger_id"],
      "msg": "Input should be a valid integer, unable to parse string as an integer",
      "input": "search"
    }
  ]
}
```

### 원인
FastAPI는 경로를 위에서 아래로 순서대로 매칭합니다. `/passengers/{passenger_id}`가 `/passengers/search`보다 먼저 정의되어 있으면, `search`를 `passenger_id`로 파싱하려고 시도합니다.

### 해결
구체적인 경로(`/passengers/search`, `/passengers/top/{n}`)를 동적 경로(`/passengers/{passenger_id}`)보다 **먼저** 정의해야 합니다.

**올바른 순서:**
1. `/passengers` (구체적)
2. `/passengers/search` (구체적)
3. `/passengers/top/{top_n}` (구체적)
4. `/passengers/{passenger_id}` (동적 - 마지막)

이 문제는 이미 수정되었습니다. 서버를 재시작하면 정상 작동합니다.

## 📋 기본 설정

### Base URL
```
http://localhost:9006
```

### Headers (모든 요청에 공통)
```
Content-Type: application/json
```

---

## 🔵 CREATE (생성)

### 1. 새 승객 생성

**Method:** `POST`  
**URL:** `http://localhost:9006/titanic/passengers`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "PassengerId": 892,
  "Survived": 0,
  "Pclass": 3,
  "Name": "Test, Mr. John",
  "Sex": "male",
  "Age": 25.0,
  "SibSp": 0,
  "Parch": 0,
  "Ticket": "TEST123",
  "Fare": 10.5,
  "Cabin": null,
  "Embarked": "S"
}
```

**예상 응답 (201 Created):**
```json
{
  "passenger_id": 892,
  "survived": 0,
  "pclass": 3,
  "name": "Test, Mr. John",
  "sex": "male",
  "age": 25.0,
  "sib_sp": 0,
  "parch": 0,
  "ticket": "TEST123",
  "fare": 10.5,
  "cabin": null,
  "embarked": "S"
}
```

---

### 2. 딕셔너리로 승객 생성

**Method:** `POST`  
**URL:** `http://localhost:9006/titanic/passengers/dict`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "PassengerId": 893,
  "Survived": 1,
  "Pclass": 1,
  "Name": "Test, Mrs. Jane",
  "Sex": "female",
  "Age": 30.0,
  "SibSp": 1,
  "Parch": 0,
  "Ticket": "TEST456",
  "Fare": 50.0,
  "Cabin": "C123",
  "Embarked": "C"
}
```

---

## 🔵 READ (조회)

### 3. ID로 승객 조회

**Method:** `GET`  
**URL:** `http://localhost:9006/titanic/passengers/1`

**Headers:** 없음

**예상 응답 (200 OK):**
```json
{
  "passenger_id": 1,
  "survived": 0,
  "pclass": 3,
  "name": "Braund, Mr. Owen Harris",
  "sex": "male",
  "age": 22.0,
  "sib_sp": 1,
  "parch": 0,
  "ticket": "A/5 21171",
  "fare": 7.25,
  "cabin": null,
  "embarked": "S"
}
```

---

### 4. 모든 승객 조회 (페이지네이션)

**Method:** `GET`  
**URL:** `http://localhost:9006/titanic/passengers`

**Query Parameters:**
- `limit` (optional): 조회할 최대 개수 (예: 10)
- `offset` (optional): 시작 위치 (기본값: 0)

**예시:**
```
http://localhost:9006/titanic/passengers?limit=10&offset=0
```

**예상 응답 (200 OK):**
```json
[
  {
    "passenger_id": 1,
    "survived": 0,
    "pclass": 3,
    "name": "Braund, Mr. Owen Harris",
    ...
  },
  {
    "passenger_id": 2,
    "survived": 1,
    "pclass": 1,
    "name": "Cumings, Mrs. John Bradley",
    ...
  }
]
```

---

### 5. 승객 검색

**Method:** `GET`  
**URL:** `http://localhost:9006/titanic/passengers/search`

**Query Parameters:**
- `name` (optional): 이름 (부분 일치)
- `sex` (optional): 성별 (`male` 또는 `female`)
- `survived` (optional): 생존 여부 (`0` 또는 `1`)
- `pclass` (optional): 등급 (`1`, `2`, `3`)
- `min_age` (optional): 최소 나이
- `max_age` (optional): 최대 나이
- `min_fare` (optional): 최소 요금
- `max_fare` (optional): 최대 요금
- `limit` (optional): 결과 개수 제한 (기본값: 20)

**예시 1: 생존한 여성 승객 검색**
```
http://localhost:9006/titanic/passengers/search?sex=female&survived=1&limit=10
```

**예시 2: 1등급 승객 중 요금 50 이상**
```
http://localhost:9006/titanic/passengers/search?pclass=1&min_fare=50
```

**예시 3: 이름에 "John"이 포함된 승객**
```
http://localhost:9006/titanic/passengers/search?name=John
```

**예시 4: 20-30세 승객**
```
http://localhost:9006/titanic/passengers/search?min_age=20&max_age=30
```

**예상 응답 (200 OK):**
```json
[
  {
    "passenger_id": 2,
    "survived": 1,
    "pclass": 1,
    "name": "Cumings, Mrs. John Bradley",
    "sex": "female",
    ...
  }
]
```

---

### 6. 요금 기준 상위 N명 조회

**Method:** `GET`  
**URL:** `http://localhost:9006/titanic/passengers/top/10`

**Path Parameters:**
- `top_n`: 조회할 개수 (1-100)

**예시:**
```
http://localhost:9006/titanic/passengers/top/10
http://localhost:9006/titanic/passengers/top/5
```

**예상 응답 (200 OK):**
```json
[
  {
    "passenger_id": 259,
    "survived": 1,
    "pclass": 1,
    "name": "Ward, Miss. Anna",
    "fare": 512.3292,
    ...
  },
  ...
]
```

---

### 7. 통계 정보 조회

**Method:** `GET`  
**URL:** `http://localhost:9006/titanic/stats`

**Headers:** 없음

**예상 응답 (200 OK):**
```json
{
  "total_passengers": 891,
  "survived": 342,
  "died": 549,
  "survival_rate": 38.38,
  "average_fare": 32.20,
  "average_age": 29.70,
  "pclass_distribution": {
    "3": 491,
    "1": 216,
    "2": 184
  },
  "sex_distribution": {
    "male": 577,
    "female": 314
  }
}
```

---

## 🔵 UPDATE (수정)

### 8. 승객 정보 전체 수정

**Method:** `PUT`  
**URL:** `http://localhost:9006/titanic/passengers/1`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "PassengerId": 1,
  "Survived": 1,
  "Pclass": 2,
  "Name": "Updated Name",
  "Sex": "female",
  "Age": 30.0,
  "SibSp": 0,
  "Parch": 0,
  "Ticket": "UPDATED123",
  "Fare": 25.0,
  "Cabin": "A123",
  "Embarked": "C"
}
```

**주의:** Path의 `passenger_id`와 Body의 `PassengerId`가 일치해야 합니다.

**예상 응답 (200 OK):**
```json
{
  "passenger_id": 1,
  "survived": 1,
  "pclass": 2,
  "name": "Updated Name",
  ...
}
```

---

### 9. 승객 정보 부분 수정

**Method:** `PATCH`  
**URL:** `http://localhost:9006/titanic/passengers/1`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "Age": 35.0,
  "Fare": 30.0
}
```

또는

```json
{
  "Survived": 1,
  "Cabin": "B456"
}
```

**예상 응답 (200 OK):**
```json
{
  "passenger_id": 1,
  "survived": 1,
  "pclass": 3,
  "name": "Braund, Mr. Owen Harris",
  "age": 35.0,
  "fare": 30.0,
  "cabin": "B456",
  ...
}
```

---

## 🔵 DELETE (삭제)

### 10. 승객 삭제

**Method:** `DELETE`  
**URL:** `http://localhost:9006/titanic/passengers/892`

**Headers:** 없음

**예상 응답 (204 No Content):**
```
(응답 본문 없음)
```

---

### 11. 모든 승객 삭제 (⚠️ 주의!)

**Method:** `DELETE`  
**URL:** `http://localhost:9006/titanic/passengers`

**Headers:** 없음

**⚠️ 경고:** 이 작업은 되돌릴 수 없습니다!

**예상 응답 (204 No Content):**
```
(응답 본문 없음)
```

---

## 📦 Postman Collection 설정

### 환경 변수 설정

1. Postman에서 **Environments** → **Add** 클릭
2. 다음 변수 추가:

| Variable | Initial Value |
|----------|---------------|
| `base_url` | `http://localhost:9006` |
| `titanic_base` | `{{base_url}}/titanic` |

### Collection 생성

1. **New** → **Collection** 클릭
2. Collection 이름: "ML Service - Titanic API"
3. Collection 변수 추가:
   - `base_url`: `http://localhost:9006`

### 요청 생성 예시

각 엔드포인트를 Collection에 추가:

1. **Add Request** 클릭
2. 요청 이름 입력 (예: "Get Passenger by ID")
3. Method 선택 (GET, POST, PUT, PATCH, DELETE)
4. URL 입력: `{{base_url}}/titanic/passengers/1`
5. Headers 추가 (필요한 경우)
6. Body 추가 (POST, PUT, PATCH의 경우)

---

## 🧪 테스트 시나리오

### 시나리오 1: CRUD 전체 플로우

1. **생성 (CREATE)**
   ```
   POST /titanic/passengers
   Body: 새 승객 데이터
   → passenger_id 저장
   ```

2. **조회 (READ)**
   ```
   GET /titanic/passengers/{saved_id}
   → 생성된 데이터 확인
   ```

3. **수정 (UPDATE)**
   ```
   PATCH /titanic/passengers/{saved_id}
   Body: {"Age": 30.0}
   → 수정 확인
   ```

4. **삭제 (DELETE)**
   ```
   DELETE /titanic/passengers/{saved_id}
   → 삭제 확인
   ```

---

### 시나리오 2: 검색 테스트

1. **전체 조회**
   ```
   GET /titanic/passengers?limit=10
   ```

2. **필터링 검색**
   ```
   GET /titanic/passengers/search?sex=female&survived=1
   ```

3. **상위 조회**
   ```
   GET /titanic/passengers/top/5
   ```

4. **통계 확인**
   ```
   GET /titanic/stats
   ```

---

## 🔍 에러 응답 예시

### 404 Not Found
```json
{
  "detail": "Passenger with ID 9999 not found"
}
```

### 400 Bad Request
```json
{
  "detail": "PassengerId 1 already exists or creation failed"
}
```

또는

```json
{
  "detail": [
    {
      "loc": ["body", "Survived"],
      "msg": "ensure this value is less than or equal to 1",
      "type": "value_error.number.not_le"
    }
  ]
}
```

---

## 💡 Postman 사용 팁

### 1. Pre-request Script

요청 전에 변수 설정:
```javascript
// passenger_id를 동적으로 생성
pm.environment.set("test_passenger_id", Math.floor(Math.random() * 1000) + 900);
```

### 2. Tests Script

응답 검증:
```javascript
// 상태 코드 확인
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

// 응답 본문 확인
pm.test("Response has passenger_id", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('passenger_id');
});

// 응답 시간 확인
pm.test("Response time is less than 500ms", function () {
    pm.expect(pm.response.responseTime).to.be.below(500);
});
```

### 3. Collection Runner

여러 요청을 순차적으로 실행:
1. Collection 우클릭 → **Run collection**
2. 실행 순서 확인
3. **Run** 클릭

---

## 📝 빠른 참조

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/titanic/passengers` | 승객 생성 |
| GET | `/titanic/passengers/{id}` | ID로 조회 |
| GET | `/titanic/passengers` | 전체 조회 |
| GET | `/titanic/passengers/search` | 검색 |
| GET | `/titanic/passengers/top/{n}` | 상위 N명 |
| GET | `/titanic/stats` | 통계 |
| PUT | `/titanic/passengers/{id}` | 전체 수정 |
| PATCH | `/titanic/passengers/{id}` | 부분 수정 |
| DELETE | `/titanic/passengers/{id}` | 삭제 |
| DELETE | `/titanic/passengers` | 전체 삭제 |

---

## 🚀 서버 실행 확인

테스트 전에 서버가 실행 중인지 확인:

```bash
# 서버 상태 확인
GET http://localhost:9006/health

# 또는
GET http://localhost:9006/
```

**예상 응답:**
```json
{
  "service": "ML Service",
  "status": "running",
  "version": "1.0.0"
}
```

---

**작성일:** 2025-12-05  
**버전:** 1.0

