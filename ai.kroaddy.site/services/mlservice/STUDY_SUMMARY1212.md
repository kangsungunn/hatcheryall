# Samsung WordCloud FastAPI 통합 및 딥러닝 준비 - 학습 정리

## 📚 학습 목차

1. [Samsung WordCloud OOP 리팩토링](#1-samsung-wordcloud-oop-리팩토링)
2. [FastAPI 통합](#2-fastapi-통합)
3. [404 오류 해결 과정](#3-404-오류-해결-과정)
4. [Docker 환경 설정](#4-docker-환경-설정)
5. [딥러닝 준비 (Review 감정 분석)](#5-딥러닝-준비-review-감정-분석)

---

## 1. Samsung WordCloud OOP 리팩토링

### 1.1 기존 문제점
- 절차적 프로그래밍 방식의 함수들
- 재사용성 및 유지보수성 부족
- 상태 관리 어려움

### 1.2 OOP 구조로 변경

#### 클래스 구조
```python
class SamsungWordCloud:
    def __init__(self, file_path, stopword_path):
        self.okt = Okt()  # 한국어 형태소 분석기
        self.file_path = file_path
        self.stopword_path = Path(stopword_path)
        self.font_path = nlp_data_dir / 'D2Coding.ttf'
        self.save_dir = Path(__file__).parent / 'save'
        
        # 내부 상태 저장
        self.raw_text = None
        self.hangeul_text = None
        self.tokens = None
        self.noun_texts = None
        self.filtered_texts = None
```

#### 주요 메서드
1. `read_file()` - 파일 읽기
2. `extract_hangeul()` - 한글만 추출
3. `change_token()` - 토큰화
4. `extract_noun()` - 명사 추출
5. `read_stopword()` - 스탑워드 읽기
6. `remove_stopword()` - 스탑워드 제거
7. `find_freq()` - 빈도 분석
8. `draw_wordcloud()` - 워드클라우드 생성

### 1.3 Emma와의 구조 비교

**Emma (영어 NLP)**
- NLTK 사용
- FreqDist로 빈도 분석
- `generate_from_frequencies()` 사용

**Samsung (한국어 NLP)**
- Konlpy (Okt) 사용
- 명사 추출 후 FreqDist
- `generate()` 메서드 사용
- 한글 폰트 필수 (D2Coding.ttf)

---

## 2. FastAPI 통합

### 2.1 라우터 구조

#### 파일 구조
```
app/
├── main.py                    # 메인 애플리케이션
└── nlp/
    ├── nlp_router.py         # NLP 라우터
    ├── emma/
    │   └── emma_wordcloud.py
    └── samsung/
        └── samsung_wordcloud.py
```

#### 라우터 등록 패턴
```python
# nlp_router.py
router = APIRouter(prefix="/nlp", tags=["nlp"])

# main.py
app.include_router(
    nlp_router,
    prefix="",  # 빈 문자열! (nlp_router에서 이미 /nlp 설정)
    tags=["nlp"]
)
```

### 2.2 엔드포인트 구조

#### Samsung 워드클라우드 생성
```
GET /nlp/samsung
Query Parameters:
  - file_path: 분석할 파일 경로 (기본값: data/kr-Report_2018.txt)
  - stopword_path: 스탑워드 파일 경로
  - width: 이미지 너비 (기본값: 1200)
  - height: 이미지 높이 (기본값: 1200)
  - relative_scaling: 상대적 크기 조정 (기본값: 0.2)
  - background_color: 배경색 (기본값: white)

Response: PNG 이미지
```

#### Samsung 통계 조회
```
GET /nlp/samsung/stats
Query Parameters:
  - file_path: 분석할 파일 경로
  - stopword_path: 스탑워드 파일 경로
  - top_n: 상위 N개 단어 (기본값: 10)

Response: JSON
{
  "status": "success",
  "total_words": 1234,
  "top_words": [
    {"word": "삼성전자", "count": 150},
    ...
  ]
}
```

### 2.3 게이트웨이 라우팅

#### API Gateway 설정 (application.yaml)
```yaml
# NLP Service 라우팅
- id: nlp-service-route
  uri: http://mlservice:9006
  predicates:
    - Path=/api/ml/nlp/**
  filters:
    - RewritePath=/api/ml/nlp/(?<segment>.*), /nlp/${segment}
```

#### URL 매핑
- 외부: `http://localhost:8080/api/ml/nlp/samsung`
- 내부: `http://mlservice:9006/nlp/samsung`

---

## 3. 404 오류 해결 과정

### 3.1 문제 증상
```
GET http://localhost:8080/api/ml/nlp/samsung
→ 404 Not Found
```

### 3.2 진단 단계

#### Step 1: 루트 엔드포인트 확인
```
GET http://localhost:9006/
```
확인 사항:
- `nlp_router_loaded`: true 여부
- `all_nlp_paths`: "/nlp/samsung" 포함 여부

**증상**: 디버깅 필드가 없음 → 서버 재시작 안 됨

#### Step 2: 직접 포트 테스트
```
GET http://localhost:9006/nlp/samsung
```
- 성공: 라우터 정상, 게이트웨이 문제
- 404: 라우터 등록 안 됨

#### Step 3: 게이트웨이 경유 테스트
```
GET http://localhost:8080/api/ml/nlp/samsung
```

### 3.3 해결 방법

#### 문제 1: 서버 재시작 안 됨
**증상**: 코드 변경했는데 반영 안 됨

**해결**:
```powershell
# __pycache__ 삭제
Remove-Item -Recurse -Force ai.kroaddy.site\services\mlservice\app\nlp\__pycache__
Remove-Item -Recurse -Force ai.kroaddy.site\services\mlservice\app\__pycache__

# Docker 재시작
docker-compose restart mlservice
```

#### 문제 2: Java 의존성 없음
**증상**:
```
JVMNotFoundException: No JVM shared library file (libjvm.so) found.
```

**원인**: konlpy의 Okt는 Java 필요

**해결**: Dockerfile 수정 (다음 섹션 참조)

#### 문제 3: Save 폴더에 이미지 안 생김
**증상**: 워드클라우드는 생성되지만 로컬 save 폴더에 파일 없음

**원인**: Docker volume 마운트 설정 없음

**해결**: docker-compose.yaml에 volume 추가

---

## 4. Docker 환경 설정

### 4.1 Dockerfile 수정

#### Java 설치 추가
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Java 및 한글 폰트 설치 (konlpy가 Java 필요)
RUN apt-get update && apt-get install -y \
    fonts-nanum \
    fontconfig \
    default-jdk \
    && rm -rf /var/lib/apt/lists/* \
    && fc-cache -fv

# JAVA_HOME 환경 변수 설정
ENV JAVA_HOME=/usr/lib/jvm/default-java
ENV PATH="${JAVA_HOME}/bin:${PATH}"
```

**왜 Java가 필요한가?**
- `konlpy`는 Java 기반 한국어 형태소 분석 라이브러리
- `Okt`, `Komoran`, `Hannanum` 등은 모두 Java로 구현됨
- `jpype1`을 통해 Python에서 Java 라이브러리 호출
- JVM (Java Virtual Machine) 필요

### 4.2 Docker Compose Volume 설정

#### 수정 전
```yaml
volumes:
  - ./ai.kroaddy.site/services/mlservice/app/nlp/save:/app/app/nlp/save
```

#### 수정 후
```yaml
volumes:
  - ./ai.kroaddy.site/services/mlservice/app/nlp/save:/app/app/nlp/save
  - ./ai.kroaddy.site/services/mlservice/app/nlp/emma/save:/app/app/nlp/emma/save
  - ./ai.kroaddy.site/services/mlservice/app/nlp/samsung/save:/app/app/nlp/samsung/save
```

**Volume 매핑 이해**:
- 형식: `<호스트경로>:<컨테이너경로>`
- 호스트: 로컬 PC의 실제 폴더
- 컨테이너: Docker 내부 경로
- 양방향 동기화: 컨테이너에서 생성된 파일이 호스트에도 나타남

### 4.3 재빌드 명령어

```bash
# 완전 재빌드
docker-compose down
docker-compose up -d --build mlservice

# 특정 서비스만 재빌드
docker-compose up -d --build mlservice

# 로그 확인
docker-compose logs -f mlservice

# 컨테이너 내부 접속 (디버깅)
docker exec -it mlservice bash
```

---

## 5. 딥러닝 준비 (Review 감정 분석)

### 5.0 딥러닝 기초 개념 (초보자용)

#### 딥러닝이란?
딥러닝은 **인공 신경망**을 여러 층으로 쌓아서 복잡한 패턴을 학습하는 기술입니다.

**전통적인 프로그래밍 vs 딥러닝**
```
📌 전통적인 프로그래밍:
입력 → [규칙(개발자가 작성)] → 출력
예: if "좋아요" in text: return "긍정"

📌 딥러닝:
입력 + 정답 → [모델이 규칙 학습] → 출력
예: "정말 좋아요!" + 긍정 라벨 → 모델이 패턴 학습
```

#### 자연어 처리 (NLP)에서의 딥러닝
컴퓨터는 숫자만 이해하므로 텍스트를 숫자로 변환해야 합니다:

```
텍스트: "이 제품 좋아요"
    ↓ (토큰화)
["이", "제품", "좋아요"]
    ↓ (숫자 변환)
[1234, 5678, 9012]
    ↓ (딥러닝 모델)
[0.9, 0.05, 0.05]  (긍정 90%, 부정 5%, 중립 5%)
```

#### Transformer란?
2017년 Google이 발표한 **주의(Attention)** 메커니즘 기반 모델:
- 문장 전체를 한번에 볼 수 있음 (이전 모델은 순차적으로만 봄)
- "좋아요"라는 단어가 "제품"과 "배송" 중 어디와 관련있는지 파악
- BERT, GPT, KoELECTRA 등의 기반 기술

#### BERT vs ELECTRA
**BERT (2018)**:
- Masked Language Model: 문장의 일부를 가리고 맞추는 학습
- 예: "이 제품 [MASK] 좋아요" → "정말"을 예측

**ELECTRA (2020)**:
- Replaced Token Detection: 가짜 단어를 찾아내는 학습
- 예: "이 제품 별로 좋아요" → "별로"가 이상함을 감지
- BERT보다 효율적 (적은 데이터로 더 높은 성능)

### 5.1 프로젝트 구조

```
app/nlp/review/
├── __init__.py
├── emotion_inference.py        # 감정 분석 추론 코드 (우리가 구현할 부분)
├── koelectra_local/            # 사전 학습 모델 (이미 학습된 뇌)
│   ├── config.json            # 모델 설정 (뇌의 구조 정의)
│   ├── pytorch_model.bin      # 학습된 가중치 (뇌의 지식)
│   ├── vocab.txt              # 어휘 사전 (알고 있는 단어 목록)
│   └── tokenizer_config.json  # 토크나이저 설정 (단어 자르는 방법)
└── corpus/                     # 학습/테스트 데이터 (연습 문제집)
    ├── 95505.json             # 리뷰 1개 (텍스트 + 정답 라벨)
    ├── 95508.json
    └── ... (총 53개의 리뷰 데이터)
```

#### 왜 이런 구조가 필요한가?
```
┌─────────────────────────────────────────────────────────┐
│                   딥러닝 모델 = 훈련된 뇌                │
├─────────────────────────────────────────────────────────┤
│ 1. config.json         → 뇌의 크기와 구조 정의          │
│ 2. pytorch_model.bin   → 학습으로 얻은 지식 (가중치)    │
│ 3. vocab.txt           → 아는 단어들 (단어장)           │
│ 4. tokenizer_config    → 문장을 단어로 자르는 방법      │
│ 5. corpus/             → 연습 문제 (학습 데이터)        │
└─────────────────────────────────────────────────────────┘
```

### 5.2 KoELECTRA 모델 이해

#### ELECTRA란?
- **E**fficiently **L**earning an **E**ncoder that **C**lassifies **T**oken **R**eplacements **A**ccurately
- Google에서 개발한 사전 학습 언어 모델
- BERT보다 효율적한 학습 방법

**학습 방법 비교 (초보자용 설명)**:

```
📚 BERT 학습 방법:
원문: "이 제품은 [MASK] 좋아요"
학습: [MASK]에 들어갈 단어 맞추기 → "정말"

장점: 문맥 이해 잘함
단점: [MASK]가 15%만 학습됨 (나머지 85% 낭비)

⚡ ELECTRA 학습 방법:
원문: "이 제품은 정말 좋아요"
변조: "이 제품은 별로 좋아요"  (정말→별로)
학습: 모든 단어가 진짜인지 가짜인지 판별

장점: 모든 단어(100%)에서 학습 → 효율적!
단점: 구현이 복잡함
```

#### KoELECTRA
- ELECTRA의 한국어 버전
- 한국어 위키피디아, 나무위키 등으로 사전 학습됨
- 약 3400만 문장으로 학습 (엄청난 양!)
- 감정 분석, 문장 분류, 질문-답변 등에 활용

**사전 학습(Pre-training)이란?**
```
┌────────────────────────────────────────────────────┐
│  사전 학습 = 기본 한국어 능력 학습                  │
├────────────────────────────────────────────────────┤
│  입력: "밥 먹고 학교 갔어"                          │
│  학습: 한국어 문법, 단어 의미, 문맥 이해           │
│  기간: 수일~수주 (GPU로)                           │
│  비용: 매우 높음 💰💰💰                            │
└────────────────────────────────────────────────────┘
         ↓ (이미 완료된 모델 다운로드)
┌────────────────────────────────────────────────────┐
│  파인튜닝 = 특정 작업에 맞게 미세 조정              │
├────────────────────────────────────────────────────┤
│  입력: "이 제품 좋아요" + [긍정] 라벨              │
│  학습: 긍정/부정/중립 구별하는 방법                │
│  기간: 수분~수시간                                 │
│  비용: 저렴 💰                                     │
└────────────────────────────────────────────────────┘
```

우리는 **이미 사전 학습된 모델**을 사용합니다!

#### 모델 전체 구조 (상세 버전)

```
┌──────────────────────────────────────────────────────────────┐
│                    전체 감정 분석 파이프라인                  │
└──────────────────────────────────────────────────────────────┘

1️⃣ 입력 단계
   "이 제품 정말 좋아요!"
         │
         ↓

2️⃣ 토큰화 단계 (vocab.txt 사용)
   ["[CLS]", "이", "제품", "정말", "좋아요", "!", "[SEP]"]
         │
         ↓

3️⃣ 숫자 변환 단계
   [101, 1234, 5678, 9012, 3456, 119, 102]
         │
         ↓

4️⃣ 임베딩 단계 (단어 → 벡터)
   각 숫자를 768차원 벡터로 변환
   1234 → [0.1, 0.3, -0.2, ..., 0.5]  (768개 숫자)
         │
         ↓

5️⃣ Transformer 레이어 (12층)
   ┌───────────────────────────────────┐
   │  Layer 1: Attention (단어 관계 파악) │
   │  "좋아요"는 "제품"과 관련있음      │
   ├───────────────────────────────────┤
   │  Layer 2: Feed Forward (패턴 학습) │
   │  "정말 좋아요" 패턴 인식           │
   ├───────────────────────────────────┤
   │  ... (Layer 3 ~ 12)              │
   └───────────────────────────────────┘
         │
         ↓

6️⃣ Pooling (문장 전체 정보 요약)
   768차원 벡터 [0.8, 0.1, -0.3, ..., 0.9]
         │
         ↓

7️⃣ Classification Head (감정 분류)
   선형 변환: 768차원 → 3차원
   [2.5, -1.2, 0.3]  (긍정, 부정, 중립 점수)
         │
         ↓

8️⃣ Softmax (확률로 변환)
   [0.92, 0.05, 0.03]  (92%, 5%, 3%)
         │
         ↓

9️⃣ 최종 결과
   감정: 긍정 (92% 확신)
```

### 5.3 모델 파일 설명 (초보자 상세 버전)

#### 1. `config.json` - 모델의 설계도

**비유**: 건물 설계도 (몇 층짜리? 방 크기는?)

```json
{
  "hidden_size": 768,           # 각 층의 방 크기 (뉴런 개수)
  "num_hidden_layers": 12,      # 건물 층수 (Transformer 레이어)
  "num_attention_heads": 12,    # 각 층의 창문 개수 (Attention)
  "intermediate_size": 3072,    # 중간 복도 크기
  "max_position_embeddings": 512 # 최대 수용 인원 (토큰 수)
}
```

**상세 설명**:

```
📐 hidden_size: 768
┌─────────────────────────────────────────────┐
│  각 단어를 768개의 숫자로 표현               │
│  "좋아요" → [0.1, 0.3, -0.2, ..., 0.5]     │
│                  (768개 숫자)               │
│                                             │
│  왜 768개?: 단어의 의미를 다양하게 표현     │
│  - 0번째 숫자: 긍정/부정 정도               │
│  - 1번째 숫자: 감정 강도                    │
│  - ...                                     │
└─────────────────────────────────────────────┘

🏢 num_hidden_layers: 12
┌─────────────────────────────────────────────┐
│  12층 건물 = Transformer 12개 층            │
│                                             │
│  Layer 1:  단어 수준 이해                   │
│  Layer 2-4: 구문 수준 이해                  │
│  Layer 5-8: 문장 수준 이해                  │
│  Layer 9-12: 의미 수준 이해                 │
│                                             │
│  층이 많을수록: 복잡한 의미 이해 가능       │
│  하지만: 느리고 메모리 많이 필요            │
└─────────────────────────────────────────────┘

👁️ num_attention_heads: 12
┌─────────────────────────────────────────────┐
│  12개의 시선 = 동시에 여러 관계 파악        │
│                                             │
│  "이 제품은 배송도 빠르고 품질도 좋아요"    │
│                                             │
│  Head 1: "빠르고" ← → "배송"                │
│  Head 2: "좋아요" ← → "품질"                │
│  Head 3: "이" ← → "제품"                    │
│  ... (동시에 여러 관계 분석)                │
└─────────────────────────────────────────────┘

📏 max_position_embeddings: 512
┌─────────────────────────────────────────────┐
│  최대 512개 토큰까지 처리 가능              │
│  = 약 200~300단어 정도                      │
│                                             │
│  초과하면?: 잘라내거나 나눠서 처리          │
└─────────────────────────────────────────────┘
```

#### 2. `pytorch_model.bin` - 학습된 지식 (가중치)

**비유**: 학생이 공부해서 얻은 지식

```
📦 pytorch_model.bin (약 423MB)
┌─────────────────────────────────────────────┐
│  약 110,000,000개의 숫자 (파라미터)         │
├─────────────────────────────────────────────┤
│  각 숫자 = 학습으로 얻은 지식               │
│                                             │
│  예시:                                      │
│  Weight[1234] = 0.742                       │
│  → "좋아요" 단어가 나오면 긍정일 확률 높임  │
│                                             │
│  Weight[5678] = -0.523                      │
│  → "별로" 단어가 나오면 긍정일 확률 낮춤    │
└─────────────────────────────────────────────┘

계산 과정:
입력: [0.1, 0.3, -0.2, ...]  (768개)
가중치: [[0.742, ...], [0.523, ...], ...]
출력: 입력 × 가중치 = [0.8, 0.1, ...]
```

**왜 이렇게 큰가?**
- 110,000,000개 파라미터
- 각 파라미터 = 4바이트 (float32)
- 110,000,000 × 4 = 440MB
- 압축하면 약 423MB

#### 3. `vocab.txt` - 단어장 (약 35,000개 단어)

**비유**: 사전 (알고 있는 단어 목록)

```
📖 vocab.txt 구조
┌─────────────────────────────────────────────┐
│ 1줄 = 1토큰                                 │
├─────────────────────────────────────────────┤
│ [PAD]      ← 특수 토큰 (빈칸 채우기)        │
│ [UNK]      ← 모르는 단어                     │
│ [CLS]      ← 문장 시작                       │
│ [SEP]      ← 문장 끝                         │
│ [MASK]     ← 가린 단어 (학습용)             │
│ !                                           │
│ "                                           │
│ #                                           │
│ ...        ← 특수 문자들                     │
│ 가                                          │
│ 가게                                        │
│ 가격                                        │
│ ...        ← 일반 단어들                     │
│ ##어요     ← 서브워드 (접미사)              │
│ ##입니다                                    │
└─────────────────────────────────────────────┘
```

**서브워드 토큰화 예시** (중요!):

```
❓ "좋아요"라는 단어가 vocab에 없다면?

❌ 일반적인 방법:
"좋아요" → [UNK] (모르는 단어)
문제: 의미를 전혀 모름

✅ 서브워드 방법:
"좋아요" → ["좋", "##아요"]
           ↓       ↓
         vocab에  vocab에
         있음      있음
장점: 모르는 단어도 부분적으로 이해 가능!

실제 예시:
"맛있어요" → ["맛있", "##어요"]
"예쁘어요" → ["예쁘", "##어요"]
            → "##어요"가 긍정적 표현임을 학습
```

#### 4. `tokenizer_config.json` - 토큰화 규칙

**비유**: 문장을 어떻게 자를지 정하는 규칙

```json
{
  "do_lower_case": false,       # 대소문자 구분 안 함
  "max_len": 512,               # 최대 길이
  "special_tokens_map": {
    "cls_token": "[CLS]",       # 문장 시작 토큰
    "sep_token": "[SEP]",       # 문장 끝 토큰
    "pad_token": "[PAD]",       # 빈칸 채우기 토큰
    "unk_token": "[UNK]",       # 모르는 단어 토큰
    "mask_token": "[MASK]"      # 가린 단어 토큰
  }
}
```

**실제 토큰화 과정**:

```
입력: "이 제품 좋아요!"
     ↓
1단계: 특수 토큰 추가
     "[CLS] 이 제품 좋아요! [SEP]"
     ↓
2단계: 단어 분리
     ["[CLS]", "이", "제품", "좋아요", "!", "[SEP]"]
     ↓
3단계: ID 변환 (vocab.txt에서 찾기)
     [101, 1234, 5678, 9012, 119, 102]
     ↓
4단계: 패딩 (512개로 맞추기)
     [101, 1234, 5678, 9012, 119, 102, 0, 0, 0, ..., 0]
     (0 = [PAD])
```

### 5.4 감정 분석 전체 파이프라인 (초보자 완벽 가이드)

#### 전체 흐름 한눈에 보기

```
┌─────────────────────────────────────────────────────────┐
│                 감정 분석 4단계 파이프라인                 │
└─────────────────────────────────────────────────────────┘

📁 Step 1: 데이터 준비
   corpus/95505.json 파일 읽기
       ↓
💬 Step 2: 텍스트 전처리
   "이 제품 좋아요!" → [101, 1234, 5678, ...]
       ↓
🧠 Step 3: 모델 로드
   koelectra_local/ 폴더에서 모델 불러오기
       ↓
🎯 Step 4: 감정 예측
   [0.92, 0.05, 0.03] → "긍정" (92% 확신)
```

---

#### Step 1: 데이터 준비 (corpus/)

**파일 형식**:
```json
// corpus/95505.json
{
  "id": "95505",
  "text": "이 제품 정말 좋아요! 강력 추천합니다.",
  "label": "positive"
}
```

**데이터 구조 설명**:
```
┌──────────────────────────────────────────┐
│  corpus/ 폴더 = 53개의 리뷰 데이터        │
├──────────────────────────────────────────┤
│  각 파일 구조:                           │
│  ┌────────────────────────────────────┐ │
│  │ id: "95505"  → 리뷰 고유 번호      │ │
│  │ text: "..."  → 실제 리뷰 텍스트    │ │
│  │ label: "..." → 정답 감정 라벨      │ │
│  └────────────────────────────────────┘ │
│                                          │
│  label 종류:                             │
│  - "positive"  (긍정)                    │
│  - "negative"  (부정)                    │
│  - "neutral"   (중립)                    │
└──────────────────────────────────────────┘
```

**Python 코드**:
```python
import json

# 리뷰 데이터 읽기
with open('corpus/95505.json', 'r', encoding='utf-8') as f:
    review_data = json.load(f)

print(review_data['text'])   # "이 제품 정말 좋아요! ..."
print(review_data['label'])  # "positive"
```

---

#### Step 2: 텍스트 전처리 (토큰화)

**왜 전처리가 필요한가?**
```
컴퓨터는 문자를 직접 이해 못함 ❌
    ↓
숫자로 변환 필요 ✅
    ↓
토큰화(Tokenization) 과정
```

**전체 토큰화 과정**:

```python
from transformers import AutoTokenizer

# 1. 토크나이저 로드
tokenizer = AutoTokenizer.from_pretrained('./koelectra_local')

# 2. 텍스트 준비
text = "이 제품 정말 좋아요!"

# 3. 토큰화 실행
tokens = tokenizer(
    text,
    padding='max_length',      # 512개로 길이 맞추기
    truncation=True,            # 긴 문장 자르기
    max_length=512,             # 최대 길이
    return_tensors='pt'         # PyTorch 텐서로 반환
)

# 결과 확인
print(tokens)
```

**출력 결과 상세 분석**:
```python
{
  'input_ids': tensor([[
    101,    # [CLS] - 문장 시작
    1234,   # "이"
    5678,   # "제품"
    9012,   # "정말"
    3456,   # "좋아요"
    119,    # "!"
    102,    # [SEP] - 문장 끝
    0, 0, 0, ..., 0  # [PAD] - 패딩 (512개까지 채움)
  ]]),
  
  'attention_mask': tensor([[
    1, 1, 1, 1, 1, 1, 1,  # 실제 단어: 주목하라 (1)
    0, 0, 0, ..., 0       # 패딩: 무시하라 (0)
  ]])
}
```

**각 요소의 역할**:
```
📌 input_ids:
   텍스트를 숫자로 변환한 ID
   
   "이" → 1234 (vocab.txt에서 1234번째 단어)
   "제품" → 5678
   ...

📌 attention_mask:
   어느 토큰을 주목할지 표시
   
   1 = 실제 단어 (봐라!)
   0 = 패딩 (무시해!)
   
   이게 없으면 모델이 쓸데없는 [PAD]까지 분석함

📌 padding='max_length':
   모든 문장을 512개로 맞춤
   
   짧은 문장: [토큰들] + [PAD] 많이
   긴 문장: [토큰들] + [PAD] 조금
   
   왜?: GPU는 같은 크기의 데이터를 한번에 처리하는게 빠름

📌 truncation=True:
   512개 넘으면 자르기
   
   예: 600개 토큰 → 512개만 사용
```

**시각화**:
```
원본 텍스트:
"이 제품 정말 좋아요!"

    ↓ [토큰화]

["[CLS]", "이", "제품", "정말", "좋아요", "!", "[SEP]"]

    ↓ [ID 변환]

[101, 1234, 5678, 9012, 3456, 119, 102]

    ↓ [패딩]

[101, 1234, 5678, 9012, 3456, 119, 102, 0, 0, ..., 0]
 <------------ 실제 단어 ----------->  <--- 패딩 --->
        (attention_mask = 1)        (attention_mask = 0)
```

---

#### Step 3: 모델 로드

**모델 불러오기**:
```python
from transformers import AutoModelForSequenceClassification

# 모델 로드
model = AutoModelForSequenceClassification.from_pretrained(
    './koelectra_local',
    num_labels=3  # 긍정, 부정, 중립 (3가지)
)

# 평가 모드로 전환 (학습 안 하고 예측만)
model.eval()
```

**AutoModelForSequenceClassification이란?**
```
┌─────────────────────────────────────────────────────┐
│  AutoModel = 자동으로 적절한 모델 선택               │
│  ForSequenceClassification = 문장 분류용             │
└─────────────────────────────────────────────────────┘

이 한 줄이 하는 일:
1. config.json 읽기 (모델 구조 파악)
2. pytorch_model.bin 로드 (학습된 가중치)
3. 분류용 헤드 추가 (768 → 3 차원)
4. 모델 조립 완료!
```

**num_labels=3의 의미**:
```
출력층 구조:
768차원 (마지막 은닉층)
    ↓
선형 변환 (Linear Layer)
    ↓
3차원 [긍정 점수, 부정 점수, 중립 점수]

예: [2.5, -1.2, 0.3]
    긍정  부정  중립
    
num_labels를 바꾸면:
- num_labels=2 → [긍정, 부정]만
- num_labels=5 → [매우긍정, 긍정, 중립, 부정, 매우부정]
```

---

#### Step 4: 감정 예측 (추론)

**전체 추론 코드**:
```python
import torch

# 1. 추론 모드 (기울기 계산 안 함 = 빠름!)
with torch.no_grad():
    # 2. 모델에 토큰 입력
    outputs = model(**tokens)
    
    # 3. logits 추출 (원시 점수)
    logits = outputs.logits
    print(f"Logits: {logits}")
    # 출력: tensor([[2.5, -1.2, 0.3]])
    
    # 4. 확률로 변환 (Softmax)
    probabilities = torch.softmax(logits, dim=-1)
    print(f"확률: {probabilities}")
    # 출력: tensor([[0.92, 0.05, 0.03]])
    
    # 5. 최종 예측 (가장 높은 확률)
    prediction = torch.argmax(probabilities, dim=-1)
    print(f"예측: {prediction}")
    # 출력: tensor([0]) → 인덱스 0 = 긍정
```

**각 단계 상세 설명**:

```
🔢 Logits (로짓):
┌─────────────────────────────────────┐
│  원시 점수 (아직 확률 아님)          │
│  [2.5, -1.2, 0.3]                   │
│   긍정  부정  중립                   │
│                                     │
│  큰 값 = 그 감정일 가능성 높음       │
│  작은 값 = 그 감정일 가능성 낮음     │
└─────────────────────────────────────┘

📊 Softmax (확률 변환):
┌─────────────────────────────────────┐
│  Logits → 확률 (합계 = 1.0)        │
│                                     │
│  공식: e^x / sum(e^x)               │
│                                     │
│  예시:                               │
│  [2.5, -1.2, 0.3]                   │
│     ↓ Softmax                       │
│  [0.92, 0.05, 0.03]                 │
│                                     │
│  확인: 0.92 + 0.05 + 0.03 = 1.0 ✓   │
└─────────────────────────────────────┘

🎯 Argmax (최대값 찾기):
┌─────────────────────────────────────┐
│  [0.92, 0.05, 0.03]                 │
│    ↑                                │
│  가장 큰 값 = 인덱스 0               │
│                                     │
│  인덱스 → 감정 매핑:                 │
│  0 → 긍정                            │
│  1 → 부정                            │
│  2 → 중립                            │
└─────────────────────────────────────┘
```

**torch.no_grad()가 뭐야?**
```
📚 학습 모드 (with torch.no_grad() 없음):
   - 기울기 계산함 (메모리 많이 씀)
   - 느림
   - 학습할 때 필요

🚀 추론 모드 (with torch.no_grad()):
   - 기울기 계산 안 함 (메모리 절약)
   - 빠름
   - 예측만 할 때 사용

차이:
학습 모드: 10초, 메모리 2GB
추론 모드: 1초, 메모리 500MB
```

---

#### 전체 흐름 최종 정리

```
┌─────────────────────────────────────────────────────────┐
│  "이 제품 정말 좋아요!" (입력)                           │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Step 1: 데이터 준비                                     │
│  corpus/95505.json 파일 읽기                            │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Step 2: 토큰화                                          │
│  "이 제품..." → [101, 1234, 5678, ...]                 │
│  attention_mask: [1, 1, 1, ...]                        │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Step 3: 모델 통과                                       │
│  [101, 1234, ...] → ELECTRA 12층 → [2.5, -1.2, 0.3]   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Step 4: 확률 변환 & 예측                                │
│  [2.5, -1.2, 0.3] → Softmax → [0.92, 0.05, 0.03]      │
│  Argmax → 0 → "긍정" ✅                                  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  최종 결과:                                              │
│  {                                                      │
│    "text": "이 제품 정말 좋아요!",                      │
│    "emotion": "긍정",                                    │
│    "confidence": 0.92,                                  │
│    "probabilities": {                                   │
│      "positive": 0.92,                                  │
│      "negative": 0.05,                                  │
│      "neutral": 0.03                                    │
│    }                                                    │
│  }                                                      │
└─────────────────────────────────────────────────────────┘
```

### 5.5 emotion_inference.py 구조 (상세 설명)

#### 클래스 전체 구조
```python
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from typing import Dict
from pathlib import Path

class EmotionInference:
    """
    감정 분석 추론 클래스
    
    역할: 리뷰 텍스트를 입력받아 감정(긍정/부정/중립)을 예측
    """
    
    def __init__(self, model_path='./koelectra_local'):
        """
        모델 초기화
        
        Args:
            model_path: KoELECTRA 모델이 저장된 폴더 경로
        """
        # 1. 토크나이저 로드
        self.tokenizer = AutoTokenizer.from_pretrained(model_path)
        
        # 2. 모델 로드
        self.model = AutoModelForSequenceClassification.from_pretrained(
            model_path,
            num_labels=3  # 감정 3가지: 긍정, 부정, 중립
        )
        
        # 3. 평가 모드 (학습 안 함, 예측만)
        self.model.eval()
        
        # 4. 인덱스 → 감정 라벨 매핑
        self.label_map = {
            0: 'positive',   # 긍정
            1: 'negative',   # 부정
            2: 'neutral'     # 중립
        }
    
    def predict(self, text: str) -> Dict:
        """
        텍스트의 감정 예측
        
        Args:
            text: 분석할 리뷰 텍스트
            
        Returns:
            {
                'text': 입력 텍스트,
                'emotion': 예측된 감정,
                'confidence': 확신도,
                'probabilities': 각 감정별 확률
            }
        """
        # ========== Step 1: 토크나이징 ==========
        inputs = self.tokenizer(
            text,
            padding='max_length',
            truncation=True,
            max_length=512,
            return_tensors='pt'
        )
        # inputs: {'input_ids': tensor([[...]]), 'attention_mask': tensor([[...]])}
        
        # ========== Step 2: 모델 추론 ==========
        with torch.no_grad():  # 기울기 계산 안 함 (빠름!)
            # 모델 실행
            outputs = self.model(**inputs)
            # outputs.logits: tensor([[2.5, -1.2, 0.3]])
            
            logits = outputs.logits
            
            # Softmax로 확률 변환
            probabilities = torch.softmax(logits, dim=-1)
            # probabilities: tensor([[0.92, 0.05, 0.03]])
            
            # 최대값 인덱스 찾기
            prediction = torch.argmax(probabilities, dim=-1)
            # prediction: tensor([0])
        
        # ========== Step 3: 결과 정리 ==========
        pred_idx = prediction.item()  # tensor([0]) → 0 (정수)
        
        return {
            'text': text,
            'emotion': self.label_map[pred_idx],  # 0 → 'positive'
            'confidence': probabilities[0][pred_idx].item(),  # 0.92
            'probabilities': {
                'positive': probabilities[0][0].item(),   # 0.92
                'negative': probabilities[0][1].item(),   # 0.05
                'neutral': probabilities[0][2].item()     # 0.03
            }
        }
```

#### 코드 상세 분석

**1. `__init__` 메서드 - 모델 준비**
```
생성자가 하는 일:
┌─────────────────────────────────────────────┐
│ 1. 토크나이저 로드                           │
│    - vocab.txt 읽기 (35,000개 단어)         │
│    - tokenizer_config.json 설정 적용        │
│                                             │
│ 2. 모델 로드                                 │
│    - config.json 읽기 (모델 구조)           │
│    - pytorch_model.bin 로드 (가중치)        │
│    - 약 110M 파라미터 메모리에 올림         │
│                                             │
│ 3. 평가 모드 설정                            │
│    - Dropout 비활성화                        │
│    - Batch Normalization 고정               │
│                                             │
│ 4. 라벨 매핑 정의                            │
│    - 0, 1, 2 → 사람이 이해할 수 있는 단어   │
└─────────────────────────────────────────────┘
```

**2. `predict` 메서드 - 감정 예측**

**동작 과정 시각화**:
```
입력: "배송이 빠르고 상품도 만족스럽습니다"

    ↓ [토크나이저]

input_ids:      [101, 8765, 1234, 5678, ...]
attention_mask: [1,   1,    1,    1,    ...]
                CLS   배송   이    빠르

    ↓ [임베딩]

각 ID를 768차원 벡터로 변환
8765 → [0.1, 0.3, -0.2, ..., 0.5]

    ↓ [12개 Transformer 레이어]

Layer 1:  "빠르고" ← Attention → "배송"
Layer 2:  "만족스럽" ← Attention → "상품"
...
Layer 12: 전체 문맥 이해 완료

    ↓ [CLS 토큰의 벡터 추출]

문장 전체 의미를 담은 768차원 벡터

    ↓ [Classification Head]

768차원 → 3차원 변환
[0.1, 0.3, ..., 0.5] → [2.8, -1.5, 0.2]
                        긍정  부정  중립

    ↓ [Softmax]

[2.8, -1.5, 0.2] → [0.94, 0.04, 0.02]

    ↓ [Argmax]

가장 큰 값: 0.94 (인덱스 0)

    ↓ [매핑]

인덱스 0 → "positive"

    ↓ [결과]

{
  "emotion": "positive",
  "confidence": 0.94,
  "probabilities": {
    "positive": 0.94,
    "negative": 0.04,
    "neutral": 0.02
  }
}
```

**주요 메서드 설명**:

```python
# .item() 메서드
tensor([0]) → 0       # PyTorch 텐서 → Python 정수
tensor([0.92]) → 0.92 # PyTorch 텐서 → Python 실수

# dim=-1 의미
probabilities: tensor([[0.92, 0.05, 0.03]])
                       ↑     ↑     ↑
                      차원 -1 (마지막 차원)

softmax(logits, dim=-1) → 마지막 차원에 대해 Softmax 적용
```

### 5.6 FastAPI 통합 계획

#### 왜 FastAPI로 감싸야 하나?

```
❌ 딥러닝 모델만 있으면:
   - Python 코드로만 실행 가능
   - 웹에서 사용 불가
   - 다른 서비스와 연동 어려움

✅ FastAPI로 감싸면:
   - HTTP API로 접근 가능
   - 웹, 앱, 다른 서버에서 호출 가능
   - Postman, Swagger UI로 테스트 가능
```

#### 전체 아키텍처

```
┌──────────────────────────────────────────────────────┐
│                     사용자/클라이언트                  │
│                                                      │
│  웹 브라우저, 모바일 앱, Postman, 다른 서버           │
└──────────────────┬───────────────────────────────────┘
                   │ HTTP Request
                   │ POST /api/ml/nlp/review/emotion
                   │ Body: {"text": "이 제품 좋아요!"}
                   ↓
┌──────────────────────────────────────────────────────┐
│              API Gateway (8080)                      │
│                                                      │
│  /api/ml/nlp/review/emotion                         │
└──────────────────┬───────────────────────────────────┘
                   │ Rewrite
                   │ /nlp/review/emotion
                   ↓
┌──────────────────────────────────────────────────────┐
│           ML Service (9006) - FastAPI                │
│                                                      │
│  nlp_router.py                                       │
│  @router.post("/review/emotion")                    │
└──────────────────┬───────────────────────────────────┘
                   │ Python 함수 호출
                   ↓
┌──────────────────────────────────────────────────────┐
│           EmotionInference 클래스                     │
│                                                      │
│  emotion_inference.py                                │
│  - predict() 메서드 실행                             │
└──────────────────┬───────────────────────────────────┘
                   │ 모델 추론
                   ↓
┌──────────────────────────────────────────────────────┐
│         KoELECTRA 모델 (koelectra_local/)            │
│                                                      │
│  - Tokenizer: 텍스트 → 숫자                          │
│  - Model: 숫자 → 감정 예측                           │
└──────────────────┬───────────────────────────────────┘
                   │ 결과 반환
                   ↓
                사용자에게 JSON 응답
```

#### 엔드포인트 설계 (상세 버전)

```python
@router.post("/review/emotion")
async def analyze_emotion(
    text: str = Body(..., description="분석할 리뷰 텍스트")
):
    """
    리뷰 텍스트의 감정 분석
    
    **사용 예시**:
    ```
    POST /api/ml/nlp/review/emotion
    Body: {
        "text": "이 제품 정말 좋아요!"
    }
    ```
    
    **응답 예시**:
    ```json
    {
        "text": "이 제품 정말 좋아요!",
        "emotion": "positive",
        "confidence": 0.95,
        "probabilities": {
            "positive": 0.95,
            "negative": 0.03,
            "neutral": 0.02
        }
    }
    ```
    """
    try:
        # 1. 모델 인스턴스 생성 (또는 미리 생성된 것 사용)
        emotion_model = EmotionInference()
        
        # 2. 감정 예측
        result = emotion_model.predict(text)
        
        # 3. 결과 반환
        return result
        
    except Exception as e:
        import traceback
        raise HTTPException(
            status_code=500,
            detail=f"감정 분석 실패: {str(e)}\n{traceback.format_exc()}"
        )
```

#### 성능 최적화 팁

**문제**: 매번 `EmotionInference()` 생성하면 느림 (모델 로드 시간)

**해결**: 전역 인스턴스 사용 (Samsung WordCloud 패턴)

```python
# nlp_router.py 상단에 추가
from app.nlp.review.emotion_inference import EmotionInference

# 모델 미리 로드 (서버 시작 시 1번만)
try:
    emotion_model = EmotionInference()
    emotion_model_loaded = True
except Exception as e:
    logger.error(f"EmotionInference 로드 실패: {e}")
    emotion_model = None
    emotion_model_loaded = False

# 엔드포인트에서 사용
@router.post("/review/emotion")
async def analyze_emotion(text: str = Body(...)):
    if not emotion_model_loaded:
        raise HTTPException(503, "모델이 로드되지 않았습니다")
    
    result = emotion_model.predict(text)  # 빠름! (모델 이미 로드됨)
    return result
```

**속도 비교**:
```
매번 로드:
요청 1: 5초 (로드 4초 + 추론 1초)
요청 2: 5초 (로드 4초 + 추론 1초)
요청 3: 5초 (로드 4초 + 추론 1초)

미리 로드:
초기화: 4초 (1번만)
요청 1: 1초 (추론만)
요청 2: 1초 (추론만)
요청 3: 1초 (추론만)
```

### 5.7 필수 패키지 및 환경 설정

#### requirements.txt 추가

```txt
# 기존 패키지들...
fastapi>=0.104.1
pandas>=2.0.0
konlpy>=0.6.0

# 딥러닝 패키지 (새로 추가)
torch>=2.0.0              # PyTorch (딥러닝 프레임워크)
transformers>=4.30.0      # Hugging Face (사전학습 모델)
```

**각 패키지 설명**:

```
🔥 PyTorch (torch):
┌─────────────────────────────────────────────┐
│  딥러닝 프레임워크                           │
│  - 텐서 연산 (행렬 계산)                     │
│  - 자동 미분 (학습 시 필요)                  │
│  - GPU 가속 지원                             │
│                                             │
│  역할: 모델의 뇌 역할                        │
│  크기: 약 800MB                              │
└─────────────────────────────────────────────┘

🤗 Transformers:
┌─────────────────────────────────────────────┐
│  Hugging Face 라이브러리                     │
│  - 사전학습 모델 쉽게 사용                   │
│  - BERT, GPT, ELECTRA 등 지원               │
│  - AutoModel, AutoTokenizer 제공            │
│                                             │
│  역할: 모델을 쉽게 불러오고 사용하는 도구    │
│  크기: 약 200MB                              │
└─────────────────────────────────────────────┘
```

#### CPU vs GPU 버전

**CPU 버전 (기본)** - 현재 사용
```dockerfile
FROM python:3.11-slim

# 장점:
# - 설치 간단
# - 모든 환경에서 작동
# - 개발/테스트용으로 충분

# 단점:
# - 느림 (추론 1초 정도)
# - 배치 처리 제한적
```

**GPU 버전 (프로덕션)**
```dockerfile
FROM nvidia/cuda:11.8.0-cudnn8-runtime-ubuntu22.04

# 필요 조건:
# - NVIDIA GPU 필요
# - CUDA 드라이버 설치
# - nvidia-docker 설치

# 장점:
# - 빠름 (추론 0.1초)
# - 대량 요청 처리 가능
# - 배치 처리 효율적

# 단점:
# - 설정 복잡
# - GPU 하드웨어 필요 (비용 높음)
```

**속도 비교 (실제 데이터)**:
```
작업: 100개 리뷰 감정 분석

CPU:
- 개별 처리: 100초 (1개당 1초)
- 배치 처리: 50초

GPU:
- 개별 처리: 10초 (1개당 0.1초)
- 배치 처리: 2초 (50배 빠름!)
```

#### 메모리 요구사항

```
💾 메모리 계산:
┌─────────────────────────────────────────────┐
│  모델 크기:      423MB                       │
│  + PyTorch:      800MB                       │
│  + 추론 버퍼:    300MB                       │
│  + 시스템:       500MB                       │
│  ────────────────────                        │
│  총 필요:       ~2GB                         │
└─────────────────────────────────────────────┘

권장 사양:
- 개발: 최소 4GB RAM
- 프로덕션: 8GB RAM 이상
```

### 5.8 다음 단계 (추후 구현) - 로드맵

#### Phase 1: 기본 추론 엔드포인트 구현 ⭐ (다음 수업)

```
목표: 감정 분석 API 완성
난이도: ★★☆☆☆ (중)
소요 시간: 1-2시간

작업 내역:
1. emotion_inference.py 완성
   - EmotionInference 클래스 구현
   - predict() 메서드 작성
   - 에러 처리 추가

2. nlp_router.py에 엔드포인트 추가
   - POST /review/emotion
   - 입력: {"text": "리뷰 텍스트"}
   - 출력: {"emotion": "positive", ...}

3. 테스트
   - Postman으로 API 호출
   - 다양한 리뷰 텍스트 테스트
   - 결과 확인
```

#### Phase 2: 배치 처리 추가

```
목표: 여러 리뷰를 한번에 분석
난이도: ★★★☆☆ (중상)
소요 시간: 2-3시간

엔드포인트:
POST /review/emotion/batch
Body: {
  "texts": [
    "이 제품 좋아요!",
    "배송이 느려요...",
    "그냥 그래요"
  ]
}

Response: [
  {"text": "이 제품 좋아요!", "emotion": "positive", ...},
  {"text": "배송이 느려요...", "emotion": "negative", ...},
  {"text": "그냥 그래요", "emotion": "neutral", ...}
]

장점:
- 100개 리뷰를 한번에 → 속도 10배 빠름
- API 호출 횟수 감소
```

#### Phase 3: 모델 파인튜닝 (선택)

```
목표: 우리 도메인에 맞게 모델 개선
난이도: ★★★★☆ (상)
소요 시간: 1-2일

과정:
1. corpus/ 데이터 준비 (이미 완료)
   - 53개 리뷰 → 최소 1000개 필요
   - 라벨 정확도 확인

2. 학습 스크립트 작성 (train.py)
   ```python
   from transformers import Trainer, TrainingArguments
   
   training_args = TrainingArguments(
       output_dir='./results',
       num_train_epochs=3,
       per_device_train_batch_size=8,
       learning_rate=2e-5
   )
   
   trainer = Trainer(
       model=model,
       args=training_args,
       train_dataset=train_dataset,
       eval_dataset=eval_dataset
   )
   
   trainer.train()
   ```

3. 학습 실행 (GPU 권장)
   - 학습 시간: 1-2시간
   - 검증 세트로 성능 확인
   - 베스트 모델 저장

4. 새 모델 배포
   - koelectra_local/ 폴더 교체
   - 서비스 재시작
```

#### Phase 4: 고급 기능

**1. 모델 양자화 (속도 2배 향상)**
```python
# FP32 (기본): 32비트 실수
# INT8 (양자화): 8비트 정수

from torch.quantization import quantize_dynamic

quantized_model = quantize_dynamic(
    model, 
    {torch.nn.Linear},  # 선형 레이어만 양자화
    dtype=torch.qint8
)

# 결과:
# - 크기: 423MB → 110MB (4배 감소)
# - 속도: 1초 → 0.5초 (2배 빠름)
# - 정확도: 95% → 94% (약간 감소)
```

**2. 배치 처리 최적화**
```python
# 배치 크기에 따른 성능
┌──────────────────────────────────────┐
│ Batch Size │ 처리 시간 │ 효율      │
├──────────────────────────────────────┤
│     1      │  1.0초   │  기준     │
│     8      │  1.5초   │  5.3배↑  │
│    16      │  2.0초   │  8.0배↑  │
│    32      │  3.0초   │  10.6배↑ │
└──────────────────────────────────────┘
```

**3. 캐싱 (중복 요청 처리)**
```python
from functools import lru_cache

@lru_cache(maxsize=1000)
def predict_cached(text: str):
    return emotion_model.predict(text)

# 같은 텍스트 반복 요청 시 캐시에서 즉시 반환
# "이 제품 좋아요" × 100번 → 1번만 계산
```

#### 전체 구현 타임라인

```
┌──────────────────────────────────────────────────────┐
│                  구현 로드맵                          │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Week 1: 기본 구현 ✅ (완료)                         │
│    - Samsung WordCloud OOP 리팩토링                  │
│    - FastAPI 통합                                    │
│    - Docker 환경 설정                                │
│                                                      │
│  Week 2: 감정 분석 추론 🎯 (다음)                    │
│    - EmotionInference 클래스 구현                    │
│    - POST /review/emotion 엔드포인트                 │
│    - 기본 테스트                                      │
│                                                      │
│  Week 3: 배치 처리                                    │
│    - POST /review/emotion/batch                      │
│    - 성능 최적화                                      │
│                                                      │
│  Week 4+: 고급 기능 (선택)                            │
│    - 모델 파인튜닝                                    │
│    - 양자화                                           │
│    - 모니터링                                         │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 📝 핵심 요약

### 오늘 배운 것

#### 1. 백엔드 개발 (Samsung WordCloud)
- ✅ OOP 리팩토링 (클래스 기반 설계)
- ✅ FastAPI 라우터 통합 (prefix 패턴)
- ✅ 404 오류 디버깅 체크리스트
- ✅ Docker Java 환경 설정 (konlpy)
- ✅ Docker Volume 마운트 (save 폴더)

#### 2. 딥러닝 기초 이해
- ✅ Transformer, BERT, ELECTRA 개념
- ✅ 사전 학습 vs 파인튜닝
- ✅ 토큰화 (Tokenization) 원리
- ✅ 서브워드 토큰화 (Subword)
- ✅ Attention 메커니즘

#### 3. 모델 구조 상세 이해
- ✅ config.json (모델 설계도)
- ✅ pytorch_model.bin (학습된 가중치)
- ✅ vocab.txt (단어장 35,000개)
- ✅ tokenizer_config.json (토큰화 규칙)

#### 4. 감정 분석 파이프라인
- ✅ 데이터 → 토큰화 → 모델 → 예측 (4단계)
- ✅ Softmax, Argmax 개념
- ✅ torch.no_grad() 사용법
- ✅ CPU vs GPU 차이

### 중요 체크포인트

#### 개발 환경
- [ ] 코드 변경 후 반드시 `__pycache__` 삭제
- [ ] 서버 재시작 확인 (루트 엔드포인트 디버깅 필드 확인)
- [ ] 직접 포트(9006) → 게이트웨이(8080) 순서로 테스트
- [ ] konlpy 사용 시 Java 환경 필수
- [ ] Docker volume 설정으로 로컬에 파일 저장

#### 딥러닝 환경
- [ ] PyTorch, Transformers 패키지 설치
- [ ] 최소 4GB RAM 확보
- [ ] 모델 파일 위치 확인 (koelectra_local/)
- [ ] corpus 데이터 준비 (최소 1000개 권장)

### 다음 수업 준비

#### 필수 사항
1. **emotion_inference.py 구현 완성**
   - EmotionInference 클래스 작성
   - predict() 메서드 구현
   - 테스트 코드 작성

2. **FastAPI 엔드포인트 추가**
   - POST /review/emotion
   - Postman 테스트

3. **성능 측정**
   - 추론 속도 확인
   - 메모리 사용량 확인

#### 선택 사항
- GPU 환경 설정 (CUDA)
- 배치 처리 구현
- 캐싱 적용

### 학습 포인트 정리

```
┌──────────────────────────────────────────────────────┐
│              무엇을 배웠나?                           │
├──────────────────────────────────────────────────────┤
│                                                      │
│  1️⃣ 백엔드 API 개발 패턴                            │
│     - 라우터 설계                                     │
│     - 에러 처리                                       │
│     - 디버깅 전략                                     │
│                                                      │
│  2️⃣ 딥러닝 모델 구조                                │
│     - Transformer 12층                               │
│     - Attention (주의 메커니즘)                       │
│     - 768차원 임베딩                                  │
│                                                      │
│  3️⃣ 텍스트 → 숫자 변환                              │
│     - 토큰화 과정                                     │
│     - 서브워드 개념                                   │
│     - 패딩 & 어텐션 마스크                            │
│                                                      │
│  4️⃣ 예측 프로세스                                   │
│     - Logits → Softmax → Argmax                     │
│     - 확률 계산                                       │
│     - 최종 라벨 매핑                                  │
│                                                      │
│  5️⃣ 프로덕션 배포                                   │
│     - Docker 설정 (Java, Volume)                     │
│     - API 통합                                        │
│     - 성능 최적화 전략                                │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 🔗 참고 자료

### 공식 문서
- [FastAPI Documentation](https://fastapi.tiangolo.com/) - FastAPI 공식 가이드
- [Konlpy Documentation](https://konlpy.org/) - 한국어 NLP 라이브러리
- [Transformers Documentation](https://huggingface.co/docs/transformers/) - Hugging Face 사용법
- [PyTorch Documentation](https://pytorch.org/docs/stable/index.html) - PyTorch 공식 문서

### 딥러닝 이론
- [KoELECTRA GitHub](https://github.com/monologg/KoELECTRA) - 한국어 ELECTRA 모델
- [ELECTRA Paper](https://arxiv.org/abs/2003.10555) - 원본 논문
- [Attention is All You Need](https://arxiv.org/abs/1706.03762) - Transformer 원본 논문
- [BERT Paper](https://arxiv.org/abs/1810.04805) - BERT 이해하기

### 초보자용 학습 자료
- [딥러닝 용어 정리](https://wikidocs.net/book/2155) - WikiDocs
- [Transformer 설명 (한글)](https://wikidocs.net/31379) - 친절한 설명
- [Hugging Face Course](https://huggingface.co/course) - 무료 강의 (영어)
- [PyTorch 튜토리얼](https://tutorials.pytorch.kr/) - 한글 번역

### Docker
- [Docker Compose Documentation](https://docs.docker.com/compose/) - Docker Compose 공식 문서
- [Python Docker Best Practices](https://docs.docker.com/language/python/) - Python Docker 가이드

### 도구
- [Postman](https://www.postman.com/) - API 테스트 도구
- [Swagger UI](https://swagger.io/tools/swagger-ui/) - API 문서화

---

## 💡 추가 학습 팁

### 딥러닝 입문자를 위한 학습 순서

```
1단계: 기초 개념 (1주)
   ↓
   - 딥러닝이란?
   - 신경망 기본 구조
   - 학습 vs 추론
   
2단계: PyTorch 기초 (1주)
   ↓
   - Tensor 연산
   - 모델 정의
   - 학습 루프
   
3단계: Transformer (2주)
   ↓
   - Attention 메커니즘
   - BERT 구조
   - 토큰화 이해
   
4단계: 실전 프로젝트 (현재!)
   ↓
   - 사전학습 모델 사용
   - FastAPI 통합
   - 배포
```

### 디버깅 팁

**모델 로딩 실패 시**:
```python
# 1. 파일 존재 확인
import os
print(os.path.exists('./koelectra_local/pytorch_model.bin'))

# 2. 메모리 확인
import psutil
print(f"가용 메모리: {psutil.virtual_memory().available / (1024**3):.2f}GB")

# 3. 로그 확인
import logging
logging.basicConfig(level=logging.DEBUG)
```

**추론 느릴 때**:
```python
# 시간 측정
import time

start = time.time()
result = emotion_model.predict(text)
end = time.time()

print(f"추론 시간: {end - start:.2f}초")

# 1초 이상이면 → GPU 고려
# 0.1초 이하면 → 정상
```

### 용어 사전

| 용어 | 의미 | 예시 | 
|------|------|------|
| **토큰** | 단어나 문자의 조각 | "좋아요" → ["좋", "##아요"] |
| **임베딩** | 단어를 숫자 벡터로 변환 | "좋아요" → [0.1, 0.3, ...] |
| **Logits** | 모델의 원시 출력 점수 | [2.5, -1.2, 0.3] |
| **Softmax** | 점수를 확률로 변환 | [2.5, -1.2, 0.3] → [0.92, 0.05, 0.03] |
| **Attention** | 단어 간 관계 파악 | "좋아요"가 "제품"과 관련 |
| **Hidden State** | 각 층의 중간 결과 | 768차원 벡터 |
| **Fine-tuning** | 사전학습 모델을 특정 작업에 맞게 조정 | 일반 모델 → 리뷰 감정 분석 모델 |
| **Inference** | 학습된 모델로 예측 | "좋아요" → "긍정" 예측 |

---

## 🎓 마무리

### 성공한 것
✅ Samsung WordCloud를 OOP로 리팩토링
✅ FastAPI에 완벽히 통합
✅ 404 오류 완벽히 해결
✅ Docker 환경 (Java 포함) 구축
✅ 워드클라우드 이미지 생성 및 저장
✅ 딥러닝 모델 구조 완벽 이해

### 다음 목표
🎯 EmotionInference 클래스 구현
🎯 감정 분석 API 엔드포인트 추가
🎯 Postman으로 테스트
🎯 배치 처리 구현 (선택)

### 최종 확인

**Samsung WordCloud 동작 확인**:
```
✅ URL: http://localhost:8080/api/ml/nlp/samsung
✅ 이미지 생성: samsung/save/samsung_wordcloud_YYYYMMDD_HHMMSS.png
✅ 응답: PNG 이미지
```

**다음 구현할 기능**:
```
🎯 URL: http://localhost:8080/api/ml/nlp/review/emotion
🎯 입력: {"text": "이 제품 좋아요!"}
🎯 출력: {"emotion": "positive", "confidence": 0.92}
```

---

**수고하셨습니다! 🎉**

