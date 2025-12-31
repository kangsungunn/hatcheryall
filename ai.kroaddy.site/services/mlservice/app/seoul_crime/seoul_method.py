import pandas as pd
import json
from pathlib import Path
from io import BytesIO
from shapely.geometry import Point, Polygon
from app.seoul_crime.kakao_map_singleton import KakaoMapSingleton
import matplotlib
matplotlib.use('Agg')  # GUI 백엔드 없이 사용
import matplotlib.pyplot as plt
import seaborn as sns
import platform
import folium


class SeoulMethod:
    """서울 데이터 전처리 메서드"""

    def __init__(self):
        self.gmaps = KakaoMapSingleton()
        self.gu_boundaries = None
        self._korean_font_prop = None  # 한글 폰트 속성 초기화

    def csv_to_df(self, fname: str) -> pd.DataFrame:
        return pd.read_csv(fname)

    def xlsx_to_df(self, fname: str) -> pd.DataFrame:
        return pd.read_excel(fname)

    def df_merge(self, left: pd.DataFrame, right: pd.DataFrame, 
                 left_on: str = None, right_on: str = None, 
                 on: str = None, how: str = 'inner') -> pd.DataFrame:
        if on:
            merged = pd.merge(left, right, on=on, how=how, suffixes=('', '_y'))
        else:
            merged = pd.merge(left, right, left_on=left_on, right_on=right_on, 
                            how=how, suffixes=('', '_y'))
        
        cols_to_drop = [col for col in merged.columns if col.endswith('_y')]
        if cols_to_drop:
            merged = merged.drop(columns=cols_to_drop)
        
        if right_on and right_on in merged.columns and left_on:
            if merged[left_on].equals(merged[right_on]):
                merged = merged.drop(columns=[right_on])
        
        return merged


    def _load_gu_boundaries(self, json_path: str):
        """구 경계 데이터 로드"""
        if self.gu_boundaries is None:
            with open(json_path, 'r', encoding='utf-8') as f:
                geojson = json.load(f)
            self.gu_boundaries = {}
            for feature in geojson['features']:
                gu_name = feature['properties']['name']
                coords = feature['geometry']['coordinates'][0]
                polygon = Polygon(coords)
                self.gu_boundaries[gu_name] = polygon
        return self.gu_boundaries

    def _geocode_police_station(self, police_name: str):
        """경찰서 이름으로 Geocoding하여 좌표 획득"""
        if not self.gmaps._api_key:
            return None
        
        query = f"서울시 {police_name}"
        try:
            geocode_result = self.gmaps.geocode(query)
            if geocode_result:
                location = geocode_result[0]['geometry']['location']
                return (location['lng'], location['lat'])
        except Exception:
            pass
        return None

    def _find_gu_by_coordinates(self, lng: float, lat: float, json_path: str):
        """좌표가 속한 구 찾기"""
        boundaries = self._load_gu_boundaries(json_path)
        point = Point(lng, lat)
        
        for gu_name, polygon in boundaries.items():
            if polygon.contains(point):
                return gu_name
        return None

    def map_police_to_gu(self, crime_df: pd.DataFrame, json_path: str, police_col: str = '관서명'):
        """경찰서를 구로 매핑하여 구명 컬럼 추가"""
        if not self.gmaps._api_key:
            raise ValueError("Kakao Map API 키가 설정되지 않았습니다. KAKAO_MAP_API_KEY 환경변수를 설정하세요.")
        
        gu_list = []
        for police_name in crime_df[police_col]:
            coords = self._geocode_police_station(police_name)
            if coords:
                gu_name = self._find_gu_by_coordinates(coords[0], coords[1], json_path)
                gu_list.append(gu_name if gu_name else None)
            else:
                gu_list.append(None)    
        
        crime_df = crime_df.copy()
        crime_df['구명'] = gu_list
        return crime_df
    
    def _setup_korean_font(self):
        """한글 폰트 설정 - NanumGothic 사용"""
        plt.rcParams['axes.unicode_minus'] = False  # 마이너스 기호 깨짐 방지
        
        # NanumGothic 폰트 설정
        try:
            system = platform.system()
            if system == 'Windows':
                plt.rcParams['font.family'] = 'Malgun Gothic'
                self._korean_font_prop = None
            elif system == 'Darwin':  # macOS
                plt.rcParams['font.family'] = 'AppleGothic'
                self._korean_font_prop = None
            else:  # Linux (Docker)
                # 폰트 경로 직접 지정 (Docker 환경)
                import os
                nanum_gothic_path = '/usr/share/fonts/truetype/nanum/NanumGothic.ttf'
                
                if os.path.exists(nanum_gothic_path):
                    from matplotlib.font_manager import FontProperties
                    # FontProperties로 폰트 로드
                    prop = FontProperties(fname=nanum_gothic_path)
                    # 전역 폰트 설정
                    plt.rcParams['font.family'] = 'NanumGothic'
                    plt.rcParams['font.sans-serif'] = ['NanumGothic', 'Nanum Gothic', 'NanumBarunGothic', 'DejaVu Sans', 'sans-serif']
                    # matplotlib의 기본 폰트도 설정
                    import matplotlib
                    matplotlib.rcParams['font.family'] = 'NanumGothic'
                    matplotlib.rcParams['font.sans-serif'] = ['NanumGothic', 'Nanum Gothic', 'NanumBarunGothic', 'DejaVu Sans', 'sans-serif']
                    # 폰트 속성 저장
                    self._korean_font_prop = prop
                else:
                    # 폰트를 찾지 못한 경우
                    plt.rcParams['font.family'] = 'DejaVu Sans'
                    plt.rcParams['font.sans-serif'] = ['DejaVu Sans', 'sans-serif']
                    self._korean_font_prop = None
        except Exception as e:
            # 폰트 설정 실패 시 기본 폰트 사용
            plt.rcParams['font.family'] = 'DejaVu Sans'
            plt.rcParams['font.sans-serif'] = ['DejaVu Sans', 'sans-serif']
            self._korean_font_prop = None
    
    
    def create_crime_rate_heatmap(self, crime_rate_df: pd.DataFrame) -> BytesIO:
        """
        범죄율 히트맵 생성
        
        Args:
            crime_rate_df: 자치구별 범죄율 DataFrame (인덱스: 자치구명, 컬럼: 범죄 유형별 발생률)
        
        Returns:
            BytesIO: PNG 이미지 버퍼
        """
        self._setup_korean_font()
        
        # 한글 컬럼명 유지 (영문 변환 제거)
        df_display = crime_rate_df.copy()
        
        # 컬럼명을 짧게 표시 (히트맵 가독성 향상)
        column_short_names = {
            '살인발생률': '살인',
            '강도발생률': '강도',
            '강간발생률': '강간',
            '절도발생률': '절도',
            '폭력발생률': '폭력'
        }
        # 존재하는 컬럼만 rename
        existing_columns = {k: v for k, v in column_short_names.items() if k in df_display.columns}
        if existing_columns:
            df_display = df_display.rename(columns=existing_columns)
        
        # 인덱스(자치구명) 한글 유지 (영문 변환 제거)
        df_display = df_display.reset_index()  # 인덱스를 컬럼으로 변환
        index_col_name = df_display.columns[0]  # 첫 번째 컬럼이 인덱스였던 컬럼
        # 한글 자치구명 그대로 유지
        df_display = df_display.set_index(index_col_name)  # 다시 인덱스로 설정
        
        # 정규화 (0~1 범위로 변환) - 히트맵 색상 일관성 위해
        df_normalized = df_display.copy()
        for col in df_normalized.columns:
            col_max = df_normalized[col].max()
            col_min = df_normalized[col].min()
            if col_max > col_min:
                df_normalized[col] = (df_normalized[col] - col_min) / (col_max - col_min)
            else:
                df_normalized[col] = 0.0
        
        # 정렬: 정규화된 합계로 정렬
        df_normalized['Total'] = df_normalized.sum(axis=1)
        df_normalized = df_normalized.sort_values('Total', ascending=False)
        df_normalized = df_normalized.drop('Total', axis=1)
        
        # 원본 데이터도 같은 순서로 정렬
        df_display = df_display.loc[df_normalized.index]
        
        # 히트맵 생성 (더 큰 크기)
        fig, ax = plt.subplots(figsize=(14, max(12, len(df_display) * 0.4)))
        
        # 한글 폰트 속성 가져오기 (히트맵 그리기 전에 설정)
        font_prop = getattr(self, '_korean_font_prop', None)
        
        # 히트맵 그리기
        heatmap = sns.heatmap(
            df_normalized,
            annot=df_display,  # 실제 값 표시
            fmt='.1f',  # 소수점 1자리
            cmap='Reds',  # 빨간색 계열
            cbar_kws={'label': '정규화된 값 (0.0 ~ 1.0)', 'shrink': 0.8},
            linewidths=0.8,
            linecolor='white',
            square=False,
            ax=ax,
            annot_kws={'size': 9, 'weight': 'bold', 'color': 'white'},
            xticklabels=False,  # 일단 틱 라벨 숨김
            yticklabels=False   # 일단 틱 라벨 숨김
        )
        
        # 틱 라벨을 직접 설정 (폰트와 함께)
        if font_prop:
            ax.set_xticks(range(len(df_normalized.columns)))
            ax.set_xticklabels(df_normalized.columns.tolist(), fontproperties=font_prop, fontsize=11, rotation=0)
            ax.set_yticks(range(len(df_normalized.index)))
            ax.set_yticklabels(df_normalized.index.tolist(), fontproperties=font_prop, fontsize=10, rotation=0)
        else:
            ax.set_xticks(range(len(df_normalized.columns)))
            ax.set_xticklabels(df_normalized.columns.tolist(), fontsize=11, rotation=0)
            ax.set_yticks(range(len(df_normalized.index)))
            ax.set_yticklabels(df_normalized.index.tolist(), fontsize=10, rotation=0)
        
        # colorbar 라벨에도 폰트 적용
        if font_prop and hasattr(heatmap, 'collections') and len(heatmap.collections) > 0:
            cbar = heatmap.collections[0].colorbar
            if cbar:
                cbar.set_label('정규화된 값 (0.0 ~ 1.0)', fontproperties=font_prop)
        
        ax.set_title('서울시 범죄율 히트맵 (인구 10만명당)', 
                    fontsize=18, fontweight='bold', pad=25, fontproperties=font_prop)
        ax.set_xlabel('범죄 유형', fontsize=14, fontweight='bold', fontproperties=font_prop)
        ax.set_ylabel('자치구', fontsize=14, fontweight='bold', fontproperties=font_prop)
        
        plt.tight_layout()
        
        # tight_layout 이후에도 폰트 다시 적용 (레이아웃 조정 후 폰트가 리셋될 수 있음)
        if font_prop:
            for label in ax.get_xticklabels():
                label.set_fontproperties(font_prop)
            for label in ax.get_yticklabels():
                label.set_fontproperties(font_prop)
            # 제목과 라벨도 다시 적용
            ax.title.set_fontproperties(font_prop)
            ax.xaxis.label.set_fontproperties(font_prop)
            ax.yaxis.label.set_fontproperties(font_prop)
        
        # BytesIO 버퍼에 저장
        buffer = BytesIO()
        plt.savefig(buffer, format='png', dpi=200, bbox_inches='tight', facecolor='white')
        buffer.seek(0)
        plt.close(fig)  # 메모리 해제
        
        return buffer
    
    def create_arrest_rate_heatmap(self, arrest_rate_df: pd.DataFrame) -> BytesIO:
        """
        검거율 히트맵 생성
        
        Args:
            arrest_rate_df: 자치구별 검거율 DataFrame (인덱스: 자치구명, 컬럼: 범죄 유형별 검거율)
        
        Returns:
            BytesIO: PNG 이미지 버퍼
        """
        self._setup_korean_font()
        
        # 한글 컬럼명 유지 (영문 변환 제거)
        df_display = arrest_rate_df.copy()
        
        # 컬럼명을 짧게 표시 (히트맵 가독성 향상)
        column_short_names = {
            '살인검거율': '살인',
            '강도검거율': '강도',
            '강간검거율': '강간',
            '절도검거율': '절도',
            '폭력검거율': '폭력'
        }
        # 존재하는 컬럼만 rename
        existing_columns = {k: v for k, v in column_short_names.items() if k in df_display.columns}
        if existing_columns:
            df_display = df_display.rename(columns=existing_columns)
        
        # 인덱스(자치구명) 한글 유지 (영문 변환 제거)
        df_display = df_display.reset_index()  # 인덱스를 컬럼으로 변환
        index_col_name = df_display.columns[0]  # 첫 번째 컬럼이 인덱스였던 컬럼
        # 한글 자치구명 그대로 유지
        df_display = df_display.set_index(index_col_name)  # 다시 인덱스로 설정
        
        # 평균 검거율로 정렬 (검거율이 높은 자치구가 위로)
        df_display['Avg'] = df_display.mean(axis=1)
        df_display = df_display.sort_values('Avg', ascending=False)
        df_display = df_display.drop('Avg', axis=1)
        
        # 히트맵 생성 (더 큰 크기)
        fig, ax = plt.subplots(figsize=(14, max(12, len(df_display) * 0.4)))
        
        # 한글 폰트 속성 가져오기 (히트맵 그리기 전에 설정)
        font_prop = getattr(self, '_korean_font_prop', None)
        
        # 히트맵 그리기 (검거율은 0~100% 범위, 정규화 없이 직접 사용)
        heatmap = sns.heatmap(
            df_display,
            annot=True,  # 실제 값 표시
            fmt='.1f',  # 소수점 1자리
            cmap='RdYlGn',  # 빨강-노랑-초록 (낮음: 빨강, 높음: 초록)
            cbar_kws={'label': '검거율 (%)', 'shrink': 0.8},
            linewidths=0.8,
            linecolor='white',
            square=False,
            ax=ax,
            vmin=0,
            vmax=100,
            annot_kws={'size': 9, 'weight': 'bold', 'color': 'black'},
            xticklabels=False,  # 일단 틱 라벨 숨김
            yticklabels=False   # 일단 틱 라벨 숨김
        )
        
        # 틱 라벨을 직접 설정 (폰트와 함께)
        if font_prop:
            ax.set_xticks(range(len(df_display.columns)))
            ax.set_xticklabels(df_display.columns.tolist(), fontproperties=font_prop, fontsize=11, rotation=0)
            ax.set_yticks(range(len(df_display.index)))
            ax.set_yticklabels(df_display.index.tolist(), fontproperties=font_prop, fontsize=10, rotation=0)
        else:
            ax.set_xticks(range(len(df_display.columns)))
            ax.set_xticklabels(df_display.columns.tolist(), fontsize=11, rotation=0)
            ax.set_yticks(range(len(df_display.index)))
            ax.set_yticklabels(df_display.index.tolist(), fontsize=10, rotation=0)
        
        # colorbar 라벨에도 폰트 적용
        if font_prop and hasattr(heatmap, 'collections') and len(heatmap.collections) > 0:
            cbar = heatmap.collections[0].colorbar
            if cbar:
                cbar.set_label('검거율 (%)', fontproperties=font_prop)
        
        ax.set_title('서울시 범죄 검거율 히트맵', 
                    fontsize=18, fontweight='bold', pad=25, fontproperties=font_prop)
        ax.set_xlabel('범죄 유형', fontsize=14, fontweight='bold', fontproperties=font_prop)
        ax.set_ylabel('자치구', fontsize=14, fontweight='bold', fontproperties=font_prop)
        
        plt.tight_layout()
        
        # tight_layout 이후에도 폰트 다시 적용 (레이아웃 조정 후 폰트가 리셋될 수 있음)
        if font_prop:
            for label in ax.get_xticklabels():
                label.set_fontproperties(font_prop)
            for label in ax.get_yticklabels():
                label.set_fontproperties(font_prop)
            # 제목과 라벨도 다시 적용
            ax.title.set_fontproperties(font_prop)
            ax.xaxis.label.set_fontproperties(font_prop)
            ax.yaxis.label.set_fontproperties(font_prop)
        
        # BytesIO 버퍼에 저장
        buffer = BytesIO()
        plt.savefig(buffer, format='png', dpi=200, bbox_inches='tight', facecolor='white')
        buffer.seek(0)
        plt.close(fig)  # 메모리 해제
        
        return buffer
    
    def create_crime_rate_map(self, crime_rate_df: pd.DataFrame, json_path: str, crime_type: str = '전체') -> str:
        """
        범죄율 Choropleth 지도 생성
        
        Args:
            crime_rate_df: 자치구별 범죄율 DataFrame (인덱스: 자치구명, 컬럼: 범죄 유형별 발생률)
            json_path: 서울시 자치구 GeoJSON 파일 경로
            crime_type: 범죄 유형 ('살인', '강도', '강간', '절도', '폭력', '전체')
        
        Returns:
            str: HTML 파일 경로
        """
        # GeoJSON 파일 로드
        with open(json_path, 'r', encoding='utf-8') as f:
            seoul_geo = json.load(f)
        
        # 데이터 준비
        df = crime_rate_df.copy()
        df = df.reset_index()  # 인덱스를 컬럼으로 변환
        
        # 범죄 유형별 데이터 선택
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
        
        # 서울시 중심 좌표 (서울시청 기준)
        seoul_center = [37.5665, 126.9780]
        
        # Folium 지도 생성
        m = folium.Map(location=seoul_center, zoom_start=11, tiles='OpenStreetMap')
        
        # Choropleth 레이어 추가
        folium.Choropleth(
            geo_data=seoul_geo,
            name="choropleth",
            data=df,
            columns=["자치구", data_col],
            key_on="feature.id",  # GeoJSON의 id 필드와 매칭
            fill_color="YlOrRd",  # 노란색-주황색-빨간색 계열
            fill_opacity=0.7,
            line_opacity=0.2,
            legend_name=legend_name,
        ).add_to(m)
        
        # 레이어 컨트롤 추가
        folium.LayerControl().add_to(m)
        
        # HTML 파일로 저장
        html_path = Path(json_path).parent / f'crime_rate_map_{crime_type}.html'
        m.save(str(html_path))
        
        return str(html_path)
    
    def create_arrest_rate_map(self, arrest_rate_df: pd.DataFrame, json_path: str, crime_type: str = '전체') -> str:
        """
        검거율 Choropleth 지도 생성
        
        Args:
            arrest_rate_df: 자치구별 검거율 DataFrame (인덱스: 자치구명, 컬럼: 범죄 유형별 검거율)
            json_path: 서울시 자치구 GeoJSON 파일 경로
            crime_type: 범죄 유형 ('살인', '강도', '강간', '절도', '폭력', '전체')
        
        Returns:
            str: HTML 파일 경로
        """
        # GeoJSON 파일 로드
        with open(json_path, 'r', encoding='utf-8') as f:
            seoul_geo = json.load(f)
        
        # 데이터 준비
        df = arrest_rate_df.copy()
        df = df.reset_index()  # 인덱스를 컬럼으로 변환
        
        # 범죄 유형별 데이터 선택
        if crime_type == '전체':
            # 전체 검거율 평균 계산
            rate_cols = [col for col in df.columns if '검거율' in col]
            df['전체검거율'] = df[rate_cols].mean(axis=1)
            data_col = '전체검거율'
            legend_name = '전체 검거율 (%)'
        else:
            data_col = f'{crime_type}검거율'
            # 컬럼이 존재하는지 확인
            if data_col not in df.columns:
                available_cols = [col for col in df.columns if '검거율' in col]
                raise ValueError(f"컬럼 '{data_col}'을 찾을 수 없습니다. 사용 가능한 컬럼: {available_cols}")
            legend_name = f'{crime_type} 검거율 (%)'
        
        # 서울시 중심 좌표 (서울시청 기준)
        seoul_center = [37.5665, 126.9780]
        
        # Folium 지도 생성
        m = folium.Map(location=seoul_center, zoom_start=11, tiles='OpenStreetMap')
        
        # Choropleth 레이어 추가 (검거율은 높을수록 좋으므로 초록색 계열)
        folium.Choropleth(
            geo_data=seoul_geo,
            name="choropleth",
            data=df,
            columns=["자치구", data_col],
            key_on="feature.id",  # GeoJSON의 id 필드와 매칭
            fill_color="YlGn",  # 노란색-초록색 계열 (검거율이 높을수록 초록색)
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

