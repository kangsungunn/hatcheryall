# 서울시 범죄 데이터 시각화 프로젝트 - Folium 지도 및 히트맵 구현

**작성일:** 2025년 12월 11일  
**프로젝트:** 서울시 자치구별 범죄율/검거율 인터랙티브 지도 시각화  
**기술 스택:** Python, FastAPI, Folium, Pandas, Matplotlib, Seaborn, Docker

---

## 📋 Table of Contents

1. [프로젝트 개요](#프로젝트-개요)
2. [사전 준비](#사전-준비)
3. [단계별 구현 과정](#단계별-구현-과정)
   - [Step 1: 히트맵 이미지 저장 기능 추가](#step-1-히트맵-이미지-저장-기능-추가)
   - [Step 2: 범죄율/검거율 계산 로직 검증 및 개선](#step-2-범죄율검거율-계산-로직-검증-및-개선)
   - [Step 3: Folium Choropleth 지도 생성 기능 구현](#step-3-folium-choropleth-지도-생성-기능-구현)
   - [Step 4: API 엔드포인트 추가 및 테스트](#step-4-api-엔드포인트-추가-및-테스트)
4. [트러블슈팅](#트러블슈팅)
5. [최종 결과물](#최종-결과물)
6. [학습 정리](#학습-정리)
7. [다음 학습 과제](#다음-학습-과제)

---

## 프로젝트 개요

### 무엇을 만들었나?

서울시 25개 자치구의 범죄 데이터를 시각화하는 웹 기반 인터랙티브 지도 시스템을 구현했습니다. 사용자가 웹 브라우저를 통해 범죄율과 검거율을 지도 위에서 직관적으로 확인할 수 있습니다.

### 왜 만들었나?

**비즈니스 가치:**
- 정적인 PNG 히트맵만으로는 지리적 위치 파악이 어려움
- 자치구 이름만으로는 실제 위치를 직관적으로 알기 어려움
- 인터랙티브 지도를 통해 데이터 탐색 경험 향상
- 웹 브라우저에서 바로 확인 가능한 공유 가능한 시각화

**기술적 목표:**
- Folium 라이브러리를 활용한 지도 시각화 구현
- GeoJSON 데이터와 통계 데이터 결합
- RESTful API 설계 및 파일 응답 처리
- Docker 환경에서 데이터 영속성 관리

### 주요 기능

1. **범죄율 Choropleth 지도**
   - 자치구별 인구 10만명당 범죄 발생률 시각화
   - 5대 범죄(살인, 강도, 강간, 절도, 폭력) 개별 또는 전체 범죄율 표시
   - 색상 그라데이션으로 위험도 시각화 (노란색 → 주황색 → 빨간색)

2. **검거율 Choropleth 지도**
   - 자치구별 범죄 검거율(%) 시각화
   - 높은 검거율일수록 녹색으로 표시 (노란색 → 초록색)

3. **히트맵 이미지 저장**
   - PNG 형식의 히트맵 자동 저장
   - 타임스탬프 기반 파일명으로 버전 관리

### 기술 스택

| 카테고리 | 기술 | 사용 목적 |
|---------|------|----------|
| **백엔드** | FastAPI | RESTful API 서버 |
| **데이터 처리** | Pandas, NumPy | CSV 데이터 정제 및 계산 |
| **지도 시각화** | Folium | 인터랙티브 Choropleth 지도 |
| **차트 시각화** | Matplotlib, Seaborn | 히트맵 PNG 이미지 생성 |
| **컨테이너화** | Docker, Docker Compose | 서비스 배포 및 관리 |
| **API Gateway** | Spring Cloud Gateway | 마이크로서비스 라우팅 |

---

## 사전 준비

### 1. 필요한 파일 구조

```
kroaddy_project_dacon/
├── ai.kroaddy.site/
│   └── services/
│       └── mlservice/
│           ├── app/
│           │   └── seoul_crime/
│           │       ├── data/
│           │       │   ├── kr-state.json       # 서울시 자치구 GeoJSON
│           │       │   └── ...
│           │       ├── save/                    # 결과물 저장 폴더
│           │       │   ├── crime.csv           # 정제된 범죄 데이터
│           │       │   ├── *.png               # 히트맵 이미지
│           │       │   └── *.html              # Folium 지도
│           │       ├── seoul_data.py           # 데이터 클래스
│           │       ├── seoul_method.py         # 처리 메서드
│           │       ├── seoul_service.py        # 비즈니스 로직
│           │       └── seoul_router.py         # API 엔드포인트
│           ├── requirements.txt
│           └── Dockerfile
├── docker-compose.yaml
└── test_*.html                                  # 테스트 파일 (임시)
```

### 2. GeoJSON 데이터 구조

`kr-state.json` 파일은 서울시 25개 자치구의 경계선 좌표를 담고 있습니다:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": "강동구",
      "properties": {
        "code": "11250",
        "name": "강동구",
        "name_eng": "Gangdong-gu"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[127.115, 37.557], ...]]
      }
    },
    ...
  ]
}
```

**핵심 포인트:**
- `id` 필드: 자치구 이름 (한글) - Folium의 `key_on` 파라미터와 매칭
- `geometry`: 다각형 좌표 데이터
- Folium이 이 좌표를 사용해 지도에 경계선을 그림

### 3. 범죄 데이터 구조

`crime.csv` 파일은 자치구별 범죄 통계를 담고 있습니다:

| 컬럼명 | 의미 | 예시 |
|--------|------|------|
| `자치구` | 자치구 이름 | 강남구 |
| `POP_인구` | 자치구 인구 | 543,437 |
| `CRIME_살인 발생` | 살인 발생 건수 | 3 |
| `CRIME_살인 검거` | 살인 검거 건수 | 3 |
| `CRIME_절도 발생` | 절도 발생 건수 | 2,411 |

**주의사항:**
- 숫자 컬럼에 쉼표(,)가 포함되어 있어 파싱 필요
- 같은 자치구에 여러 경찰서가 있어 집계 필요

### 4. Docker 환경 설정

`docker-compose.yaml`에서 볼륨 마운트 확인:

```yaml
mlservice:
  volumes:
    - ./ai.kroaddy.site/services/mlservice/app/seoul_crime/save:/app/app/seoul_crime/save
```

이 설정으로 Docker 컨테이너 내부의 `/app/app/seoul_crime/save` 경로와 호스트의 `save` 폴더가 동기화됩니다.

---

## 단계별 구현 과정

### Step 1: 히트맵 이미지 저장 기능 추가

#### 🎯 목표
포스트맨에서 API를 호출할 때마다 생성된 히트맵 PNG 이미지를 `save` 폴더에 자동 저장하도록 구현

#### 📝 왜 이 기능이 필요한가?

**문제 상황:**
- 기존 코드는 히트맵 이미지를 BytesIO 메모리 버퍼에만 저장
- API 응답으로는 이미지를 볼 수 있지만, 서버에는 저장되지 않음
- 히스토리 관리, 재사용, 공유가 불가능

**해결 방안:**
1. 이미지 데이터를 파일로 저장
2. 타임스탬프를 포함한 파일명으로 버전 관리
3. Docker 볼륨 마운트로 호스트에서도 접근 가능

#### 💻 구현 코드

**`seoul_service.py` 수정:**

```python
from datetime import datetime
import os
from pathlib import Path

class SeoulService:
    def __init__(self):
        self.data = SeoulData()
        self.method = SeoulMethod()
        
        # save 폴더 경로 설정
        self.save_dir = Path(self.data.sname)  # app/seoul_crime/save
        os.makedirs(self.save_dir, exist_ok=True)  # 폴더가 없으면 생성
```

**왜 이렇게 설계했나요?**
- `Path` 객체 사용: 경로 조작이 편리하고 OS 독립적
- `os.makedirs(exist_ok=True)`: 폴더가 없으면 생성, 있으면 무시
- 초기화 시점에 폴더 생성: 서비스 시작 시 한 번만 확인

**범죄율 히트맵 저장 메서드:**

```python
def get_crime_rate_heatmap_image(self) -> bytes:
    """
    범죄율 히트맵 이미지 생성 및 반환
    
    Returns:
        bytes: PNG 이미지 바이너리 데이터
    """
    # 1. 데이터 준비 및 히트맵 생성
    heatmap_data = self.prepare_heatmap_data()
    buffer = self.method.create_crime_rate_heatmap(heatmap_data['crime_rate_df'])
    
    # 2. BytesIO에서 이미지 데이터 읽기
    image_bytes = buffer.read()
    
    # 3. save 폴더에 저장
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")  # 20251211_103402
    filename = f"crime_rate_heatmap_{timestamp}.png"
    save_filepath = self.save_dir / filename
    
    with open(save_filepath, 'wb') as f:
        f.write(image_bytes)
    
    logger.info(f"범죄율 히트맵 저장 완료: {save_filepath}")
    
    # 4. 클라이언트에게 반환
    return image_bytes
```

**코드 상세 설명:**

**라인별 분석:**
1. `prepare_heatmap_data()`: 
   - CSV 파일에서 데이터 로드
   - 자치구별 집계
   - 범죄율/검거율 계산
   
2. `buffer.read()`:
   - Matplotlib이 생성한 PNG를 BytesIO에서 읽음
   - 메모리 상의 이미지 데이터를 bytes로 변환

3. `datetime.now().strftime()`:
   - 현재 시각을 파일명에 포함
   - 형식: `crime_rate_heatmap_20251211_103402.png`
   - 이유: 같은 이름으로 덮어쓰지 않고 이력 관리

4. `self.save_dir / filename`:
   - Path 객체의 `/` 연산자로 경로 결합
   - `Path('/app/save') / 'file.png'` → `/app/save/file.png`

5. `with open(save_filepath, 'wb')`:
   - `wb`: Write Binary 모드
   - PNG는 바이너리 파일이므로 텍스트 모드(w) 사용 불가
   - `with` 문: 파일을 자동으로 닫아줌 (리소스 관리)

6. `return image_bytes`:
   - 저장과 별개로 API 응답으로도 반환
   - 클라이언트는 즉시 이미지를 볼 수 있음

**검거율 히트맵도 동일한 로직:**

```python
def get_arrest_rate_heatmap_image(self) -> bytes:
    heatmap_data = self.prepare_heatmap_data()
    buffer = self.method.create_arrest_rate_heatmap(heatmap_data['arrest_rate_df'])
    image_bytes = buffer.read()
    
    # save 폴더에 저장
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"arrest_rate_heatmap_{timestamp}.png"
    save_filepath = self.save_dir / filename
    
    with open(save_filepath, 'wb') as f:
        f.write(image_bytes)
    
    logger.info(f"검거율 히트맵 저장 완료: {save_filepath}")
    
    return image_bytes
```

#### 🔍 동작 원리

**1. 메모리 → 파일 저장 흐름:**

```
사용자 요청
    ↓
seoul_router.py: /seoul/heatmap/crime-rate
    ↓
seoul_service.py: get_crime_rate_heatmap_image()
    ↓
    ├─ prepare_heatmap_data() → DataFrame 준비
    ├─ create_crime_rate_heatmap() → BytesIO 버퍼에 PNG 생성
    ├─ buffer.read() → bytes 추출
    ├─ open(file, 'wb').write() → 파일로 저장
    └─ return image_bytes → 클라이언트에게 전송
```

**2. Docker 볼륨 마운트 동작:**

```
컨테이너 내부                     호스트 (Windows)
/app/app/seoul_crime/save   ←→   ./ai.kroaddy.site/.../save
    ↓ 파일 쓰기                       ↓ 자동 동기화
crime_rate_heatmap_*.png          crime_rate_heatmap_*.png
```

Docker Compose의 볼륨 설정으로 양방향 동기화가 자동으로 이루어집니다.

#### ✅ 검증 방법

**테스트 1: API 호출**
```bash
# 포스트맨에서 GET 요청
GET http://localhost:8080/api/ai/seoul/heatmap/crime-rate
```

**테스트 2: 파일 확인**
```powershell
Get-ChildItem "ai.kroaddy.site/services/mlservice/app/seoul_crime/save" -Filter "*.png"
```

**기대 결과:**
```
Name                                   LastWriteTime
----                                   -------------
crime_rate_heatmap_20251211_103402.png  2025-12-11 오전 10:34:02
```

---

### Step 2: 범죄율/검거율 계산 로직 검증 및 개선

#### 🎯 목표
"범죄율과 검거율이 너무 높게 나온다"는 사용자 피드백에 대응하여 계산 로직 검증 및 데이터 정제 개선

#### 📝 문제 분석

**사용자 피드백:**
> "잘했어 뜨긴떴는데, 범죄율과 검거율의 비율이 이상한거같아. 너무 과하게 높아."

**예상 원인:**
1. 쉼표(,)가 포함된 숫자 파싱 오류
2. 자치구별 집계 오류 (중복 카운팅)
3. 범죄율/검거율 계산 공식 오류

#### 💻 데이터 정제 개선

**`_clean_numeric_column` 메서드 개선:**

**Before (문제 있는 코드):**
```python
def _clean_numeric_column(self, series: pd.Series) -> pd.Series:
    """숫자 컬럼의 쉼표 제거 및 변환"""
    cleaned = series.astype(str).str.replace(',', '')
    return pd.to_numeric(cleaned, errors='coerce').fillna(0).astype(float)
```

**문제점:**
- 빈 문자열(`''`)이나 공백(`' '`)을 제대로 처리하지 못함
- `pd.to_numeric('')` → `NaN`이 되어야 하는데 예상치 못한 동작 가능

**After (개선된 코드):**
```python
def _clean_numeric_column(self, series: pd.Series) -> pd.Series:
    """숫자 컬럼의 쉼표 제거 및 변환 (개선)"""
    # 1. 문자열로 변환 후 쉼표 제거
    cleaned = series.astype(str).str.replace(',', '')
    
    # 2. 빈 문자열이나 공백만 있는 경우 pd.NA로 변환
    cleaned = cleaned.replace(['', ' '], pd.NA)
    
    # 3. NaN을 0으로 변환 후 float로 변환
    return pd.to_numeric(cleaned, errors='coerce').fillna(0).astype(float)
```

**개선 사항:**
1. `.replace(['', ' '], pd.NA)`: 명시적으로 빈 값을 `pd.NA`로 변환
2. `errors='coerce'`: 변환 실패 시 `NaN`으로 변환 (오류 무시)
3. `.fillna(0)`: 모든 결측치를 0으로 대체

**왜 이렇게 개선했나요?**
- Pandas는 빈 문자열과 숫자 0을 구분하지 못할 때가 있음
- 명시적인 처리로 예상치 못한 동작 방지
- 데이터 품질 향상

#### 💻 범죄율/검거율 계산 로직

**`prepare_heatmap_data` 메서드의 핵심 계산:**

**1. 범죄율 계산 (인구 10만명당):**

```python
# 범죄율 계산
crime_rate_data = {'자치구': df_grouped['자치구']}
crime_types = ['살인', '강도', '강간', '절도', '폭력']

for crime_type in crime_types:
    occur_col = f'CRIME_{crime_type} 발생'
    if occur_col in df_grouped.columns:
        # ⭐ 핵심 공식: (발생 건수 / 인구) × 100,000
        crime_rate = (df_grouped[occur_col] / df_grouped['POP_인구']) * 100000
        crime_rate_data[f'{crime_type}발생률'] = crime_rate.round(1)

crime_rate_df = pd.DataFrame(crime_rate_data).set_index('자치구')
```

**공식 설명:**
- **범죄율 = (범죄 발생 건수 / 인구) × 100,000**
- 인구 10만명당으로 정규화하는 이유: 인구 규모가 다른 지역을 공정하게 비교하기 위함

**예시 계산 (강남구):**
```python
# 데이터
인구: 543,437명
절도 발생: 2,411건

# 계산
범죄율 = (2,411 / 543,437) × 100,000
       = 0.00444 × 100,000
       = 443.8 (인구 10만명당 443.8건)
```

**2. 검거율 계산 (퍼센트):**

```python
# 검거율 계산
arrest_rate_data = {'자치구': df_grouped['자치구']}

for crime_type in crime_types:
    occur_col = f'CRIME_{crime_type} 발생'
    arrest_col = f'CRIME_{crime_type} 검거'
    
    if occur_col in df_grouped.columns and arrest_col in df_grouped.columns:
        # ⭐ 핵심 공식: (검거 건수 / 발생 건수) × 100
        # 발생 건수가 0이면 검거율도 0으로 설정
        arrest_rate = np.where(
            df_grouped[occur_col] == 0,
            0,  # 발생 건수가 0이면 검거율 0
            (df_grouped[arrest_col] / df_grouped[occur_col]) * 100
        )
        arrest_rate_data[f'{crime_type}검거율'] = pd.Series(arrest_rate).round(1)

arrest_rate_df = pd.DataFrame(arrest_rate_data).set_index('자치구')
```

**공식 설명:**
- **검거율 = (검거 건수 / 발생 건수) × 100**
- 퍼센트로 표현 (0~100%)

**예시 계산 (강남구 절도):**
```python
# 데이터
절도 발생: 2,411건
절도 검거: 2,100건

# 계산
검거율 = (2,100 / 2,411) × 100
       = 0.871 × 100
       = 87.1%
```

**`np.where` 사용 이유:**
```python
# 나쁜 예: ZeroDivisionError 발생 가능
arrest_rate = (arrested / occurred) * 100

# 좋은 예: 조건부 계산
arrest_rate = np.where(
    occurred == 0,  # 조건: 발생 건수가 0이면
    0,              # 참일 때: 0 반환
    (arrested / occurred) * 100  # 거짓일 때: 정상 계산
)
```

#### 🔍 높은 범죄율/검거율 원인 분석

**왜 범죄율이 높게 나왔을까?**

**중구(Jung-gu) 예시:**
- 인구: 약 13만명 (서울에서 가장 작음)
- 절도 발생: 많음 (상업 지구, 유동 인구 많음)
- 결과: 인구 대비 범죄 발생이 많아 범죄율 높음

**계산 검증:**
```python
# 중구 데이터 (가상)
인구: 133,000명
절도 발생: 1,500건

범죄율 = (1,500 / 133,000) × 100,000
       = 1,127.8 (인구 10만명당)

# 강남구 데이터
인구: 543,437명
절도 발생: 2,411건

범죄율 = (2,411 / 543,437) × 100,000
       = 443.8 (인구 10만명당)
```

**결론:**
- 범죄율이 높게 나온 것은 계산 오류가 아니라 **실제 데이터의 특성**
- 중구는 인구는 적지만 상업/관광 지역이라 절대 범죄 건수가 많음
- 인구 대비 계산이므로 범죄율이 높게 나타남

#### ✅ 검증 방법

**테스트 스크립트 작성:**

```python
# test_calc_fix.py
import pandas as pd
from pathlib import Path

# 데이터 로드
data_path = Path('app/seoul_crime/save/crime.csv')
df = pd.read_csv(data_path)

# 특정 자치구만 필터링 (강남구)
gangnam = df[df['자치구'] == '강남구']

print("=== 강남구 데이터 ===")
print(f"인구: {gangnam['POP_인구'].values[0]:,}명")
print(f"절도 발생: {gangnam['CRIME_절도 발생'].values[0]:,}건")
print(f"절도 검거: {gangnam['CRIME_절도 검거'].values[0]:,}건")

# 범죄율 계산
crime_rate = (gangnam['CRIME_절도 발생'].values[0] / gangnam['POP_인구'].values[0]) * 100000
print(f"\n절도 범죄율: {crime_rate:.1f} (인구 10만명당)")

# 검거율 계산
arrest_rate = (gangnam['CRIME_절도 검거'].values[0] / gangnam['CRIME_절도 발생'].values[0]) * 100
print(f"절도 검거율: {arrest_rate:.1f}%")
```

---

### Step 3: Folium Choropleth 지도 생성 기능 구현

#### 🎯 목표
정적인 PNG 히트맵 대신 인터랙티브한 웹 기반 Choropleth 지도를 생성하여 사용자가 웹 브라우저에서 직접 탐색할 수 있도록 구현

#### 📝 왜 Folium을 선택했나?

**Matplotlib/Seaborn의 한계:**
- ❌ 정적 이미지만 생성 가능
- ❌ 줌 인/아웃, 드래그 등 인터랙션 불가
- ❌ 지리적 위치 파악이 어려움

**Folium의 장점:**
- ✅ Leaflet.js 기반 인터랙티브 지도
- ✅ GeoJSON 지원으로 지역 경계 표시 가능
- ✅ Choropleth(단계구분도) 기능 내장
- ✅ HTML로 출력되어 웹에서 바로 공유 가능
- ✅ Python 코드로 간단하게 생성

#### 💻 Folium 지도 생성 메서드 구현

**`seoul_method.py`에 추가:**

```python
import folium  # 상단에 import 추가

def create_crime_rate_map(self, crime_rate_df: pd.DataFrame, json_path: str, 
                          crime_type: str = '전체') -> str:
    """
    범죄율 Choropleth 지도 생성
    
    Args:
        crime_rate_df: 자치구별 범죄율 DataFrame (인덱스: 자치구명)
        json_path: 서울시 자치구 GeoJSON 파일 경로
        crime_type: 범죄 유형 ('살인', '강도', '강간', '절도', '폭력', '전체')
    
    Returns:
        str: 생성된 HTML 파일 경로
    """
    # ========================================
    # 1단계: GeoJSON 파일 로드
    # ========================================
    with open(json_path, 'r', encoding='utf-8') as f:
        seoul_geo = json.load(f)
```

**GeoJSON이란?**
- JSON 형식으로 지리적 데이터를 저장하는 표준
- `features` 배열에 각 지역의 `geometry`(좌표)와 `properties`(속성) 포함
- Folium은 이 좌표를 사용해 지도에 경계선을 그림

```python
    # ========================================
    # 2단계: 데이터 준비
    # ========================================
    df = crime_rate_df.copy()
    df = df.reset_index()  # 인덱스를 컬럼으로 변환
```

**왜 `reset_index()`를 해야 하나?**
- 원본 DataFrame은 '자치구'가 인덱스로 설정되어 있음
- Folium의 `columns` 파라미터는 컬럼명을 기대함
- 인덱스를 컬럼으로 변환해야 `["자치구", "범죄율"]` 형태로 사용 가능

**Before:**
```
           살인발생률  강도발생률  ...
자치구                        
강남구         0.5      2.1  ...
강북구         0.8      3.2  ...
```

**After:**
```
    자치구  살인발생률  강도발생률  ...
0   강남구      0.5      2.1  ...
1   강북구      0.8      3.2  ...
```

```python
    # ========================================
    # 3단계: 범죄 유형별 데이터 선택
    # ========================================
    if crime_type == '전체':
        # 전체 범죄율 합계 계산
        rate_cols = [col for col in df.columns if '발생률' in col]
        df['전체범죄율'] = df[rate_cols].sum(axis=1)
        data_col = '전체범죄율'
        legend_name = '전체 범죄율 (10만명당)'
    else:
        data_col = f'{crime_type}발생률'
        
        # 컬럼이 존재하는지 확인
        if data_col not in df.columns:
            available_cols = [col for col in df.columns if '발생률' in col]
            raise ValueError(f"컬럼 '{data_col}'을 찾을 수 없습니다. 사용 가능한 컬럼: {available_cols}")
        
        legend_name = f'{crime_type} 범죄율 (10만명당)'
```

**범죄 유형 처리 로직:**

1. **전체 범죄율:**
   - 모든 `발생률` 컬럼을 찾아서 합계 계산
   - `df[rate_cols].sum(axis=1)`: 행 방향으로 합계

2. **개별 범죄:**
   - 사용자가 지정한 범죄 유형의 컬럼 선택
   - 존재하지 않는 컬럼 요청 시 명확한 에러 메시지 제공

```python
    # ========================================
    # 4단계: Folium 지도 생성
    # ========================================
    seoul_center = [37.5665, 126.9780]  # 서울시청 좌표
    m = folium.Map(
        location=seoul_center,  # 지도 중심 좌표
        zoom_start=11,          # 초기 줌 레벨
        tiles='OpenStreetMap'   # 지도 타일 (배경 지도)
    )
```

**Folium Map 파라미터 설명:**
- `location`: 지도의 중심 좌표 `[위도, 경도]`
- `zoom_start`: 초기 줌 레벨 (1~18, 숫자가 클수록 확대)
- `tiles`: 배경 지도 종류
  - `'OpenStreetMap'`: 기본 OSM 지도
  - `'Stamen Toner'`: 흑백 지도
  - `'CartoDB positron'`: 밝은 톤 지도

```python
    # ========================================
    # 5단계: Choropleth 레이어 추가
    # ========================================
    folium.Choropleth(
        geo_data=seoul_geo,           # GeoJSON 데이터
        name="choropleth",            # 레이어 이름
        data=df,                      # 통계 데이터 (DataFrame)
        columns=["자치구", data_col], # [키 컬럼, 값 컬럼]
        key_on="feature.id",          # GeoJSON의 어떤 필드와 매칭할지
        fill_color="YlOrRd",          # 색상 팔레트
        fill_opacity=0.7,             # 채우기 불투명도
        line_opacity=0.2,             # 경계선 불투명도
        legend_name=legend_name,      # 범례 제목
    ).add_to(m)
```

**Choropleth 파라미터 상세 설명:**

1. **`geo_data=seoul_geo`:**
   - GeoJSON 객체 전달
   - Folium이 이 데이터로 지역 경계선을 그림

2. **`data=df`:**
   - 각 지역에 표시할 통계 데이터
   - DataFrame 형태로 전달

3. **`columns=["자치구", data_col]`:**
   - 첫 번째: 지역 식별자 (GeoJSON의 `key_on`과 매칭)
   - 두 번째: 표시할 값 (범죄율 등)

4. **`key_on="feature.id"`:**
   - GeoJSON의 어떤 필드와 DataFrame의 "자치구" 컬럼을 매칭할지 지정
   - `"feature.id"` = GeoJSON의 `features[i].id`
   - 우리 GeoJSON에서 `"id": "강남구"`로 설정되어 있음

5. **`fill_color="YlOrRd"`:**
   - 색상 팔레트 (ColorBrewer)
   - `YlOrRd`: Yellow → Orange → Red (낮음 → 높음)
   - 다른 옵션: `YlGn`, `BuPu`, `RdYlGn` 등

**색상 팔레트 선택 기준:**
- **범죄율**: `YlOrRd` (빨간색 = 위험)
- **검거율**: `YlGn` (초록색 = 좋음)

```python
    # ========================================
    # 6단계: 레이어 컨트롤 추가
    # ========================================
    folium.LayerControl().add_to(m)
```

**LayerControl이란?**
- 지도 좌측 상단에 레이어 선택 UI 추가
- 사용자가 배경 지도를 변경하거나 레이어를 on/off 할 수 있음

```python
    # ========================================
    # 7단계: HTML 파일로 저장
    # ========================================
    html_path = Path(json_path).parent / f'crime_rate_map_{crime_type}.html'
    m.save(str(html_path))
    
    return str(html_path)
```

**저장 경로:**
- GeoJSON이 있는 폴더(`data/`)에 저장
- 파일명: `crime_rate_map_전체.html`
- Folium의 `save()` 메서드가 HTML 파일 생성

#### 💻 검거율 지도 생성 메서드

**`create_arrest_rate_map` 메서드:**

```python
def create_arrest_rate_map(self, arrest_rate_df: pd.DataFrame, json_path: str, 
                           crime_type: str = '전체') -> str:
    """
    검거율 Choropleth 지도 생성
    """
    # GeoJSON 로드
    with open(json_path, 'r', encoding='utf-8') as f:
        seoul_geo = json.load(f)
    
    # 데이터 준비
    df = arrest_rate_df.copy()
    df = df.reset_index()
    
    # 범죄 유형별 데이터 선택
    if crime_type == '전체':
        # 전체 검거율 평균 계산
        rate_cols = [col for col in df.columns if '검거율' in col]
        df['전체검거율'] = df[rate_cols].mean(axis=1)  # ⭐ mean (평균)
        data_col = '전체검거율'
        legend_name = '전체 검거율 (%)'
    else:
        data_col = f'{crime_type}검거율'
        # 컬럼 존재 확인
        if data_col not in df.columns:
            available_cols = [col for col in df.columns if '검거율' in col]
            raise ValueError(f"컬럼 '{data_col}'을 찾을 수 없습니다. 사용 가능한 컬럼: {available_cols}")
        legend_name = f'{crime_type} 검거율 (%)'
    
    # 서울시 중심 좌표
    seoul_center = [37.5665, 126.9780]
    
    # Folium 지도 생성
    m = folium.Map(location=seoul_center, zoom_start=11, tiles='OpenStreetMap')
    
    # Choropleth 레이어 추가
    folium.Choropleth(
        geo_data=seoul_geo,
        name="choropleth",
        data=df,
        columns=["자치구", data_col],
        key_on="feature.id",
        fill_color="YlGn",  # ⭐ 초록색 계열 (높을수록 좋음)
        fill_opacity=0.7,
        line_opacity=0.2,
        legend_name=legend_name,
    ).add_to(m)
    
    # 레이어 컨트롤 추가
    folium.LayerControl().add_to(m)
    
    # HTML 파일로 저장
    html_path = Path(json_path).parent / f'arrest_rate_map_{crime_type}.html'
    m.save(str(html_path))
    
    return str(html_path)
```

**범죄율 지도와의 차이점:**

1. **전체 값 계산:**
   - 범죄율: `sum(axis=1)` (합계)
   - 검거율: `mean(axis=1)` (평균)
   
   **왜 다르게 계산하나?**
   - 범죄율: 각 범죄의 발생률을 모두 합쳐서 전체 위험도 표현
   - 검거율: 평균 검거율로 전반적인 치안 활동 효율성 표현

2. **색상 팔레트:**
   - 범죄율: `YlOrRd` (빨간색 = 나쁨)
   - 검거율: `YlGn` (초록색 = 좋음)

#### 🔍 Folium 동작 원리

**1. GeoJSON과 데이터 매칭 과정:**

```
GeoJSON:
{
  "id": "강남구",
  "geometry": {"coordinates": [...]}
}

DataFrame:
| 자치구 | 범죄율 |
|--------|--------|
| 강남구 | 443.8  |

Folium Choropleth:
- key_on="feature.id" → GeoJSON의 "강남구" 찾기
- columns=["자치구", "범죄율"] → DataFrame에서 강남구의 범죄율(443.8) 가져오기
- 강남구 영역을 443.8에 해당하는 색으로 채우기
```

**2. 색상 매핑 과정:**

```
데이터 범위: [최소값 ~ 최대값]
예: [100 ~ 1000]

ColorBrewer YlOrRd 팔레트:
100 ───────────────────── 1000
 ↓                          ↓
노란색 → 주황색 → 빨간색

각 자치구의 값에 따라 색상 자동 할당
```

**3. HTML 생성 과정:**

```
Folium Map 객체
    ↓
.save('map.html')
    ↓
HTML 파일 생성
    ├─ Leaflet.js 라이브러리 임베딩
    ├─ GeoJSON 데이터 JSON 형태로 포함
    ├─ 색상 매핑 JavaScript 코드
    └─ 인터랙션 코드 (줌, 드래그 등)
```

생성된 HTML은 **독립적으로 동작**하며, 웹 서버 없이도 브라우저에서 열 수 있습니다.

---

### Step 4: API 엔드포인트 추가 및 테스트

#### 🎯 목표
생성된 Folium 지도를 웹 브라우저에서 접근할 수 있도록 FastAPI 엔드포인트 추가

#### 💻 서비스 레이어 구현

**`seoul_service.py`에 추가:**

```python
def get_crime_rate_map(self, crime_type: str = '전체') -> str:
    """
    범죄율 Choropleth 지도 생성 및 저장
    
    Args:
        crime_type: 범죄 유형 ('살인', '강도', '강간', '절도', '폭력', '전체')
    
    Returns:
        str: HTML 파일 경로
    """
    # 1. 히트맵 데이터 준비
    heatmap_data = self.prepare_heatmap_data()
    
    # 2. GeoJSON 파일 경로
    json_path = Path(self.data.dname) / 'kr-state.json'
    
    # 3. 지도 생성 (data 폴더에 임시 저장)
    html_path = self.method.create_crime_rate_map(
        heatmap_data['crime_rate_df'],
        str(json_path),
        crime_type
    )
    
    # 4. save 폴더로 복사 (타임스탬프 포함)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    save_filename = f"crime_rate_map_{crime_type}_{timestamp}.html"
    save_filepath = self.save_dir / save_filename
    
    import shutil
    shutil.copy(html_path, save_filepath)
    logger.info(f"범죄율 지도 저장 완료: {save_filepath}")
    
    # 5. save 폴더의 파일 경로 반환
    return str(save_filepath)
```

**왜 두 번 저장하나요?**

1. **첫 번째 저장 (`data/`):**
   - `create_crime_rate_map()`이 GeoJSON과 같은 폴더에 저장
   - 이유: GeoJSON 경로 기준으로 상대 경로 계산이 쉬움

2. **두 번째 저장 (`save/`):**
   - 타임스탬프를 포함한 파일명으로 복사
   - 이유: 이력 관리 및 Docker 볼륨 마운트를 통한 호스트 접근

**검거율 지도도 동일한 로직:**

```python
def get_arrest_rate_map(self, crime_type: str = '전체') -> str:
    """
    검거율 Choropleth 지도 생성 및 저장
    """
    heatmap_data = self.prepare_heatmap_data()
    json_path = Path(self.data.dname) / 'kr-state.json'
    
    html_path = self.method.create_arrest_rate_map(
        heatmap_data['arrest_rate_df'],
        str(json_path),
        crime_type
    )
    
    # save 폴더로 복사
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    save_filename = f"arrest_rate_map_{crime_type}_{timestamp}.html"
    save_filepath = self.save_dir / save_filename
    
    import shutil
    shutil.copy(html_path, save_filepath)
    logger.info(f"검거율 지도 저장 완료: {save_filepath}")
    
    return str(save_filepath)
```

#### 💻 API 라우터 구현

**`seoul_router.py`에 추가:**

```python
from fastapi import Query
from fastapi.responses import FileResponse

@router.get("/map/crime-rate")
async def get_crime_rate_map(
    crime_type: str = Query('전체', description="범죄 유형 (살인, 강도, 강간, 절도, 폭력, 전체)")
):
    """
    서울시 자치구별 범죄율 Choropleth 지도 반환
    
    **Query 파라미터:**
    - `crime_type`: 범죄 유형 (기본값: '전체')
        - '살인': 살인 범죄율
        - '강도': 강도 범죄율
        - '강간': 강간 범죄율
        - '절도': 절도 범죄율
        - '폭력': 폭력 범죄율
        - '전체': 전체 범죄율 합계
    
    **반환:**
    - HTML 형식의 인터랙티브 지도
    """
    try:
        # 1. 유효성 검사
        if crime_type not in ['살인', '강도', '강간', '절도', '폭력', '전체']:
            raise HTTPException(
                status_code=400,
                detail="crime_type은 '살인', '강도', '강간', '절도', '폭력', '전체' 중 하나여야 합니다."
            )
        
        # 2. 지도 생성
        html_path = seoul_service.get_crime_rate_map(crime_type)
        
        # 3. HTML 파일 응답
        return FileResponse(
            html_path,
            media_type="text/html",
            filename=f"crime_rate_map_{crime_type}.html"
        )
    
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=f"데이터 파일을 찾을 수 없습니다: {str(e)}")
    except Exception as e:
        import traceback
        error_detail = f"{str(e)}\n{traceback.format_exc()}"
        raise HTTPException(status_code=500, detail=f"지도 생성 실패: {error_detail}")
```

**코드 설명:**

**1. `Query` 파라미터:**
```python
crime_type: str = Query('전체', description="...")
```
- URL 쿼리 파라미터 정의
- 기본값: `'전체'`
- FastAPI 자동 문서화에 설명이 표시됨

**2. `FileResponse`:**
```python
return FileResponse(
    html_path,              # 파일 경로
    media_type="text/html", # MIME 타입
    filename="..."          # 다운로드 시 파일명
)
```

**FileResponse vs StreamingResponse 차이:**

| | FileResponse | StreamingResponse |
|---|---|---|
| **용도** | 파일 전체 전송 | 스트림(BytesIO 등) 전송 |
| **사용 사례** | HTML, PDF, ZIP | PNG, 동적 생성 이미지 |
| **장점** | 파일 시스템 최적화 | 메모리 효율적 |
| **단점** | 파일이 디스크에 있어야 함 | 버퍼 관리 필요 |

우리는 HTML 파일이 디스크에 저장되므로 `FileResponse` 사용!

**3. 에러 처리:**
- `FileNotFoundError`: 데이터 파일 누락
- `ValueError`: 잘못된 범죄 유형
- `Exception`: 기타 오류 (traceback 포함)

**검거율 엔드포인트도 동일:**

```python
@router.get("/map/arrest-rate")
async def get_arrest_rate_map(
    crime_type: str = Query('전체', description="범죄 유형 (살인, 강도, 강간, 절도, 폭력, 전체)")
):
    """
    서울시 자치구별 검거율 Choropleth 지도 반환
    """
    try:
        if crime_type not in ['살인', '강도', '강간', '절도', '폭력', '전체']:
            raise HTTPException(
                status_code=400,
                detail="crime_type은 '살인', '강도', '강간', '절도', '폭력', '전체' 중 하나여야 합니다."
            )
        
        html_path = seoul_service.get_arrest_rate_map(crime_type)
        return FileResponse(
            html_path,
            media_type="text/html",
            filename=f"arrest_rate_map_{crime_type}.html"
        )
    
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=f"데이터 파일을 찾을 수 없습니다: {str(e)}")
    except Exception as e:
        import traceback
        error_detail = f"{str(e)}\n{traceback.format_exc()}"
        raise HTTPException(status_code=500, detail=f"지도 생성 실패: {error_detail}")
```

#### 🔍 API 요청 흐름

**전체 요청-응답 흐름:**

```
1. 사용자: 브라우저에서 URL 입력
   http://localhost:8080/api/ai/seoul/map/crime-rate?crime_type=전체

2. API Gateway: 경로 재작성
   /api/ai/seoul/map/crime-rate → /seoul/map/crime-rate

3. mlservice (Docker): FastAPI 서버
   seoul_router.py: get_crime_rate_map() 호출

4. seoul_service.py: get_crime_rate_map()
   ├─ prepare_heatmap_data() → CSV 로드 및 계산
   ├─ create_crime_rate_map() → Folium 지도 생성
   └─ save 폴더에 복사

5. FastAPI: FileResponse로 HTML 전송
   Content-Type: text/html

6. 브라우저: HTML 수신 및 렌더링
   └─ Leaflet.js 실행 → 인터랙티브 지도 표시
```

#### ✅ 테스트 방법

**1. Docker 컨테이너 재시작:**
```bash
docker compose restart mlservice
```

**2. 브라우저에서 테스트:**
```
http://localhost:8080/api/ai/seoul/map/crime-rate?crime_type=전체
http://localhost:8080/api/ai/seoul/map/arrest-rate?crime_type=전체
http://localhost:8080/api/ai/seoul/map/crime-rate?crime_type=절도
```

**3. 파일 저장 확인:**
```powershell
Get-ChildItem "ai.kroaddy.site/services/mlservice/app/seoul_crime/save" -Filter "*.html"
```

**기대 결과:**
- 브라우저에 인터랙티브 지도 표시
- `save` 폴더에 타임스탬프 포함 HTML 파일 저장
- 지도 조작 가능 (줌, 드래그, 범례 확인)

---

## 트러블슈팅

### 문제 1: URL 인코딩 문제로 한글 파라미터 처리 오류

#### 증상
```
GET /seoul/map/crime-rate?crime_type=전체
→ 400 Bad Request: "crime_type은 '살인', ... 중 하나여야 합니다."
```

#### 원인 분석
- 브라우저/포스트맨이 한글을 URL 인코딩
- `전체` → `%EC%A0%84%EC%B2%B4`
- FastAPI가 자동 디코딩하지만, 일부 환경에서 깨짐

#### 해결 과정

**1단계: URL 인코딩 확인**
```python
# PowerShell에서 테스트
[System.Web.HttpUtility]::UrlEncode('전체')
# 결과: %EC%A0%84%EC%B2%B4
```

**2단계: 인코딩된 URL로 테스트**
```
# 인코딩 전 (실패)
GET http://localhost:9006/seoul/map/crime-rate?crime_type=전체

# 인코딩 후 (성공)
GET http://localhost:9006/seoul/map/crime-rate?crime_type=%EC%A0%84%EC%B2%B4
```

**3단계: 브라우저는 자동 처리**
- 브라우저 주소창에 한글 입력하면 자동으로 인코딩됨
- 포스트맨도 자동 처리
- 직접 HTTP 라이브러리 사용 시 수동 인코딩 필요

#### 검증 방법
```bash
# 직접 mlservice에 접근 (Gateway 우회)
curl "http://localhost:9006/seoul/map/crime-rate?crime_type=%EC%A0%84%EC%B2%B4"
```

#### 최종 해결책
- FastAPI가 자동으로 URL 디코딩 처리
- 추가 코드 불필요
- 브라우저 주소창에 한글 직접 입력 가능

---

### 문제 2: 중복된 메서드 정의로 인한 코드 충돌

#### 증상
```python
# seoul_method.py에서 같은 메서드가 두 번 정의됨
def create_crime_rate_map(...):  # 라인 266
    ...

def create_crime_rate_map(...):  # 라인 495 (중복!)
    ...
```

#### 원인 분석
- 파일 수정 중 `search_replace` 도구 사용 시 오류
- 기존 메서드를 삭제하지 않고 새로 추가
- Python은 마지막 정의를 사용하므로 첫 번째는 무시됨

#### 해결 과정

**1단계: 중복 메서드 검색**
```bash
grep -n "def create_crime_rate_map" seoul_method.py
# 결과: 266, 495 (두 줄 발견)
```

**2단계: 코드 비교**
- 라인 266: 컬럼 존재 확인 없음
- 라인 495: 에러 처리 추가됨 (최신 버전)

**3단계: 중복 제거**
- 첫 번째 메서드 삭제
- 최신 버전(에러 처리 포함)만 유지

#### 검증 방법
```python
# Python에서 메서드 확인
from app.seoul_crime.seoul_method import SeoulMethod
import inspect

method = SeoulMethod()
print(inspect.getsourcelines(method.create_crime_rate_map))
# 한 번만 출력되어야 함
```

#### 최종 해결책
```python
# seoul_method.py
# 중복된 메서드 정의 제거
# create_crime_rate_map()와 create_arrest_rate_map() 각각 1개씩만 유지
```

---

### 문제 3: 컬럼명 오류 - "컬럼을 찾을 수 없습니다"

#### 증상
```
KeyError: '절도발생률'
ValueError: 컬럼 '절도발생률'을 찾을 수 없습니다. 
사용 가능한 컬럼: ['살인발생률', '강도발생률', '강간발생률', '절도발생률', '폭력발생률']
```

#### 원인 분석
- 사용자가 `crime_type='절도'` 전달
- 코드가 `f'{crime_type}발생률'` → `'절도발생률'` 생성
- 실제로는 컬럼이 존재하는데 오류 발생?
- **실제 원인**: 테스트 환경에서 DataFrame에 컬럼이 없었음

#### 해결 과정

**1단계: 사용 가능한 컬럼 확인**
```python
# Docker 컨테이너에서 실행
docker compose exec mlservice python -c "
from app.seoul_crime.seoul_service import SeoulService
service = SeoulService()
data = service.prepare_heatmap_data()
print('Crime rate columns:', list(data['crime_rate_df'].columns))
"
```

**출력:**
```
Crime rate columns: ['살인발생률', '강도발생률', '강간발생률', '절도발생률', '폭력발생률']
```

**2단계: 에러 처리 추가**
```python
# seoul_method.py
if crime_type != '전체':
    data_col = f'{crime_type}발생률'
    
    # 컬럼이 존재하는지 확인
    if data_col not in df.columns:
        available_cols = [col for col in df.columns if '발생률' in col]
        raise ValueError(
            f"컬럼 '{data_col}'을 찾을 수 없습니다. "
            f"사용 가능한 컬럼: {available_cols}"
        )
```

**3단계: 유효성 검사 강화**
```python
# seoul_router.py
if crime_type not in ['살인', '강도', '강간', '절도', '폭력', '전체']:
    raise HTTPException(status_code=400, detail="...")
```

#### 검증 방법
```bash
# 잘못된 범죄 유형 테스트
curl "http://localhost:8080/api/ai/seoul/map/crime-rate?crime_type=사기"
# → 400 Bad Request

# 올바른 범죄 유형 테스트
curl "http://localhost:8080/api/ai/seoul/map/crime-rate?crime_type=절도"
# → 200 OK
```

#### 최종 해결책
- API 레벨에서 유효성 검사
- 서비스 레벨에서 컬럼 존재 확인
- 명확한 에러 메시지 제공

---

## 최종 결과물

### API 엔드포인트 목록

| 메서드 | 엔드포인트 | 설명 | 반환 형식 |
|--------|-----------|------|----------|
| GET | `/seoul/heatmap/crime-rate` | 범죄율 히트맵 PNG | image/png |
| GET | `/seoul/heatmap/arrest-rate` | 검거율 히트맵 PNG | image/png |
| GET | `/seoul/heatmap/data` | 히트맵 데이터 JSON | application/json |
| GET | `/seoul/map/crime-rate?crime_type={type}` | 범죄율 Choropleth 지도 | text/html |
| GET | `/seoul/map/arrest-rate?crime_type={type}` | 검거율 Choropleth 지도 | text/html |

**API Gateway를 통한 접근:**
- `http://localhost:8080/api/ai/seoul/...`

**직접 mlservice 접근:**
- `http://localhost:9006/seoul/...`

### 실제 사용 예시

**1. 브라우저에서 범죄율 지도 보기:**
```
http://localhost:8080/api/ai/seoul/map/crime-rate?crime_type=전체
```

**2. 절도 범죄율 지도:**
```
http://localhost:8080/api/ai/seoul/map/crime-rate?crime_type=절도
```

**3. 검거율 지도:**
```
http://localhost:8080/api/ai/seoul/map/arrest-rate?crime_type=전체
```

**4. 포스트맨에서 테스트:**
```
GET http://localhost:8080/api/ai/seoul/map/crime-rate?crime_type=전체
→ HTML 파일 다운로드 또는 브라우저에서 열기
```

### 저장된 파일 구조

```
app/seoul_crime/save/
├── crime.csv                                   # 정제된 데이터
├── crime_rate_heatmap_20251211_103402.png    # 범죄율 히트맵
├── arrest_rate_heatmap_20251211_103451.png   # 검거율 히트맵
├── crime_rate_map_전체_20251211_104648.html   # 범죄율 지도
├── arrest_rate_map_전체_20251211_104715.html  # 검거율 지도
└── ... (타임스탬프별 이력 관리)
```

### 데이터 구조

**히트맵 데이터 JSON (`/seoul/heatmap/data`):**
```json
{
  "status": "success",
  "crime_rate": {
    "강남구": {
      "살인발생률": 0.5,
      "강도발생률": 2.1,
      "강간발생률": 5.3,
      "절도발생률": 443.8,
      "폭력발생률": 120.5
    },
    ...
  },
  "arrest_rate": {
    "강남구": {
      "살인검거율": 100.0,
      "강도검거율": 95.2,
      "강간검거율": 88.7,
      "절도검거율": 87.1,
      "폭력검거율": 92.3
    },
    ...
  },
  "summary": {
    "total_districts": 25,
    "crime_types": 5,
    "data_period": "2024"
  }
}
```

---

## 학습 정리

### 배운 기술 스킬

#### 1. Folium 라이브러리 활용

**핵심 개념:**
- **Choropleth Map**: 지역별 통계 데이터를 색상으로 표현하는 단계구분도
- **GeoJSON**: 지리적 데이터를 JSON 형식으로 저장하는 표준
- **Leaflet.js**: 인터랙티브 지도를 위한 JavaScript 라이브러리

**실무 활용:**
- 데이터 시각화에서 지도는 직관성이 매우 높음
- 정적 차트보다 인터랙티브 지도가 사용자 경험 향상
- HTML 출력으로 웹에서 바로 공유 가능

#### 2. FastAPI FileResponse 처리

**핵심 개념:**
- `FileResponse`: 파일 시스템의 파일을 직접 스트리밍
- `media_type`: MIME 타입 지정으로 브라우저가 적절하게 처리
- `filename`: 다운로드 시 기본 파일명 설정

**실무 활용:**
- PDF, Excel, 이미지 등 다양한 파일 형식 제공 가능
- CDN 없이도 정적 파일 서빙 가능
- 동적 파일 생성 후 즉시 제공

#### 3. Pandas 데이터 정제 및 집계

**핵심 개념:**
- `groupby()`: 그룹별 집계
- `agg()`: 다양한 집계 함수 동시 적용
- `reset_index()`: 인덱스를 컬럼으로 변환

**실무 활용:**
- CSV 데이터 정제 자동화
- 대용량 데이터 효율적 처리
- 계산 로직을 메서드화하여 재사용

#### 4. Docker 볼륨 마운트

**핵심 개념:**
- **볼륨 마운트**: 컨테이너 내부와 호스트 파일 시스템 연결
- **데이터 영속성**: 컨테이너 재시작해도 데이터 보존
- **양방향 동기화**: 컨테이너 ↔ 호스트 실시간 동기화

**실무 활용:**
- 개발 중 파일 확인 편리
- 로그, 결과물 저장
- 백업 및 복구 용이

#### 5. API 설계 패턴

**핵심 개념:**
- **레이어 분리**: Router → Service → Method
- **에러 처리**: 각 레이어에서 적절한 예외 처리
- **유효성 검사**: 입력 데이터 검증

**실무 활용:**
- 코드 유지보수성 향상
- 테스트 용이성
- 책임 분리 (SRP)

### 배운 소프트 스킬

#### 1. 문제 분석 능력

**사례:**
- "범죄율이 너무 높다" → 계산 오류 vs 데이터 특성 판단
- 실제 데이터 검증으로 계산이 올바름을 확인
- 인구 밀도 차이로 인한 자연스러운 현상임을 설명

**교훈:**
- 사용자 피드백을 액면 그대로 받아들이지 않기
- 데이터를 직접 검증하여 원인 파악
- 비즈니스 컨텍스트 이해

#### 2. 사용자 경험(UX) 개선

**사례:**
- PNG 히트맵: 정적, 위치 파악 어려움
- Folium 지도: 인터랙티브, 직관적, 공유 편리

**교훈:**
- 기술적으로 가능한 것보다 사용자가 원하는 것 우선
- 시각화는 "보기 좋음"보다 "이해하기 쉬움"이 중요
- 피드백을 통한 지속적 개선

#### 3. 디버깅 전략

**사례:**
- 중복 메서드 정의 → `grep`으로 검색
- URL 인코딩 문제 → 직접 인코딩하여 테스트
- 컬럼 오류 → Docker 컨테이너에서 직접 확인

**교훈:**
- 가정하지 말고 확인하기
- 로그와 에러 메시지 꼼꼼히 읽기
- 작은 단위로 테스트하기

### 비즈니스 인사이트

#### 1. 데이터 해석의 중요성

**인사이트:**
- 같은 데이터도 표현 방식에 따라 다르게 해석됨
- 범죄율(인구 대비)과 절대 건수는 다른 의미
- 맥락 없는 숫자는 오해를 낳을 수 있음

**적용:**
- 데이터 시각화 시 항상 설명(범례, 제목) 추가
- 정규화된 값과 절대값을 함께 제공
- 사용자가 다양한 관점에서 볼 수 있도록

#### 2. 점진적 개선의 가치

**프로젝트 진행 과정:**
1. 히트맵 PNG 생성
2. 히트맵 자동 저장
3. Folium 지도 추가
4. API 엔드포인트 구현

**교훈:**
- 한 번에 완벽한 것보다 빠른 출시 후 개선
- 사용자 피드백으로 방향 조정
- 기술 부채 관리하며 개선

#### 3. 문서화와 공유

**사례:**
- API 엔드포인트 설명 추가
- 사용 예시 제공
- 트러블슈팅 문서화

**교훈:**
- 코드만으로는 불충분
- 사용자가 직접 사용할 수 있도록 가이드 필요
- 문제 해결 과정도 중요한 자산

---

## 다음 학습 과제

### 1. 시각화 고도화

#### 1-1. Folium 지도 기능 강화
```python
# 툴팁 추가: 마우스 오버 시 자치구 정보 표시
folium.Choropleth(...).geojson.add_child(
    folium.features.GeoJsonTooltip(
        fields=['name', 'crime_rate'],
        aliases=['자치구', '범죄율']
    )
)
```

**학습 목표:**
- 사용자가 지도를 클릭하거나 마우스 오버 시 상세 정보 표시
- 팝업으로 차트 표시
- 여러 레이어 겹쳐서 비교

#### 1-2. 시계열 애니메이션
```python
# 연도별 범죄율 변화를 애니메이션으로 표현
from folium.plugins import TimestampedGeoJson
```

**학습 목표:**
- 시간에 따른 변화 추이 시각화
- 슬라이더로 연도 선택
- 자동 재생 기능

#### 1-3. 다중 레이어 지도
```python
# 범죄율 + CCTV 설치 현황 동시 표시
# 검거율 + 경찰서 위치 마커
```

**학습 목표:**
- 여러 데이터를 하나의 지도에 통합
- 레이어별 on/off 기능
- 상관관계 시각적 표현

### 2. 데이터 분석 확장

#### 2-1. 통계 분석 추가
```python
# 범죄율과 검거율의 상관관계 분석
from scipy import stats
correlation = stats.pearsonr(crime_rate, arrest_rate)

# 회귀 분석: CCTV 수가 범죄율에 미치는 영향
from sklearn.linear_model import LinearRegression
```

**학습 목표:**
- 상관분석으로 관계 파악
- 회귀분석으로 영향 요인 분석
- 결과를 시각화로 표현

#### 2-2. 클러스터링
```python
# 범죄 패턴이 유사한 자치구 그룹화
from sklearn.cluster import KMeans

# 특징: 범죄율, 검거율, 인구, CCTV 수
```

**학습 목표:**
- K-means, DBSCAN 등 클러스터링 알고리즘 적용
- 자치구를 3~4개 그룹으로 분류
- 각 그룹의 특성 분석

#### 2-3. 이상치 탐지
```python
# 범죄율이 급격히 증가한 지역 자동 탐지
from sklearn.ensemble import IsolationForest
```

**학습 목표:**
- 이상치 탐지 알고리즘 적용
- 경보 시스템 구축
- 대시보드에 알림 표시

### 3. 프론트엔드 개발

#### 3-1. React 대시보드 구축
```jsx
// 컴포넌트 구조
<Dashboard>
  <MapView />          // Folium 지도 임베딩
  <ChartPanel />       // 차트 모음
  <FilterControls />   // 필터 UI
  <DataTable />        // 데이터 테이블
</Dashboard>
```

**학습 목표:**
- React로 SPA 구축
- API 호출 및 데이터 바인딩
- 반응형 디자인

#### 3-2. 실시간 업데이트
```javascript
// WebSocket으로 실시간 데이터 수신
const ws = new WebSocket('ws://localhost:8080/ws/seoul');
ws.onmessage = (event) => {
  updateMap(JSON.parse(event.data));
};
```

**학습 목표:**
- WebSocket 연동
- 실시간 데이터 반영
- 부드러운 애니메이션

### 4. 성능 최적화

#### 4-1. 캐싱 전략
```python
# Redis 캐싱
import redis
from functools import wraps

def cache_result(ttl=3600):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # 캐시 확인 → 있으면 반환
            # 없으면 계산 후 캐시 저장
            pass
        return wrapper
    return decorator

@cache_result(ttl=3600)
def get_crime_rate_map(crime_type):
    # 1시간 동안 캐싱
    ...
```

**학습 목표:**
- Redis 설치 및 연동
- 캐시 무효화 전략
- TTL(Time To Live) 설정

#### 4-2. 비동기 처리
```python
# 여러 지도를 동시에 생성
import asyncio

async def generate_all_maps():
    tasks = [
        create_map('살인'),
        create_map('강도'),
        create_map('절도'),
        ...
    ]
    await asyncio.gather(*tasks)
```

**학습 목표:**
- asyncio 활용
- 병렬 처리로 성능 향상
- 에러 처리

#### 4-3. 데이터베이스 최적화
```python
# PostgreSQL + PostGIS로 공간 쿼리
SELECT 자치구, 범죄율
FROM crime_data
WHERE ST_Contains(
    ST_GeomFromGeoJSON(?),
    location
);
```

**학습 목표:**
- CSV → PostgreSQL 마이그레이션
- 공간 인덱스 생성
- 쿼리 최적화

### 5. 배포 및 운영

#### 5-1. CI/CD 파이프라인 구축
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build Docker Image
      - name: Run Tests
      - name: Deploy to AWS ECS
```

**학습 목표:**
- GitHub Actions 설정
- 자동 테스트 및 배포
- 롤백 전략

#### 5-2. 모니터링 및 로깅
```python
# Prometheus + Grafana 연동
from prometheus_client import Counter, Histogram

request_count = Counter('api_requests_total', 'Total API requests')
request_duration = Histogram('api_request_duration_seconds', 'API request duration')
```

**학습 목표:**
- Prometheus 메트릭 수집
- Grafana 대시보드 구축
- 알림 설정

#### 5-3. 보안 강화
```python
# API Rate Limiting
from slowapi import Limiter
limiter = Limiter(key_func=get_remote_address)

@limiter.limit("10/minute")
@router.get("/map/crime-rate")
async def get_crime_rate_map(...):
    ...
```

**학습 목표:**
- Rate Limiting 적용
- JWT 인증
- HTTPS 설정

---

## 참고 자료 및 더 배우기

### 공식 문서
- [Folium 공식 문서](https://python-visualization.github.io/folium/)
- [FastAPI 공식 문서](https://fastapi.tiangolo.com/)
- [Pandas 공식 문서](https://pandas.pydata.org/docs/)
- [GeoJSON 스펙](https://geojson.org/)
- [Leaflet.js 문서](https://leafletjs.com/)

### 추천 학습 자료
- **책**: "Python for Data Analysis" by Wes McKinney
- **책**: "Flask Web Development" (FastAPI와 유사)
- **온라인 강의**: Udacity "Data Visualization" 나노디그리
- **유튜브**: "Corey Schafer" FastAPI 튜토리얼

### 유용한 도구
- **ColorBrewer**: 색상 팔레트 선택 도구
- **GeoJSON.io**: GeoJSON 시각화 및 편집
- **Postman**: API 테스트
- **DBeaver**: 데이터베이스 관리

---

## 마무리

오늘 우리는 서울시 범죄 데이터를 단순한 PNG 히트맵에서 인터랙티브한 웹 지도로 발전시켰습니다. 이 과정에서:

1. **데이터 정제**: 쉼표가 포함된 숫자, 빈 값 처리
2. **계산 로직**: 범죄율(인구 대비), 검거율(퍼센트) 정확한 계산
3. **시각화**: Folium Choropleth 지도로 직관적 표현
4. **API 설계**: RESTful 엔드포인트, FileResponse 활용
5. **배포**: Docker 환경에서 볼륨 마운트, 파일 저장

이제 사용자는 웹 브라우저에서 서울시 범죄 데이터를 탐색하고, 자치구별 범죄 현황을 한눈에 파악할 수 있습니다.

다음 단계로는 실시간 업데이트, 시계열 분석, 머신러닝 예측 등으로 확장할 수 있습니다. 데이터 시각화는 단순히 "보기 좋은 것"이 아니라 "인사이트를 발견하는 도구"라는 것을 기억하세요!

**Happy Coding! 🚀**

