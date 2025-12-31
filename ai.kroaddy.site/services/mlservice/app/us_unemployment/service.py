import requests
import pandas as pd
import folium
from typing import Dict, Any, Optional


class USUnemploymentService:
    """미국 실업률 데이터 시각화 서비스"""
    
    def __init__(self):
        self._geo_url = "https://raw.githubusercontent.com/python-visualization/folium-example-data/main/us_states.json"
        self._data_url = "https://raw.githubusercontent.com/python-visualization/folium-example-data/main/us_unemployment_oct_2012.csv"
        self._map_location = [48, -102]
        self._map_zoom = 3
        self._state_geo: Optional[Dict[str, Any]] = None
        self._state_data: Optional[pd.DataFrame] = None
        self._map: Optional[folium.Map] = None
    
    @property
    def state_geo(self) -> Dict[str, Any]: return self._state_geo
    
    @property
    def state_data(self) -> pd.DataFrame: return self._state_data
    
    @property
    def map(self) -> folium.Map: return self._map
    
    def load_geo_data(self) -> Dict[str, Any]:
        """GeoJSON 데이터 로드"""
        if self._state_geo is None:
            response = requests.get(self._geo_url)
            self._state_geo = response.json()
        return self._state_geo
    
    def load_unemployment_data(self) -> pd.DataFrame:
        """실업률 데이터 로드"""
        if self._state_data is None:
            self._state_data = pd.read_csv(self._data_url)
        return self._state_data
    
    def create_map(self, location: Optional[list] = None, zoom_start: Optional[int] = None) -> folium.Map:
        """Folium 지도 생성"""
        loc = location or self._map_location
        zoom = zoom_start or self._map_zoom
        self._map = folium.Map(location=loc, zoom_start=zoom)
        return self._map
    
    def add_choropleth(self, fill_color: str = "YlGn", fill_opacity: float = 0.7, 
                      line_opacity: float = 0.2, legend_name: str = "Unemployment Rate (%)") -> None:
        """Choropleth 히트맵 추가"""
        if self._map is None:
            self.create_map()
        
        geo_data = self.load_geo_data()
        data = self.load_unemployment_data()
        
        folium.Choropleth(
            geo_data=geo_data,
            name="choropleth",
            data=data,
            columns=["State", "Unemployment"],
            key_on="feature.id",
            fill_color=fill_color,
            fill_opacity=fill_opacity,
            line_opacity=line_opacity,
            legend_name=legend_name,
        ).add_to(self._map)
    
    def add_layer_control(self) -> None:
        """레이어 컨트롤 추가"""
        if self._map is None:
            self.create_map()
        folium.LayerControl().add_to(self._map)
    
    def build_map(self) -> folium.Map:
        """전체 지도 생성 및 반환"""
        self.create_map()
        self.add_choropleth()
        self.add_layer_control()
        return self._map