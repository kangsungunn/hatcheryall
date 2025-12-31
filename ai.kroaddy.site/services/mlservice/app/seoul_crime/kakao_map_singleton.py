import os
import requests
import logging
from pathlib import Path
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# 프로젝트 루트의 .env 파일 경로 계산
# 현재 파일 위치: ai.kroaddy.site/services/mlservice/app/seoul_crime/kakao_map_singleton.py
# 목표 파일 위치: 프로젝트 루트/.env
_current_file = Path(__file__)
_project_root = _current_file.parent.parent.parent.parent.parent.parent.parent
_env_path = _project_root / '.env'

# .env 파일 로드
if _env_path.exists():
    load_dotenv(dotenv_path=_env_path)
else:
    # .env가 없으면 기본 .env 파일도 시도
    load_dotenv()


class KakaoMapSingleton:
    _instance = None  # 싱글턴 인스턴스를 저장할 클래스 변수

    def __new__(cls):
        if cls._instance is None:  # 인스턴스가 없으면 생성
            cls._instance = super(KakaoMapSingleton, cls).__new__(cls)
            cls._instance._api_key = cls._instance._retrieve_api_key()  # API 키 가져오기
            cls._instance._address_url = "https://dapi.kakao.com/v2/local/search/address.json"
            cls._instance._keyword_url = "https://dapi.kakao.com/v2/local/search/keyword.json"
        return cls._instance  # 기존 인스턴스 반환

    def _retrieve_api_key(self):
        """API 키를 가져오는 내부 메서드"""
        # 먼저 환경변수에서 확인 (Docker Compose가 설정한 경우)
        api_key = os.getenv('KAKAO_MAP_API_KEY') or os.getenv('KAKAO_REST_API_KEY')
        
        # 환경변수에 없으면 .env 파일에서 읽기
        if not api_key:
            if _env_path.exists():
                load_dotenv(dotenv_path=_env_path, override=True)
                api_key = os.getenv('KAKAO_MAP_API_KEY') or os.getenv('KAKAO_REST_API_KEY')
        
        return api_key

    def get_api_key(self):
        """저장된 API 키 반환"""
        return self._api_key

    def geocode(self, query, language='ko'):
        """장소명 또는 주소를 위도, 경도로 변환하는 메서드 (키워드 검색 사용)"""
        if not self._api_key:
            return None
        
        headers = {
            "Authorization": f"KakaoAK {self._api_key}"
        }
        params = {
            "query": query,
            "size": 1  # 첫 번째 결과만
        }
        
        try:
            # 키워드 검색 API 사용 (장소명 검색 가능)
            response = requests.get(self._keyword_url, headers=headers, params=params)
            response.raise_for_status()
            data = response.json()
            
            if data.get('documents') and len(data['documents']) > 0:
                # Kakao Maps API와 유사한 형식으로 변환
                doc = data['documents'][0]
                
                # 키워드 검색 API 응답 형식: address_name 또는 road_address_name이 직접 있음
                address_name = doc.get('address_name', '') or doc.get('road_address_name', '')
                if not address_name and 'address' in doc:
                    address_name = doc['address'].get('address_name', '') or doc['address'].get('road_address_name', '')
                if not address_name and 'road_address' in doc:
                    address_name = doc['road_address'].get('address_name', '') or doc['road_address'].get('road_address_name', '')
                
                return [{
                    "formatted_address": address_name,
                    "geometry": {
                        "location": {
                            "lat": float(doc.get('y', 0)),
                            "lng": float(doc.get('x', 0))
                        }
                    }
                }]
            else:
                logger.warning(f"검색 결과 없음: query={query}, response={data}")
            return None
        except Exception as e:
            logger.error(f"Kakao Map API 호출 실패: query={query}, error={str(e)}")
            return None
