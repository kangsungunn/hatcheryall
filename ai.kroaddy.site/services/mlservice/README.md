# ML Service

다양한 머신러닝 데이터셋을 처리하고 학습시키기 위한 통합 서비스

## 📚 문서

- **[구조 및 워크플로우 가이드](ML_SERVICE_STRUCTURE_AND_WORKFLOW.md)**: 상세한 구조 설명과 새 데이터셋 추가 방법
- **[Postman 테스트 가이드](POSTMAN_TEST_GUIDE.md)**: API 테스트 방법
- **[Postman 컬렉션](ML_Service_Titanic_API.postman_collection.json)**: API 테스트용 컬렉션

## 🚀 빠른 시작

### 1. 독립 실행 (mlservice만)

```bash
cd ai.kroaddy.site/services/mlservice
docker compose up --build
```

서비스가 `http://localhost:9006`에서 실행됩니다.

### 2. API 문서 확인

- **Swagger UI**: http://localhost:9006/docs
- **ReDoc**: http://localhost:9006/redoc
- **OpenAPI JSON**: http://localhost:9006/openapi.json

## 📁 프로젝트 구조

```
mlservice/
├── app/
│   ├── __init__.py
│   ├── main.py                          # FastAPI 메인 애플리케이션
│   │
│   ├── titanic/                         # 타이타닉 데이터셋 모듈
│   │   ├── __init__.py
│   │   ├── titanic_dataset.py          # 데이터셋 클래스
│   │   ├── titanic_model.py            # ML 모델 클래스
│   │   ├── titanic_method.py           # 전처리 메서드
│   │   ├── titanic_service.py          # ML 파이프라인
│   │   ├── router.py                   # API 엔드포인트
│   │   ├── train.csv                   # 학습 데이터
│   │   └── test.csv                    # 테스트 데이터
│   │
│   └── culture/                         # 문화 데이터셋 (준비 중)
│       └── culture.csv
│
├── docker-compose.yaml                  # 독립 실행용
├── Dockerfile                           # 컨테이너 이미지
├── requirements.txt                     # Python 의존성
├── README.md                            # 이 파일
├── ML_SERVICE_STRUCTURE_AND_WORKFLOW.md # 상세 가이드
├── POSTMAN_TEST_GUIDE.md               # API 테스트 가이드
└── ML_Service_Titanic_API.postman_collection.json
```

## 🎯 주요 기능

### 1. 데이터셋 모듈화

각 데이터셋(Titanic, Culture 등)은 독립적인 모듈로 구성:

- **Dataset**: 데이터 구조 및 경로 관리
- **Model**: 머신러닝 알고리즘
- **Method**: 데이터 전처리 메서드
- **Service**: ML 파이프라인 (전처리 → 모델링 → 학습 → 평가 → 제출)
- **Router**: REST API 엔드포인트

### 2. 머신러닝 파이프라인

5단계 ML 파이프라인 구조:

```
1. Preprocess (전처리)   → 데이터 클렌징, 인코딩, 스케일링
2. Modeling (모델링)     → 알고리즘 선택 및 설정
3. Learning (학습)       → 모델 학습
4. Evaluate (평가)       → 성능 평가 및 검증
5. Submit (제출)         → 결과 생성 및 저장
```

### 3. REST API

FastAPI 기반의 RESTful API 제공:

- **CRUD 작업**: 데이터 생성, 조회, 수정, 삭제
- **검색 기능**: 다양한 필터를 통한 데이터 검색
- **통계 정보**: 데이터셋 통계 및 분석
- **ML 실행**: 머신러닝 파이프라인 실행 (향후 추가)

## 📋 현재 지원 데이터셋

### Titanic (타이타닉 승객 데이터)

**엔드포인트**: `/titanic`

#### CREATE (생성)

```bash
POST /titanic/passengers
Content-Type: application/json

{
  "PassengerId": 892,
  "Survived": 0,
  "Pclass": 3,
  "Name": "Test, Mr. Test",
  "Sex": "male",
  "Age": 25.0,
  "SibSp": 0,
  "Parch": 0,
  "Ticket": "TEST123",
  "Fare": 10.0,
  "Cabin": null,
  "Embarked": "S"
}
```

#### READ (조회)

```bash
# 모든 승객 조회
GET /titanic/passengers?limit=10&offset=0

# ID로 승객 조회
GET /titanic/passengers/{passenger_id}

# 승객 검색
GET /titanic/passengers/search?sex=female&survived=1

# 요금 기준 상위 N명
GET /titanic/passengers/top/10

# 통계 조회
GET /titanic/stats
```

#### UPDATE (수정)

```bash
# 전체 수정
PUT /titanic/passengers/{passenger_id}

# 부분 수정
PATCH /titanic/passengers/{passenger_id}
Content-Type: application/json

{
  "Age": 30.0,
  "Fare": 50.0
}
```

#### DELETE (삭제)

```bash
# 승객 삭제
DELETE /titanic/passengers/{passenger_id}

# 모든 승객 삭제 (주의!)
DELETE /titanic/passengers
```

## 🔧 기술 스택

| 카테고리 | 기술 |
|---------|-----|
| **웹 프레임워크** | FastAPI 0.104.1+ |
| **서버** | Uvicorn 0.24.0+ |
| **데이터 검증** | Pydantic 2.0.0+ |
| **데이터 처리** | Pandas 2.0.0+ |
| **수치 연산** | NumPy 1.24.0+ |
| **머신러닝** | Scikit-learn 1.3.0+ |
| **디버깅** | Icecream 2.1.3+ |
| **컨테이너** | Docker & Docker Compose |

