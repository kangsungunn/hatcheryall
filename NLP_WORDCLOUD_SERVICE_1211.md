# NLTK 기반 워드클라우드 서비스 구축 프로젝트

**작성일:** 2025년 12월 11일  
**프로젝트:** Emma 말뭉치 자연어 처리 및 워드클라우드 시각화  
**기술 스택:** Python, FastAPI, NLTK, WordCloud, PIL, Docker

---

## 📋 Table of Contents

1. [프로젝트 개요](#프로젝트-개요)
2. [사전 준비](#사전-준비)
3. [단계별 구현 과정](#단계별-구현-과정)
   - [Step 1: 절차적 코드를 OOP로 리팩토링](#step-1-절차적-코드를-oop로-리팩토링)
   - [Step 2: NLPService 클래스 구현](#step-2-nlpservice-클래스-구현)
   - [Step 3: 워드클라우드 생성 및 저장 기능](#step-3-워드클라우드-생성-및-저장-기능)
   - [Step 4: FastAPI 엔드포인트 구현](#step-4-fastapi-엔드포인트-구현)
4. [트러블슈팅](#트러블슈팅)
5. [최종 결과물](#최종-결과물)
6. [학습 정리](#학습-정리)
7. [다음 학습 과제](#다음-학습-과제)

---

## 프로젝트 개요

### 무엇을 만들었나?

제인 오스틴의 소설 "Emma" 말뭉치를 분석하여 등장인물 이름의 빈도를 워드클라우드로 시각화하는 웹 서비스를 구축했습니다. NLTK(Natural Language Toolkit)를 활용한 전문적인 자연어 처리 파이프라인을 OOP 방식으로 설계했습니다.

### 왜 만들었나?

**비즈니스 가치:**
- 텍스트 데이터의 주요 키워드를 시각적으로 파악
- 대용량 문서의 핵심 개념을 빠르게 이해
- 데이터 분석 결과를 직관적으로 전달
- 웹 API를 통한 서비스화로 확장성 확보

**기술적 목표:**
- 절차적 코드를 객체지향(OOP) 구조로 전환
- NLTK의 다양한 자연어 처리 기능 학습
- 재사용 가능한 NLP 서비스 클래스 설계
- FastAPI와 NLTK의 통합
- Docker 환경에서 NLTK 데이터 관리

**학습 목적:**
- NLTK 패키지의 핵심 기능 습득
- 형태소 분석(Stemming, Lemmatization) 이해
- 품사 태깅(POS Tagging) 활용
- 빈도 분석(FreqDist) 및 시각화

### 주요 기능

1. **말뭉치(Corpus) 관리**
   - Gutenberg 말뭉치 로드
   - 다양한 문학 작품 접근
   - 텍스트 전처리

2. **토큰화(Tokenization)**
   - 문장 단위 토큰화
   - 단어 단위 토큰화
   - 정규식 기반 토큰화

3. **형태소 분석**
   - Porter Stemmer: 어간 추출
   - Lancaster Stemmer: 강력한 어간 추출
   - Lemmatization: 원형 복원

4. **품사 태깅(POS Tagging)**
   - Penn Treebank 태그셋 사용
   - 고유명사(NNP) 필터링
   - Stopwords 제거

5. **빈도 분석**
   - FreqDist 클래스 활용
   - 출현 빈도 계산
   - Top N 단어 추출

6. **워드클라우드 시각화**
   - 빈도 기반 크기 조정
   - 커스터마이징 옵션 (크기, 색상, 랜덤 시드)
   - PNG 이미지 생성 및 저장

### 기술 스택

| 카테고리 | 기술 | 사용 목적 |
|---------|------|----------|
| **백엔드** | FastAPI | RESTful API 서버 |
| **자연어 처리** | NLTK | 토큰화, 형태소 분석, 품사 태깅 |
| **시각화** | WordCloud | 워드클라우드 이미지 생성 |
| **이미지 처리** | PIL (Pillow) | 이미지 포맷 변환 |
| **컨테이너화** | Docker | 서비스 배포 및 NLTK 데이터 관리 |
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
│           │   └── nlp/
│           │       ├── emma/
│           │       │   ├── __init__.py
│           │       │   └── emma_wordcloud.py    # NLPService 클래스
│           │       ├── samsung/                  # 향후 확장용
│           │       ├── data/
│           │       │   ├── D2Coding.ttf         # 한글 폰트
│           │       │   ├── kr-Report_2018.txt   # 한글 말뭉치
│           │       │   └── stopwords.txt        # 불용어 목록
│           │       ├── save/                     # 워드클라우드 저장
│           │       │   └── emma_wordcloud_*.png
│           │       ├── __init__.py
│           │       └── nlp_router.py            # API 엔드포인트
│           └── requirements.txt
└── docker-compose.yaml
```

### 2. NLTK 패키지란?

**NLTK (Natural Language Toolkit):**
- 교육용으로 개발된 자연어 처리 패키지
- 다양한 말뭉치와 분석 도구 제공
- 연구 및 실무에서 널리 사용

**주요 기능:**
1. **말뭉치(Corpus)**: 샘플 문서 집합
2. **토큰 생성(Tokenization)**: 문자열을 단위로 분리
3. **형태소 분석(Morphological Analysis)**: 어근, 접두사, 접미사 분석
4. **품사 태깅(POS Tagging)**: 단어의 품사 자동 부착

### 3. 필요한 Python 패키지

```txt
# requirements.txt
nltk>=3.8.0          # 자연어 처리
wordcloud>=1.9.0     # 워드클라우드 생성
sentencepiece>=0.1.99 # 서브워드 토크나이저
konlpy>=0.6.0        # 한국어 자연어 처리
opencv-python>=4.8.0 # 이미지 처리
Pillow>=10.0.0       # 이미지 포맷 변환
jpype1>=1.4.0        # Java와 Python 연동 (KoNLPy용)
```

### 4. NLTK 데이터 다운로드

NLTK는 사용 전에 필요한 데이터를 다운로드해야 합니다:

```python
import nltk

# 필수 데이터 다운로드
nltk.download('book')                           # 샘플 말뭉치 모음
nltk.download('punkt')                          # 문장/단어 토크나이저
nltk.download('wordnet')                        # WordNet 사전
nltk.download('averaged_perceptron_tagger')     # 품사 태거
nltk.download('omw-1.4')                        # Open Multilingual Wordnet
```

**다운로드 위치:**
- Linux/Mac: `~/nltk_data/`
- Windows: `C:\Users\{username}\nltk_data\`
- Docker 컨테이너: `/root/nltk_data/`

---

## 단계별 구현 과정

### Step 1: 절차적 코드를 OOP로 리팩토링

#### 🎯 목표
기존 절차적(Procedural) 방식의 NLTK 코드를 객체지향(OOP) 방식의 재사용 가능한 클래스로 전환

#### 📝 왜 OOP로 리팩토링하나?

**절차적 코드의 문제점:**
- ❌ 코드 중복: 같은 로직을 여러 곳에서 반복
- ❌ 유지보수 어려움: 수정 시 여러 곳을 찾아다녀야 함
- ❌ 재사용 불가: 다른 프로젝트에서 사용하기 어려움
- ❌ 테스트 어려움: 함수가 독립적이지 않음

**OOP의 장점:**
- ✅ 캡슐화: 관련 데이터와 메서드를 하나로 묶음
- ✅ 재사용성: 클래스 인스턴스를 여러 곳에서 사용
- ✅ 유지보수: 한 곳만 수정하면 전체 반영
- ✅ 확장성: 상속을 통한 기능 확장 가능
- ✅ 테스트: 단위 테스트 작성 용이

#### 💻 리팩토링 전후 비교

**Before (절차적 코드):**

```python
# nlp_service.py (절차적 방식)
import nltk
from wordcloud import WordCloud

# NLTK 데이터 다운로드
nltk.download('book')
nltk.download('punkt')

# 말뭉치 로드
emma_raw = nltk.corpus.gutenberg.raw('austen-emma.txt')

# 토큰화
from nltk.tokenize import RegexpTokenizer
tokenizer = RegexpTokenizer("[\w]+")
emma_tokens = tokenizer.tokenize(emma_raw)

# 품사 태깅
from nltk import pos_tag
tagged_tokens = pos_tag(emma_tokens)

# 고유명사 필터링
stopwords = ["Mr.", "Mrs.", "Miss"]
names = [word for word, tag in tagged_tokens 
         if tag == "NNP" and word not in stopwords]

# 빈도 분석
from nltk import FreqDist
fd_names = FreqDist(names)

# 워드클라우드 생성
wc = WordCloud(width=1000, height=600)
wc.generate_from_frequencies(fd_names)
wc.to_file('wordcloud.png')
```

**문제점:**
- 전역 변수 사용으로 상태 관리 어려움
- 같은 작업을 반복할 때마다 전체 코드 재실행
- 다른 말뭉치 분석 시 코드 복사/수정 필요
- 에러 처리 없음

**After (OOP 방식):**

```python
# emma_wordcloud.py (객체지향 방식)
class NLPService:
    """
    NLTK 기반 자연어 처리 서비스 클래스
    """
    
    def __init__(self, download_nltk_data: bool = True):
        """초기화 및 NLTK 데이터 다운로드"""
        if download_nltk_data:
            self._download_nltk_data()
        
        # 분석 도구 초기화
        self.porter_stemmer = PorterStemmer()
        self.lancaster_stemmer = LancasterStemmer()
        self.lemmatizer = WordNetLemmatizer()
        self.regex_tokenizer = RegexpTokenizer("[\w]+")
        
        # 내부 상태 저장
        self.current_text: Optional[Text] = None
        self.current_tokens: Optional[List[str]] = None
        self.current_corpus: Optional[str] = None
        
        # save 폴더 설정
        self.save_dir = Path(__file__).parent.parent / 'save'
        self.save_dir.mkdir(exist_ok=True)
    
    def load_corpus(self, fileid: str) -> str:
        """말뭉치 로드"""
        raw_text = nltk.corpus.gutenberg.raw(fileid)
        self.current_corpus = raw_text
        return raw_text
    
    def tokenize_regex(self, text: Optional[str] = None) -> List[str]:
        """정규식 기반 토큰화"""
        if text is None:
            text = self.current_corpus
        tokens = self.regex_tokenizer.tokenize(text)
        self.current_tokens = tokens
        return tokens
    
    def pos_tag(self, tokens: Optional[List[str]] = None) -> List[Tuple[str, str]]:
        """품사 태깅"""
        if tokens is None:
            tokens = self.current_tokens
        return pos_tag(tokens)
    
    def filter_tokens_by_pos(
        self, 
        pos_tag: str, 
        stopwords: Optional[List[str]] = None,
        tagged_list: Optional[List[Tuple[str, str]]] = None
    ) -> List[str]:
        """특정 품사만 필터링"""
        if tagged_list is None:
            tagged_list = self.pos_tag()
        if stopwords is None:
            stopwords = []
        return [word for word, tag in tagged_list 
                if tag == pos_tag and word not in stopwords]
    
    def create_freq_dist(self, tokens: List[str]) -> FreqDist:
        """빈도 분포 생성"""
        return FreqDist(tokens)
    
    def generate_wordcloud(
        self, 
        freq_dist: FreqDist,
        width: int = 1000,
        height: int = 600,
        show: bool = True
    ) -> WordCloud:
        """워드클라우드 생성"""
        wc = WordCloud(width=width, height=height)
        wc.generate_from_frequencies(freq_dist)
        
        # 자동 저장
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"emma_wordcloud_{timestamp}.png"
        filepath = self.save_dir / filename
        wc.to_file(str(filepath))
        
        return wc


# 사용 예시
nlp = NLPService()
emma_raw = nlp.load_corpus('austen-emma.txt')
tokens = nlp.tokenize_regex(emma_raw)
tagged = nlp.pos_tag(tokens)
names = nlp.filter_tokens_by_pos('NNP', stopwords=["Mr.", "Mrs."], tagged_list=tagged)
fd = nlp.create_freq_dist(names)
wc = nlp.generate_wordcloud(fd)
```

**개선 사항:**
- ✅ 상태 관리: `self.current_corpus`, `self.current_tokens`로 상태 저장
- ✅ 재사용성: `nlp = NLPService()`로 인스턴스 생성 후 반복 사용
- ✅ 유연성: 파라미터로 동작 커스터마이징
- ✅ 자동화: 워드클라우드 자동 저장
- ✅ 에러 처리: 각 메서드에서 입력 검증

---

### Step 2: NLPService 클래스 구현

#### 🎯 목표
NLTK의 주요 기능을 메서드로 구현한 완전한 NLP 서비스 클래스 작성

#### 💻 클래스 구조 설계

```python
class NLPService:
    """
    NLTK 기반 자연어 처리 서비스 클래스
    
    구조:
    ├── __init__: 초기화 및 도구 설정
    ├── 말뭉치 관리
    │   ├── get_corpus_fileids()
    │   └── load_corpus()
    ├── 토큰화
    │   ├── tokenize_sentences()
    │   ├── tokenize_words()
    │   └── tokenize_regex()
    ├── 형태소 분석
    │   ├── stem_porter()
    │   ├── stem_lancaster()
    │   └── lemmatize()
    ├── 품사 태깅
    │   ├── pos_tag()
    │   ├── extract_nouns()
    │   └── filter_tokens_by_pos()
    ├── 텍스트 분석
    │   ├── create_text_analyzer()
    │   ├── plot_word_frequency()
    │   └── plot_dispersion()
    ├── 빈도 분석
    │   ├── create_freq_dist()
    │   ├── get_freq_statistics()
    │   └── get_most_common()
    └── 워드클라우드
        ├── generate_wordcloud()
        └── save_wordcloud()
    """
```

#### 📝 주요 메서드 상세 설명

**1. 초기화 메서드**

```python
def __init__(self, download_nltk_data: bool = True):
    """
    NLPService 초기화
    
    Args:
        download_nltk_data: NLTK 데이터 다운로드 여부
    """
    # 1. NLTK 데이터 다운로드
    if download_nltk_data:
        try:
            nltk.download('book', quiet=True)
            nltk.download('punkt', quiet=True)
            nltk.download('wordnet', quiet=True)
            nltk.download('averaged_perceptron_tagger', quiet=True)
            nltk.download('omw-1.4', quiet=True)
        except Exception as e:
            print(f"NLTK 데이터 다운로드 중 오류 (무시하고 계속): {e}")
    
    # 2. 형태소 분석기 초기화
    self.porter_stemmer = PorterStemmer()
    self.lancaster_stemmer = LancasterStemmer()
    self.lemmatizer = WordNetLemmatizer()
    
    # 3. 토크나이저 초기화
    self.regex_tokenizer = RegexpTokenizer("[\w]+")
    
    # 4. 내부 상태 저장 변수
    self.current_text: Optional[Text] = None
    self.current_tokens: Optional[List[str]] = None
    self.current_corpus: Optional[str] = None
    
    # 5. save 폴더 경로 설정
    self.save_dir = Path(__file__).parent.parent / 'save'
    self.save_dir.mkdir(exist_ok=True)
```

**코드 설명:**

1. **NLTK 데이터 다운로드:**
   - `quiet=True`: 다운로드 진행 상황 메시지 숨김
   - `try-except`: 다운로드 실패해도 프로그램 계속 실행
   - Docker 환경에서는 볼륨 마운트로 데이터 영속화

2. **분석 도구 초기화:**
   - `PorterStemmer`: 영어 어간 추출 (예: "running" → "run")
   - `LancasterStemmer`: 더 강력한 어간 추출
   - `WordNetLemmatizer`: 원형 복원 (예: "better" → "good")

3. **내부 상태 관리:**
   - `current_corpus`: 현재 로드된 텍스트
   - `current_tokens`: 현재 토큰 리스트
   - `current_text`: NLTK Text 객체
   - 메서드 체이닝 가능: `nlp.load().tokenize().pos_tag()`

4. **save 폴더 설정:**
   - `Path(__file__).parent.parent`: 현재 파일의 2단계 상위 폴더
   - `emma_wordcloud.py` → `emma/` → `nlp/` → `nlp/save/`
   - `mkdir(exist_ok=True)`: 폴더가 없으면 생성, 있으면 무시

**2. 토큰화 메서드**

```python
def tokenize_regex(self, text: Optional[str] = None, pattern: str = "[\w]+") -> List[str]:
    """
    정규식 기반 토큰화
    
    Args:
        text: 토큰화할 텍스트 (None이면 현재 로드된 텍스트 사용)
        pattern: 정규식 패턴 (기본값: "[\w]+")
        
    Returns:
        토큰 리스트
    """
    # 1. 텍스트 검증
    if text is None:
        if self.current_corpus is None:
            raise ValueError("분석할 텍스트가 없습니다.")
        text = self.current_corpus
    
    # 2. 정규식 토크나이저 생성 및 토큰화
    tokenizer = RegexpTokenizer(pattern)
    tokens = tokenizer.tokenize(text)
    
    # 3. 상태 저장
    self.current_tokens = tokens
    
    return tokens
```

**정규식 패턴 설명:**

| 패턴 | 의미 | 예시 |
|------|------|------|
| `[\w]+` | 단어 문자 (문자, 숫자, _) 1개 이상 | "Hello123" ✅ |
| `[A-Za-z]+` | 영문자만 | "Hello" ✅, "Hello123" ❌ |
| `[\w-]+` | 단어 문자 + 하이픈 | "mother-in-law" ✅ |

**왜 정규식 토크나이저를 사용하나?**
- `word_tokenize()`는 구두점을 별도 토큰으로 분리 (예: "Hello!" → ["Hello", "!"])
- `RegexpTokenizer("[\w]+"))`는 단어만 추출 (예: "Hello!" → ["Hello"])
- 워드클라우드에는 단어만 필요하므로 정규식 방식이 적합

**3. 품사 태깅 및 필터링**

```python
def filter_tokens_by_pos(
    self, 
    pos_tag: str, 
    stopwords: Optional[List[str]] = None,
    tagged_list: Optional[List[Tuple[str, str]]] = None
) -> List[str]:
    """
    특정 품사만 필터링하여 추출
    
    Args:
        pos_tag: 추출할 품사 태그 (예: 'NNP' - 고유명사)
        stopwords: 제외할 단어 리스트
        tagged_list: POS 태깅된 리스트 (None이면 자동 태깅)
        
    Returns:
        필터링된 단어 리스트
    """
    # 1. 품사 태깅 (필요시)
    if tagged_list is None:
        tagged_list = self.pos_tag()
    
    # 2. Stopwords 기본값
    if stopwords is None:
        stopwords = []
    
    # 3. 필터링 (리스트 컴프리헨션)
    return [word for word, tag in tagged_list 
            if tag == pos_tag and word not in stopwords]
```

**Penn Treebank 품사 태그 예시:**

| 태그 | 의미 | 예시 |
|------|------|------|
| NNP | 단수 고유명사 | Emma, London |
| NNPS | 복수 고유명사 | Americans |
| NN | 일반 명사 | book, dog |
| VB | 동사 원형 | run, eat |
| VBD | 동사 과거형 | ran, ate |
| JJ | 형용사 | beautiful, good |

**Emma 말뭉치에서 고유명사만 추출하는 이유:**
- 등장인물 이름에 집중
- 일반 명사는 "the", "a", "to" 등이 많아 의미 없음
- "Emma", "Mr. Knightley", "Frank" 등 인물 관계 파악

**4. 빈도 분석**

```python
def create_freq_dist(self, tokens: List[str]) -> FreqDist:
    """
    토큰 리스트로부터 빈도 분포 생성
    
    Args:
        tokens: 토큰 리스트
        
    Returns:
        FreqDist 객체
    """
    return FreqDist(tokens)


def get_freq_statistics(self, freq_dist: FreqDist, word: str) -> Tuple[int, int, float]:
    """
    빈도 통계 정보 반환
    
    Args:
        freq_dist: FreqDist 객체
        word: 조회할 단어
        
    Returns:
        (전체 단어 수, 단어 출현 횟수, 단어 출현 확률) 튜플
    """
    total = freq_dist.N()           # 전체 단어 수
    count = freq_dist[word]         # 특정 단어 출현 횟수
    frequency = freq_dist.freq(word)  # 출현 확률 (count / total)
    
    return total, count, frequency


def get_most_common(self, freq_dist: FreqDist, num: int = 10) -> List[Tuple[str, int]]:
    """
    가장 빈도가 높은 단어 반환
    
    Args:
        freq_dist: FreqDist 객체
        num: 반환할 단어 수
        
    Returns:
        (단어, 빈도) 튜플 리스트
    """
    return freq_dist.most_common(num)
```

**FreqDist 클래스란?**
- NLTK의 빈도 분포 클래스
- Python의 `Counter`와 유사하지만 더 많은 기능 제공
- 단어를 키(key), 출현빈도를 값(value)으로 저장

**사용 예시:**
```python
# Emma 말뭉치에서 "Emma" 출현 횟수
fd = nlp.create_freq_dist(names)
total, emma_count, emma_freq = nlp.get_freq_statistics(fd, "Emma")

print(f"전체 단어 수: {total}")        # 865
print(f"Emma 출현: {emma_count}")      # 191
print(f"출현 확률: {emma_freq:.4f}")   # 0.2208 (22.08%)
```

---

### Step 3: 워드클라우드 생성 및 저장 기능

#### 🎯 목표
빈도 분석 결과를 시각적으로 표현하는 워드클라우드 이미지를 생성하고 자동으로 저장

#### 💻 워드클라우드 생성 메서드

```python
def generate_wordcloud(
    self, 
    freq_dist: FreqDist,
    width: int = 1000,
    height: int = 600,
    background_color: str = "white",
    random_state: int = 0,
    show: bool = True
) -> WordCloud:
    """
    워드클라우드 생성
    
    Args:
        freq_dist: FreqDist 객체 (단어 빈도 분포)
        width: 이미지 너비 (픽셀)
        height: 이미지 높이 (픽셀)
        background_color: 배경색 (기본값: "white")
        random_state: 랜덤 시드 (재현 가능한 결과를 위해)
        show: 그래프 표시 여부
        
    Returns:
        WordCloud 객체
    """
    # ========================================
    # 1단계: WordCloud 객체 생성
    # ========================================
    wc = WordCloud(
        width=width,
        height=height,
        background_color=background_color,
        random_state=random_state
    )
    
    # ========================================
    # 2단계: 빈도 데이터로부터 워드클라우드 생성
    # ========================================
    wc.generate_from_frequencies(freq_dist)
    
    # ========================================
    # 3단계: 자동 저장 (타임스탬프 포함)
    # ========================================
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"emma_wordcloud_{timestamp}.png"
    filepath = self.save_dir / filename
    wc.to_file(str(filepath))
    
    # ========================================
    # 4단계: 시각화 (선택적)
    # ========================================
    if show:
        plt.imshow(wc)
        plt.axis("off")  # 축 숨기기
        plt.show()
    
    return wc
```

#### 📝 파라미터 상세 설명

**1. `width`, `height`:**
```python
# 다양한 크기 예시
wc = nlp.generate_wordcloud(fd, width=1920, height=1080)  # Full HD
wc = nlp.generate_wordcloud(fd, width=800, height=600)    # 4:3 비율
wc = nlp.generate_wordcloud(fd, width=1000, height=500)   # 와이드
```

**2. `background_color`:**
```python
# 배경색 옵션
wc = nlp.generate_wordcloud(fd, background_color="white")   # 하얀색
wc = nlp.generate_wordcloud(fd, background_color="black")   # 검은색
wc = nlp.generate_wordcloud(fd, background_color="#f0f0f0") # 회색 (HEX)
```

**3. `random_state`:**
```python
# 랜덤 시드 - 재현 가능한 결과
wc1 = nlp.generate_wordcloud(fd, random_state=0)
wc2 = nlp.generate_wordcloud(fd, random_state=0)
# wc1과 wc2는 완전히 동일한 배치

wc3 = nlp.generate_wordcloud(fd, random_state=42)
# wc3는 wc1과 다른 배치 (시드 값이 다름)
```

**왜 랜덤 시드를 고정하나?**
- 워드클라우드는 단어 배치가 무작위
- 같은 데이터로 생성해도 매번 다른 모양
- `random_state`를 고정하면 동일한 결과 재현 가능
- 디버깅, 테스트, 비교 분석에 유용

**4. `show`:**
```python
# API 서버에서는 show=False로 설정
wc = nlp.generate_wordcloud(fd, show=False)  # 그래프 창 띄우지 않음

# 로컬 테스트에서는 show=True
wc = nlp.generate_wordcloud(fd, show=True)   # Matplotlib 창에 표시
```

#### 🔍 워드클라우드 생성 원리

**1. 빈도 데이터 → 크기 매핑:**

```
빈도 분포:
Emma: 191회
Knightley: 115회
Frank: 89회
...

↓ WordCloud 알고리즘

시각화:
Emma (가장 큼)
Knightley (중간)
Frank (작음)
```

**2. 레이아웃 알고리즘:**
- 빈도가 높은 단어를 중앙에 배치
- 낮은 빈도 단어는 주변에 배치
- 겹치지 않도록 위치 계산
- 공간 효율적으로 채우기

**3. 색상 선택:**
```python
# 기본 색상 팔레트 (파란색 계열)
wc = WordCloud(colormap='viridis')

# 다양한 색상 옵션
wc = WordCloud(colormap='rainbow')  # 무지개
wc = WordCloud(colormap='hot')      # 빨강-노랑
wc = WordCloud(colormap='cool')     # 파랑-보라
```

#### ✅ 자동 저장 기능

```python
# 자동 저장 코드 분석
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
# 결과: "20251211_092138"

filename = f"emma_wordcloud_{timestamp}.png"
# 결과: "emma_wordcloud_20251211_092138.png"

filepath = self.save_dir / filename
# 결과: Path('app/nlp/save/emma_wordcloud_20251211_092138.png')

wc.to_file(str(filepath))
# WordCloud를 PNG 파일로 저장
```

**파일명에 타임스탬프를 포함하는 이유:**
- 같은 이름으로 덮어쓰지 않음
- 이력 관리 (버전별 비교 가능)
- 언제 생성되었는지 명확히 알 수 있음
- 동시에 여러 요청이 와도 충돌 없음

---

### Step 4: FastAPI 엔드포인트 구현

#### 🎯 목표
NLPService 클래스를 FastAPI로 웹 서비스화하여 HTTP API로 제공

#### 💻 API 라우터 구현

**`nlp_router.py` 전체 구조:**

```python
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response
from io import BytesIO
from app.nlp.emma.emma_wordcloud import NLPService

# ========================================
# 1. 라우터 생성 및 서비스 초기화
# ========================================
router = APIRouter(prefix="/nlp", tags=["nlp"])
nlp_service = NLPService(download_nltk_data=True)


# ========================================
# 2. 워드클라우드 생성 엔드포인트
# ========================================
@router.get("/emma")
async def generate_emma_wordcloud(
    width: int = Query(1000, description="이미지 너비"),
    height: int = Query(600, description="이미지 높이"),
    background_color: str = Query("white", description="배경색"),
    random_state: int = Query(0, description="랜덤 시드")
):
    """
    Emma 말뭉치를 사용하여 워드클라우드 생성
    
    **처리 과정:**
    1. Emma 말뭉치 로드
    2. 정규식 토큰화
    3. POS 태깅
    4. 고유명사(NNP) 필터링
    5. 빈도 분석
    6. 워드클라우드 생성
    7. PNG 이미지 반환
    
    **Query 파라미터:**
    - width: 이미지 너비 (기본값: 1000)
    - height: 이미지 높이 (기본값: 600)
    - background_color: 배경색 (기본값: "white")
    - random_state: 랜덤 시드 (기본값: 0)
    
    **반환:**
    - PNG 형식의 워드클라우드 이미지
    """
    try:
        # Step 1: Emma 말뭉치 로드
        emma_raw = nlp_service.load_corpus("austen-emma.txt")
        
        # Step 2: 토큰화 (정규식 사용)
        emma_tokens = nlp_service.tokenize_regex(emma_raw)
        
        # Step 3: POS 태깅
        tagged_tokens = nlp_service.pos_tag(emma_tokens)
        
        # Step 4: 고유명사(NNP)만 필터링
        stopwords = ["Mr.", "Mrs.", "Miss", "Mr", "Mrs", "Dear"]
        names = nlp_service.filter_tokens_by_pos(
            pos_tag="NNP",
            stopwords=stopwords,
            tagged_list=tagged_tokens
        )
        
        # Step 5: 빈도 분포 생성
        fd_names = nlp_service.create_freq_dist(names)
        
        # Step 6: 워드클라우드 생성 (show=False)
        wc = nlp_service.generate_wordcloud(
            freq_dist=fd_names,
            width=width,
            height=height,
            background_color=background_color,
            random_state=random_state,
            show=False  # API 서버에서는 그래프 창 띄우지 않음
        )
        
        # Step 7: 이미지를 BytesIO로 변환
        from PIL import Image
        import numpy as np
        
        # WordCloud를 numpy 배열로 변환
        img_array = wc.to_array()
        
        # numpy 배열을 PIL Image로 변환
        img = Image.fromarray(img_array)
        
        # PIL Image를 BytesIO 버퍼에 저장
        img_buffer = BytesIO()
        img.save(img_buffer, format='PNG')
        img_buffer.seek(0)
        
        # Step 8: Response로 반환
        return Response(
            content=img_buffer.getvalue(),
            media_type="image/png",
            headers={
                "Content-Disposition": "inline; filename=emma_wordcloud.png"
            }
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"워드클라우드 생성 실패: {str(e)}"
        )
```

#### 📝 코드 상세 분석

**1. 라우터 생성:**

```python
router = APIRouter(prefix="/nlp", tags=["nlp"])
```

- `prefix="/nlp"`: 모든 엔드포인트에 `/nlp` 접두사 추가
- `tags=["nlp"]`: Swagger 문서화 시 그룹 분류
- 실제 경로: `/nlp/emma`, `/nlp/emma/stats`

**2. 서비스 초기화:**

```python
nlp_service = NLPService(download_nltk_data=True)
```

- 모듈 로드 시 한 번만 초기화
- 모든 요청이 같은 인스턴스 공유
- NLTK 데이터는 최초 한 번만 다운로드

**3. Query 파라미터:**

```python
width: int = Query(1000, description="이미지 너비")
```

- `Query()`: FastAPI의 쿼리 파라미터 검증
- 기본값: 1000
- `description`: Swagger 문서에 표시될 설명
- 자동 타입 변환: `"1000"` (문자열) → `1000` (정수)

**URL 예시:**
```
GET /nlp/emma
GET /nlp/emma?width=1920&height=1080
GET /nlp/emma?background_color=black&random_state=42
```

**4. NLP 파이프라인:**

```python
# 체이닝 방식으로 단계별 처리
emma_raw = nlp_service.load_corpus("austen-emma.txt")
emma_tokens = nlp_service.tokenize_regex(emma_raw)
tagged_tokens = nlp_service.pos_tag(emma_tokens)
names = nlp_service.filter_tokens_by_pos("NNP", stopwords, tagged_tokens)
fd_names = nlp_service.create_freq_dist(names)
wc = nlp_service.generate_wordcloud(fd_names, ...)
```

**각 단계별 데이터 변환:**

```
Step 1: load_corpus
→ "[Emma by Jane Austen 1816]..."  (긴 문자열)

Step 2: tokenize_regex
→ ["Emma", "by", "Jane", "Austen", ...]  (토큰 리스트)

Step 3: pos_tag
→ [("Emma", "NNP"), ("by", "IN"), ("Jane", "NNP"), ...]  (튜플 리스트)

Step 4: filter_tokens_by_pos
→ ["Emma", "Jane", "Austen", "Knightley", ...]  (고유명사만)

Step 5: create_freq_dist
→ FreqDist({'Emma': 191, 'Knightley': 115, ...})  (빈도 사전)

Step 6: generate_wordcloud
→ WordCloud 객체 (이미지 데이터)
```

**5. 이미지 변환 과정:**

```python
# WordCloud → numpy array
img_array = wc.to_array()
# 형태: (600, 1000, 3) RGB 이미지

# numpy array → PIL Image
img = Image.fromarray(img_array)

# PIL Image → BytesIO
img_buffer = BytesIO()
img.save(img_buffer, format='PNG')
img_buffer.seek(0)
```

**왜 이렇게 복잡한 변환이 필요한가?**
- WordCloud는 numpy 배열로 데이터 저장
- FastAPI Response는 bytes 타입 요구
- PIL은 numpy ↔ bytes 변환의 중개자
- BytesIO는 메모리 상의 파일 객체 (디스크 I/O 없음)

**6. Response 생성:**

```python
return Response(
    content=img_buffer.getvalue(),  # bytes 데이터
    media_type="image/png",          # MIME 타입
    headers={
        "Content-Disposition": "inline; filename=emma_wordcloud.png"
    }
)
```

**Response 파라미터 설명:**
- `content`: 실제 이미지 바이트 데이터
- `media_type`: 브라우저에게 이것이 PNG 이미지임을 알림
- `Content-Disposition: inline`: 다운로드 대신 브라우저에서 표시
- `filename`: 저장 시 기본 파일명

#### 💻 통계 정보 조회 엔드포인트

```python
@router.get("/emma/stats")
async def get_emma_stats():
    """
    Emma 말뭉치 통계 정보 조회
    
    **반환 데이터:**
    - 전체 단어 수
    - 가장 빈도 높은 단어 Top 10
    - "Emma" 단어의 출현 횟수 및 확률
    """
    try:
        # 1~5단계: 워드클라우드와 동일한 전처리
        emma_raw = nlp_service.load_corpus("austen-emma.txt")
        emma_tokens = nlp_service.tokenize_regex(emma_raw)
        tagged_tokens = nlp_service.pos_tag(emma_tokens)
        
        stopwords = ["Mr.", "Mrs.", "Miss", "Mr", "Mrs", "Dear"]
        names = nlp_service.filter_tokens_by_pos(
            pos_tag="NNP",
            stopwords=stopwords,
            tagged_list=tagged_tokens
        )
        
        fd_names = nlp_service.create_freq_dist(names)
        
        # 6. 통계 정보 수집
        total, emma_count, emma_freq = nlp_service.get_freq_statistics(fd_names, "Emma")
        most_common = nlp_service.get_most_common(fd_names, 10)
        
        # 7. JSON 형식으로 반환
        return {
            "status": "success",
            "total_words": total,
            "emma_count": emma_count,
            "emma_frequency": round(emma_freq, 4),
            "top_10_words": [
                {"word": word, "count": count} 
                for word, count in most_common
            ]
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"통계 조회 실패: {str(e)}"
        )
```

**반환 데이터 예시:**

```json
{
  "status": "success",
  "total_words": 865,
  "emma_count": 191,
  "emma_frequency": 0.2208,
  "top_10_words": [
    {"word": "Emma", "count": 191},
    {"word": "Knightley", "count": 115},
    {"word": "Frank", "count": 89},
    {"word": "Harriet", "count": 73},
    {"word": "Jane", "count": 61},
    {"word": "Weston", "count": 52},
    {"word": "Elton", "count": 49},
    {"word": "Miss", "count": 38},
    {"word": "Churchill", "count": 35},
    {"word": "Fairfax", "count": 31}
  ]
}
```

#### 🔍 API 요청-응답 흐름

```
1. 사용자: 브라우저에서 URL 입력
   GET http://localhost:8080/api/ml/nlp/emma?width=1920

2. API Gateway: 경로 재작성
   /api/ml/nlp/emma → /nlp/emma

3. mlservice (Docker): FastAPI 서버
   nlp_router.py: generate_emma_wordcloud() 호출

4. NLPService: 자연어 처리 파이프라인
   ├─ load_corpus() → Emma 텍스트 로드
   ├─ tokenize_regex() → 토큰화
   ├─ pos_tag() → 품사 태깅
   ├─ filter_tokens_by_pos() → 고유명사 필터링
   ├─ create_freq_dist() → 빈도 분석
   └─ generate_wordcloud() → 워드클라우드 생성
       └─ save to app/nlp/save/emma_wordcloud_*.png

5. FastAPI: Image → BytesIO → Response
   Content-Type: image/png

6. 브라우저: PNG 이미지 수신 및 표시
   └─ 워드클라우드 시각화
```

---

## 트러블슈팅

### 문제 1: NLTK 데이터 다운로드 실패

#### 증상
```python
LookupError: 
**********************************************
  Resource 'corpora/gutenberg' not found.
  Please use the NLTK Downloader to obtain the resource:
  >>> import nltk
  >>> nltk.download('gutenberg')
**********************************************
```

#### 원인 분석
- NLTK는 패키지 설치만으로는 사용 불가
- 별도로 말뭉치, 태거 등의 데이터를 다운로드해야 함
- Docker 컨테이너 재시작 시 데이터 손실

#### 해결 과정

**1단계: 초기화 시 자동 다운로드**
```python
def __init__(self, download_nltk_data: bool = True):
    if download_nltk_data:
        nltk.download('book', quiet=True)
        nltk.download('punkt', quiet=True)
        nltk.download('wordnet', quiet=True)
        nltk.download('averaged_perceptron_tagger', quiet=True)
        nltk.download('omw-1.4', quiet=True)
```

**2단계: Docker 볼륨 마운트로 영속화**

```yaml
# docker-compose.yaml
mlservice:
  volumes:
    - nltk_data:/root/nltk_data  # NLTK 데이터 영속화

volumes:
  nltk_data:  # Named volume 정의
```

**3단계: 에러 처리 추가**
```python
try:
    nltk.download('averaged_perceptron_tagger_eng', quiet=True)
except:
    pass  # 일부 버전에서는 필요 없을 수 있음
```

#### 검증 방법
```python
# Docker 컨테이너 내부에서 확인
docker compose exec mlservice python -c "
import nltk
print(nltk.data.path)
print(nltk.corpus.gutenberg.fileids())
"
```

#### 최종 해결책
- 서비스 초기화 시 자동 다운로드
- Docker 볼륨으로 데이터 영속화
- 다운로드 실패 시에도 프로그램 계속 실행

---

### 문제 2: "Resource 'averaged_perceptron_tagger_eng' not found"

#### 증상
```
500 Internal Server Error
Resource 'averaged_perceptron_tagger_eng' not found.
```

#### 원인 분석
- NLTK 3.8+ 버전에서 POS 태거 리소스 이름 변경
- `averaged_perceptron_tagger_eng`가 필요한 경우 발생
- 일부 환경에서는 자동으로 다운로드되지 않음

#### 해결 과정

**시도 1: 추가 다운로드**
```python
nltk.download('averaged_perceptron_tagger_eng', quiet=True)
```

**시도 2: 예외 처리**
```python
try:
    nltk.download('averaged_perceptron_tagger_eng', quiet=True)
except:
    pass  # 버전에 따라 필요 없을 수 있음
```

**시도 3: Universal Tagset 다운로드**
```python
nltk.download('universal_tagset', quiet=True)
```

#### 최종 해결책
```python
def __init__(self, download_nltk_data: bool = True):
    if download_nltk_data:
        try:
            nltk.download('book', quiet=True)
            nltk.download('punkt', quiet=True)
            nltk.download('wordnet', quiet=True)
            nltk.download('averaged_perceptron_tagger', quiet=True)
            # 추가: 모든 관련 태거 데이터
            try:
                nltk.download('averaged_perceptron_tagger_eng', quiet=True)
            except:
                pass
            nltk.download('universal_tagset', quiet=True)
            nltk.download('omw-1.4', quiet=True)
        except Exception as e:
            print(f"NLTK 데이터 다운로드 중 오류 (무시하고 계속): {e}")
```

---

### 문제 3: API Gateway에서 404 Not Found

#### 증상
```
GET http://localhost:8080/api/ml/nlp/emma
→ 404 Not Found
```

#### 원인 분석
- API Gateway의 `application.yaml`에 `/nlp` 경로 라우팅 설정 누락
- 기존 설정에는 `/titanic`, `/usa`, `/seoul` 경로만 존재

#### 해결 과정

**1단계: 라우팅 규칙 확인**
```yaml
# application.yaml 확인
routes:
  - id: titanic-service-route
    predicates:
      - Path=/api/ml/titanic/**
    filters:
      - RewritePath=/api/ml/titanic/(?<segment>.*), /titanic/${segment}
  
  # NLP 라우팅 없음!
```

**2단계: NLP 라우팅 추가**
```yaml
# application.yaml에 추가
- id: nlp-service-route
  uri: http://mlservice:9006
  predicates:
    - Path=/api/ml/nlp/**
  filters:
    - RewritePath=/api/ml/nlp/(?<segment>.*), /nlp/${segment}
```

**3단계: Gateway 재시작**
```bash
docker compose restart api-gateway
```

#### 검증 방법
```bash
# 직접 mlservice 접근 (Gateway 우회)
curl http://localhost:9006/nlp/emma
# → 200 OK

# Gateway를 통한 접근
curl http://localhost:8080/api/ml/nlp/emma
# → 200 OK
```

#### 최종 해결책
- API Gateway에 NLP 서비스 라우팅 규칙 추가
- 경로 재작성 패턴: `/api/ml/nlp/**` → `/nlp/**`
- 컨테이너 재시작으로 설정 적용

---

### 문제 4: 워드클라우드 이미지가 save 폴더에 저장되지 않음

#### 증상
- API 호출 성공 (200 OK)
- 브라우저에 워드클라우드 표시됨
- `app/nlp/save/` 폴더에 파일 없음

#### 원인 분석
- `generate_wordcloud()` 메서드에 저장 로직 누락
- 이미지가 메모리에만 생성되고 디스크에 저장되지 않음

#### 해결 과정

**1단계: 저장 로직 추가**
```python
def generate_wordcloud(self, freq_dist, ...):
    wc = WordCloud(...)
    wc.generate_from_frequencies(freq_dist)
    
    # 저장 로직 추가
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"emma_wordcloud_{timestamp}.png"
    filepath = self.save_dir / filename
    wc.to_file(str(filepath))  # ← 이 부분 추가
    
    return wc
```

**2단계: save_dir 경로 확인**
```python
def __init__(self):
    # save 폴더 경로 설정
    self.save_dir = Path(__file__).parent.parent / 'save'
    # emma_wordcloud.py → emma/ → nlp/ → nlp/save/
    
    # 폴더 생성
    self.save_dir.mkdir(exist_ok=True)
```

**3단계: Docker 볼륨 마운트 추가**
```yaml
# docker-compose.yaml
mlservice:
  volumes:
    - ./ai.kroaddy.site/services/mlservice/app/nlp/save:/app/app/nlp/save
```

#### 검증 방법
```bash
# API 호출 후 파일 확인
ls ai.kroaddy.site/services/mlservice/app/nlp/save/
# emma_wordcloud_20251211_092138.png

# 컨테이너 내부 확인
docker compose exec mlservice ls -la /app/app/nlp/save/
```

#### 최종 해결책
- `generate_wordcloud()` 메서드에 자동 저장 추가
- Docker 볼륨 마운트로 호스트에서 파일 접근 가능
- 타임스탬프 포함 파일명으로 이력 관리

---

## 최종 결과물

### API 엔드포인트 목록

| 메서드 | 엔드포인트 | 설명 | 반환 형식 |
|--------|-----------|------|----------|
| GET | `/nlp/emma` | Emma 워드클라우드 생성 | image/png |
| GET | `/nlp/emma/stats` | Emma 통계 정보 조회 | application/json |

**API Gateway를 통한 접근:**
- `http://localhost:8080/api/ml/nlp/emma`
- `http://localhost:8080/api/ml/nlp/emma/stats`

**직접 mlservice 접근:**
- `http://localhost:9006/nlp/emma`
- `http://localhost:9006/nlp/emma/stats`

### 실제 사용 예시

**1. 기본 워드클라우드 생성:**
```
GET http://localhost:8080/api/ml/nlp/emma
→ 1000x600 PNG 이미지 반환
```

**2. 커스터마이징:**
```
GET http://localhost:8080/api/ml/nlp/emma?width=1920&height=1080&background_color=black&random_state=42
→ Full HD 크기, 검은 배경, 시드 42
```

**3. 통계 정보 조회:**
```
GET http://localhost:8080/api/ml/nlp/emma/stats
→ JSON 응답
```

**응답 예시:**
```json
{
  "status": "success",
  "total_words": 865,
  "emma_count": 191,
  "emma_frequency": 0.2208,
  "top_10_words": [
    {"word": "Emma", "count": 191},
    {"word": "Knightley", "count": 115},
    {"word": "Frank", "count": 89},
    ...
  ]
}
```

### 저장된 파일 구조

```
app/nlp/
├── emma/
│   ├── __init__.py
│   └── emma_wordcloud.py (NLPService 클래스, 766줄)
├── save/
│   └── emma_wordcloud_20251211_092138.png (워드클라우드 이미지)
├── data/
│   ├── D2Coding.ttf
│   ├── kr-Report_2018.txt
│   └── stopwords.txt
├── __init__.py
└── nlp_router.py (API 엔드포인트, 146줄)
```

### NLPService 클래스 메서드 목록

**말뭉치 관리 (2개):**
- `get_corpus_fileids()`: 말뭉치 파일 목록
- `load_corpus()`: 말뭉치 로드

**토큰화 (3개):**
- `tokenize_sentences()`: 문장 단위
- `tokenize_words()`: 단어 단위
- `tokenize_regex()`: 정규식 기반

**형태소 분석 (4개):**
- `stem_porter()`: Porter Stemmer
- `stem_lancaster()`: Lancaster Stemmer
- `lemmatize()`: 원형 복원
- `lemmatize_word()`: 단일 단어 원형 복원

**품사 태깅 (5개):**
- `get_pos_tag_info()`: 태그 정보
- `pos_tag()`: 품사 태깅
- `extract_nouns()`: 명사 추출
- `remove_tags()`: 태그 제거
- `create_pos_tokenizer()`: POS 포함 토큰

**텍스트 분석 (6개):**
- `create_text_analyzer()`: Text 객체 생성
- `plot_word_frequency()`: 빈도 그래프
- `plot_dispersion()`: 분산 플롯
- `find_concordance()`: 단어 위치
- `find_similar_words()`: 유사 단어
- `find_collocations()`: 연어 찾기

**빈도 분석 (4개):**
- `get_vocabulary()`: 어휘 빈도
- `create_freq_dist()`: 빈도 분포
- `filter_tokens_by_pos()`: 품사 필터링
- `get_freq_statistics()`: 통계 정보
- `get_most_common()`: Top N 단어

**워드클라우드 (2개):**
- `generate_wordcloud()`: 생성 및 저장
- `save_wordcloud()`: 파일 저장

**총 26개 메서드**

---

## 학습 정리

### 배운 기술 스킬

#### 1. NLTK 자연어 처리

**핵심 개념:**
- **말뭉치(Corpus)**: 대규모 텍스트 데이터 집합
- **토큰화(Tokenization)**: 문자열을 분석 단위로 분리
- **형태소 분석(Morphology)**: 단어의 어근, 접사 분석
- **품사 태깅(POS Tagging)**: 단어의 문법적 역할 파악
- **빈도 분석(Frequency)**: 단어 출현 횟수 계산

**실무 활용:**
- 검색 엔진: 쿼리 분석 및 문서 인덱싱
- 챗봇: 사용자 의도 파악
- 감정 분석: 긍정/부정 판단
- 문서 요약: 핵심 키워드 추출

#### 2. 객체지향 프로그래밍(OOP)

**핵심 개념:**
- **캡슐화(Encapsulation)**: 데이터와 메서드를 하나로 묶음
- **추상화(Abstraction)**: 복잡한 로직을 간단한 인터페이스로
- **재사용성(Reusability)**: 한 번 작성한 코드를 여러 곳에서 사용
- **유지보수성(Maintainability)**: 수정이 쉽고 영향 범위가 명확

**실무 활용:**
- 라이브러리/프레임워크 설계
- 대규모 프로젝트 코드 구조화
- 팀 협업 (명확한 인터페이스)
- 테스트 주도 개발(TDD)

#### 3. FastAPI 이미지 응답

**핵심 개념:**
- **Response 클래스**: 커스텀 응답 생성
- **BytesIO**: 메모리 상의 파일 객체
- **PIL (Pillow)**: 이미지 포맷 변환
- **MIME 타입**: 브라우저에게 콘텐츠 타입 알림

**실무 활용:**
- 동적 이미지 생성 (차트, 그래프)
- 썸네일 생성
- 이미지 필터 적용
- PDF 생성 및 전송

#### 4. Docker 데이터 영속화

**핵심 개념:**
- **Named Volume**: Docker가 관리하는 영구 저장소
- **Bind Mount**: 호스트 경로를 컨테이너에 마운트
- **데이터 라이프사이클**: 컨테이너 재시작해도 데이터 보존

**실무 활용:**
- 데이터베이스 데이터 보존
- 로그 파일 저장
- 빌드 캐시 관리
- 개발 환경과 운영 환경 동기화

#### 5. 정규식(Regular Expression)

**핵심 개념:**
- **패턴 매칭**: 문자열에서 특정 패턴 찾기
- **토큰화**: 단어, 숫자, 기호 등 분리
- **텍스트 정제**: 불필요한 문자 제거

**실무 활용:**
- 데이터 검증 (이메일, 전화번호)
- 로그 파일 파싱
- 웹 크롤링
- 텍스트 전처리

### 배운 소프트 스킬

#### 1. 절차적 → 객체지향 사고방식 전환

**인사이트:**
- 코드를 "작업 순서"가 아닌 "책임 단위"로 나눔
- "무엇을 하는가?"에서 "누가 무엇을 담당하는가?"로 사고 전환
- 재사용 가능한 컴포넌트 설계

**적용:**
- 클래스 설계 시 단일 책임 원칙(SRP) 고려
- 메서드는 한 가지 일만 수행
- 상태 관리를 명확히

#### 2. API 설계 철학

**인사이트:**
- 사용자 관점에서 생각 (무엇을 입력하고 무엇을 받는가?)
- 명확한 에러 메시지 제공
- 유연성 (커스터마이징 옵션 제공)

**적용:**
- Query 파라미터로 옵션 제공
- 기본값 설정으로 간편한 사용 보장
- 문서화 (docstring, Swagger)

#### 3. 디버깅 및 문제 해결

**전략:**
1. 문제 분리 (Gateway? mlservice? NLTK?)
2. 직접 접근으로 검증 (Docker 컨테이너 내부 확인)
3. 로그 확인 (`docker compose logs`)
4. 작은 단위로 테스트 (메서드별 테스트)

**적용:**
- 각 레이어별로 테스트
- 에러 메시지를 꼼꼼히 읽기
- 가정하지 말고 확인하기

### 비즈니스 인사이트

#### 1. 데이터 시각화의 가치

**인사이트:**
- 숫자 나열보다 이미지가 10배 이해하기 쉬움
- 워드클라우드는 비기술자도 즉시 이해 가능
- 시각화 = 커뮤니케이션 도구

**적용:**
- 데이터 분석 결과는 항상 시각화
- 대시보드에 워드클라우드 추가
- 보고서에 직관적인 이미지 포함

#### 2. 재사용 가능한 컴포넌트의 중요성

**인사이트:**
- NLPService 클래스는 다른 프로젝트에서도 사용 가능
- 한 번 잘 만들면 계속 활용 가능
- 개발 속도 향상 = 비용 절감

**적용:**
- 라이브러리화 가능한 코드 작성
- 의존성 최소화
- 문서화로 재사용성 향상

#### 3. 확장 가능한 구조 설계

**인사이트:**
- `app/nlp/emma/`와 `app/nlp/samsung/` 구조
- 향후 한국어 NLP 추가 예정
- 모듈화로 확장 용이

**적용:**
- 처음부터 확장성 고려
- 폴더 구조를 의미 있게
- 공통 기능은 상위 클래스로

---

## 다음 학습 과제

### 1. 한국어 자연어 처리

#### 1-1. KoNLPy 통합
```python
# app/nlp/samsung/korean_nlp.py
from konlpy.tag import Okt, Komoran, Mecab

class KoreanNLPService:
    def __init__(self):
        self.okt = Okt()  # 빠르고 정확
        self.komoran = Komoran()  # 정확도 높음
    
    def tokenize_korean(self, text: str):
        """한국어 형태소 분석"""
        return self.okt.morphs(text)
    
    def extract_nouns(self, text: str):
        """명사 추출"""
        return self.okt.nouns(text)
    
    def pos_tag(self, text: str):
        """품사 태깅"""
        return self.okt.pos(text)
```

**학습 목표:**
- 한국어 형태소 분석기 비교
- 띄어쓰기 없는 한국어 처리
- 한국어 워드클라우드 (한글 폰트 적용)

#### 1-2. 한국어 워드클라우드
```python
def generate_korean_wordcloud(self, text: str):
    """한국어 워드클라우드 생성"""
    # 1. 명사 추출
    nouns = self.okt.nouns(text)
    
    # 2. 불용어 제거
    stopwords = ['것', '등', '및', '수', '때문']
    filtered = [w for w in nouns if w not in stopwords and len(w) > 1]
    
    # 3. 빈도 분석
    fd = FreqDist(filtered)
    
    # 4. 워드클라우드 생성 (한글 폰트 지정)
    wc = WordCloud(
        font_path='app/nlp/data/D2Coding.ttf',
        width=1000,
        height=600,
        background_color='white'
    )
    wc.generate_from_frequencies(fd)
    
    return wc
```

#### 1-3. 한국어 말뭉치 분석
```python
# data/kr-Report_2018.txt 분석
@router.get("/korean/wordcloud")
async def generate_korean_wordcloud():
    """한국어 리포트 워드클라우드 생성"""
    with open('app/nlp/data/kr-Report_2018.txt', 'r', encoding='utf-8') as f:
        text = f.read()
    
    korean_nlp = KoreanNLPService()
    wc = korean_nlp.generate_korean_wordcloud(text)
    
    # ... (이미지 변환 및 반환)
```

### 2. 감정 분석 (Sentiment Analysis)

#### 2-1. VADER 감정 분석
```python
from nltk.sentiment import SentimentIntensityAnalyzer

class SentimentService:
    def __init__(self):
        nltk.download('vader_lexicon')
        self.sia = SentimentIntensityAnalyzer()
    
    def analyze_sentiment(self, text: str) -> Dict[str, float]:
        """
        감정 분석
        
        Returns:
            {
                'neg': 0.1,   # 부정
                'neu': 0.6,   # 중립
                'pos': 0.3,   # 긍정
                'compound': 0.4  # 종합 점수 (-1 ~ 1)
            }
        """
        return self.sia.polarity_scores(text)
```

#### 2-2. 리뷰 감정 분석 API
```python
@router.post("/sentiment")
async def analyze_text_sentiment(text: str = Query(...)):
    """텍스트 감정 분석"""
    sentiment_service = SentimentService()
    scores = sentiment_service.analyze_sentiment(text)
    
    # 분류
    if scores['compound'] >= 0.05:
        label = "긍정"
    elif scores['compound'] <= -0.05:
        label = "부정"
    else:
        label = "중립"
    
    return {
        "text": text,
        "scores": scores,
        "label": label
    }
```

#### 2-3. 대량 리뷰 분석
```python
@router.post("/sentiment/batch")
async def analyze_batch_sentiment(reviews: List[str]):
    """여러 리뷰 일괄 분석"""
    results = []
    for review in reviews:
        scores = sentiment_service.analyze_sentiment(review)
        results.append({
            "review": review,
            "compound": scores['compound'],
            "label": "긍정" if scores['compound'] >= 0.05 else "부정"
        })
    
    # 통계
    positive_count = sum(1 for r in results if r['label'] == "긍정")
    negative_count = sum(1 for r in results if r['label'] == "부정")
    
    return {
        "results": results,
        "statistics": {
            "total": len(reviews),
            "positive": positive_count,
            "negative": negative_count,
            "positive_rate": positive_count / len(reviews)
        }
    }
```

### 3. Named Entity Recognition (NER)

#### 3-1. 개체명 인식
```python
import spacy

class NERService:
    def __init__(self):
        # spaCy 모델 로드
        self.nlp = spacy.load('en_core_web_sm')
    
    def extract_entities(self, text: str):
        """개체명 추출"""
        doc = self.nlp(text)
        
        entities = []
        for ent in doc.ents:
            entities.append({
                "text": ent.text,
                "label": ent.label_,  # PERSON, ORG, GPE, DATE 등
                "start": ent.start_char,
                "end": ent.end_char
            })
        
        return entities
```

#### 3-2. 엔티티 시각화
```python
from spacy import displacy

@router.get("/ner")
async def extract_named_entities(text: str = Query(...)):
    """개체명 인식 및 시각화"""
    ner_service = NERService()
    doc = ner_service.nlp(text)
    
    # HTML 시각화 생성
    html = displacy.render(doc, style="ent", page=False)
    
    return Response(content=html, media_type="text/html")
```

### 4. 텍스트 요약 (Text Summarization)

#### 4-1. 추출적 요약
```python
from nltk.corpus import stopwords
from nltk.tokenize import sent_tokenize
from nltk.probability import FreqDist

class SummarizationService:
    def extractive_summary(self, text: str, num_sentences: int = 3):
        """추출적 요약 (중요 문장 추출)"""
        # 1. 문장 토큰화
        sentences = sent_tokenize(text)
        
        # 2. 단어 토큰화 및 불용어 제거
        words = word_tokenize(text.lower())
        stop_words = set(stopwords.words('english'))
        words = [w for w in words if w.isalnum() and w not in stop_words]
        
        # 3. 단어 빈도 계산
        freq_dist = FreqDist(words)
        
        # 4. 문장 점수 계산 (문장에 포함된 단어의 빈도 합)
        sentence_scores = {}
        for sentence in sentences:
            for word in word_tokenize(sentence.lower()):
                if word in freq_dist:
                    sentence_scores[sentence] = sentence_scores.get(sentence, 0) + freq_dist[word]
        
        # 5. 상위 N개 문장 선택
        summary_sentences = sorted(sentence_scores, key=sentence_scores.get, reverse=True)[:num_sentences]
        
        # 6. 원본 순서대로 정렬
        summary = [s for s in sentences if s in summary_sentences]
        
        return ' '.join(summary)
```

#### 4-2. 요약 API
```python
@router.post("/summarize")
async def summarize_text(
    text: str = Query(...),
    num_sentences: int = Query(3, description="요약 문장 수")
):
    """텍스트 요약"""
    summarization_service = SummarizationService()
    summary = summarization_service.extractive_summary(text, num_sentences)
    
    return {
        "original_length": len(text),
        "summary_length": len(summary),
        "summary": summary,
        "compression_ratio": len(summary) / len(text)
    }
```

### 5. 성능 최적화

#### 5-1. 캐싱 전략
```python
from functools import lru_cache
import redis

class CachedNLPService(NLPService):
    def __init__(self):
        super().__init__()
        self.redis_client = redis.Redis(host='redis', port=6379)
    
    @lru_cache(maxsize=100)
    def tokenize_regex(self, text: str):
        """메모리 캐싱"""
        return super().tokenize_regex(text)
    
    def generate_wordcloud_cached(self, corpus_id: str, **kwargs):
        """Redis 캐싱"""
        cache_key = f"wordcloud:{corpus_id}:{hash(frozenset(kwargs.items()))}"
        
        # 캐시 확인
        cached = self.redis_client.get(cache_key)
        if cached:
            return cached
        
        # 생성 및 캐싱
        wc = self.generate_wordcloud(**kwargs)
        img_bytes = wc.to_image().tobytes()
        self.redis_client.setex(cache_key, 3600, img_bytes)  # 1시간 TTL
        
        return img_bytes
```

#### 5-2. 비동기 처리
```python
import asyncio
from concurrent.futures import ProcessPoolExecutor

class AsyncNLPService:
    def __init__(self):
        self.executor = ProcessPoolExecutor(max_workers=4)
    
    async def process_multiple_texts(self, texts: List[str]):
        """여러 텍스트 병렬 처리"""
        loop = asyncio.get_event_loop()
        tasks = [
            loop.run_in_executor(self.executor, self.process_text, text)
            for text in texts
        ]
        results = await asyncio.gather(*tasks)
        return results
```

### 6. 프론트엔드 통합

#### 6-1. React 워드클라우드 뷰어
```jsx
import React, { useState, useEffect } from 'react';

function WordCloudViewer() {
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  
  const generateWordCloud = async () => {
    setLoading(true);
    const response = await fetch(
      'http://localhost:8080/api/ml/nlp/emma?width=1920&height=1080'
    );
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    setImageUrl(url);
    setLoading(false);
  };
  
  return (
    <div>
      <button onClick={generateWordCloud}>
        Generate WordCloud
      </button>
      {loading && <p>Loading...</p>}
      {imageUrl && <img src={imageUrl} alt="WordCloud" />}
    </div>
  );
}
```

#### 6-2. 실시간 텍스트 분석 대시보드
```jsx
function TextAnalysisDashboard() {
  const [text, setText] = useState('');
  const [stats, setStats] = useState(null);
  
  useEffect(() => {
    // 디바운스 후 API 호출
    const timer = setTimeout(async () => {
      if (text.length > 10) {
        const response = await fetch(
          `http://localhost:8080/api/ml/nlp/emma/stats`
        );
        const data = await response.json();
        setStats(data);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [text]);
  
  return (
    <div>
      <textarea 
        value={text} 
        onChange={(e) => setText(e.target.value)}
      />
      {stats && (
        <div>
          <p>Total Words: {stats.total_words}</p>
          <p>Top Word: {stats.top_10_words[0].word}</p>
        </div>
      )}
    </div>
  );
}
```

---

## 참고 자료 및 더 배우기

### 공식 문서
- [NLTK 공식 문서](https://www.nltk.org/)
- [NLTK Book (무료 온라인)](https://www.nltk.org/book/)
- [WordCloud 문서](https://amueller.github.io/word_cloud/)
- [KoNLPy 문서](https://konlpy.org/)
- [spaCy 문서](https://spacy.io/)

### 추천 학습 자료
- **책**: "Natural Language Processing with Python" (NLTK Book)
- **책**: "Speech and Language Processing" by Jurafsky & Martin
- **온라인 강의**: Coursera "Natural Language Processing"
- **유튜브**: "StatQuest with Josh Starmer" (NLP 개념 설명)

### 유용한 도구
- **NLTK Downloader GUI**: 데이터 관리 도구
- **spaCy CLI**: 모델 다운로드 및 관리
- **Jupyter Notebook**: 대화형 NLP 실험
- **Postman**: API 테스트

---

## 마무리

오늘 우리는 절차적 NLTK 코드를 객체지향 설계의 재사용 가능한 NLP 서비스로 발전시켰습니다. 이 과정에서:

1. **리팩토링**: 절차적 코드 → OOP 클래스 구조
2. **자연어 처리**: NLTK의 토큰화, 형태소 분석, 품사 태깅, 빈도 분석
3. **시각화**: 워드클라우드 생성 및 자동 저장
4. **API 설계**: FastAPI 이미지 응답, Query 파라미터
5. **배포**: Docker 환경에서 NLTK 데이터 관리

이제 Emma 소설의 등장인물 관계를 워드클라우드로 한눈에 파악할 수 있습니다. 더 나아가 한국어 NLP, 감정 분석, 개체명 인식 등으로 확장할 수 있는 견고한 기반을 마련했습니다.

NLP는 단순히 "단어를 세는 것"이 아니라 "의미를 파악하는 것"입니다. 이 프로젝트를 통해 자연어 처리의 기초를 다졌으니, 이제 실전 프로젝트에 적용해보세요!

**Happy NLP Coding! 🔤📊**

