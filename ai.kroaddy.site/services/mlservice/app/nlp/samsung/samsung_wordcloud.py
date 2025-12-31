# ************
# 삼성전자 보고서 자연어 처리 - OOP 버전
# ************
"""
삼성전자 보고서를 분석하여 워드클라우드를 생성하는 클래스
한국어 자연어 처리를 위해 konlpy의 Okt를 사용합니다.
"""

import re
import pandas as pd
from pathlib import Path
from typing import List, Optional
from nltk import FreqDist
from wordcloud import WordCloud
import matplotlib.pyplot as plt
from konlpy.tag import Okt
from datetime import datetime


class SamsungWordCloud:
    """
    삼성전자 보고서 자연어 처리 및 워드클라우드 생성 클래스
    
    주요 기능:
    - 파일 읽기 및 한글 추출
    - 명사 추출
    - 스탑워드 제거
    - 빈도 분석
    - 워드클라우드 생성
    """
    
    def __init__(self, file_path: Optional[str] = None, stopword_path: Optional[str] = None):
        """
        SamsungWordCloud 초기화
        
        Args:
            file_path: 분석할 파일 경로 (기본값: None)
            stopword_path: 스탑워드 파일 경로 (기본값: './data/stopwords.txt')
        """
        # 한국어 형태소 분석기 초기화
        self.okt = Okt()
        
        # 파일 경로 설정
        self.file_path = file_path
        if stopword_path is None:
            # 기본 경로: app/nlp/data/ 폴더
            nlp_data_dir = Path(__file__).parent.parent / 'data'
            stopword_path = nlp_data_dir / 'stopwords.txt'
        self.stopword_path = Path(stopword_path)
        
        # 폰트 경로 설정
        nlp_data_dir = Path(__file__).parent.parent / 'data'
        self.font_path = nlp_data_dir / 'D2Coding.ttf'
        
        # 내부 상태 저장
        self.raw_text: Optional[str] = None
        self.hangeul_text: Optional[str] = None
        self.tokens: Optional[List[str]] = None
        self.noun_texts: Optional[str] = None
        self.filtered_texts: Optional[List[str]] = None
        
        # save 폴더 경로 설정 (samsung/save/)
        self.save_dir = Path(__file__).parent / 'save'
        self.save_dir.mkdir(exist_ok=True)
    
    def read_file(self, file_path: Optional[str] = None) -> str:
        """
        파일 읽기
        
        Args:
            file_path: 읽을 파일 경로 (None이면 self.file_path 사용)
            
        Returns:
            파일 내용 문자열
        """
        if file_path is None:
            if self.file_path is None:
                raise ValueError("파일 경로가 지정되지 않았습니다. file_path를 인자로 전달하거나 __init__에서 설정하세요.")
            file_path = self.file_path
        
        file_path = Path(file_path)
        if not file_path.exists():
            raise FileNotFoundError(f"파일을 찾을 수 없습니다: {file_path}")
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        self.raw_text = content
        return content
    
    def extract_hangeul(self, text: Optional[str] = None) -> str:
        """
        한글만 추출
        
        Args:
            text: 추출할 텍스트 (None이면 self.raw_text 사용)
            
        Returns:
            한글이 포함된 텍스트만 추출한 문자열
        """
        if text is None:
            if self.raw_text is None:
                raise ValueError("텍스트가 없습니다. read_file()을 먼저 호출하세요.")
            text = self.raw_text
        
        # 한글, 공백, 숫자만 추출
        pattern = re.compile('[^가-힣\s0-9]')
        hangeul_text = pattern.sub('', text)
        
        self.hangeul_text = hangeul_text
        return hangeul_text
    
    def change_token(self, text: str) -> List[str]:
        """
        텍스트를 토큰 리스트로 변환
        
        Args:
            text: 토큰화할 텍스트
            
        Returns:
            토큰 리스트
        """
        # 공백으로 분리하여 토큰 리스트 생성
        tokens = text.split()
        self.tokens = tokens
        return tokens
    
    def extract_noun(self) -> str:
        """
        명사 추출
        삼성전자의 스마트폰은 -> 삼성전자 스마트폰
        
        Returns:
            명사만 추출한 텍스트 (공백으로 구분)
        """
        if self.raw_text is None:
            raise ValueError("텍스트가 없습니다. read_file()을 먼저 호출하세요.")
        
        # 한글 추출 및 토큰화
        hangeul_text = self.extract_hangeul()
        tokens = self.change_token(hangeul_text)
        
        noun_tokens = []
        for token in tokens:
            # 형태소 분석 및 품사 태깅
            pos = self.okt.pos(token)
            # 명사만 추출
            nouns = [word for word, tag in pos if tag == 'Noun']
            # 명사들을 합쳐서 하나의 토큰으로 만듦
            noun_str = ''.join(nouns)
            # 길이가 1보다 큰 경우만 추가
            if len(noun_str) > 1:
                noun_tokens.append(noun_str)
        
        texts = ' '.join(noun_tokens)
        
        self.noun_texts = texts
        return texts
    
    def read_stopword(self) -> str:
        """
        스탑워드 파일 읽기
        
        Returns:
            스탑워드 문자열
        """
        # Okt 초기화 (필요시)
        self.okt.pos("삼성전자 글로벌센터 전자사업부", stem=True)
        
        if not self.stopword_path.exists():
            raise FileNotFoundError(f"스탑워드 파일을 찾을 수 없습니다: {self.stopword_path}")
        
        with open(self.stopword_path, 'r', encoding='utf-8') as f:
            stopwords = f.read()
        
        return stopwords
    
    def remove_stopword(self) -> List[str]:
        """
        스탑워드 제거
        
        Returns:
            스탑워드가 제거된 토큰 리스트
        """
        # 명사 추출
        texts = self.extract_noun()
        # 토큰화
        tokens = self.change_token(texts)
        
        # 스탑워드 읽기
        stopwords = self.read_stopword()
        
        # 스탑워드에 포함되지 않은 토큰만 필터링
        filtered_texts = [text for text in tokens if text not in stopwords]
        
        self.filtered_texts = filtered_texts
        return filtered_texts
    
    def find_freq(self) -> pd.Series:
        """
        빈도수가 많은 단어부터 정렬된 Series 반환
        
        Returns:
            빈도수로 정렬된 pandas Series
        """
        texts = self.remove_stopword()
        
        # 빈도 분포 계산
        freq_dist = FreqDist(texts)
        # pandas Series로 변환하고 빈도수 내림차순 정렬
        freqtxt = pd.Series(dict(freq_dist)).sort_values(ascending=False)
        
        return freqtxt
    
    def draw_wordcloud(
        self,
        width: int = 1200,
        height: int = 1200,
        relative_scaling: float = 0.2,
        background_color: str = 'white',
        show: bool = True,
        save: bool = True
    ) -> WordCloud:
        """
        워드클라우드 그리기
        
        Args:
            width: 이미지 너비 (기본값: 1200)
            height: 이미지 높이 (기본값: 1200)
            relative_scaling: 상대적 크기 조정 (기본값: 0.2)
            background_color: 배경색 (기본값: 'white')
            show: 그래프 표시 여부 (기본값: True)
            save: 파일 저장 여부 (기본값: True)
            
        Returns:
            WordCloud 객체
        """
        texts = self.remove_stopword()
        
        # 폰트 경로 확인
        font_path = str(self.font_path) if self.font_path.exists() else None
        if font_path is None:
            raise FileNotFoundError(f"폰트 파일을 찾을 수 없습니다: {self.font_path}")
        
        # 워드클라우드 생성
        wcloud = WordCloud(
            font_path=font_path,
            width=width,
            height=height,
            relative_scaling=relative_scaling,
            background_color=background_color
        ).generate(" ".join(texts))
        
        # 그래프 표시
        if show:
            plt.figure(figsize=(12, 12))
            plt.imshow(wcloud, interpolation='bilinear')
            plt.axis('off')
            plt.show()
        
        # 파일 저장
        if save:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"samsung_wordcloud_{timestamp}.png"
            filepath = self.save_dir / filename
            wcloud.to_file(str(filepath))
        
        return wcloud


# ***********
# 사용 예시
# ***********

if __name__ == "__main__":
    # 클래스 인스턴스 생성
    swc = SamsungWordCloud(
        file_path='./data/samsung_report.txt',  # 실제 파일 경로로 변경 필요
        stopword_path='./data/stopwords.txt'
    )
    
    # 파일 읽기
    swc.read_file()
    
    # 명사 추출
    nouns = swc.extract_noun()
    print(f"명사 추출 결과 (처음 100자): {nouns[:100]}")
    
    # 스탑워드 제거
    filtered = swc.remove_stopword()
    print(f"필터링된 토큰 수: {len(filtered)}")
    
    # 빈도 분석
    freq = swc.find_freq()
    print(f"상위 10개 단어:\n{freq.head(10)}")
    
    # 워드클라우드 생성
    wc = swc.draw_wordcloud(show=True, save=True)
    print("워드클라우드 생성 완료!")