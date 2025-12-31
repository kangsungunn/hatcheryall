from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse, FileResponse
from typing import Dict, Any, Optional
from app.seoul_crime.seoul_service import SeoulService
from io import BytesIO

router = APIRouter(prefix="/seoul", tags=["seoul"])
seoul_service = SeoulService()


@router.get("/top5", response_model=Dict[str, Any])
async def get_top5():
    """각 데이터의 상위 5개 반환"""
    return seoul_service.get_top5()


@router.get("/preprocess", response_model=Dict[str, Any])
async def run_preprocess():
    """데이터 전처리 실행"""
    return seoul_service.preprocess()


@router.get("/heatmap/crime-rate")
async def get_crime_rate_heatmap():
    """
    서울시 자치구별 범죄율 히트맵 이미지 반환
    
    Returns:
        PNG 이미지 (image/png)
    """
    try:
        image_bytes = seoul_service.get_crime_rate_heatmap_image()
        return StreamingResponse(
            BytesIO(image_bytes),
            media_type="image/png",
            headers={"Content-Disposition": "inline; filename=crime_rate_heatmap.png"}
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=f"데이터 파일을 찾을 수 없습니다: {str(e)}")
    except Exception as e:
        import traceback
        error_detail = f"{str(e)}\n{traceback.format_exc()}"
        raise HTTPException(status_code=500, detail=f"히트맵 생성 실패: {error_detail}")


@router.get("/heatmap/arrest-rate")
async def get_arrest_rate_heatmap():
    """
    서울시 자치구별 범죄 검거율 히트맵 이미지 반환
    
    Returns:
        PNG 이미지 (image/png)
    """
    try:
        image_bytes = seoul_service.get_arrest_rate_heatmap_image()
        return StreamingResponse(
            BytesIO(image_bytes),
            media_type="image/png",
            headers={"Content-Disposition": "inline; filename=arrest_rate_heatmap.png"}
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=f"데이터 파일을 찾을 수 없습니다: {str(e)}")
    except Exception as e:
        import traceback
        error_detail = f"{str(e)}\n{traceback.format_exc()}"
        raise HTTPException(status_code=500, detail=f"히트맵 생성 실패: {error_detail}")


@router.get("/heatmap/data", response_model=Dict[str, Any])
async def get_heatmap_data():
    """
    히트맵 데이터를 JSON 형식으로 반환
    
    Returns:
        dict: 범죄율/검거율 데이터와 통계 정보
    """
    try:
        return seoul_service.get_heatmap_data()
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=f"데이터 파일을 찾을 수 없습니다: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"데이터 로드 실패: {str(e)}")


@router.get("/map/crime-rate")
async def get_crime_rate_map(
    crime_type: str = Query('전체', description="범죄 유형 (살인, 강도, 강간, 절도, 폭력, 전체)")
):
    """
    서울시 자치구별 범죄율 Choropleth 지도 반환
    
    **Query 파라미터:**
    - `crime_type`: 범죄 유형 (기본값: '전체')
        - '살인': 살인 범죄율
        - '강도': 강도 범죄율
        - '강간': 강간 범죄율
        - '절도': 절도 범죄율
        - '폭력': 폭력 범죄율
        - '전체': 전체 범죄율 합계
    
    **반환:**
    - HTML 형식의 인터랙티브 지도
    """
    try:
        if crime_type not in ['살인', '강도', '강간', '절도', '폭력', '전체']:
            raise HTTPException(
                status_code=400,
                detail="crime_type은 '살인', '강도', '강간', '절도', '폭력', '전체' 중 하나여야 합니다."
            )
        
        html_path = seoul_service.get_crime_rate_map(crime_type)
        return FileResponse(
            html_path,
            media_type="text/html",
            filename=f"crime_rate_map_{crime_type}.html"
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=f"데이터 파일을 찾을 수 없습니다: {str(e)}")
    except Exception as e:
        import traceback
        error_detail = f"{str(e)}\n{traceback.format_exc()}"
        raise HTTPException(status_code=500, detail=f"지도 생성 실패: {error_detail}")


@router.get("/map/arrest-rate")
async def get_arrest_rate_map(
    crime_type: str = Query('전체', description="범죄 유형 (살인, 강도, 강간, 절도, 폭력, 전체)")
):
    """
    서울시 자치구별 검거율 Choropleth 지도 반환
    
    **Query 파라미터:**
    - `crime_type`: 범죄 유형 (기본값: '전체')
        - '살인': 살인 검거율
        - '강도': 강도 검거율
        - '강간': 강간 검거율
        - '절도': 절도 검거율
        - '폭력': 폭력 검거율
        - '전체': 전체 검거율 평균
    
    **반환:**
    - HTML 형식의 인터랙티브 지도
    """
    try:
        if crime_type not in ['살인', '강도', '강간', '절도', '폭력', '전체']:
            raise HTTPException(
                status_code=400,
                detail="crime_type은 '살인', '강도', '강간', '절도', '폭력', '전체' 중 하나여야 합니다."
            )
        
        html_path = seoul_service.get_arrest_rate_map(crime_type)
        return FileResponse(
            html_path,
            media_type="text/html",
            filename=f"arrest_rate_map_{crime_type}.html"
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=f"데이터 파일을 찾을 수 없습니다: {str(e)}")
    except Exception as e:
        import traceback
        error_detail = f"{str(e)}\n{traceback.format_exc()}"
        raise HTTPException(status_code=500, detail=f"지도 생성 실패: {error_detail}")
