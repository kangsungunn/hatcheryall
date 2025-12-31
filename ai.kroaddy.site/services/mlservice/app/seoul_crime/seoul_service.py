import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, Any
from datetime import datetime
import os
from app.seoul_crime.seoul_method import SeoulMethod
from app.seoul_crime.seoul_data import SeoulData
from app.seoul_crime.kakao_map_singleton import KakaoMapSingleton
import logging

logger = logging.getLogger(__name__)

class SeoulService:
    """서울 데이터 처리 및 ML 서비스"""
    
    def __init__(self):
       self.data = SeoulData()
       self.method = SeoulMethod()
       # save 폴더 경로 설정
       self.save_dir = Path(self.data.sname)
       os.makedirs(self.save_dir, exist_ok=True)  # save 폴더가 없으면 생성

    def get_top5(self):
        """각 데이터의 상위 5개 반환"""
        cctv_path = Path(self.data.dname) / 'cctv.csv'
        crime_path = Path(self.data.dname) / 'crime.csv'
        pop_path = Path(self.data.dname) / 'pop.xls'
        
        cctv = self.method.csv_to_df(str(cctv_path)).head(5)
        crime = self.method.csv_to_df(str(crime_path)).head(5)
        pop = self.method.xlsx_to_df(str(pop_path)).head(5)
        
        return {
            "cctv": cctv.to_dict(orient='records'),
            "crime": crime.to_dict(orient='records'),
            "pop": pop.to_dict(orient='records')
        }

    def preprocess(self):
        """서울 데이터 전처리 및 CCTV-인구-범죄 데이터 머지"""
        cctv_path = Path(self.data.dname) / 'cctv.csv'
        crime_path = Path(self.data.dname) / 'crime.csv'
        pop_path = Path(self.data.dname) / 'pop.xls'
        json_path = Path(self.data.dname) / 'kr-state.json'

        # 데이터 로드
        cctv = self.method.csv_to_df(str(cctv_path))
        # cctv 컬럼 편집
        cctv = cctv.drop(['2013년도 이전','2014년','2015년','2016년'], axis=1)
        
        crime = self.method.csv_to_df(str(crime_path))
        pop = self.method.xlsx_to_df(str(pop_path))
        # pop 컬럼 편집
        # axis = 1 방향으로 자치구와 좌로부터 4번째 컬럼만 남기고 모두 삭제
        # axis = 0 방향으로 위로부터 2, 3, 4 번째 행을 제거
        # 원본 컬럼명 저장 (인덱스 3의 컬럼명)
        col_3_name = pop.columns[3] if len(pop.columns) > 3 else pop.columns[-1]
        pop = pop.iloc[:, [1, 3]]  # 자치구(인덱스 1)와 왼쪽에서 4번째 컬럼(인덱스 3)만 선택
        pop.columns = ['자치구', col_3_name]  # 컬럼명 재설정
        pop = pop.drop([1, 2, 3], axis=0)  # 위에서 2, 3, 4번째 행(인덱스 1, 2, 3) 제거
        pop = pop.reset_index(drop=True)  # 인덱스 재설정

        # 관서명에 따른 경찰서 주소 찾기 및 자치구 매핑
        gmaps = KakaoMapSingleton()
        station_names = ['서울' + str(name[:-1]) + '경찰서' for name in crime['관서명']]
        station_addrs = []
        
        for name in station_names:
            tmp = gmaps.geocode(name, language='ko')
            if tmp and len(tmp) > 0:
                addr = tmp[0].get("formatted_address")
                location = tmp[0].get("geometry", {}).get("location", {})
                lat = location.get("lat")
                lng = location.get("lng")
                station_addrs.append(addr)
                print(f"✓ {name}의 검색 결과:")
                print(f"  - 주소: {addr}")
                print(f"  - 위도: {lat}")
                print(f"  - 경도: {lng}")
                logger.info(f"{name}의 검색 결과: {addr}, 위도: {lat}, 경도: {lng}")
            else:
                station_addrs.append(None)
                print(f"✗ {name}의 검색 결과를 찾을 수 없습니다.")
                logger.warning(f"{name}의 검색 결과를 찾을 수 없습니다.")
        
        gu_names = []
        for addr in station_addrs:
            if addr:
                tmp = addr.split()
                tmp_gu = [gu for gu in tmp if gu[-1] == '구']
                gu_names.append(tmp_gu[0] if tmp_gu else None)
            else:
                gu_names.append(None)
        
        crime['자치구'] = gu_names
        crime['경찰서주소'] = station_addrs

        # CCTV-POP 머지
        merged = self.method.df_merge(
            left=cctv,
            right=pop,
            left_on='기관명',
            right_on='자치구',
            how='inner'
        )

        cctv_cols = ['소계', '2013년도 이전', '2014년', '2015년', '2016년']
        cctv_rename_map = {col: f'CCTV_{col}' for col in cctv_cols if col in merged.columns}
        if cctv_rename_map:
            merged = merged.rename(columns=cctv_rename_map)

        pop_cols = [col for col in merged.columns if col not in ['기관명'] and col not in cctv_cols]
        pop_rename_map = {col: f'POP_{col}' for col in pop_cols if not col.startswith('CCTV_')}
        if pop_rename_map:
            merged = merged.rename(columns=pop_rename_map)

        crime_merged = False
        crime_mapped_count = 0
        crime_error = None
        
        try:
            # crime 데이터에 자치구 매핑하여 머지
            crime_with_gu = crime.copy()
            crime_with_gu = crime_with_gu.rename(columns={'자치구': '구명'})
            crime_with_gu = crime_with_gu.dropna(subset=['구명'])
            
            final_merged = self.method.df_merge(
                left=merged,
                right=crime_with_gu,
                left_on='기관명',
                right_on='구명',
                how='inner'
            )

            crime_cols = [col for col in crime_with_gu.columns if col not in ['관서명', '구명', '경찰서주소']]
            crime_rename_map = {col: f'CRIME_{col}' for col in crime_cols if col in final_merged.columns}
            if crime_rename_map:
                final_merged = final_merged.rename(columns=crime_rename_map)
            
            # 관서명을 '서울+XX+경찰서' 형식으로 변경
            if '관서명' in final_merged.columns:
                final_merged['관서명'] = final_merged['관서명'].apply(lambda x: '서울' + str(x[:-1]) + '경찰서' if pd.notna(x) and len(str(x)) > 0 else x)
            
            # 기관명 컬럼을 자치구로 변경
            if '기관명' in final_merged.columns:
                final_merged = final_merged.rename(columns={'기관명': '자치구'})
            
            crime_merged = True
            crime_mapped_count = len(crime_with_gu)
        except Exception as e:
            final_merged = merged
            crime_error = str(e)

        self.data.cctv = cctv
        self.data.crime = crime
        self.data.pop = pop
        self.data.merged_cctv_pop = final_merged

        # 정제화된 데이터를 save 폴더에 crime.csv로 저장
        save_path = Path(self.data.sname) / 'crime.csv'
        save_path.parent.mkdir(parents=True, exist_ok=True)
        final_merged.to_csv(save_path, index=False, encoding='utf-8-sig')
        print(f"✓ 정제화된 데이터가 저장되었습니다: {save_path}")
        logger.info(f"정제화된 데이터 저장 완료: {save_path}")

        response = {
            "status": "success",
            "message": "데이터 로드 및 머지 완료",
            "summary": {
                "cctv_rows": len(cctv),
                "crime_rows": len(crime),
                "pop_rows": len(pop),
                "merged_rows": len(final_merged),
                "merged_columns": len(final_merged.columns),
                "crime_merged": crime_merged,
                "crime_mapped_count": crime_mapped_count,
                "saved_path": str(save_path)
            },
            "merged_data": final_merged.replace({np.nan: None}).to_dict(orient='records')
        }
        
        if crime_error:
            response["crime_error"] = crime_error
        
        return response
    
    def _clean_numeric_column(self, series: pd.Series) -> pd.Series:
        """숫자 컬럼의 쉼표 제거 및 변환"""
        # 문자열로 변환 후 쉼표 제거, 빈 값은 NaN으로 처리
        cleaned = series.astype(str).str.replace(',', '', regex=False)
        # 빈 문자열이나 공백만 있는 경우 NaN으로 변환
        cleaned = cleaned.replace(['', ' '], pd.NA)
        # NaN을 0으로 변환 후 float로 변환
        return pd.to_numeric(cleaned, errors='coerce').fillna(0).astype(float)
    
    def prepare_heatmap_data(self):
        """
        히트맵 생성을 위한 데이터 전처리
        - 자치구별 집계 (관서별 → 자치구별)
        - 범죄율 계산 (인구 10만명당)
        - 검거율 계산
        
        Returns:
            dict: {
                'crime_rate_df': DataFrame (자치구별 범죄율),
                'arrest_rate_df': DataFrame (자치구별 검거율),
                'summary': dict (통계 정보)
            }
        """
        # save/crime.csv 파일 읽기
        crime_path = Path(self.data.sname) / 'crime.csv'
        if not crime_path.exists():
            raise FileNotFoundError(f"crime.csv 파일을 찾을 수 없습니다: {crime_path}")
        
        df = self.method.csv_to_df(str(crime_path))
        
        # 숫자 컬럼 정리 (쉼표 제거)
        crime_cols = ['CRIME_살인 발생', 'CRIME_살인 검거', 'CRIME_강도 발생', 'CRIME_강도 검거',
                     'CRIME_강간 발생', 'CRIME_강간 검거', 'CRIME_절도 발생', 'CRIME_절도 검거',
                     'CRIME_폭력 발생', 'CRIME_폭력 검거']
        
        for col in crime_cols:
            if col in df.columns:
                df[col] = self._clean_numeric_column(df[col])
        
        # 인구수 컬럼 정리
        if 'POP_인구' in df.columns:
            df['POP_인구'] = self._clean_numeric_column(df['POP_인구'])
        
        # 자치구별 집계 (같은 자치구의 여러 관서 데이터 합산)
        # 예: 강남구에 강남경찰서와 수서경찰서가 있으면 범죄 건수는 합산, 인구수는 동일하므로 첫 번째 값 사용
        agg_dict = {}
        
        # 범죄 발생/검거 건수는 합산 (같은 자치구의 여러 관서 데이터 합산)
        for col in crime_cols:
            if col in df.columns:
                agg_dict[col] = 'sum'
        
        # 인구수는 첫 번째 값 사용 (같은 자치구면 인구수는 동일)
        if 'POP_인구' in df.columns:
            agg_dict['POP_인구'] = 'first'
        
        # 자치구별 집계 실행
        df_grouped = df.groupby('자치구', as_index=False).agg(agg_dict)
        
        # 범죄율 계산 (인구 10만명당)
        # 공식: (범죄 발생 건수 / 자치구 인구) × 100,000
        # 각 자치구별로 독립적으로 계산됨
        crime_rate_data = {'자치구': df_grouped['자치구']}
        
        crime_types = ['살인', '강도', '강간', '절도', '폭력']
        for crime_type in crime_types:
            occur_col = f'CRIME_{crime_type} 발생'
            if occur_col in df_grouped.columns:
                # 각 자치구별로 (해당 자치구의 범죄 발생 건수 / 해당 자치구의 인구) × 100,000
                crime_rate = (df_grouped[occur_col] / df_grouped['POP_인구']) * 100000
                crime_rate_data[f'{crime_type}발생률'] = crime_rate.round(1)
        
        crime_rate_df = pd.DataFrame(crime_rate_data)
        crime_rate_df = crime_rate_df.set_index('자치구')
        
        # 검거율 계산
        # 공식: (검거 건수 / 발생 건수) × 100
        # 각 자치구별로 독립적으로 계산됨
        arrest_rate_data = {'자치구': df_grouped['자치구']}
        
        for crime_type in crime_types:
            occur_col = f'CRIME_{crime_type} 발생'
            arrest_col = f'CRIME_{crime_type} 검거'
            
            if occur_col in df_grouped.columns and arrest_col in df_grouped.columns:
                # 각 자치구별로 (해당 자치구의 검거 건수 / 해당 자치구의 발생 건수) × 100
                # 0으로 나누기 방지 (발생 건수가 0인 경우 검거율 0%)
                arrest_rate = np.where(
                    df_grouped[occur_col] == 0,
                    0,
                    (df_grouped[arrest_col] / df_grouped[occur_col]) * 100
                )
                # 검거율이 100%를 넘을 수 있음 (다른 기간의 검거가 포함될 수 있음)
                arrest_rate_data[f'{crime_type}검거율'] = pd.Series(arrest_rate).round(1)
        
        arrest_rate_df = pd.DataFrame(arrest_rate_data)
        arrest_rate_df = arrest_rate_df.set_index('자치구')
        
        # 통계 정보
        summary = {
            'total_districts': len(crime_rate_df),
            'crime_types': crime_types,
            'crime_rate_stats': {
                col: {
                    'min': float(crime_rate_df[col].min()),
                    'max': float(crime_rate_df[col].max()),
                    'mean': float(crime_rate_df[col].mean())
                }
                for col in crime_rate_df.columns
            },
            'arrest_rate_stats': {
                col: {
                    'min': float(arrest_rate_df[col].min()),
                    'max': float(arrest_rate_df[col].max()),
                    'mean': float(arrest_rate_df[col].mean())
                }
                for col in arrest_rate_df.columns
            }
        }
        
        return {
            'crime_rate_df': crime_rate_df,
            'arrest_rate_df': arrest_rate_df,
            'summary': summary
        }
    
    def get_crime_rate_heatmap_image(self) -> bytes:
        """
        범죄율 히트맵 이미지 생성 및 반환
        
        Returns:
            bytes: PNG 이미지 바이너리 데이터
        """
        heatmap_data = self.prepare_heatmap_data()
        buffer = self.method.create_crime_rate_heatmap(heatmap_data['crime_rate_df'])
        # buffer.seek(0)이 이미 seoul_method.py에서 호출됨
        image_bytes = buffer.read()
        
        # save 폴더에 저장
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"crime_rate_heatmap_{timestamp}.png"
        save_filepath = self.save_dir / filename
        with open(save_filepath, 'wb') as f:
            f.write(image_bytes)
        logger.info(f"범죄율 히트맵 저장 완료: {save_filepath}")
        
        return image_bytes
    
    def get_arrest_rate_heatmap_image(self) -> bytes:
        """
        검거율 히트맵 이미지 생성 및 반환
        
        Returns:
            bytes: PNG 이미지 바이너리 데이터
        """
        heatmap_data = self.prepare_heatmap_data()
        buffer = self.method.create_arrest_rate_heatmap(heatmap_data['arrest_rate_df'])
        # buffer.seek(0)이 이미 seoul_method.py에서 호출됨
        image_bytes = buffer.read()
        
        # save 폴더에 저장
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"arrest_rate_heatmap_{timestamp}.png"
        save_filepath = self.save_dir / filename
        with open(save_filepath, 'wb') as f:
            f.write(image_bytes)
        logger.info(f"검거율 히트맵 저장 완료: {save_filepath}")
        
        return image_bytes
    
    def get_heatmap_data(self) -> Dict[str, Any]:
        """
        히트맵 데이터를 JSON 형식으로 반환
        
        Returns:
            dict: 범죄율/검거율 DataFrame과 통계 정보
        """
        heatmap_data = self.prepare_heatmap_data()
        
        return {
            'status': 'success',
            'crime_rate': heatmap_data['crime_rate_df'].to_dict(orient='index'),
            'arrest_rate': heatmap_data['arrest_rate_df'].to_dict(orient='index'),
            'summary': heatmap_data['summary']
        }
    
    def get_crime_rate_map(self, crime_type: str = '전체') -> str:
        """
        범죄율 Choropleth 지도 생성 및 저장
        
        Args:
            crime_type: 범죄 유형 ('살인', '강도', '강간', '절도', '폭력', '전체')
        
        Returns:
            str: HTML 파일 경로
        """
        heatmap_data = self.prepare_heatmap_data()
        json_path = Path(self.data.dname) / 'kr-state.json'
        
        html_path = self.method.create_crime_rate_map(
            heatmap_data['crime_rate_df'],
            str(json_path),
            crime_type
        )
        
        # save 폴더로 복사
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        save_filename = f"crime_rate_map_{crime_type}_{timestamp}.html"
        save_filepath = self.save_dir / save_filename
        
        import shutil
        shutil.copy(html_path, save_filepath)
        logger.info(f"범죄율 지도 저장 완료: {save_filepath}")
        
        return str(save_filepath)
    
    def get_arrest_rate_map(self, crime_type: str = '전체') -> str:
        """
        검거율 Choropleth 지도 생성 및 저장
        
        Args:
            crime_type: 범죄 유형 ('살인', '강도', '강간', '절도', '폭력', '전체')
        
        Returns:
            str: HTML 파일 경로
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