## 🔍 검색 필터 (Titanic)

다음 필터를 조합하여 사용:

| 필터 | 설명 | 예시 |
|-----|-----|-----|
| `name` | 이름 (부분 일치) | `name=Smith` |
| `sex` | 성별 | `sex=female` |
| `survived` | 생존 여부 | `survived=1` |
| `pclass` | 등급 | `pclass=1` |
| `min_age` / `max_age` | 나이 범위 | `min_age=20&max_age=30` |
| `min_fare` / `max_fare` | 요금 범위 | `min_fare=50&max_fare=100` |
| `limit` | 결과 개수 제한 | `limit=20` |

## 📝 사용 예시

### Python 클라이언트

```python
import requests

BASE_URL = "http://localhost:9006"

# 승객 조회
response = requests.get(f"{BASE_URL}/titanic/passengers/1")
passenger = response.json()

# 승객 검색 (여성 생존자)
response = requests.get(
    f"{BASE_URL}/titanic/passengers/search",
    params={"sex": "female", "survived": 1, "limit": 10}
)
passengers = response.json()

# 통계 조회
response = requests.get(f"{BASE_URL}/titanic/stats")
stats = response.json()
```

### cURL 예시

```bash
# 승객 조회
curl http://localhost:9006/titanic/passengers/1

# 승객 검색
curl "http://localhost:9006/titanic/passengers/search?sex=female&survived=1"

# 통계 조회
curl http://localhost:9006/titanic/stats

# 상위 10명 (요금 기준)
curl http://localhost:9006/titanic/passengers/top/10
```

## 🐳 Docker 실행

### 독립 실행

```bash
cd ai.kroaddy.site/services/mlservice
docker compose up --build
```

### 전체 시스템 실행

```bash
# 프로젝트 루트에서
cd C:\Users\hi\Documents\dacon_realreal\kroaddy_project_dacon
docker compose up
```

mlservice는 다음 설정으로 실행됩니다:
- 포트: `9006:9006`
- 컨테이너명: `mlservice`
- 네트워크: `kroaddy-network`

## 🛠️ 개발 환경 설정

### 로컬 개발

```bash
# 가상 환경 생성
python -m venv venv

# 가상 환경 활성화
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

# 의존성 설치
cd ai.kroaddy.site/services/mlservice
pip install -r requirements.txt

# 서버 실행 (개발 모드)
uvicorn app.main:app --reload --port 9006
```

### 디버깅

```python
from icecream import ic

# 변수 출력
ic(variable)

# 함수 실행 추적
ic(function_call())
```

## 📊 새로운 데이터셋 추가 방법

상세한 가이드는 [ML_SERVICE_STRUCTURE_AND_WORKFLOW.md](ML_SERVICE_STRUCTURE_AND_WORKFLOW.md)를 참조하세요.

### 간단 요약

1. **폴더 생성**: `app/{dataset_name}/`
2. **파일 생성**: 
   - `{dataset}_dataset.py`
   - `{dataset}_model.py`
   - `{dataset}_method.py`
   - `{dataset}_service.py`
   - `router.py`
3. **CSV 파일**: `train.csv`, `test.csv`
4. **라우터 등록**: `main.py`에 추가

```python
# main.py
from app.{dataset}.router import router as {dataset}_router

app.include_router(
    {dataset}_router,
    prefix="",
    tags=["{dataset}"]
)
```

## ⚠️ 주의사항

1. **데이터 저장**: 변경사항은 CSV 파일에 저장됩니다
2. **데이터 백업**: 중요한 데이터는 백업을 권장합니다
3. **전체 삭제**: `DELETE /passengers`는 모든 데이터를 삭제하므로 주의
4. **경로 순서**: FastAPI는 경로를 위에서 아래로 매칭하므로 구체적인 경로를 먼저 정의

## 🐛 문제 해결

### 422 에러 (Unprocessable Entity)

**원인**: FastAPI 경로 매칭 순서 문제

**해결**: `router.py`에서 구체적인 경로를 동적 경로보다 먼저 정의

```python
# ❌ 잘못된 순서
@router.get("/passengers/{passenger_id}")  # 먼저 정의됨
@router.get("/passengers/search")          # 나중에 정의됨

# ✅ 올바른 순서
@router.get("/passengers/search")          # 구체적 경로 먼저
@router.get("/passengers/{passenger_id}")  # 동적 경로 나중
```

### Pydantic V2 호환성

**문제**: `allow_population_by_field_name` deprecated

**해결**: `populate_by_name = True` 사용

```python
class Config:
    populate_by_name = True  # Pydantic V2
    use_enum_values = True
```

## 📚 추가 기능 (향후 계획)

### 단기 (현재 진행 중)

- [ ] Culture 데이터셋 구현
- [ ] ML 파이프라인 API 엔드포인트 추가
- [ ] 모델 저장/로드 기능

### 중기

- [ ] AutoML 기능 통합
- [ ] 실시간 학습 모니터링
- [ ] 모델 버전 관리 시스템
- [ ] 배치 데이터 업로드

### 장기

- [ ] 데이터 시각화 API
- [ ] 하이퍼파라미터 자동 튜닝
- [ ] 분산 학습 지원
- [ ] WebSocket을 통한 실시간 업데이트

## 🤝 기여

새로운 데이터셋 추가 또는 기능 개선은 PR을 통해 기여해주세요.

## 📄 라이선스

MIT License

---

**작성일**: 2024-12-05  
**버전**: 1.0.0  
**팀**: ML Service Team
