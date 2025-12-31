# ************
# NLTK 자연어 처리 패키지 - OOP 버전
# ************
"""
https://datascienceschool.net/view-notebook/118731eec74b4ad3bdd2f89bab077e1b/
NLTK(Natural Language Toolkit) 패키지는 
교육용으로 개발된 자연어 처리 및 문서 분석용 파이썬 패키지다. 
다양한 기능 및 예제를 가지고 있으며 실무 및 연구에서도 많이 사용된다.
NLTK 패키지가 제공하는 주요 기능은 다음과 같다.
말뭉치
토큰 생성
형태소 분석
품사 태깅
"""  

import nltk
from nltk.tokenize import sent_tokenize, word_tokenize, RegexpTokenizer
from nltk.stem import PorterStemmer, LancasterStemmer, WordNetLemmatizer
from nltk.tag import pos_tag, untag
from nltk import Text, FreqDist
from wordcloud import WordCloud
import matplotlib.pyplot as plt
from typing import List, Tuple, Optional, Dict, Any
from pathlib import Path
import os
from datetime import datetime


class NLPService:
    """
    NLTK 기반 자연어 처리 서비스 클래스
    
    주요 기능:
    - 말뭉치 로드 및 관리
    - 토큰화 (문장, 단어, 정규식)
    - 형태소 분석 (Stemming, Lemmatization)
    - 품사 태깅 (POS Tagging)
    - 텍스트 분석 (Text 클래스)
    - 빈도 분석 (FreqDist)
    - 워드클라우드 생성
    """
    
    def __init__(self, download_nltk_data: bool = True):
        """
        NLPService 초기화
        
        Args:
            download_nltk_data: NLTK 데이터 다운로드 여부 (기본값: True)
        """
        if download_nltk_data:
            try:
                nltk.download('book', quiet=True)
                nltk.download('punkt', quiet=True)
                nltk.download('wordnet', quiet=True)
                nltk.download('averaged_perceptron_tagger', quiet=True)
                # POS 태깅에 필요한 추가 데이터
                try:
                    nltk.download('averaged_perceptron_tagger_eng', quiet=True)
                except:
                    pass  # 일부 버전에서는 필요 없을 수 있음
                nltk.download('omw-1.4', quiet=True)
            except Exception as e:
                print(f"NLTK 데이터 다운로드 중 오류 발생 (무시하고 계속): {e}")
        
        # 형태소 분석기 초기화
        self.porter_stemmer = PorterStemmer()
        self.lancaster_stemmer = LancasterStemmer()
        self.lemmatizer = WordNetLemmatizer()
        
        # 토크나이저 초기화
        self.regex_tokenizer = RegexpTokenizer("[\w]+")
        
        # 내부 상태 저장
        self.current_text: Optional[Text] = None
        self.current_tokens: Optional[List[str]] = None
        self.current_corpus: Optional[str] = None
        
        # save 폴더 경로 설정 (app/nlp/save)
        self.save_dir = Path(__file__).parent.parent / 'save'
        # save 폴더가 없으면 생성
        self.save_dir.mkdir(exist_ok=True)
    
    # *********
    # 말뭉치
    # *********
    """
    말뭉치(corpus)는 자연어 분석 작업을 위해 만든 샘플 문서 집합을 말한다. 
    단순히 소설, 신문 등의 문서를 모아놓은 것도 있지만 
    품사. 형태소, 등의 보조적 의미를 추가하고 쉬운 분석을 위해 
    구조적인 형태로 정리해 놓은 것을 포함한다. 
    NLTK 패키지의 corpus 서브패키지에서는 다양한 연구용 말뭉치를 제공한다. 
    이 목록은 전체 corpus의 일부일 뿐이다. 
    말뭉치 자료는 설치시에 제공되지 않고 download 명령으로 
    사용자가 다운로드 받아야 한다. 
    nltk.download('book') 명령을 실행하면 
    NLTK 패키지 사용자 설명서에서 요구하는
    대부분의 말뭉치를 다운로드 받아준다.
    
    예를 들어 저작권이 말소된 문학작품을 포함하는 gutenberg 말뭉치에는 
    다음과 같은 작품이 샘플로 포함되어 있다.
    """
    
    def get_corpus_fileids(self, corpus_name: str = 'gutenberg') -> List[str]:
        """
        말뭉치 파일 ID 목록 반환
        
        Args:
            corpus_name: 말뭉치 이름 (기본값: 'gutenberg')
            
        Returns:
            파일 ID 리스트
        """
        if corpus_name == 'gutenberg':
            return nltk.corpus.gutenberg.fileids()
        else:
            raise ValueError(f"지원하지 않는 말뭉치: {corpus_name}")
    
    def load_corpus(self, fileid: str, corpus_name: str = 'gutenberg') -> str:
        """
        말뭉치 파일 로드
        
        예를 들어 저작권이 말소된 문학작품을 포함하는 gutenberg 말뭉치에는 
        다음과 같은 작품이 샘플로 포함되어 있다.
        이 중 제인 오스틴의 엠마 문서를 살펴보면 
        다음과 같이 원문 형태 그대로를 포함하고 있다.
        
        Args:
            fileid: 파일 ID (예: 'austen-emma.txt')
            corpus_name: 말뭉치 이름 (기본값: 'gutenberg')
            
        Returns:
            원시 텍스트 문자열
        """
        if corpus_name == 'gutenberg':
            raw_text = nltk.corpus.gutenberg.raw(fileid)
            self.current_corpus = raw_text
            return raw_text
        else:
            raise ValueError(f"지원하지 않는 말뭉치: {corpus_name}")
    
    def load_text_from_string(self, text: str) -> None:
        """
        문자열로부터 텍스트 로드
        
        Args:
            text: 분석할 텍스트 문자열
        """
        self.current_corpus = text
    
    # ************
    # 토큰 생성
    # ************
    """
    자연어 문서를 분석하기 위해서는 우선 긴 문자열을 분석을 위한 
    작은 단위로 나누어야 한다. 
    이 문자열 단위를 토큰(token)이라고 하고 
    이렇게 문자열을 토큰으로 나누는 작업을 토큰 생성(tokenizing)이라고 한다. 
    영문의 경우에는 문장, 단어 등을 
    토큰으로 사용하거나 정규 표현식을 쓸 수 있다.
    문자열을 토큰으로 분리하는 함수를 
    토큰 생성 함수(tokenizer)라고 한다. 
    토큰 생성 함수는 문자열을 입력받아 토큰 문자열의 리스트를 출력한다.
    """
    
    def tokenize_sentences(self, text: Optional[str] = None) -> List[str]:
        """
        문장 단위 토큰화
        
        Args:
            text: 토큰화할 텍스트 (None이면 현재 로드된 텍스트 사용)
            
        Returns:
            문장 리스트
        """
        if text is None:
            if self.current_corpus is None:
                raise ValueError("분석할 텍스트가 없습니다. load_corpus() 또는 load_text_from_string()을 먼저 호출하세요.")
            text = self.current_corpus
        
        return sent_tokenize(text)
    
    def tokenize_words(self, text: Optional[str] = None) -> List[str]:
        """
        단어 단위 토큰화
        
        Args:
            text: 토큰화할 텍스트 (None이면 현재 로드된 텍스트 사용)
            
        Returns:
            단어 토큰 리스트
        """
        if text is None:
            if self.current_corpus is None:
                raise ValueError("분석할 텍스트가 없습니다. load_corpus() 또는 load_text_from_string()을 먼저 호출하세요.")
            text = self.current_corpus
        
        tokens = word_tokenize(text)
        self.current_tokens = tokens
        return tokens
    
    def tokenize_regex(self, text: Optional[str] = None, pattern: str = "[\w]+") -> List[str]:
        """
        정규식 기반 토큰화
        
        Args:
            text: 토큰화할 텍스트 (None이면 현재 로드된 텍스트 사용)
            pattern: 정규식 패턴 (기본값: "[\w]+")
            
        Returns:
            토큰 리스트
        """
        if text is None:
            if self.current_corpus is None:
                raise ValueError("분석할 텍스트가 없습니다. load_corpus() 또는 load_text_from_string()을 먼저 호출하세요.")
            text = self.current_corpus
        
        tokenizer = RegexpTokenizer(pattern)
        tokens = tokenizer.tokenize(text)
        self.current_tokens = tokens
        return tokens
    
    # ***************
    # 형태소 분석
    # ***************
    """
    형태소(morpheme)는 언어학에서 
    일정한 의미가 있는 가장 작은 말의 단위를 뜻한다. 
    보통 자연어 처리에서는 토큰으로 형태소를 이용한다. 
    형태소 분석(morphological analysis)이란 단어로부터 
    어근, 접두사, 접미사, 품사 등 다양한 언어적 속성을 파악하고 
    이를 이용하여 형태소를 찾아내거나 처리하는 작업이다. 
    형태소 분석의 예로는 다음과 같은 작업이 있다.
    어간 추출(stemming)
    원형 복원(lemmatizing)
    품사 부착(Part-Of-Speech tagging)
    
    어간 추출과 원형 복원
    어간 추출(stemming)은 변화된 단어의 접미사나 어미를 제거하여 
    같은 의미를 가지는 형태소의 기본형을 찾는 방법이다. 
    NLTK는 PorterStemmer LancasterStemmer 등을 제공한다. 
    어간 추출법은 단순히 어미를 제거할 뿐이므로 
    단어의 원형의 정확히 찾아주지는 않는다.
    
    원형 복원(lemmatizing)은 같은 의미를 가지는 여러 단어를 
    사전형으로 통일하는 작업이다. 품사(part of speech)를 지정하는 경우 
    좀 더 정확한 원형을 찾을 수 있다.
    """
    
    def stem_porter(self, words: List[str]) -> List[str]:
        """
        Porter Stemmer를 사용한 어간 추출
        
        Args:
            words: 어간 추출할 단어 리스트
            
        Returns:
            어간 추출된 단어 리스트
        """
        return [self.porter_stemmer.stem(word) for word in words]
    
    def stem_lancaster(self, words: List[str]) -> List[str]:
        """
        Lancaster Stemmer를 사용한 어간 추출
        
        Args:
            words: 어간 추출할 단어 리스트
            
        Returns:
            어간 추출된 단어 리스트
        """
        return [self.lancaster_stemmer.stem(word) for word in words]
    
    def lemmatize(self, words: List[str], pos: Optional[str] = None) -> List[str]:
        """
        원형 복원 (Lemmatization)
        
        Args:
            words: 원형 복원할 단어 리스트
            pos: 품사 태그 (None이면 자동 감지)
            
        Returns:
            원형 복원된 단어 리스트
        """
        if pos:
            return [self.lemmatizer.lemmatize(word, pos=pos) for word in words]
        else:
            return [self.lemmatizer.lemmatize(word) for word in words]
    
    def lemmatize_word(self, word: str, pos: Optional[str] = None) -> str:
        """
        단일 단어 원형 복원
        
        Args:
            word: 원형 복원할 단어
            pos: 품사 태그 (예: 'v', 'n', 'a')
            
        Returns:
            원형 복원된 단어
        """
        if pos:
            return self.lemmatizer.lemmatize(word, pos=pos)
        else:
            return self.lemmatizer.lemmatize(word)
    
    # **********
    # POS tagging
    # **********
    """
    품사(POS, part-of-speech)는 낱말을 
    문법적인 기능이나 형태, 뜻에 따라 구분한 것이다. 
    품사의 구분은 언어마다 그리고 학자마다 다르다.
    예를 들어 NLTK에서는 펜 트리뱅크 태그세트(Penn Treebank Tagset)
   라는 것을 이용한다. 
    다음은 펜 트리뱅크 태그세트에서 사용하는 품사의 예이다.
    NNP: 단수 고유명사
    VB: 동사
    VBP: 동사 현재형
    TO: to 전치사
    NN: 명사(단수형 혹은 집합형)
    DT: 관형사
    nltk.help.upenn_tagset 명령으로 자세한 설명을 볼 수 있다.
    
    국내 태그세트로는 "21세기 세종계획 품사 태그세트"를 비롯하여
    다양한 품사 태그세트가 있으며 세종계획 품사 태그세트에 대해서는
    "(21세기 세종계획)국어 기초자료 구축" 보고서의
    "어절 분석 표지 표준안"을 참조한다. 
    사실은 형태소 분석기마다 사용하는 품사 태그가 다르며 
    자세한 내용은 다음절의 koNLPy 패키지에서 설명한다.
    pos_tag 명령을 사용하면 단어 토큰에 품사를 부착하여 튜플로 출력한다. 
    다음 예문에서 refuse, permit이라는 같은 철자의 단어가 
    각각 동사와 명사로 다르게 품사 부착된 것을 볼 수 있다.
    
    품사 태그 정보를 사용하면 명사인 토큰만 선택할 수 있다.
    untag 명령을 사용하면 태그 튜플을 제거할 수 있다.
    
    Scikit-Learn 등에서 자연어 분석을 할 때는 같은 토큰이라도 
    품사가 다르면 다른 토큰으로 처리해야 하는 경우가 많은데 
    이 때는 원래의 토큰과 품사를 붙여서 새로운 토큰 이름을 만들어 사용하면
    철자가 같고 품사가 다른 단어를 구분할 수 있다.
    """
    
    def get_pos_tag_info(self, tag: str) -> None:
        """
        POS 태그 정보 출력
        
        Args:
            tag: POS 태그 (예: 'VB', 'NN')
        """
        nltk.help.upenn_tagset(tag)
    
    def pos_tag(self, tokens: Optional[List[str]] = None) -> List[Tuple[str, str]]:
        """
        품사 태깅
        
        pos_tag 명령을 사용하면 단어 토큰에 품사를 부착하여 튜플로 출력한다. 
        다음 예문에서 refuse, permit이라는 같은 철자의 단어가 
        각각 동사와 명사로 다르게 품사 부착된 것을 볼 수 있다.
        예: "Emma refused to permit us to obtain the refuse permit"
        
        Args:
            tokens: 토큰 리스트 (None이면 현재 토큰 사용)
            
        Returns:
            (단어, 품사) 튜플 리스트
        """
        if tokens is None:
            if self.current_tokens is None:
                raise ValueError("토큰이 없습니다. tokenize_words() 또는 tokenize_regex()를 먼저 호출하세요.")
            tokens = self.current_tokens
        
        return pos_tag(tokens)
    
    def extract_nouns(self, tagged_list: Optional[List[Tuple[str, str]]] = None) -> List[str]:
        """
        명사만 추출
        
        Args:
            tagged_list: POS 태깅된 리스트 (None이면 자동 태깅)
            
        Returns:
            명사 리스트
        """
        if tagged_list is None:
            tagged_list = self.pos_tag()
        
        return [word for word, tag in tagged_list if tag == "NN"]
    
    def remove_tags(self, tagged_list: List[Tuple[str, str]]) -> List[str]:
        """
        태그 제거
        
        Args:
            tagged_list: POS 태깅된 리스트
            
        Returns:
            태그가 제거된 단어 리스트
        """
        return untag(tagged_list)
    
    def create_pos_tokenizer(self, tagged_list: Optional[List[Tuple[str, str]]] = None) -> List[str]:
        """
        POS 태그를 포함한 토크나이저 생성
        (같은 철자, 다른 품사를 구분하기 위해 단어/품사 형식으로 변환)
        
        Args:
            tagged_list: POS 태깅된 리스트 (None이면 자동 태깅)
            
        Returns:
            "단어/품사" 형식의 토큰 리스트
        """
        if tagged_list is None:
            tagged_list = self.pos_tag()
        
        return ["/".join(pair) for pair in tagged_list]
    
    # ***********
    # Text 클래스
    # ***********
    """
    NLTK의 Text 클래스는 문서 분석에 유용한 여러가지 메서드를 제공한다. 
    토큰열을 입력하여 생성한다.
    
    plot 메소드를 사용하면 각 단어(토큰)의 사용 빈도를 그래프로 그려준다.
    
    dispersion_plot 메서드는 단어가 사용된 위치를 시각화한다. 
    소설 엠마의 각 등장인물에 대해 적용하면 다음과 같은 결과를 얻는다.
    
    concordance 메서드로 단어가 사용된 위치를 직접 표시할 수도 있다.
    
    similar 메서드는 해당 단어와 비슷한 문맥에서 사용된 단어들을 찾는다.
    
    collocations 메서드로는 같이 붙어서 쓰이는 단어 
    즉, 연어(collocation)를 찾는다.
    """
    
    def create_text_analyzer(self, tokens: Optional[List[str]] = None, name: str = "Text") -> Text:
        """
        Text 분석 객체 생성
        
        Args:
            tokens: 토큰 리스트 (None이면 현재 토큰 사용)
            name: 텍스트 이름
            
        Returns:
            Text 객체
        """
        if tokens is None:
            if self.current_tokens is None:
                raise ValueError("토큰이 없습니다. tokenize_words() 또는 tokenize_regex()를 먼저 호출하세요.")
            tokens = self.current_tokens
        
        text = Text(tokens, name=name)
        self.current_text = text
        return text
    
    def plot_word_frequency(self, text: Optional[Text] = None, num_words: int = 20, show: bool = True) -> None:
        """
        단어 빈도 그래프 그리기
        
        Args:
            text: Text 객체 (None이면 현재 Text 사용)
            num_words: 표시할 단어 수
            show: 그래프 표시 여부
        """
        if text is None:
            if self.current_text is None:
                raise ValueError("Text 객체가 없습니다. create_text_analyzer()를 먼저 호출하세요.")
            text = self.current_text
        
        text.plot(num_words)
        if show:
            plt.show()
    
    def plot_dispersion(self, words: List[str], text: Optional[Text] = None, show: bool = True) -> None:
        """
        단어 분산 플롯 (단어가 사용된 위치 시각화)
        
        Args:
            words: 시각화할 단어 리스트
            text: Text 객체 (None이면 현재 Text 사용)
            show: 그래프 표시 여부
        """
        if text is None:
            if self.current_text is None:
                raise ValueError("Text 객체가 없습니다. create_text_analyzer()를 먼저 호출하세요.")
            text = self.current_text
        
        text.dispersion_plot(words)
        if show:
            plt.show()
    
    def find_concordance(self, word: str, lines: int = 5, text: Optional[Text] = None) -> None:
        """
        단어 사용 위치 찾기
        
        Args:
            word: 찾을 단어
            lines: 표시할 줄 수
            text: Text 객체 (None이면 현재 Text 사용)
        """
        if text is None:
            if self.current_text is None:
                raise ValueError("Text 객체가 없습니다. create_text_analyzer()를 먼저 호출하세요.")
            text = self.current_text
        
        text.concordance(word, lines=lines)
    
    def find_similar_words(self, word: str, num: int = 10, text: Optional[Text] = None) -> None:
        """
        유사한 문맥에서 사용된 단어 찾기
        
        Args:
            word: 기준 단어
            num: 반환할 단어 수
            text: Text 객체 (None이면 현재 Text 사용)
        """
        if text is None:
            if self.current_text is None:
                raise ValueError("Text 객체가 없습니다. create_text_analyzer()를 먼저 호출하세요.")
            text = self.current_text
        
        text.similar(word, num=num)
    
    def find_collocations(self, num: int = 10, text: Optional[Text] = None) -> None:
        """
        연어(Collocation) 찾기
        
        Args:
            num: 반환할 연어 수
            text: Text 객체 (None이면 현재 Text 사용)
        """
        if text is None:
            if self.current_text is None:
                raise ValueError("Text 객체가 없습니다. create_text_analyzer()를 먼저 호출하세요.")
            text = self.current_text
        
        text.collocations(num=num)
    
    # ***********
    # FreqDist
    # ***********
    """
    FreqDist 클래스는 단어를 키(key), 출현빈도를 값(value)으로 
    가지는 사전 자료형과 유사하다. 
    다음 코드는 전체 단어의 수, "Emma"라는 단어의 출현 횟수, 확률을 각각 계산한다.
    
    또는 다음처럼 토큰 리스트를 넣어서 직접 만들 수도 있다. 
    다음 코드에서는 Emma 말뭉치에서 사람의 이름만 모아서 FreqDist 클래스 객체를 만들었다. 
    품사 태그에서 NNP(고유대명사)이면서 필요없는 단어(stop words)는 제거하였다.
    
    most_common 메서드를 사용하면 가장 출현 횟수가 높은 단어를 찾는다.
    """
    
    def get_vocabulary(self, text: Optional[Text] = None) -> FreqDist:
        """
        Text 객체의 어휘 빈도 분포 반환
        
        Args:
            text: Text 객체 (None이면 현재 Text 사용)
            
        Returns:
            FreqDist 객체
        """
        if text is None:
            if self.current_text is None:
                raise ValueError("Text 객체가 없습니다. create_text_analyzer()를 먼저 호출하세요.")
            text = self.current_text
        
        return text.vocab()
    
    def create_freq_dist(self, tokens: List[str]) -> FreqDist:
        """
        토큰 리스트로부터 빈도 분포 생성
        
        Args:
            tokens: 토큰 리스트
            
        Returns:
            FreqDist 객체
        """
        return FreqDist(tokens)
    
    def filter_tokens_by_pos(
        self, 
        pos_tag: str, 
        stopwords: Optional[List[str]] = None,
        tagged_list: Optional[List[Tuple[str, str]]] = None
    ) -> List[str]:
        """
        특정 품사만 필터링하여 추출
        
        Args:
            pos_tag: 추출할 품사 태그 (예: 'NNP', 'NN')
            stopwords: 제외할 단어 리스트
            tagged_list: POS 태깅된 리스트 (None이면 자동 태깅)
            
        Returns:
            필터링된 단어 리스트
        """
        if tagged_list is None:
            tagged_list = self.pos_tag()
        
        if stopwords is None:
            stopwords = []
        
        return [word for word, tag in tagged_list if tag == pos_tag and word not in stopwords]
    
    def get_freq_statistics(self, freq_dist: FreqDist, word: str) -> Tuple[int, int, float]:
        """
        빈도 통계 정보 반환
        
        Args:
            freq_dist: FreqDist 객체
            word: 조회할 단어
            
        Returns:
            (전체 단어 수, 단어 출현 횟수, 단어 출현 확률) 튜플
        """
        return freq_dist.N(), freq_dist[word], freq_dist.freq(word)
    
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
    
    # ***********
    # 워드클라우드
    # ***********
    """
    wordcloud 패키지를 사용하면 단어의 사용 빈도수에 따라 
    워드클라우드(Word Cloud) 시각화를 할 수 있다.
    """
    
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
            freq_dist: FreqDist 객체
            width: 이미지 너비
            height: 이미지 높이
            background_color: 배경색
            random_state: 랜덤 시드
            show: 그래프 표시 여부
            
        Returns:
            WordCloud 객체
        """
        wc = WordCloud(
            width=width,
            height=height,
            background_color=background_color,
            random_state=random_state
        )
        
        wc.generate_from_frequencies(freq_dist)
        
        # 워드클라우드 자동 저장
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"emma_wordcloud_{timestamp}.png"
        filepath = self.save_dir / filename
        wc.to_file(str(filepath))
        
        if show:
            plt.imshow(wc)
            plt.axis("off")
            plt.show()
        
        return wc
    
    def save_wordcloud(self, wordcloud: WordCloud, filepath: str) -> None:
        """
        워드클라우드를 파일로 저장
        
        Args:
            wordcloud: WordCloud 객체
            filepath: 저장할 파일 경로
        """
        wordcloud.to_file(filepath)


# ***********
# 사용 예시
# ***********

if __name__ == "__main__":
    # 서비스 인스턴스 생성
    nlp = NLPService()
    
    # 말뭉치 로드
    fileids = nlp.get_corpus_fileids()
    print(f"사용 가능한 파일: {fileids[:5]}")
    
    emma_raw = nlp.load_corpus("austen-emma.txt")
    print(f"엠마 원문 (처음 200자): {emma_raw[:200]}")
    
    # 토큰화
    sentences = nlp.tokenize_sentences(emma_raw[:1000])
    print(f"\n문장 수: {len(sentences)}")
    print(f"첫 번째 문장: {sentences[0] if sentences else 'None'}")
    
    words = nlp.tokenize_words(emma_raw[50:100])
    print(f"\n단어 토큰: {words}")
    
    regex_tokens = nlp.tokenize_regex(emma_raw[50:100])
    print(f"정규식 토큰: {regex_tokens}")
    
    # 형태소 분석
    test_words = ['lives', 'crying', 'flies', 'dying']
    porter_stems = nlp.stem_porter(test_words)
    print(f"\nPorter Stemming: {porter_stems}")
    
    lancaster_stems = nlp.stem_lancaster(test_words)
    print(f"Lancaster Stemming: {lancaster_stems}")
    
    lemmas = nlp.lemmatize(test_words)
    print(f"Lemmatization: {lemmas}")
    
    dying_lemma = nlp.lemmatize_word("dying", pos="v")
    print(f"Lemmatize 'dying' (verb): {dying_lemma}")
    
    # POS 태깅
    sentence = "Emma refused to permit us to obtain the refuse permit"
    tokens = nlp.tokenize_words(sentence)
    tagged = nlp.pos_tag(tokens)
    print(f"\nPOS 태깅: {tagged}")
    
    nouns = nlp.extract_nouns(tagged)
    print(f"명사만 추출: {nouns}")
    
    # Text 분석
    text_analyzer = nlp.create_text_analyzer(nlp.tokenize_regex(emma_raw), name="Emma")
    
    # 빈도 분석
    stopwords = ["Mr.", "Mrs.", "Miss", "Mr", "Mrs", "Dear"]
    emma_tokens = nlp.tokenize_regex(emma_raw)
    tagged_tokens = nlp.pos_tag(emma_tokens)
    names = nlp.filter_tokens_by_pos("NNP", stopwords=stopwords, tagged_list=tagged_tokens)
    fd_names = nlp.create_freq_dist(names)
    
    total, emma_count, emma_freq = nlp.get_freq_statistics(fd_names, "Emma")
    print(f"\n전체 단어 수: {total}, 'Emma' 출현: {emma_count}, 확률: {emma_freq:.4f}")
    
    most_common = nlp.get_most_common(fd_names, 5)
    print(f"가장 빈도 높은 단어: {most_common}")
    
    # 워드클라우드 생성
    wc = nlp.generate_wordcloud(fd_names, show=False)
    print("\n워드클라우드 생성 완료!")
