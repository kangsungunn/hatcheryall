from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse
from typing import Dict, Any
from app.us_unemployment.service import USUnemploymentService

router = APIRouter(prefix="/usa", tags=["usa"])
usa_service = USUnemploymentService()


@router.get("/map", response_class=HTMLResponse)
async def get_unemployment_map():
    """미국 실업률 히트맵 생성 및 반환"""
    try:
        map_obj = usa_service.build_map()
        return map_obj._repr_html_()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"지도 생성 실패: {str(e)}")


@router.get("/data", response_model=Dict[str, Any])
async def get_unemployment_data():
    """실업률 데이터 조회"""
    try:
        geo_data = usa_service.load_geo_data()
        data = usa_service.load_unemployment_data()
        return {
            "status": "success",
            "geo_features": len(geo_data.get("features", [])),
            "data_records": len(data),
            "data": data.to_dict(orient="records")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"데이터 로드 실패: {str(e)}")


@router.get("/stats", response_model=Dict[str, Any])
async def get_unemployment_stats():
    """실업률 통계 정보"""
    try:
        data = usa_service.load_unemployment_data()
        stats = {
            "status": "success",
            "total_states": len(data),
            "mean_unemployment": float(data["Unemployment"].mean()),
            "min_unemployment": float(data["Unemployment"].min()),
            "max_unemployment": float(data["Unemployment"].max()),
            "median_unemployment": float(data["Unemployment"].median())
        }
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"통계 계산 실패: {str(e)}")

