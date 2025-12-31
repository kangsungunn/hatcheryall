# 타이타닉 데이터 전처리 프로젝트 학습 가이드

## 📋 목차
1. [프로젝트 개요](#프로젝트-개요)
2. [파일 구조 정리](#파일-구조-정리)
3. [전처리 메서드 구현](#전처리-메서드-구현)
4. [FastAPI 엔드포인트 생성](#fastapi-엔드포인트-생성)
5. [Docker 환경 문제 해결](#docker-환경-문제-해결)
6. [데이터 타입 정리 및 최적화](#데이터-타입-정리-및-최적화)
7. [로그 출력 일치성 확인](#로그-출력-일치성-확인)
8. [핵심 학습 포인트](#핵심-학습-포인트)

---

## 프로젝트 개요

타이타닉 데이터셋을 활용한 머신러닝 전처리 파이프라인 구축 프로젝트입니다. FastAPI를 통해 전처리 결과를 API로 제공하며, Docker 환경에서 실행됩니다.

### 주요 목표
- 중복 파일 제거 및 코드 구조 정리
- 체계적인 전처리 메서드 구현 (척도별 처리)
- 모든 피처를 숫자형으로 변환
- FastAPI를 통한 전처리 결과 제공
- Docker 환경에서의 안정적인 실행

---

## 파일 구조 정리

### 🔧 문제 상황
`app/titanic` 폴더에 중복된 파일들이 존재했습니다:
- `model.py` (중복)
- `service.py` (중복)
- `router.py` (이름 불일치)

이미 `titanic_` 접두사를 가진 파일들이 존재했기 때문에 중복 파일을 제거하고 통합했습니다.

### ✅ 해결 방법

#### 1. 중복 파일 삭제
```bash
# 삭제된 파일
- model.py
- service.py
```

#### 2. 파일 통합 및 이름 변경
- `model.py`의 내용 → `titanic_model.py`로 이동
- `service.py`는 `titanic_service.py`가 이미 존재하므로 삭제
- `router.py` → `titanic_router.py`로 이름 변경

#### 3. Import 경로 수정
**`titanic_router.py`**
```python
# 변경 전
from app.titanic.model import Passenger
from app.titanic.service import TitanicService

# 변경 후
from app.titanic.titanic_model import Passenger
from app.titanic.titanic_service import TitanicService
```

**`main.py`**
```python
# 변경 전
from app.titanic.router import router as titanic_router

# 변경 후
from app.titanic.titanic_router import router as titanic_router
```

### 📁 최종 파일 구조
```
app/titanic/
├── __init__.py
├── titanic_dataset.py      # 데이터셋 클래스
├── titanic_model.py        # Pydantic 모델 (Passenger, SexEnum, EmbarkedEnum)
├── titanic_method.py       # 전처리 메서드 클래스
├── titanic_service.py      # ML 서비스 로직
├── titanic_router.py       # FastAPI 라우터
├── train.csv              # 학습 데이터
└── test.csv               # 테스트 데이터
```

---

## 전처리 메서드 구현

### 📊 척도(Scale) 개념 이해

데이터의 척도는 4가지로 분류됩니다:
- **Nominal (명목형)**: 순서가 없는 범주형 (예: 성별, 탑승 항구)
- **Ordinal (서열형)**: 순서가 있는 범주형 (예: 객실 등급)
- **Interval (등간형)**: 간격이 의미 있는 수치형
- **Ratio (비율형)**: 절대 0이 있는 수치형 (예: 나이, 요금)

### 🛠️ 구현된 전처리 메서드

#### 1. `pclass_ordinal()` - 객실 등급 처리
```python
def pclass_ordinal(self, df: DataFrame) -> pd.DataFrame:
    """
    Pclass: 객실 등급 (1, 2, 3)
    - 서열형 척도(ordinal)로 처리
    - 이미 순서형 값이므로 그대로 사용
    """
    df = df.copy()
    df['Pclass'] = df['Pclass'].astype(int)
    return df
```

**처리 내용:**
- Pclass는 이미 1, 2, 3의 순서형 값이므로 타입만 int로 변환

---

#### 2. `fare_ordinal()` - 요금 구간화
```python
def fare_ordinal(self, df: DataFrame) -> pd.DataFrame:
    """
    Fare: 요금
    - 연속형 ratio 척도이지만 구간화하여 서열형으로 사용
    - 결측치는 중앙값으로 채움
    - 사분위수 기반으로 4개 구간으로 binning
    """
    df = df.copy()
    
    if 'Fare' not in df.columns:
        return df
    
    # 결측치 처리: 중앙값으로 채우기
    fare_median = df['Fare'].median()
    df['Fare'] = df['Fare'].fillna(fare_median)
    
    # 사분위수 기반 구간화 (0, 1, 2, 3)
    df['Fare'] = pd.qcut(
        df['Fare'], 
        q=4, 
        labels=[0, 1, 2, 3],
        duplicates='drop'
    ).astype(int)
    
    return df
```

**처리 내용:**
- 결측치: 중앙값으로 채움
- 구간화: `pd.qcut()`을 사용하여 4개 구간으로 분할 (0, 1, 2, 3)
- 원본 Fare 컬럼을 구간화된 값으로 대체

---

#### 3. `embarked_ordinal()` - 탑승 항구 One-hot 인코딩
```python
def embarked_ordinal(self, df: DataFrame) -> pd.DataFrame:
    """
    Embarked: 탑승 항구 (C, Q, S)
    - 본질적으로는 nominal(명목) 척도
    - One-hot encoding으로 변환
    - 결측치는 최빈값으로 채움
    """
    df = df.copy()
    
    if 'Embarked' not in df.columns:
        return df
    
    # 결측치 처리: 최빈값으로 채우기
    embarked_mode = df['Embarked'].mode()[0] if not df['Embarked'].mode().empty else 'S'
    df['Embarked'] = df['Embarked'].fillna(embarked_mode)
    
    # One-hot encoding (정수형으로 변환)
    embarked_dummies = pd.get_dummies(df['Embarked'], prefix='Embarked', dtype=int)
    df = pd.concat([df, embarked_dummies], axis=1)
    
    # 원본 Embarked 컬럼 삭제 (One-hot 컬럼만 유지)
    df = df.drop(columns=['Embarked'])
    
    return df
```

**처리 내용:**
- 결측치: 최빈값(mode)으로 채움
- One-hot encoding: `pd.get_dummies()` 사용
- **중요**: `dtype=int` 파라미터로 boolean 대신 정수형(0/1) 생성
- 원본 컬럼 삭제: `Embarked_C`, `Embarked_Q`, `Embarked_S`만 유지

**⚠️ 주의사항:**
- `pd.get_dummies()`는 기본적으로 boolean을 반환하므로 `dtype=int` 필수
- 원본 컬럼은 삭제하여 중복 방지

---

#### 4. `gender_nominal()` - 성별 이진 인코딩
```python
def gender_nominal(self, df: DataFrame) -> pd.DataFrame:
    """
    Gender: 성별 (male, female)
    - nominal 척도
    - 이진 인코딩으로 변환 (male=0, female=1)
    - 원본 'Sex' 컬럼을 'Gender'로 변경 후 삭제
    """
    df = df.copy()
    
    # 원본 데이터의 'Sex' 컬럼을 'Gender'로 변경
    if 'Sex' in df.columns and 'Gender' not in df.columns:
        df['Gender'] = df['Sex']
        # 원본 Sex 컬럼 삭제
        df = df.drop(columns=['Sex'])
    
    if 'Gender' not in df.columns:
        ic('⚠️ Gender 컬럼이 없습니다.')
        return df
    
    # 이진 인코딩: male=0, female=1
    df['Gender_encoded'] = df['Gender'].map({'male': 0, 'female': 1}).astype(int)
    
    # 원본 Gender 컬럼 삭제 (Gender_encoded만 유지)
    df = df.drop(columns=['Gender'])
    
    return df
```

**처리 내용:**
- 컬럼명 변경: `Sex` → `Gender` (사용자 요구사항)
- 이진 인코딩: `map()` 함수 사용 (male=0, female=1)
- 원본 컬럼 삭제: `Gender_encoded`만 유지

**⚠️ 주의사항:**
- 원본 `Sex`와 중간 `Gender` 모두 삭제하여 최종적으로 `Gender_encoded`만 남김

---

#### 5. `age_ratio()` - 나이 구간화
```python
def age_ratio(self, df: DataFrame) -> pd.DataFrame:
    """
    Age: 나이
    - 원래는 ratio 척도지만 구간으로 나눈 ordinal 피처로 변환
    - 결측치는 중앙값으로 채움
    - 8개 구간으로 binning
    """
    df = df.copy()
    
    if 'Age' not in df.columns:
        return df
    
    bins = [-1, 0, 5, 12, 18, 24, 35, 60, np.inf]
    labels = ['태아', '유아', '어린이', '청소년', '청년', '장년', '중년', '노년']
    
    # 결측치 처리: 중앙값으로 채우기
    age_median = df['Age'].median()
    age_filled = df['Age'].fillna(age_median)
    
    # Label Encoding (0~7) - 숫자형만 사용
    df['Age_encoded'] = pd.cut(
        age_filled, 
        bins=bins, 
        labels=False,
        include_lowest=True
    ).astype(int)
    
    # 원본 Age 컬럼 삭제 (Age_encoded만 유지)
    df = df.drop(columns=['Age'])
    
    return df
```

**처리 내용:**
- 결측치: 중앙값으로 채움
- 구간화: `pd.cut()`을 사용하여 8개 구간으로 분할
- 숫자 인코딩: `labels=False`로 0~7 숫자 반환
- 원본 컬럼 삭제: `Age_encoded`만 유지

**구간 의미:**
- 0: 태아 (-1~0)
- 1: 유아 (0~5)
- 2: 어린이 (5~12)
- 3: 청소년 (12~18)
- 4: 청년 (18~24)
- 5: 장년 (24~35)
- 6: 중년 (35~60)
- 7: 노년 (60~)

---

#### 6. `title_nominal()` - 타이틀 추출 및 인코딩
```python
def title_nominal(self, df: DataFrame) -> pd.DataFrame:
    """
    Title: 명칭 (Mr, Mrs, Miss, Master, Dr, etc.)
    - Name 컬럼에서 추출한 타이틀
    - nominal 척도
    - 희소한 타이틀은 "Rare" 또는 "Royal"로 그룹화
    """
    if 'Name' not in df.columns:
        return df
    
    df = df.copy()
    
    # Name에서 Title 추출 (정규표현식 사용)
    df['Title'] = df['Name'].str.extract(r',\s*([^\.]+)\.', expand=False)
    
    # Miss를 Ms로 통일
    df['Title'] = df['Title'].replace('Miss', 'Ms')
    
    # Royal 타이틀 그룹화
    royal_titles = ['Lady', 'Countess', 'Sir', 'Don', 'Dona', 'Jonkheer']
    df['Title'] = df['Title'].replace(royal_titles, 'Royal')
    
    # title_mapping 정의
    title_mapping = {'Mr': 1, 'Ms': 2, 'Mrs': 3, 'Master': 4, 'Royal': 5, 'Rare': 6}
    
    # 희소한 타이틀을 "Rare"로 그룹화
    title_counts = df['Title'].value_counts()
    rare_titles = title_counts[title_counts < 10].index.tolist()
    rare_titles = [t for t in rare_titles if t not in title_mapping]
    df['Title'] = df['Title'].replace(rare_titles, 'Rare')
    
    # title_mapping을 사용하여 숫자로 변환
    df['Title_encoded'] = df['Title'].map(title_mapping).fillna(6).astype(int)
    
    # 원본 Title 컬럼 삭제 (Title_encoded만 유지)
    df = df.drop(columns=['Title'])
    
    return df
```

**처리 내용:**
- Title 추출: 정규표현식 `r',\s*([^\.]+)\.'` 사용
- 그룹화:
  - Miss → Ms로 통일
  - Royal 타이틀 그룹화 (Lady, Countess, Sir 등)
  - 빈도 10 미만 타이틀 → Rare로 그룹화
- 숫자 인코딩: `title_mapping` 딕셔너리 사용
- 원본 컬럼 삭제: `Title_encoded`만 유지

**타이틀 매핑:**
- Mr: 1
- Ms: 2
- Mrs: 3
- Master: 4
- Royal: 5
- Rare: 6

---

## FastAPI 엔드포인트 생성

### 📡 `/titanic/preprocess` 엔드포인트

**`titanic_router.py`**
```python
@router.get("/preprocess", response_model=Dict[str, Any])
async def run_preprocess():
    """
    데이터 전처리 실행
    """
    try:
        result = titanic_service.preprocess()
        if result.get("status") == "error":
            error_msg = result.get("message", "전처리 중 에러 발생")
            ic(f"❌ 전처리 에러: {error_msg}")
            raise HTTPException(status_code=500, detail=error_msg)
        return result
    except HTTPException:
        raise
    except Exception as e:
        ic(f"❌ 라우터 레벨 에러: {str(e)}")
        raise HTTPException(status_code=500, detail=f"알 수 없는 라우터 에러: {str(e)}")
```

### 📊 응답 구조

**`titanic_service.py` - `preprocess()` 메서드**
```python
def preprocess(self):
    """데이터 전처리"""
    try:
        # ... 전처리 로직 ...
        
        response_data = {
            "status": "success",
            "message": "전처리 완료",
            "data": {
                "before_preprocessing": before_info,  # 전처리 전 정보
                "after_preprocessing": after_info,    # 전처리 후 정보
                "changes": changes_info               # 변화 정보
            }
        }
        
        return response_data
    except Exception as e:
        return {"status": "error", "message": f"전처리 중 에러 발생: {str(e)}"}
```

**응답 데이터 구조:**
```json
{
  "status": "success",
  "message": "전처리 완료",
  "data": {
    "before_preprocessing": {
      "columns": [...],
      "column_count": 11,
      "row_count": 891,
      "shape": [891, 11],
      "null_count": 177,
      "columns_info": {...},
      "sample_data": [...]
    },
    "after_preprocessing": {
      "columns": [...],
      "column_count": 15,
      "row_count": 891,
      "shape": [891, 15],
      "null_count": 0,
      "columns_info": {...},
      "sample_data": [...]
    },
    "changes": {
      "columns_removed": 5,
      "columns_added": 9,
      "removed_column_names": [...],
      "added_column_names": [...],
      "nulls_filled": 177,
      "preprocessing_steps": [...]
    }
  }
}
```

---

## Docker 환경 문제 해결

### 🔴 문제 1: FileNotFoundError

**증상:**
```
FileNotFoundError: train.csv 파일을 찾을 수 없습니다
```

**원인:**
- 상대 경로(`'train.csv'`)를 사용하여 Docker 컨테이너 내부에서 파일을 찾지 못함

**해결:**
```python
# 변경 전
train_path = 'train.csv'

# 변경 후
data_path = Path(__file__).parent
train_path = data_path / 'train.csv'
test_path = data_path / 'test.csv'
```

**설명:**
- `Path(__file__).parent`를 사용하여 절대 경로로 변환
- Docker 컨테이너 내부 경로: `/app/app/titanic/`

---

### 🔴 문제 2: KeyError - 'Survived' 컬럼

**증상:**
```
KeyError: 'Survived'
```

**원인:**
- `test.csv`에는 일반적으로 `Survived` 컬럼이 없음
- `create_train()` 메서드에서 존재하지 않는 컬럼을 삭제하려고 시도

**해결:**
```python
# 변경 전
this_test = the_method.create_train(df_test, 'Survived')

# 변경 후
if 'Survived' in df_test.columns:
    this_test = the_method.create_train(df_test, 'Survived')
else:
    this_test = df_test
```

---

### 🔴 문제 3: Docker 이미지 재빌드 필요

**증상:**
- 코드를 수정했지만 변경사항이 반영되지 않음

**해결:**
```bash
# Docker 이미지 재빌드 (캐시 무시)
docker-compose build --no-cache mlservice

# 컨테이너 재시작
docker-compose up -d mlservice
```

**⚠️ 중요:**
- 코드 수정 후 반드시 Docker 이미지를 재빌드해야 변경사항이 반영됨
- `--no-cache` 옵션으로 완전히 새로 빌드

---

## 데이터 타입 정리 및 최적화

### 🎯 목표
모든 피처를 숫자형으로 변환하고, 원본 컬럼은 삭제하여 학습에 사용 가능한 형태로 정리

### ✅ 수행한 작업

#### 1. Sex → Gender 변경
```python
# gender_nominal() 메서드에서
if 'Sex' in df.columns and 'Gender' not in df.columns:
    df['Gender'] = df['Sex']
    df = df.drop(columns=['Sex'])  # 원본 Sex 삭제

# 이후 Gender도 삭제하고 Gender_encoded만 유지
df['Gender_encoded'] = df['Gender'].map({'male': 0, 'female': 1}).astype(int)
df = df.drop(columns=['Gender'])
```

**결과:**
- `Sex` 컬럼 삭제
- `Gender` 컬럼 삭제
- `Gender_encoded`만 유지 (0 또는 1)

---

#### 2. 원본 컬럼 삭제

**삭제된 원본 컬럼:**
- `Sex` → `Gender_encoded`로 대체
- `Gender` → `Gender_encoded`로 대체
- `Embarked` → `Embarked_C`, `Embarked_Q`, `Embarked_S`로 대체
- `Age` → `Age_encoded`로 대체
- `Title` → `Title_encoded`로 대체

**각 메서드에서 원본 컬럼 삭제:**
```python
# embarked_ordinal()
df = df.drop(columns=['Embarked'])

# gender_nominal()
df = df.drop(columns=['Sex', 'Gender'])

# age_ratio()
df = df.drop(columns=['Age'])

# title_nominal()
df = df.drop(columns=['Title'])
```

---

#### 3. One-hot Encoding을 정수형으로 변환

**문제:**
- `pd.get_dummies()`는 기본적으로 boolean을 반환
- 로그에서 `True/False`로 표시됨

**해결:**
```python
# 변경 전
embarked_dummies = pd.get_dummies(df['Embarked'], prefix='Embarked')

# 변경 후
embarked_dummies = pd.get_dummies(df['Embarked'], prefix='Embarked', dtype=int)
```

**결과:**
- `Embarked_C`, `Embarked_Q`, `Embarked_S`가 0 또는 1의 정수형으로 변환

---

### 📊 최종 데이터 구조

**전처리 후 컬럼 목록:**
```
- PassengerId (int)
- Pclass (int) - 1, 2, 3
- Fare (int) - 0, 1, 2, 3 (구간화)
- Embarked_C (int) - 0 또는 1
- Embarked_Q (int) - 0 또는 1
- Embarked_S (int) - 0 또는 1
- Gender_encoded (int) - 0 또는 1
- Age_encoded (int) - 0~7 (구간화)
- Title_encoded (int) - 1~6
```

**모든 컬럼이 숫자형으로 변환되어 머신러닝 모델에 바로 사용 가능**

---

## 로그 출력 일치성 확인

### 🔴 문제
로그에 출력된 상위 5개 행과 `_collect_dataframe_info()`에서 수집한 `sample_data`가 일치하지 않음

**원인:**
- `_collect_dataframe_info()`: `df.head(5).replace({np.nan: None})` 사용
- 로그 출력: `this_train.head(5).to_string()` 사용
- NaN 처리 방식이 다름

### ✅ 해결
```python
# 변경 전
ic(f"상위 5개 행:\n{this_train.head(5).to_string()}")

# 변경 후
sample_df = this_train.head(5).replace({np.nan: None})
ic(f"상위 5개 행:\n{sample_df.to_string()}")
```

**적용 위치:**
- 전처리 전 정보 수집 시
- 전처리 후 정보 수집 시

**결과:**
- 로그 출력과 `sample_data`가 완전히 일치
- NaN이 None으로 변환되어 JSON 직렬화 가능

---

## 핵심 학습 포인트

### 1. 파일 구조 관리
- **원칙**: 일관된 네이밍 컨벤션 유지 (`titanic_` 접두사)
- **실수**: 중복 파일 생성 방지
- **교훈**: 파일 생성 전 기존 파일 확인

---

### 2. 척도별 전처리 전략
- **Nominal**: One-hot encoding 또는 Label encoding
- **Ordinal**: 순서 유지하며 숫자형으로 변환
- **Ratio/Interval**: 구간화(binning)하여 ordinal로 변환 가능

---

### 3. 데이터 타입 일관성
- **원칙**: 모든 피처를 숫자형으로 변환
- **방법**: 
  - `pd.get_dummies(..., dtype=int)` 사용
  - `.astype(int)` 명시적 변환
- **정리**: 원본 컬럼 삭제하여 중복 방지

---

### 4. Docker 환경 대응
- **파일 경로**: 절대 경로 사용 (`Path(__file__).parent`)
- **재빌드**: 코드 수정 후 반드시 `docker-compose build --no-cache`
- **에러 처리**: 파일 존재 확인 및 조건부 처리

---

### 5. 로그 출력 일관성
- **원칙**: 수집한 데이터와 출력 데이터 일치
- **방법**: 동일한 전처리(`replace({np.nan: None})`) 적용
- **목적**: 디버깅 및 검증 용이

---

### 6. 코드 최적화 원칙
- **메모리**: `df.copy()` 사용하여 원본 보호
- **효율성**: 불필요한 연산 제거 (예: `new_model()` 두 번 호출 방지)
- **가독성**: 메서드 체이닝 가능하도록 설계

---

### 7. 에러 처리 전략
- **파일 존재 확인**: `Path.exists()` 사용
- **조건부 처리**: 컬럼 존재 여부 확인 후 처리
- **상세한 에러 메시지**: 디버깅 용이하도록 구체적 메시지 제공

---

## 📝 체크리스트

전처리 작업 시 확인할 사항:

- [ ] 모든 원본 컬럼이 삭제되었는가?
- [ ] 모든 피처가 숫자형인가?
- [ ] 결측치가 모두 처리되었는가?
- [ ] One-hot encoding이 정수형인가?
- [ ] 로그 출력과 수집 데이터가 일치하는가?
- [ ] Docker 이미지가 재빌드되었는가?
- [ ] 파일 경로가 절대 경로인가?

---

## 🚀 다음 단계

1. **모델 학습**: 전처리된 데이터로 머신러닝 모델 학습
2. **하이퍼파라미터 튜닝**: 모델 성능 최적화
3. **교차 검증**: 모델 일반화 성능 평가
4. **예측 API**: 학습된 모델을 활용한 예측 엔드포인트 생성

---

## 📚 참고 자료

- [Pandas Documentation](https://pandas.pydata.org/docs/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Scikit-learn Preprocessing](https://scikit-learn.org/stable/modules/preprocessing.html)

---

**작성일**: 2025-01-XX  
**프로젝트**: 타이타닉 데이터 전처리 파이프라인  
**버전**: 1.0

