# ML Service 구조 및 워크플로우 가이드

## 📋 목차
1. [개요](#개요)
2. [현재 구조](#현재-구조)
3. [오늘 진행한 작업](#오늘-진행한-작업)
4. [주요 컴포넌트 설명](#주요-컴포넌트-설명)
5. [새로운 CSV 데이터 연동 워크플로우](#새로운-csv-데이터-연동-워크플로우)
6. [머신러닝 파이프라인 구조](#머신러닝-파이프라인-구조)
7. [API 엔드포인트 설계 가이드](#api-엔드포인트-설계-가이드)

---

## 개요

`mlservice`는 다양한 머신러닝 데이터셋을 처리하고 학습시키기 위한 통합 서비스입니다. 
각 데이터셋은 독립적인 모듈로 구성되어 있으며, FastAPI를 통해 REST API로 제공됩니다.

### 핵심 설계 원칙

- **모듈화**: 각 데이터셋(Titanic, Culture 등)은 독립적인 폴더로 분리
- **일관성**: 모든 데이터셋은 동일한 구조(Dataset, Model, Method, Service, Router)를 따름
- **확장성**: 새로운 데이터셋 추가 시 기존 구조를 복사하여 쉽게 확장 가능
- **재사용성**: 공통 유틸리티와 베이스 클래스를 통한 코드 재사용

---

## 현재 구조

```
mlservice/
├── app/
│   ├── __init__.py
│   ├── main.py                          # FastAPI 메인 애플리케이션
│   │
│   ├── titanic/                         # 타이타닉 데이터셋 모듈
│   │   ├── __init__.py
│   │   ├── titanic_dataset.py          # 데이터셋 클래스 (데이터 구조 정의)
│   │   ├── titanic_model.py            # 머신러닝 모델 클래스
│   │   ├── titanic_method.py           # 데이터 전처리 메서드
│   │   ├── titanic_service.py          # ML 파이프라인 서비스
│   │   ├── router.py                   # FastAPI 라우터 (API 엔드포인트)
│   │   ├── train.csv                   # 학습 데이터
│   │   └── test.csv                    # 테스트 데이터
│   │
│   └── culture/                         # 문화 데이터셋 모듈 (준비 중)
│       └── culture.csv
│
├── docker-compose.yaml                  # 독립 실행용 Docker Compose
├── Dockerfile                           # 컨테이너 이미지 빌드 파일
├── requirements.txt                     # Python 패키지 의존성
├── README.md                            # 서비스 설명서
├── POSTMAN_TEST_GUIDE.md               # API 테스트 가이드
└── ML_Service_Titanic_API.postman_collection.json  # Postman 컬렉션
```

---

## 오늘 진행한 작업

### 1. 기존 구조 문제점

**이전 구조 (문제점)**:
```
mlservice/
├── app/
│   ├── main.py
│   ├── datasets.py        # 모든 데이터셋이 한 파일에
│   ├── model.py           # Pydantic 모델만 존재
│   ├── service.py         # CRUD만 존재, ML 파이프라인 없음
│   └── titanic/
│       ├── router.py
│       ├── train.csv
│       └── test.csv
```

**문제점**:
- 데이터셋 클래스가 통합되어 있어 각 데이터셋 관리 어려움
- 머신러닝 학습 파이프라인이 없음
- 전처리, 모델링, 학습, 평가 등의 단계가 분리되지 않음
- 새로운 데이터셋 추가 시 구조가 불명확함

### 2. 새로운 구조로 개선

**개선된 구조**:
```
mlservice/
└── app/
    └── titanic/                      # 각 데이터셋은 독립 모듈
        ├── titanic_dataset.py        # 데이터 구조 및 getter/setter
        ├── titanic_model.py          # ML 모델 (RandomForest 등)
        ├── titanic_method.py         # 전처리 메서드
        ├── titanic_service.py        # ML 파이프라인 (5단계)
        ├── router.py                 # API 엔드포인트
        ├── train.csv
        └── test.csv
```

**개선 사항**:
- ✅ 각 데이터셋이 독립적인 모듈로 분리
- ✅ ML 파이프라인 5단계 구조 확립 (전처리 → 모델링 → 학습 → 평가 → 제출)
- ✅ 데이터 관리와 ML 로직 분리
- ✅ 확장 가능한 구조 (새 데이터셋 추가 용이)

### 3. 파일별 역할 재정의

| 파일명 | 역할 | 주요 내용 |
|--------|------|----------|
| `titanic_dataset.py` | 데이터 구조 정의 | - DataFrame을 담는 컨테이너 클래스<br>- 파일 경로 관리 (dname, sname)<br>- train/test 데이터 저장<br>- ID/Label 컬럼 정의 |
| `titanic_model.py` | ML 모델 정의 | - 머신러닝 알고리즘 클래스<br>- RandomForest, XGBoost 등<br>- 모델 하이퍼파라미터 설정 |
| `titanic_method.py` | 전처리 메서드 | - `new_model()`: CSV 파일 로드<br>- `create_train()`: Feature 추출<br>- `create_label()`: Label 추출 |
| `titanic_service.py` | ML 파이프라인 | - `preprocess()`: 데이터 전처리<br>- `modeling()`: 모델 생성<br>- `learning()`: 모델 학습<br>- `evaluate()`: 성능 평가<br>- `submit()`: 결과 제출 |
| `router.py` | API 엔드포인트 | - FastAPI 라우터<br>- CRUD 엔드포인트<br>- ML 실행 엔드포인트 |

---

## 주요 컴포넌트 설명

### 1. Dataset 클래스 (`titanic_dataset.py`)

데이터셋의 메타정보와 DataFrame을 관리하는 컨테이너 클래스입니다.

```python
@dataclass
class TitanicDataset(object):
    _fname: str = ''           # 파일명 (예: 'train.csv')
    _dname: str = ''           # 데이터 경로 (예: '/app/titanic/')
    _sname: str = ''           # 저장 경로 (예: '/app/results/')
    _train: pd.DataFrame = None  # 학습 데이터프레임
    _test: pd.DataFrame = None   # 테스트 데이터프레임
    _id: str = ''              # ID 컬럼명 (예: 'PassengerId')
    _label: str = ''           # 라벨 컬럼명 (예: 'Survived')
    
    # getter/setter 메서드들...
```

**사용 목적**:
- 데이터 경로 관리
- DataFrame 객체 저장
- 데이터셋 메타정보 캡슐화

### 2. Model 클래스 (`titanic_model.py`)

머신러닝 알고리즘을 담당하는 클래스입니다.

```python
class TitanicModels:
    def __init__(self) -> None:
        pass
    
    # 향후 추가될 메서드들:
    # - def random_forest_model(self, params): ...
    # - def xgboost_model(self, params): ...
    # - def neural_network_model(self, params): ...
```

**사용 목적**:
- 다양한 ML 알고리즘 정의
- 모델 하이퍼파라미터 관리
- 모델 저장/로드 기능

### 3. Method 클래스 (`titanic_method.py`)

데이터 전처리 및 가공 메서드를 제공합니다.

```python
class TitanicMethod(object):
    def new_model(self):
        # train.csv 파일을 읽어와서 DataFrame 생성
        pass
    
    def create_train(self):
        # Feature 데이터 생성 (Survived 제외)
        pass
    
    def create_label(self):
        # Label 데이터 생성 (Survived만 추출)
        pass
```

**사용 목적**:
- CSV 파일 로드
- Feature/Label 분리
- 데이터 클렌징 및 변환

### 4. Service 클래스 (`titanic_service.py`)

머신러닝 파이프라인의 핵심 클래스입니다.

```python
class TitanicService:
    def preprocess(self):
        # 데이터 전처리 (결측치 처리, 인코딩 등)
        ic("😊😊 전처리 시작")
        ic("😊😊 전처리 완료")
    
    def modeling(self):
        # 모델 생성 및 설정
        ic("😊😊 모델링 시작")
        ic("😊😊 모델링 완료")
    
    def learning(self):
        # 모델 학습
        ic("😊😊 학습 시작")
        ic("😊😊 학습 완료")
    
    def evaluate(self):
        # 모델 평가 (정확도, F1-Score 등)
        ic("😊😊 평가 시작")
        ic("😊😊 평가 완료")
    
    def submit(self):
        # 결과 제출 (CSV 파일 생성 등)
        ic("😊😊 제출 시작")
        ic("😊😊 제출 완료")
```

**사용 목적**:
- ML 파이프라인 5단계 실행
- 단계별 독립 실행 가능
- 로깅 및 모니터링

### 5. Router (`router.py`)

FastAPI 엔드포인트를 정의합니다.

```python
router = APIRouter(prefix="/titanic", tags=["titanic"])

# CRUD 엔드포인트
@router.get("/passengers")
async def get_all_passengers(): ...

# ML 실행 엔드포인트 (향후 추가)
@router.post("/ml/preprocess")
async def run_preprocess(): ...

@router.post("/ml/train")
async def run_training(): ...

@router.get("/ml/evaluate")
async def get_evaluation(): ...
```

---

## 새로운 CSV 데이터 연동 워크플로우

### 전체 흐름도

```
┌─────────────────────────────────────────────────────────────────┐
│                    1. 데이터 준비 단계                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
    ┌─────────────────────────────────────────────┐
    │  CSV 파일 준비                                │
    │  - train.csv (학습 데이터)                    │
    │  - test.csv (테스트 데이터)                   │
    └─────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  2. 프로젝트 구조 생성                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
    ┌─────────────────────────────────────────────┐
    │  mlservice/app/{dataset_name}/ 폴더 생성     │
    │  ├── {dataset}_dataset.py                   │
    │  ├── {dataset}_model.py                     │
    │  ├── {dataset}_method.py                    │
    │  ├── {dataset}_service.py                   │
    │  ├── router.py                              │
    │  ├── train.csv                              │
    │  └── test.csv                               │
    └─────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  3. 클래스 구현 단계                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
    ┌──────────────────────┐  ┌──────────────────────┐
    │  Dataset 클래스 구현   │  │  Method 클래스 구현    │
    │  - 파일 경로 설정      │  │  - CSV 로드 구현      │
    │  - DataFrame 저장     │  │  - Feature 분리       │
    │  - ID/Label 정의      │  │  - Label 분리         │
    └──────────────────────┘  └──────────────────────┘
                              ↓
    ┌──────────────────────┐  ┌──────────────────────┐
    │  Model 클래스 구현     │  │  Service 클래스 구현   │
    │  - ML 알고리즘 선택    │  │  - 전처리 로직        │
    │  - 하이퍼파라미터 설정 │  │  - 학습 로직         │
    └──────────────────────┘  │  - 평가 로직         │
                              │  - 제출 로직         │
                              └──────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  4. API 엔드포인트 구현                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
    ┌─────────────────────────────────────────────┐
    │  router.py 구현                              │
    │  - CRUD 엔드포인트                           │
    │  - ML 실행 엔드포인트                        │
    │  - 통계/분석 엔드포인트                       │
    └─────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  5. main.py에 라우터 등록                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
    ┌─────────────────────────────────────────────┐
    │  app.include_router(                         │
    │      {dataset}_router,                       │
    │      prefix="",                              │
    │      tags=["{dataset}"]                      │
    │  )                                           │
    └─────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  6. 테스트 및 배포                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
    ┌──────────────────────┐  ┌──────────────────────┐
    │  Postman 테스트       │  │  Docker 빌드         │
    │  - API 동작 확인      │  │  - docker compose up │
    │  - ML 파이프라인 검증 │  │  - 컨테이너 실행     │
    └──────────────────────┘  └──────────────────────┘
```

### 상세 단계별 가이드

#### Step 1: 데이터 준비

```bash
# 1. CSV 파일 준비
# - train.csv: 학습용 데이터 (라벨 포함)
# - test.csv: 테스트용 데이터 (라벨 제외 또는 예측 대상)

# 2. 데이터 탐색
# - 컬럼 확인
# - 결측치 확인
# - 데이터 타입 확인
# - ID 컬럼과 Label 컬럼 식별
```

#### Step 2: 프로젝트 구조 생성

```bash
# 예시: housing(주택 가격 예측) 데이터셋 추가

cd mlservice/app
mkdir housing
cd housing

# 파일 생성
touch housing_dataset.py
touch housing_model.py
touch housing_method.py
touch housing_service.py
touch router.py
touch __init__.py

# CSV 파일 복사
cp /path/to/housing_train.csv ./train.csv
cp /path/to/housing_test.csv ./test.csv
```

#### Step 3: Dataset 클래스 구현

```python
# housing_dataset.py

from dataclasses import dataclass
import pandas as pd

@dataclass
class HousingDataset(object):
    _fname: str = ''  # file name
    _dname: str = ''  # data path
    _sname: str = ''  # save path
    _train: pd.DataFrame = None
    _test: pd.DataFrame = None
    _id: str = 'Id'  # 데이터셋의 ID 컬럼명
    _label: str = 'SalePrice'  # 데이터셋의 라벨 컬럼명
    
    @property
    def fname(self) -> str:
        return self._fname
    
    @fname.setter
    def fname(self, fname):
        self._fname = fname
    
    # ... (나머지 getter/setter 메서드들)
```

#### Step 4: Method 클래스 구현

```python
# housing_method.py

import pandas as pd
import os
from pathlib import Path

class HousingMethod(object):
    def __init__(self, dataset):
        self.dataset = dataset
    
    def new_model(self):
        """CSV 파일을 읽어와서 DataFrame 생성"""
        train_path = Path(__file__).parent / "train.csv"
        test_path = Path(__file__).parent / "test.csv"
        
        self.dataset.train = pd.read_csv(train_path)
        self.dataset.test = pd.read_csv(test_path)
        
        return self.dataset
    
    def create_train(self):
        """Feature 데이터 생성 (라벨 제외)"""
        if self.dataset.train is None:
            raise ValueError("Train data not loaded")
        
        # 라벨 컬럼 제외
        X_train = self.dataset.train.drop(
            columns=[self.dataset.label]
        )
        return X_train
    
    def create_label(self):
        """Label 데이터 생성"""
        if self.dataset.train is None:
            raise ValueError("Train data not loaded")
        
        # 라벨 컬럼만 추출
        y_train = self.dataset.train[self.dataset.label]
        return y_train
```

#### Step 5: Service 클래스 구현

```python
# housing_service.py

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score
from icecream import ic

class HousingService:
    def __init__(self):
        self.dataset = None
        self.method = None
        self.model = None
        self.X_train = None
        self.y_train = None
        self.predictions = None
    
    def preprocess(self):
        """데이터 전처리"""
        ic("😊😊 전처리 시작")
        
        # 1. 결측치 처리
        # 2. 카테고리 인코딩
        # 3. 피처 스케일링
        # 4. 피처 엔지니어링
        
        ic("😊😊 전처리 완료")
        return self
    
    def modeling(self):
        """모델 생성"""
        ic("😊😊 모델링 시작")
        
        # RandomForest Regressor 생성
        self.model = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            random_state=42
        )
        
        ic("😊😊 모델링 완료")
        return self
    
    def learning(self):
        """모델 학습"""
        ic("😊😊 학습 시작")
        
        if self.model is None:
            raise ValueError("Model not created")
        
        # 모델 학습
        self.model.fit(self.X_train, self.y_train)
        
        ic("😊😊 학습 완료")
        return self
    
    def evaluate(self):
        """모델 평가"""
        ic("😊😊 평가 시작")
        
        # 예측
        predictions = self.model.predict(self.X_train)
        
        # 평가 지표 계산
        mse = mean_squared_error(self.y_train, predictions)
        r2 = r2_score(self.y_train, predictions)
        
        ic(f"MSE: {mse}")
        ic(f"R2 Score: {r2}")
        
        ic("😊😊 평가 완료")
        return {"mse": mse, "r2": r2}
    
    def submit(self):
        """결과 제출 (CSV 생성)"""
        ic("😊😊 제출 시작")
        
        # 테스트 데이터 예측
        test_predictions = self.model.predict(self.X_test)
        
        # 제출 파일 생성
        submission = pd.DataFrame({
            self.dataset.id: self.dataset.test[self.dataset.id],
            self.dataset.label: test_predictions
        })
        
        # CSV 저장
        submission.to_csv("submission.csv", index=False)
        
        ic("😊😊 제출 완료")
        return submission
```

#### Step 6: Router 구현

```python
# router.py

from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from app.housing.housing_dataset import HousingDataset
from app.housing.housing_method import HousingMethod
from app.housing.housing_service import HousingService

router = APIRouter(prefix="/housing", tags=["housing"])

# ML 파이프라인 실행 엔드포인트
@router.post("/ml/preprocess")
async def run_preprocess():
    """데이터 전처리 실행"""
    try:
        service = HousingService()
        service.preprocess()
        return {"status": "success", "message": "전처리 완료"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ml/train")
async def run_training():
    """모델 학습 실행"""
    try:
        service = HousingService()
        service.preprocess()
        service.modeling()
        service.learning()
        return {"status": "success", "message": "학습 완료"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/ml/evaluate")
async def get_evaluation():
    """모델 평가 결과 조회"""
    try:
        service = HousingService()
        # ... (전체 파이프라인 실행)
        results = service.evaluate()
        return {"status": "success", "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ml/submit")
async def create_submission():
    """제출 파일 생성"""
    try:
        service = HousingService()
        # ... (전체 파이프라인 실행)
        submission = service.submit()
        return {
            "status": "success", 
            "message": "제출 파일 생성 완료",
            "rows": len(submission)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 데이터 조회 엔드포인트
@router.get("/data/info")
async def get_data_info():
    """데이터셋 정보 조회"""
    dataset = HousingDataset()
    method = HousingMethod(dataset)
    method.new_model()
    
    return {
        "train_shape": dataset.train.shape,
        "test_shape": dataset.test.shape,
        "columns": list(dataset.train.columns),
        "id_column": dataset.id,
        "label_column": dataset.label
    }

@router.get("/data/stats")
async def get_data_stats():
    """데이터 통계 정보"""
    dataset = HousingDataset()
    method = HousingMethod(dataset)
    method.new_model()
    
    return {
        "describe": dataset.train.describe().to_dict(),
        "missing_values": dataset.train.isnull().sum().to_dict()
    }
```

#### Step 7: main.py에 라우터 등록

```python
# app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# 기존 라우터
from app.titanic.router import router as titanic_router

# 새로운 라우터 추가
from app.housing.router import router as housing_router

app = FastAPI(
    title="ML Service",
    description="머신러닝 통합 서비스",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 타이타닉 라우터 등록
app.include_router(
    titanic_router,
    prefix="",
    tags=["titanic"]
)

# 주택 가격 예측 라우터 등록
app.include_router(
    housing_router,
    prefix="",
    tags=["housing"]
)

@app.get("/")
async def root():
    return {
        "service": "ML Service",
        "status": "running",
        "endpoints": {
            "titanic": "/titanic",
            "housing": "/housing",  # 새로 추가
            "docs": "/docs"
        }
    }
```

#### Step 8: 테스트

```bash
# 1. Docker 빌드 및 실행
cd mlservice
docker compose up -d --build

# 2. API 동작 확인
curl http://localhost:9006/

# 3. Swagger UI 확인
# http://localhost:9006/docs

# 4. 데이터 정보 확인
curl http://localhost:9006/housing/data/info

# 5. ML 파이프라인 실행
curl -X POST http://localhost:9006/housing/ml/preprocess
curl -X POST http://localhost:9006/housing/ml/train
curl http://localhost:9006/housing/ml/evaluate
curl -X POST http://localhost:9006/housing/ml/submit
```

---

## 머신러닝 파이프라인 구조

### 5단계 파이프라인

```
┌─────────────────────────────────────────────────────────────────┐
│                     ML Pipeline 5 Stages                        │
└─────────────────────────────────────────────────────────────────┘

1. Preprocess (전처리)
   ├── 데이터 로드
   ├── 결측치 처리
   ├── 이상치 제거
   ├── 피처 스케일링
   └── 피처 엔지니어링
          ↓
2. Modeling (모델링)
   ├── 알고리즘 선택
   ├── 하이퍼파라미터 설정
   ├── 교차 검증 설정
   └── 앙상블 구성
          ↓
3. Learning (학습)
   ├── 모델 학습
   ├── 파라미터 최적화
   ├── 학습 곡선 모니터링
   └── 중간 체크포인트 저장
          ↓
4. Evaluate (평가)
   ├── 예측 수행
   ├── 평가 지표 계산
   │   ├── 회귀: MSE, RMSE, R2, MAE
   │   └── 분류: Accuracy, Precision, Recall, F1, AUC
   ├── 혼동 행렬 생성
   └── 피처 중요도 분석
          ↓
5. Submit (제출)
   ├── 테스트 데이터 예측
   ├── 제출 파일 생성
   ├── 결과 검증
   └── CSV 파일 저장
```

### 각 단계별 구현 가이드

#### 1. Preprocess (전처리)

```python
def preprocess(self):
    ic("😊😊 전처리 시작")
    
    # 1. 결측치 처리
    self.handle_missing_values()
    
    # 2. 카테고리 인코딩
    self.encode_categorical_features()
    
    # 3. 수치형 피처 스케일링
    self.scale_numerical_features()
    
    # 4. 피처 엔지니어링
    self.engineer_features()
    
    ic("😊😊 전처리 완료")
    return self

def handle_missing_values(self):
    """결측치 처리"""
    # 수치형: 중앙값으로 채우기
    numeric_cols = self.X_train.select_dtypes(include=['int64', 'float64']).columns
    self.X_train[numeric_cols] = self.X_train[numeric_cols].fillna(
        self.X_train[numeric_cols].median()
    )
    
    # 카테고리형: 최빈값으로 채우기
    categorical_cols = self.X_train.select_dtypes(include=['object']).columns
    self.X_train[categorical_cols] = self.X_train[categorical_cols].fillna(
        self.X_train[categorical_cols].mode().iloc[0]
    )

def encode_categorical_features(self):
    """카테고리 인코딩"""
    from sklearn.preprocessing import LabelEncoder
    
    categorical_cols = self.X_train.select_dtypes(include=['object']).columns
    
    for col in categorical_cols:
        le = LabelEncoder()
        self.X_train[col] = le.fit_transform(self.X_train[col].astype(str))

def scale_numerical_features(self):
    """수치형 피처 스케일링"""
    from sklearn.preprocessing import StandardScaler
    
    numeric_cols = self.X_train.select_dtypes(include=['int64', 'float64']).columns
    
    scaler = StandardScaler()
    self.X_train[numeric_cols] = scaler.fit_transform(self.X_train[numeric_cols])

def engineer_features(self):
    """피처 엔지니어링"""
    # 예: 가족 크기 = SibSp + Parch + 1
    if 'SibSp' in self.X_train.columns and 'Parch' in self.X_train.columns:
        self.X_train['FamilySize'] = (
            self.X_train['SibSp'] + self.X_train['Parch'] + 1
        )
```

#### 2. Modeling (모델링)

```python
def modeling(self):
    ic("😊😊 모델링 시작")
    
    # 1. 단일 모델
    self.create_single_model()
    
    # 또는 2. 앙상블 모델
    # self.create_ensemble_model()
    
    ic("😊😊 모델링 완료")
    return self

def create_single_model(self):
    """단일 모델 생성"""
    from sklearn.ensemble import RandomForestClassifier
    
    self.model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42
    )

def create_ensemble_model(self):
    """앙상블 모델 생성"""
    from sklearn.ensemble import VotingClassifier
    from sklearn.linear_model import LogisticRegression
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.svm import SVC
    
    # 여러 모델 생성
    lr = LogisticRegression(random_state=42)
    rf = RandomForestClassifier(n_estimators=100, random_state=42)
    svc = SVC(probability=True, random_state=42)
    
    # 투표 앙상블
    self.model = VotingClassifier(
        estimators=[('lr', lr), ('rf', rf), ('svc', svc)],
        voting='soft'
    )
```

#### 3. Learning (학습)

```python
def learning(self):
    ic("😊😊 학습 시작")
    
    if self.model is None:
        raise ValueError("Model not created")
    
    # 1. 모델 학습
    self.model.fit(self.X_train, self.y_train)
    
    # 2. 학습 정보 기록
    self.log_training_info()
    
    ic("😊😊 학습 완료")
    return self

def log_training_info(self):
    """학습 정보 로깅"""
    ic(f"Model: {type(self.model).__name__}")
    ic(f"Train samples: {len(self.X_train)}")
    
    # RandomForest의 경우 피처 중요도 기록
    if hasattr(self.model, 'feature_importances_'):
        importances = self.model.feature_importances_
        feature_names = self.X_train.columns
        
        feature_importance = pd.DataFrame({
            'feature': feature_names,
            'importance': importances
        }).sort_values('importance', ascending=False)
        
        ic(feature_importance.head(10))
```

#### 4. Evaluate (평가)

```python
def evaluate(self):
    ic("😊😊 평가 시작")
    
    # 1. 예측 수행
    predictions = self.model.predict(self.X_train)
    
    # 2. 평가 지표 계산
    metrics = self.calculate_metrics(self.y_train, predictions)
    
    # 3. 혼동 행렬 (분류 문제)
    self.plot_confusion_matrix(self.y_train, predictions)
    
    ic("😊😊 평가 완료")
    return metrics

def calculate_metrics(self, y_true, y_pred):
    """평가 지표 계산"""
    from sklearn.metrics import (
        accuracy_score, precision_score, recall_score, 
        f1_score, classification_report
    )
    
    metrics = {
        "accuracy": accuracy_score(y_true, y_pred),
        "precision": precision_score(y_true, y_pred, average='weighted'),
        "recall": recall_score(y_true, y_pred, average='weighted'),
        "f1_score": f1_score(y_true, y_pred, average='weighted')
    }
    
    ic(metrics)
    
    # 상세 리포트
    report = classification_report(y_true, y_pred)
    ic(report)
    
    return metrics

def plot_confusion_matrix(self, y_true, y_pred):
    """혼동 행렬 시각화"""
    from sklearn.metrics import confusion_matrix
    import matplotlib.pyplot as plt
    import seaborn as sns
    
    cm = confusion_matrix(y_true, y_pred)
    
    plt.figure(figsize=(8, 6))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues')
    plt.title('Confusion Matrix')
    plt.ylabel('True Label')
    plt.xlabel('Predicted Label')
    plt.savefig('confusion_matrix.png')
    
    ic("Confusion matrix saved to confusion_matrix.png")
```

#### 5. Submit (제출)

```python
def submit(self):
    ic("😊😊 제출 시작")
    
    # 1. 테스트 데이터 전처리 (학습 데이터와 동일하게)
    X_test = self.preprocess_test_data()
    
    # 2. 예측 수행
    predictions = self.model.predict(X_test)
    
    # 3. 제출 파일 생성
    submission = self.create_submission_file(predictions)
    
    # 4. 검증
    self.validate_submission(submission)
    
    # 5. 저장
    submission.to_csv("submission.csv", index=False)
    
    ic("😊😊 제출 완료")
    return submission

def preprocess_test_data(self):
    """테스트 데이터 전처리"""
    # 학습 데이터와 동일한 전처리 적용
    X_test = self.dataset.test.copy()
    
    # ID 컬럼 제거
    if self.dataset.id in X_test.columns:
        X_test = X_test.drop(columns=[self.dataset.id])
    
    # 동일한 전처리 파이프라인 적용
    # ... (결측치, 인코딩, 스케일링 등)
    
    return X_test

def create_submission_file(self, predictions):
    """제출 파일 생성"""
    submission = pd.DataFrame({
        self.dataset.id: self.dataset.test[self.dataset.id],
        self.dataset.label: predictions
    })
    
    return submission

def validate_submission(self, submission):
    """제출 파일 검증"""
    ic(f"Submission shape: {submission.shape}")
    ic(f"Columns: {list(submission.columns)}")
    ic(f"First 5 rows:\n{submission.head()}")
    
    # 결측치 확인
    if submission.isnull().any().any():
        ic("Warning: Submission contains null values!")
    
    # ID 중복 확인
    if submission[self.dataset.id].duplicated().any():
        ic("Warning: Submission contains duplicate IDs!")
```

---

## API 엔드포인트 설계 가이드

### 엔드포인트 네이밍 규칙

```
/{dataset_name}/           # 데이터셋 루트
├── /data/                 # 데이터 관련
│   ├── /info              # 데이터 정보
│   ├── /stats             # 통계 정보
│   └── /sample            # 샘플 데이터
│
├── /ml/                   # ML 파이프라인
│   ├── /preprocess        # 전처리 실행
│   ├── /train             # 학습 실행
│   ├── /evaluate          # 평가 조회
│   ├── /submit            # 제출 파일 생성
│   └── /pipeline          # 전체 파이프라인 실행
│
└── /model/                # 모델 관리
    ├── /save              # 모델 저장
    ├── /load              # 모델 로드
    └── /list              # 모델 목록
```

### 엔드포인트 구현 템플릿

```python
# router.py

from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, Optional

router = APIRouter(prefix="/{dataset_name}", tags=["{dataset_name}"])

# ==================== 데이터 관련 ====================

@router.get("/data/info")
async def get_data_info():
    """데이터셋 기본 정보"""
    return {
        "train_shape": (rows, cols),
        "test_shape": (rows, cols),
        "columns": ["col1", "col2", ...],
        "id_column": "Id",
        "label_column": "Label"
    }

@router.get("/data/stats")
async def get_data_stats():
    """데이터 통계 정보"""
    return {
        "describe": {...},
        "missing_values": {...},
        "data_types": {...}
    }

@router.get("/data/sample")
async def get_data_sample(n: int = Query(5, ge=1, le=100)):
    """샘플 데이터 조회"""
    return {
        "train_sample": [...],
        "test_sample": [...]
    }

# ==================== ML 파이프라인 ====================

@router.post("/ml/preprocess")
async def run_preprocess():
    """전처리 실행"""
    return {"status": "success", "message": "전처리 완료"}

@router.post("/ml/train")
async def run_training(
    model_type: str = Query("random_forest"),
    params: Optional[Dict[str, Any]] = None
):
    """모델 학습 실행"""
    return {
        "status": "success",
        "message": "학습 완료",
        "model_type": model_type,
        "training_time": 123.45
    }

@router.get("/ml/evaluate")
async def get_evaluation():
    """평가 결과 조회"""
    return {
        "status": "success",
        "metrics": {
            "accuracy": 0.85,
            "precision": 0.83,
            "recall": 0.87,
            "f1_score": 0.85
        }
    }

@router.post("/ml/submit")
async def create_submission():
    """제출 파일 생성"""
    return {
        "status": "success",
        "message": "제출 파일 생성 완료",
        "file_path": "submission.csv",
        "rows": 418
    }

@router.post("/ml/pipeline")
async def run_full_pipeline(
    model_type: str = Query("random_forest"),
    save_model: bool = Query(True)
):
    """전체 파이프라인 실행 (전처리 → 학습 → 평가 → 제출)"""
    return {
        "status": "success",
        "steps": {
            "preprocess": "completed",
            "modeling": "completed",
            "learning": "completed",
            "evaluate": "completed",
            "submit": "completed"
        },
        "metrics": {...},
        "submission_file": "submission.csv"
    }

# ==================== 모델 관리 ====================

@router.post("/model/save")
async def save_model(model_name: str = Query(...)):
    """모델 저장"""
    return {
        "status": "success",
        "message": f"모델 '{model_name}' 저장 완료",
        "file_path": f"models/{model_name}.pkl"
    }

@router.post("/model/load")
async def load_model(model_name: str = Query(...)):
    """모델 로드"""
    return {
        "status": "success",
        "message": f"모델 '{model_name}' 로드 완료",
        "model_info": {...}
    }

@router.get("/model/list")
async def list_models():
    """저장된 모델 목록"""
    return {
        "models": [
            {"name": "model1", "created_at": "2024-12-05", "size": "1.2MB"},
            {"name": "model2", "created_at": "2024-12-04", "size": "2.5MB"}
        ]
    }
```

---

## 요약

### 핵심 포인트

1. **모듈화된 구조**: 각 데이터셋은 독립적인 모듈로 관리
2. **일관된 파일 구조**: Dataset, Model, Method, Service, Router
3. **5단계 ML 파이프라인**: Preprocess → Modeling → Learning → Evaluate → Submit
4. **확장 가능성**: 새 데이터셋 추가 시 기존 구조 복사 후 수정
5. **API 우선 설계**: FastAPI를 통한 RESTful API 제공

### 다음 단계

- [ ] 추가 데이터셋 구현 (Culture, Housing 등)
- [ ] 공통 유틸리티 클래스 개발
- [ ] 모델 버전 관리 시스템 구축
- [ ] 실시간 학습 모니터링 추가
- [ ] AutoML 기능 통합

---

## 참고 자료

- [FastAPI 공식 문서](https://fastapi.tiangolo.com/)
- [Scikit-learn 문서](https://scikit-learn.org/)
- [Pandas 문서](https://pandas.pydata.org/)
- [Docker Compose 문서](https://docs.docker.com/compose/)

---

**작성일**: 2024-12-05  
**버전**: 1.0.0  
**작성자**: ML Service Team

