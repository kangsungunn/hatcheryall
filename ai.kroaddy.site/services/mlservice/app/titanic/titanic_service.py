import pandas as pd
import numpy as np
from sklearn import datasets
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import os
import sys
from typing import List, Optional, Tuple, Dict, Any
from pathlib import Path

from app.titanic.titanic_dataset import TitanicDataset
from app.titanic.titanic_method import TitanicMethod

# 공통 모듈 경로 추가
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

# 로깅 설정
try:
    from common.utils import setup_logging
    logger = setup_logging("titanic_service")
except ImportError:
    import logging
    logger = logging.getLogger("titanic_service")
    logger.setLevel(logging.INFO)
    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        handler.setFormatter(formatter)
        logger.addHandler(handler)


class TitanicService:
    """타이타닉 승객 데이터 처리 및 ML 서비스"""
    
    def __init__(self):
        self.processed_data = None  # 전처리된 데이터 저장
        self.train_label = None  # 원본 train의 Survived 레이블
        self.models = {}  # 학습된 모델 저장
    
    # ==================== ML 파이프라인 ====================
    
    # ==================== PREPROCESS ====================
    def _collect_dataframe_info(self, df: pd.DataFrame, sample_size: int = 5) -> Dict[str, Any]:
        """
        DataFrame 정보를 JSON-serializable 딕셔너리로 변환
        
        Args:
            df: pandas DataFrame
            sample_size: 샘플 데이터 행 개수
            
        Returns:
            DataFrame 정보 딕셔너리
        """
        try:
            # 샘플 데이터 변환 (NaN을 None으로 변환)
            sample_data = df.head(sample_size).replace({np.nan: None}).to_dict('records')
            
            # 컬럼 정보 (타입 포함)
            columns_info = {
                col: str(df[col].dtype) for col in df.columns
            }
            
            return {
                "columns": df.columns.tolist(),
                "column_count": len(df.columns),
                "row_count": len(df),
                "shape": list(df.shape),
                "null_count": int(df.isnull().sum().sum()),
                "columns_info": columns_info,
                "sample_data": sample_data
            }
        except Exception as e:
            logger.warning(f"DataFrame 정보 수집 중 에러: {str(e)}")
            return {
                "columns": df.columns.tolist() if hasattr(df, 'columns') else [],
                "column_count": len(df.columns) if hasattr(df, 'columns') else 0,
                "row_count": len(df) if hasattr(df, '__len__') else 0,
                "shape": list(df.shape) if hasattr(df, 'shape') else [0, 0],
                "null_count": 0,
                "columns_info": {},
                "sample_data": []
            }
    
    def _calculate_changes(self, before_info: Dict[str, Any], after_info: Dict[str, Any], 
                          removed_columns: List[str], preprocessing_steps: List[str]) -> Dict[str, Any]:
        """
        전처리 전후 변화 정보 계산
        
        Args:
            before_info: 전처리 전 정보
            after_info: 전처리 후 정보
            removed_columns: 제거된 컬럼 목록
            preprocessing_steps: 수행된 전처리 단계 목록
            
        Returns:
            변화 정보 딕셔너리
        """
        before_cols = set(before_info.get("columns", []))
        after_cols = set(after_info.get("columns", []))
        
        added_columns = list(after_cols - before_cols)
        actually_removed = list(before_cols - after_cols)
        
        return {
            "columns_removed": len(actually_removed),
            "columns_added": len(added_columns),
            "removed_column_names": actually_removed,
            "added_column_names": added_columns,
            "nulls_filled": before_info.get("null_count", 0) - after_info.get("null_count", 0),
            "preprocessing_steps": preprocessing_steps
        }
    
    def preprocess(self):
        """
        타이타닉 데이터 전처리 실행
        Returns:
            전처리 결과 정보 딕셔너리
        """
        logger.info("▶ 전처리 시작")
        
        the_method = TitanicMethod()
        
        # 파일 경로 설정
        data_path = Path(__file__).parent.parent / 'resources' / 'titanic'
        train_path = data_path / 'train.csv'
        test_path = data_path / 'test.csv'
        
        # 파일 존재 확인
        if not train_path.exists():
            logger.error(f"train.csv 파일을 찾을 수 없습니다: {train_path}")
            return {"status": "error", "message": f"train.csv 파일을 찾을 수 없습니다: {train_path}"}
        if not test_path.exists():
            logger.error(f"test.csv 파일을 찾을 수 없습니다: {test_path}")
            return {"status": "error", "message": f"test.csv 파일을 찾을 수 없습니다: {test_path}"}
        
        # 데이터 읽기
        df_train = the_method.read_csv(str(train_path))
        df_test = the_method.read_csv(str(test_path))
        
        # 원본 train에서 Survived 라벨 저장
        self.train_label = df_train['Survived'].copy()
        
        this_train = the_method.create_df(df_train, 'Survived')
        this_test = the_method.create_df(df_test, 'Survived') if 'Survived' in df_test.columns else df_test
        

        # 전처리 전 데이터 정보 수집
        before_info = self._collect_dataframe_info(this_train, sample_size=5)
        before_info_test = self._collect_dataframe_info(this_test, sample_size=5)
        null_count = int(this_train.isnull().sum().sum())
        null_count_test = int(this_test.isnull().sum().sum())
        
        logger.info(f"📊 전처리 전 | Train: {this_train.shape[0]}행×{this_train.shape[1]}열 (결측치: {null_count:,}) | Test: {this_test.shape[0]}행×{this_test.shape[1]}열 (결측치: {null_count_test:,})")
        
        # DataFrame 간결하게 출력 (3행만, 핵심 컬럼만)
        sample_df = this_train.head(3).replace({np.nan: None})
        if len(sample_df.columns) > 8:
            # 컬럼이 많으면 일부만 표시
            key_cols = ['PassengerId', 'Pclass', 'Age', 'Fare', 'Sex', 'Embarked'] + [c for c in sample_df.columns if c not in ['PassengerId', 'Pclass', 'Age', 'Fare', 'Sex', 'Embarked']][:2]
            key_cols = [c for c in key_cols if c in sample_df.columns]
            sample_df = sample_df[key_cols]
        df_str = sample_df.to_string(index=False, justify='left', max_colwidth=15)
        logger.info(f"Train 샘플 (상위 3행):\n{df_str}")


        # 전처리 전 데이터 객체 생성
        this = TitanicDataset()
        this.train = this_train
        this.test = this_test
        
        # 결측치 확인
        the_method.check_null(this)

        # 전처리 수행
        logger.info("▶ 전처리 수행 중...")
        preprocessing_steps = []
        
        drop_features = ['SibSp', 'Parch', 'Ticket', 'Cabin']
        this = the_method.drop_features(this, *drop_features)
        preprocessing_steps.append(f"drop_features: {drop_features}")
        
        this = the_method.pclass_ordinal(this)
        preprocessing_steps.append("pclass_ordinal")
        
        this = the_method.fare_ordinal(this)
        preprocessing_steps.append("fare_ordinal")
        
        this = the_method.embarked_ordinal(this)
        preprocessing_steps.append("embarked_ordinal")
        
        this = the_method.gender_nominal(this)
        preprocessing_steps.append("gender_nominal")
        
        this = the_method.age_ratio(this)
        preprocessing_steps.append("age_ratio")
        
        this = the_method.title_nominal(this)
        preprocessing_steps.append("title_nominal")

        drop_name = ['Name']
        this = the_method.drop_features(this, *drop_name)
        preprocessing_steps.append(f"drop_features: {drop_name}")




        # 전처리 후 정보 수집
        logger.info("▶ 전처리 완료!")
        
        # 결측치 확인
        the_method.check_null(this)
        
        # train.csv 정보
        after_info = self._collect_dataframe_info(this.train, sample_size=5)
        null_count_after = int(this.train.isnull().sum().sum())
        
        # test.csv 정보
        after_info_test = self._collect_dataframe_info(this.test, sample_size=5)
        null_count_after_test = int(this.test.isnull().sum().sum())
        
        logger.info(f"📊 전처리 후 | Train: {this.train.shape[0]}행×{this.train.shape[1]}열 (결측치: {null_count_after:,}) | Test: {this.test.shape[0]}행×{this.test.shape[1]}열 (결측치: {null_count_after_test:,})")
        
        # DataFrame 간결하게 출력 (3행만)
        sample_df_after = this.train.head(3).replace({np.nan: None})
        if len(sample_df_after.columns) > 8:
            key_cols = ['PassengerId', 'Pclass', 'Fare', 'Embarked_encoded', 'Gender_encoded', 'Age_encoded', 'Title_encoded']
            key_cols = [c for c in key_cols if c in sample_df_after.columns][:8]
            sample_df_after = sample_df_after[key_cols]
        df_str_after = sample_df_after.to_string(index=False, justify='left', max_colwidth=15)
        logger.info(f"Train 샘플 (상위 3행):\n{df_str_after}")


        # 변화 정보 계산
        removed_columns = drop_features + drop_name
        changes_info = self._calculate_changes(
            before_info, 
            after_info, 
            removed_columns, 
            preprocessing_steps
        )
        
        # 변화 요약 출력
        logger.info(f"📈 변화 요약 | 제거: {changes_info['columns_removed']}개 | 추가: {changes_info['columns_added']}개 | 결측치 처리: {changes_info['nulls_filled']:,}개")
        logger.info(f"단계: {' → '.join([s.split(':')[0] if ':' in s else s for s in preprocessing_steps])}")
        
        # 최종 응답 구성
        response_data = {
            "status": "success",
            "message": "전처리 완료",
            "data": {
                "before_preprocessing": before_info,
                "after_preprocessing": after_info,
                "changes": changes_info
            }
        }
        
        # 전처리된 데이터 저장
        self.processed_data = this
        
        logger.info("✅ 전처리 완료")
        return response_data


    def modeling(self):
        """모델 생성"""
        logger.info("▶ 모델 생성 시작")
        
        from sklearn.svm import SVC
        
        # 모델 생성 (SVM만 사용)
        self.models = {
            'SVM': SVC(random_state=42, probability=True)
        }
        
        logger.info("✅ 모델 생성 완료: SVM")

    def learning(self):
        """모델 학습"""
        if self.processed_data is None:
            logger.error("전처리된 데이터가 없습니다. 먼저 preprocess()를 실행하세요.")
            return None
        
        if self.train_label is None:
            logger.error("학습 레이블이 없습니다. 먼저 preprocess()를 실행하세요.")
            return None
        
        logger.info("▶ 모델 학습 시작")
        
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

    def evaluate(self):
        """모델 평가"""
        if self.processed_data is None:
            logger.error("전처리된 데이터가 없습니다. 먼저 preprocess()를 실행하세요.")
            return None
        
        if self.train_label is None:
            logger.error("학습 레이블이 없습니다. 먼저 preprocess()를 실행하세요.")
            return None
        
        if not self.models:
            logger.error("학습된 모델이 없습니다. 먼저 modeling()과 learning()을 실행하세요.")
            return None
        
        logger.info("▶ 모델 평가 시작")
        
        from sklearn.model_selection import train_test_split
        
        X = self.processed_data.train
        y = self.train_label
        
        # PassengerId 제거
        if 'PassengerId' in X.columns:
            X = X.drop(columns=['PassengerId'])
        
        # Train/Validation 분리
        X_train, X_val, y_train, y_val = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        results = {}
        best_model_name = None
        best_model = None
        best_accuracy = 0
        
        # 각 모델 평가
        for name, model in self.models.items():
            # 재학습 (train 데이터로)
            model.fit(X_train, y_train)
            
            # 검증 데이터로 평가
            accuracy = model.score(X_val, y_val)
            results[name] = accuracy
            
            logger.info(f"{name} 활용한 검증 정확도 {accuracy:.4f} ({accuracy*100:.2f}%)")
            
            # 최고 모델 업데이트
            if accuracy > best_accuracy:
                best_accuracy = accuracy
                best_model_name = name
                best_model = model
        
        logger.info("✅ 모델 평가 완료")
        
        # 최고 모델로 test 데이터 예측 및 CSV 저장
        submission_path = self.generate_submission_csv(best_model, best_model_name)
        
        return {
            "status": "success",
            "results": results,
            "best_model": best_model_name,
            "best_accuracy": best_accuracy,
            "submission_file": submission_path
        }


    def generate_submission_csv(self, model, model_name: str) -> str:
        """최고 모델로 test 데이터 예측하여 캐글 제출용 CSV 생성"""
        if self.processed_data is None:
            logger.error("전처리된 데이터가 없습니다.")
            return None
        
        logger.info(f"▶ {model_name} 모델로 test 데이터 예측 시작")
        
        # 전체 train 데이터로 최종 학습
        X_train = self.processed_data.train
        y_train = self.train_label
        
        # PassengerId 제거
        if 'PassengerId' in X_train.columns:
            X_train = X_train.drop(columns=['PassengerId'])
        
        # 최종 학습
        model.fit(X_train, y_train)
        
        # Test 데이터 준비
        X_test = self.processed_data.test.copy()
        
        # Test의 PassengerId 저장
        test_passenger_ids = X_test['PassengerId'].copy() if 'PassengerId' in X_test.columns else None
        
        # PassengerId 제거
        if 'PassengerId' in X_test.columns:
            X_test = X_test.drop(columns=['PassengerId'])
        
        # 예측 수행
        predictions = model.predict(X_test)
        
        # CSV 저장
        download_dir = Path(__file__).parent / 'download'
        download_dir.mkdir(exist_ok=True)
        
        # 파일명에 타임스탬프 추가
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"submission_{model_name}_{timestamp}.csv"
        filepath = download_dir / filename
        
        # DataFrame 생성
        submission_df = pd.DataFrame({
            'PassengerId': test_passenger_ids,
            'Survived': predictions
        })
        
        # CSV 저장
        submission_df.to_csv(filepath, index=False)
        
        logger.info(f"✅ 제출 파일 생성 완료: {filepath}")
        logger.info(f"   예측 개수: {len(predictions)}개")
        logger.info(f"   생존 예측: {predictions.sum()}명, 사망 예측: {len(predictions) - predictions.sum()}명")
        
        return str(filepath)

    def submit(self):
        """결과 제출"""
        logger.info("제출 시작")
        logger.info("제출 완료")
