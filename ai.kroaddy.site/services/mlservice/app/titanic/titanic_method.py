import pandas as pd
from typing import Tuple
import numpy as np
import os
import sys
from pathlib import Path
from typing import Optional
from pandas import DataFrame
from app.titanic.titanic_dataset import TitanicDataset

# 로깅 설정
try:
    sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))
    from common.utils import setup_logging
    logger = setup_logging("titanic_method")
except ImportError:
    import logging
    logger = logging.getLogger("titanic_method")
    logger.setLevel(logging.INFO)
    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        handler.setFormatter(formatter)
        logger.addHandler(handler)


class TitanicMethod(object):
    """타이타닉 데이터 전처리 메서드"""

    def __init__(self):
        self.dataset = TitanicDataset()



    def read_csv(self, fname: str ) -> pd.DataFrame:
        return pd.read_csv(fname)
    

    def create_df(self, df: DataFrame, label: str) -> pd.DataFrame:
        return df.drop(columns=[label])


    def create_label(self, df: DataFrame, label: str) -> pd.DataFrame:
        return df[[label]]



    def drop_features(self, this, *feature: str) -> object:
        [i.drop(j, axis=1, inplace=True) for j in feature for i in [this.train,this.test ] ]

        # for i in [this.train, this.test]:
        #     for j in feature:
        #         i.drop(j, axis=1, inplace=True)
 
        return this


    def check_null(self, this) -> None:
        """결측치 확인 및 출력"""
        for name, df in [("Train", this.train), ("Test", this.test)]:
            null_info = df.isnull().sum()
            null_count = null_info.sum()
            if null_count > 0:
                null_cols = null_info[null_info > 0]
                logger.warning(f"{name} 결측치: {null_count:,}개 ({', '.join(null_cols.index.tolist()[:5])}{'...' if len(null_cols) > 5 else ''})")
            else:
                logger.debug(f"{name}: 결측치 없음")

    # 척도 : Nominal ,Ordinal, Interval, Ratio

    def pclass_ordinal(self, this) -> object:
        """
        Pclass: 객실 등급 (1, 2, 3)
        - 서열형 척도(ordinal)로 처리합니다.
        - 1등석 > 2등석 > 3등석이므로, 생존률 관점에서 1이 가장 좋고 3이 가장 안 좋습니다.
        - 기존 Pclass를 그대로 유지합니다 (이미 순서형이므로 추가 변환 불필요).
        """
        # Pclass는 이미 1, 2, 3의 순서형 값이므로 그대로 사용
        for df in [this.train, this.test]:
            df['Pclass'] = df['Pclass'].astype(int)
        
        logger.debug('✓ Pclass 전처리 완료: 정수형 변환')
        return this

    def fare_ordinal(self, this) -> object:
        """
        Fare: 요금 (연속형 ratio 척도이지만, 여기서는 구간화하여 서열형으로 사용)
        - 결측치가 있으면 중앙값으로 채웁니다.
        - Fare를 사분위수 또는 적절한 구간으로 binning 하여 ordinal 피처를 만듭니다.
        - train 데이터의 사분위수 기준을 test에도 동일하게 적용합니다.
        """
        if 'Fare' not in this.train.columns:
            return this
        
        # 결측치 처리: 중앙값으로 채우기 (train 기준)
        fare_median = this.train['Fare'].median()
        
        # train 데이터로 사분위수 구간 경계값 계산
        _, bins = pd.qcut(
            this.train['Fare'], 
            q=4, 
            labels=[0, 1, 2, 3],
            retbins=True,
            duplicates='drop'
        )
        
        # train과 test 모두 동일한 bins로 구간화
        for df in [this.train, this.test]:
            df['Fare'] = df['Fare'].fillna(fare_median)
            df['Fare'] = pd.cut(
                df['Fare'],
                bins=bins,
                labels=[0, 1, 2, 3],
                include_lowest=True
            ).astype(int)

        logger.debug('✓ Fare 전처리 완료: train 기준 bins 적용, 구간화 완료')
        return this

    def embarked_ordinal(self, this) -> object:
        """
        Embarked: 탑승 항구 (C, Q, S)
        - 본질적으로는 nominal(명목) 척도입니다. 
        - Label encoding을 사용하여 하나의 컬럼으로 변환합니다 (C=0, Q=1, S=2).
        - 결측치는 가장 많이 등장하는 값으로 채웁니다 (mode).
        - train과 test의 일관성을 유지합니다.
        """
        if 'Embarked' not in this.train.columns:
            return this
        
        # 결측치 처리: 최빈값으로 채우기 (train 기준)
        embarked_mode = this.train['Embarked'].mode()[0] if not this.train['Embarked'].mode().empty else 'S'
        
        # Label encoding 매핑 (C=0, Q=1, S=2)
        embarked_mapping = {'C': 0, 'Q': 1, 'S': 2}
        
        # train과 test 모두 동일한 매핑 적용
        for df in [this.train, this.test]:
            df['Embarked'] = df['Embarked'].fillna(embarked_mode)
            df['Embarked_encoded'] = df['Embarked'].map(embarked_mapping).astype(int)
            df.drop(columns=['Embarked'], inplace=True)
        
        logger.debug(f'✓ Embarked 전처리 완료: 최빈값={embarked_mode}, Label encoding (C=0, Q=1, S=2)')
        return this

    def gender_nominal(self, this) -> object:
        """
        Gender: 성별 (male, female)
        - nominal 척도입니다.
        - 이진 인코딩으로 변환합니다 (male=0, female=1).
        - train.csv는 'Sex' 컬럼을 'Gender'로 변환합니다.
        - test.csv는 이미 'gender' 컬럼이 있으므로 그대로 사용합니다.
        """
        # train: 'Sex' 컬럼을 'Gender'로 변경
        if 'Sex' in this.train.columns and 'Gender' not in this.train.columns:
            this.train['Gender'] = this.train['Sex']
            this.train = this.train.drop(columns=['Sex'])
        
        # test: 'gender' 컬럼이 있으면 'Gender'로 표준화 (대소문자 통일)
        if 'gender' in this.test.columns:
            this.test['Gender'] = this.test['gender']
            this.test = this.test.drop(columns=['gender'])
        elif 'Sex' in this.test.columns:
            # 혹시 test에도 'Sex'가 있는 경우를 대비
            this.test['Gender'] = this.test['Sex']
            this.test = this.test.drop(columns=['Sex'])
        
        if 'Gender' not in this.train.columns or 'Gender' not in this.test.columns:
            logger.warning('Gender 컬럼이 없습니다.')
            return this
        
        # 이진 인코딩: male=0, female=1 (train과 test 모두)
        gender_mapping = {'male': 0, 'female': 1}
        for df in [this.train, this.test]:
            df['Gender_encoded'] = df['Gender'].map(gender_mapping).astype(int)
            df.drop(columns=['Gender'], inplace=True)
        
        logger.debug('✓ Gender 전처리 완료: 이진 인코딩 완료')
        return this


    def age_ratio(self, this) -> object:
        """
        Age: 나이
        - 원래는 ratio 척도지만, 여기서는 나이를 구간으로 나눈 ordinal 피처를 만듭니다.
        - Age 결측치는 중앙값으로 채웁니다.
        - bins를 사용해서 나이를 구간화합니다.
        - 구간 의미: [-1,0]=태아, [0,5]=유아, [5,12]=어린이, [12,18]=청소년, 
                     [18,24]=청년, [24,35]=장년, [35,60]=중년, [60,inf]=노년
        """
        if 'Age' not in this.train.columns:
            return this
        
        bins = [-1, 0, 5, 12, 18, 24, 35, 60, np.inf]

        # 결측치 처리: 중앙값으로 채우기 (train 기준)
        age_median = this.train['Age'].median()
        
        # Label Encoding (0~7) - 숫자형만 사용
        for df in [this.train, this.test]:
            df['Age'] = df['Age'].fillna(age_median)
            df['Age_encoded'] = pd.cut(
                df['Age'], 
                bins=bins, 
                labels=False,
                include_lowest=True
            ).astype(int)
            df.drop(columns=['Age'], inplace=True)
        
        logger.debug('✓ Age 전처리 완료: 구간화 완료 (0~7 숫자 인코딩)')
        return this

    def title_nominal(self, this) -> object:
        """
        Title: 명칭 (Mr, Mrs, Miss, Master, Dr, etc.)
        - Name 컬럼에서 추출한 타이틀입니다.
        - nominal 척도입니다.
        - 희소한 타이틀은 "Rare" 그룹으로 묶습니다.
        - train 데이터 기준으로 rare를 판단하여 test에도 동일하게 적용합니다.
        """
        if 'Name' not in this.train.columns or 'Name' not in this.test.columns:
            return this
        
        # Name에서 Title 추출 (정규표현식 사용)
        # 예: "Braund, Mr. Owen Harris" -> "Mr"
        for df in [this.train, this.test]:
            df['Title'] = df['Name'].str.extract(r',\s*([^\.]+)\.', expand=False)
        
        # Miss를 Ms로 통일 (title_mapping에 맞추기)
        for df in [this.train, this.test]:
            df['Title'] = df['Title'].replace('Miss', 'Ms')
        
        # Royal 타이틀 그룹화 (Lady, Countess, Sir, Don, Dona 등)
        royal_titles = ['Lady', 'Countess', 'Sir', 'Don', 'Dona', 'Jonkheer']
        for df in [this.train, this.test]:
            df['Title'] = df['Title'].replace(royal_titles, 'Royal')
        
        # title_mapping 정의
        title_mapping = {'Mr': 1, 'Ms': 2, 'Mrs': 3, 'Master': 4, 'Royal': 5, 'Rare': 6}
        
        # train 데이터 기준으로 희소한 타이틀을 "Rare"로 그룹화
        # 주요 타이틀: Mr, Ms, Mrs, Master, Royal
        title_counts = this.train['Title'].value_counts()
        rare_titles = title_counts[title_counts < 10].index.tolist()

        # title_mapping에 없는 타이틀만 Rare로 변경
        rare_titles = [t for t in rare_titles if t not in title_mapping]
        
        # train과 test 모두 동일한 rare_titles 기준 적용
        for df in [this.train, this.test]:
            df['Title'] = df['Title'].replace(rare_titles, 'Rare')
            df['Title_encoded'] = df['Title'].map(title_mapping).fillna(6).astype(int)  # 매핑되지 않은 것은 6(Rare)로
            df.drop(columns=['Title'], inplace=True)
        
        logger.debug(f'✓ Title 전처리 완료: train 기준 rare_titles={rare_titles}')
        return this

