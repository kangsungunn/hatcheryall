# 타이타닉 ML 파이프라인 구현 - 2025.12.09

## 📋 목차
1. [오늘의 학습 목표](#오늘의-학습-목표)
2. [전체 작업 흐름](#전체-작업-흐름)
3. [1단계: 전처리 메서드 구조 개선](#1단계-전처리-메서드-구조-개선)
4. [2단계: 모델링 파이프라인 구현](#2단계-모델링-파이프라인-구현)
5. [3단계: Docker 환경 설정](#3단계-docker-환경-설정)
6. [4단계: 캐글 제출 기능 추가](#4단계-캐글-제출-기능-추가)
7. [발생한 에러와 해결 과정](#발생한-에러와-해결-과정)
8. [최종 코드 구조](#최종-코드-구조)
9. [오늘의 학습 포인트](#오늘의-학습-포인트)
10. [다음 단계 계획](#다음-단계-계획)

---

## 오늘의 학습 목표

✅ **전처리 완료**: train.csv와 test.csv의 일관된 전처리 파이프라인 구축  
✅ **모델링**: 5개 알고리즘(로지스틱 회귀, 나이브베이즈, 랜덤 포레스트, SVM, LightGBM) 구현  
✅ **학습 및 평가**: 모델 학습 및 검증 정확도 측정  
✅ **캐글 제출**: 최고 성능 모델로 test 데이터 예측 후 CSV 생성  
✅ **Docker 환경**: 볼륨 마운트를 통한 모델/결과 파일 영구 저장  

---

## 전체 작업 흐름

```
┌─────────────────────────────────────────────────────────┐
│                    오늘의 작업 순서                        │
└─────────────────────────────────────────────────────────┘
                            ↓
        ┌───────────────────────────────────────┐
        │  1. 전처리 메서드 구조 개선             │
        │  - this 객체로 통일                    │
        │  - train/test 일관성 유지              │
        └───────────────────────────────────────┘
                            ↓
        ┌───────────────────────────────────────┐
        │  2. 모델링 파이프라인 구현              │
        │  - modeling(): 5개 알고리즘 생성        │
        │  - learning(): 모델 학습               │
        │  - evaluate(): 모델 평가               │
        └───────────────────────────────────────┘
                            ↓
        ┌───────────────────────────────────────┐
        │  3. SVM 모델 선택                      │
        │  - 초기 정확도: 79.33%                 │
        │  - 나머지 모델 제거 (학습 후 보류)      │
        └───────────────────────────────────────┘
                            ↓
        ┌───────────────────────────────────────┐
        │  4. Docker 환경 설정                   │
        │  - 볼륨 마운트 추가                     │
        │  - models & download 디렉토리          │
        └───────────────────────────────────────┘
                            ↓
        ┌───────────────────────────────────────┐
        │  5. 캐글 제출 CSV 생성                  │
        │  - generate_submission_csv() 구현       │
        │  - 자동 타임스탬프 파일명               │
        └───────────────────────────────────────┘
```

---

## 1단계: 전처리 메서드 구조 개선

### 문제 상황
기존 `titanic_method.py`의 전처리 메서드들이 `train_df`, `test_df`를 개별 인자로 받는 구조였으나, `titanic_service.py`에서는 `this` 객체를 전달하고 있어 **시그니처 불일치** 발생.

### 해결 방법
모든 전처리 메서드를 `this` 객체를 받도록 통일.

#### Before (기존 구조)
```python
def pclass_ordinal(self, train_df: DataFrame, test_df: DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame]:
    train_df = train_df.copy()
    test_df = test_df.copy()
    # ... 처리
    return train_df, test_df
```

#### After (개선된 구조)
```python
def pclass_ordinal(self, this) -> object:
    for df in [this.train, this.test]:
        df['Pclass'] = df['Pclass'].astype(int)
    
    logger.debug('✓ Pclass 전처리 완료: 정수형 변환')
    return this
```

### 수정된 메서드 목록
1. `pclass_ordinal(this)` - 객실 등급 처리
2. `fare_ordinal(this)` - 요금 구간화
3. `embarked_ordinal(this)` - 승선 항구 라벨 인코딩
4. `gender_nominal(this)` - 성별 이진 인코딩
5. `age_ratio(this)` - 나이 구간화
6. `title_nominal(this)` - 타이틀 추출 및 인코딩

### 핵심 개선 사항
- ✅ `this.train`, `this.test`를 직접 수정하여 일관성 유지
- ✅ train 데이터 기준으로 bins, 최빈값, 매핑 계산 후 test에 동일 적용
- ✅ 반환 타입을 `this` 객체로 통일하여 체이닝 가능

---

## 2단계: 모델링 파이프라인 구현

### 전체 파이프라인 구조

```python
class TitanicService:
    def __init__(self):
        self.processed_data = None  # 전처리된 데이터 저장
        self.train_label = None  # 원본 train의 Survived 라벨
        self.models = {}  # 학습된 모델 저장
```

### 2.1. preprocess() - 전처리 실행

**주요 작업**:
1. train.csv, test.csv 읽기
2. Survived 라벨 분리 및 저장 (`self.train_label`)
3. 전처리 파이프라인 실행
4. `this` 객체에 전처리 결과 저장 (`self.processed_data`)

**전처리 순서**:
```python
drop_features(['SibSp', 'Parch', 'Ticket', 'Cabin'])
    ↓
pclass_ordinal()  # Pclass 정수형 변환
    ↓
fare_ordinal()  # Fare 4구간으로 binning
    ↓
embarked_ordinal()  # Embarked → Embarked_encoded (0,1,2)
    ↓
gender_nominal()  # Sex/gender → Gender_encoded (0,1)
    ↓
age_ratio()  # Age → Age_encoded (0~7 구간)
    ↓
title_nominal()  # Name → Title_encoded (1~6)
    ↓
drop_features(['Name'])
```

**결과**:
- Train: 891행 × 7열 (결측치: 0개)
- Test: 418행 × 7열 (결측치: 0개)
- 최종 컬럼: `PassengerId`, `Pclass`, `Fare`, `Embarked_encoded`, `Gender_encoded`, `Age_encoded`, `Title_encoded`

---

### 2.2. modeling() - 모델 생성

**초기 구현 (5개 알고리즘)**:
```python
def modeling(self):
    from sklearn.linear_model import LogisticRegression
    from sklearn.naive_bayes import GaussianNB
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.svm import SVC
    import lightgbm as lgb
    
    self.models = {
        '로지스틱 회귀': LogisticRegression(random_state=42, max_iter=1000),
        '나이브베이즈': GaussianNB(),
        '랜덤 포레스트': RandomForestClassifier(n_estimators=100, random_state=42),
        'SVM': SVC(random_state=42, probability=True),
        'LightGBM': lgb.LGBMClassifier(random_state=42, verbose=-1)
    }
```

**최종 구현 (SVM만 선택)**:
```python
def modeling(self):
    from sklearn.svm import SVC
    
    self.models = {
        'SVM': SVC(random_state=42, probability=True)
    }
```

**선택 이유**:
- 초기 평가에서 SVM이 79.33%로 가장 높은 정확도
- 학습 단계에서 단일 모델로 집중

**❗ 중요한 학습 포인트**:
> 실제 ML 프로젝트에서는 초기 정확도만으로 모델을 선택하지 않습니다!
> - 하이퍼파라미터 튜닝
> - 교차 검증 (K-Fold CV)
> - 앙상블 기법 (Voting, Stacking)
> - 과적합 체크
> 
> 여러 모델을 유지하면서 충분한 실험 후 최종 결정하는 것이 베스트 프랙티스입니다.

---

### 2.3. learning() - 모델 학습

```python
def learning(self):
    if self.processed_data is None or self.train_label is None:
        logger.error("전처리된 데이터가 없습니다.")
        return None
    
    X_train = self.processed_data.train
    y_train = self.train_label
    
    # PassengerId 제거 (학습에 불필요)
    if 'PassengerId' in X_train.columns:
        X_train = X_train.drop(columns=['PassengerId'])
    
    # 모델 학습
    for name, model in self.models.items():
        logger.debug(f"학습 중: {name}")
        model.fit(X_train, y_train)
    
    logger.info(f"✅ 모델 학습 완료: {len(self.models)}개 모델")
```

**핵심**:
- 전체 train 데이터로 학습
- PassengerId는 제거하여 학습에 영향 없도록 처리

---

### 2.4. evaluate() - 모델 평가

```python
def evaluate(self):
    from sklearn.model_selection import train_test_split
    
    X = self.processed_data.train
    y = self.train_label
    
    # PassengerId 제거
    if 'PassengerId' in X.columns:
        X = X.drop(columns=['PassengerId'])
    
    # Train/Validation 분리 (80/20)
    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    results = {}
    best_model_name = None
    best_model = None
    best_accuracy = 0
    
    # 각 모델 평가
    for name, model in self.models.items():
        model.fit(X_train, y_train)
        accuracy = model.score(X_val, y_val)
        results[name] = accuracy
        
        logger.info(f"{name} 활용한 검증 정확도 {accuracy:.4f} ({accuracy*100:.2f}%)")
        
        if accuracy > best_accuracy:
            best_accuracy = accuracy
            best_model_name = name
            best_model = model
    
    # 최고 모델로 test 데이터 예측 및 CSV 저장
    submission_path = self.generate_submission_csv(best_model, best_model_name)
    
    return {
        "status": "success",
        "results": results,
        "best_model": best_model_name,
        "best_accuracy": best_accuracy,
        "submission_file": submission_path
    }
```

**평가 결과 (초기 5개 모델)**:
| 모델 | 검증 정확도 |
|-----|-----------|
| 로지스틱 회귀 | 76.54% |
| 나이브베이즈 | 75.42% |
| 랜덤 포레스트 | 77.65% |
| **SVM** | **79.33%** ⭐ |
| LightGBM | (미설치) |

---

## 3단계: Docker 환경 설정

### 3.1. 볼륨 마운트 설정

**목적**: 모델 파일과 제출 CSV 파일을 호스트에 영구 저장

#### docker-compose.yaml 수정

**프로젝트 루트 (`docker-compose.yaml`)**:
```yaml
mlservice:
  build:
    context: ./ai.kroaddy.site
    dockerfile: services/mlservice/Dockerfile
  ports:
    - "9006:9006"
  container_name: mlservice
  restart: unless-stopped
  volumes:
    - ./ai.kroaddy.site/services/mlservice/app/titanic/models:/app/app/titanic/models
  networks:
    - kroaddy-network
```

**ai.kroaddy.site/docker-compose.yaml**:
```yaml
mlservice:
  build:
    context: .
    dockerfile: ./services/mlservice/Dockerfile
  ports:
    - "9006:9006"
  container_name: mlservice
  restart: unless-stopped
  volumes:
    - ./services/mlservice/app/titanic/models:/app/app/titanic/models
```

### 3.2. 디렉토리 구조

```
app/titanic/
├── models/          # 학습된 모델 저장 (볼륨 마운트)
├── download/        # 캐글 제출 CSV 저장
├── titanic_dataset.py
├── titanic_method.py
├── titanic_model.py
├── titanic_router.py
└── titanic_service.py
```

---

## 4단계: 캐글 제출 기능 추가

### generate_submission_csv() 구현

```python
def generate_submission_csv(self, model, model_name: str) -> str:
    """최고 모델로 test 데이터 예측하여 캐글 제출용 CSV 생성"""
    
    logger.info(f"▶ {model_name} 모델로 test 데이터 예측 시작")
    
    # 1. 전체 train 데이터로 최종 학습
    X_train = self.processed_data.train
    y_train = self.train_label
    
    if 'PassengerId' in X_train.columns:
        X_train = X_train.drop(columns=['PassengerId'])
    
    model.fit(X_train, y_train)
    
    # 2. Test 데이터 예측
    X_test = self.processed_data.test.copy()
    test_passenger_ids = X_test['PassengerId'].copy()
    
    if 'PassengerId' in X_test.columns:
        X_test = X_test.drop(columns=['PassengerId'])
    
    predictions = model.predict(X_test)
    
    # 3. CSV 저장
    download_dir = Path(__file__).parent / 'download'
    download_dir.mkdir(exist_ok=True)
    
    from datetime import datetime
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"submission_{model_name}_{timestamp}.csv"
    filepath = download_dir / filename
    
    submission_df = pd.DataFrame({
        'PassengerId': test_passenger_ids,
        'Survived': predictions
    })
    
    submission_df.to_csv(filepath, index=False)
    
    logger.info(f"✅ 제출 파일 생성 완료: {filepath}")
    logger.info(f"   예측 개수: {len(predictions)}개")
    logger.info(f"   생존 예측: {predictions.sum()}명, 사망 예측: {len(predictions) - predictions.sum()}명")
    
    return str(filepath)
```

### CSV 파일 형식

```csv
PassengerId,Survived
892,0
893,1
894,0
895,0
...
```

### 파일 저장 위치
```
ai.kroaddy.site/services/mlservice/app/titanic/download/
└── submission_SVM_20251209_153045.csv
```

---

## 발생한 에러와 해결 과정

### 에러 1: 메서드 시그니처 불일치

**에러 메시지**:
```
TypeError: TitanicMethod.pclass_ordinal() missing 1 required positional argument: 'test_df'
```

**원인**:
- `titanic_method.py`: `pclass_ordinal(train_df, test_df)` 형태
- `titanic_service.py`: `pclass_ordinal(this)` 형태로 호출

**해결**:
모든 전처리 메서드를 `this` 객체를 받도록 수정

---

### 에러 2: Docker 빌드 에러

**에러 메시지**:
```
failed to compute cache key: "/services/mlservice/requirements.txt": not found
```

**원인**:
- `docker-compose.yaml`에서 `build: ./services/mlservice`로 설정
- Dockerfile이 상위 디렉토리의 `common` 폴더를 참조하는데 build context가 제한됨

**해결**:
```yaml
mlservice:
  build:
    context: .                              # 상위 디렉토리로 변경
    dockerfile: ./services/mlservice/Dockerfile
```

---

### 에러 3: 컨테이너 이름 충돌

**에러 메시지**:
```
Error response from daemon: Conflict. The container name "/mlservice" is already in use
```

**원인**:
- 프로젝트 루트와 `ai.kroaddy.site` 두 곳의 `docker-compose.yaml`에서 동시에 mlservice 정의
- 기존 컨테이너가 실행 중인 상태에서 재생성 시도

**해결**:
```bash
# 1. 기존 컨테이너 중지 및 제거
docker stop mlservice
docker rm mlservice

# 2. 컨테이너 재시작
docker compose up -d mlservice
```

---

### 에러 4: 404 Not Found (/titanic/evaluate)

**원인**:
- 코드 변경 후 컨테이너가 변경사항을 반영하지 못함

**해결**:
```bash
# 컨테이너 재빌드
docker compose up -d --build mlservice
```

---

## 최종 코드 구조

### titanic_service.py 구조

```python
class TitanicService:
    def __init__(self):
        self.processed_data = None
        self.train_label = None
        self.models = {}
    
    # 1. 전처리
    def preprocess(self):
        # 데이터 읽기 → 라벨 분리 → 전처리 파이프라인 실행
        # self.processed_data, self.train_label에 저장
        pass
    
    # 2. 모델 생성
    def modeling(self):
        # SVM 모델 생성
        # self.models에 저장
        pass
    
    # 3. 모델 학습
    def learning(self):
        # 전체 train 데이터로 학습
        pass
    
    # 4. 모델 평가
    def evaluate(self):
        # Train/Val 분리 → 평가 → CSV 생성
        # 최고 모델 자동 선택
        pass
    
    # 5. CSV 생성
    def generate_submission_csv(self, model, model_name):
        # test 데이터 예측 → CSV 저장
        pass
```

### titanic_router.py - /evaluate 엔드포인트

```python
@router.get("/evaluate", response_model=Dict[str, Any])
async def evaluate_model():
    """
    모델 평가 실행
    전처리 → 모델 생성 → 학습 → 평가까지 전체 파이프라인 실행
    """
    try:
        # 1. 전처리
        preprocess_result = titanic_service.preprocess()
        
        # 2. 모델 생성
        titanic_service.modeling()
        
        # 3. 모델 학습
        titanic_service.learning()
        
        # 4. 모델 평가
        evaluate_result = titanic_service.evaluate()
        
        return {
            "status": "success",
            "message": "모델 평가 완료",
            "preprocessing": preprocess_result,
            "evaluation": evaluate_result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"서버 에러: {str(e)}")
```

---

## 오늘의 학습 포인트

### 1. 전처리의 일관성 유지
- ✅ train 데이터를 기준으로 bins, 최빈값, 매핑 계산
- ✅ 동일한 기준을 test 데이터에 적용
- ✅ `this` 객체를 활용한 체이닝 패턴

### 2. ML 파이프라인 구조
```
데이터 준비 → 전처리 → 모델 생성 → 학습 → 평가 → 예측
```

### 3. 모델 선택의 신중함
- ❌ 초기 정확도만으로 즉각 결정
- ✅ 다양한 모델 유지 → 튜닝 → 교차 검증 → 앙상블 → 최종 결정

### 4. Docker 환경 관리
- 볼륨 마운트로 데이터 영구 저장
- build context 이해
- 컨테이너 이름 충돌 해결

### 5. 코드 구조의 중요성
```python
# 나쁜 예: 직접 수정
this.train, this.test = the_method.pclass_ordinal(this)

# 좋은 예: 체이닝 패턴
this = the_method.drop_features(this, 'SibSp', 'Parch')
this = the_method.pclass_ordinal(this)
this = the_method.fare_ordinal(this)
```

---

## 다음 단계 계획

### 1. 하이퍼파라미터 튜닝
```python
from sklearn.model_selection import GridSearchCV

param_grid = {
    'C': [0.1, 1, 10, 100],
    'kernel': ['linear', 'rbf', 'poly'],
    'gamma': ['scale', 'auto', 0.1, 0.01]
}

grid_search = GridSearchCV(SVC(), param_grid, cv=5)
grid_search.fit(X_train, y_train)
```

### 2. 교차 검증 (Cross-Validation)
```python
from sklearn.model_selection import cross_val_score

scores = cross_val_score(model, X, y, cv=5)
print(f"CV scores: {scores}")
print(f"Mean: {scores.mean():.4f} (+/- {scores.std() * 2:.4f})")
```

### 3. 앙상블 기법
```python
from sklearn.ensemble import VotingClassifier

ensemble = VotingClassifier(
    estimators=[
        ('svm', svm_model),
        ('rf', rf_model),
        ('lgb', lgb_model)
    ],
    voting='soft'
)
```

### 4. 특성 중요도 분석
```python
# 랜덤 포레스트 특성 중요도
feature_importance = pd.DataFrame({
    'feature': X.columns,
    'importance': rf_model.feature_importances_
}).sort_values('importance', ascending=False)
```

### 5. 모델 저장 및 로드
```python
import joblib

# 모델 저장
joblib.dump(best_model, 'models/best_svm_model.pkl')

# 모델 로드
loaded_model = joblib.load('models/best_svm_model.pkl')
```

---

## 참고 자료

### API 테스트
```bash
# Postman 또는 curl로 테스트
curl -X GET "http://localhost:9006/titanic/evaluate"
```

### 로그 확인
```bash
# Docker 로그 확인
docker compose logs --tail=50 mlservice

# 실시간 로그 확인
docker compose logs -f mlservice
```

### 컨테이너 관리
```bash
# 컨테이너 중지
docker compose down

# 컨테이너 재시작
docker compose up -d

# 컨테이너 재빌드
docker compose up -d --build mlservice
```

---

## 마무리

오늘은 타이타닉 데이터로 **전처리부터 모델 평가, 캐글 제출까지 전체 ML 파이프라인**을 구축했습니다.

**핵심 성과**:
- ✅ 일관된 전처리 파이프라인 구축
- ✅ 모델링, 학습, 평가 전체 흐름 이해
- ✅ Docker 환경에서의 ML 서비스 배포
- ✅ 실전과 유사한 코드 구조 경험
- ✅ 에러 해결 능력 향상

**중요한 깨달음**:
> 초기 정확도만으로 모델을 선택하지 말고, 충분한 실험과 검증을 거쳐야 합니다!

다음 학습에서는 하이퍼파라미터 튜닝과 교차 검증을 통해 모델 성능을 더욱 개선해보겠습니다. 🚀

---

**작성일**: 2025.12.09  
**학습 시간**: 전처리 → 모델링 → 평가 → 제출 (1차 완료)  
**다음 목표**: 하이퍼파라미터 튜닝 & 교차 검증

