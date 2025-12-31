from fastapi import APIRouter, HTTPException, Query, Path, Body
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from icecream import ic
from app.titanic.titanic_model import Passenger
from app.titanic.titanic_service import TitanicService

router = APIRouter(prefix="/titanic", tags=["titanic"])

# 서비스 인스턴스 생성
titanic_service = TitanicService()


# ==================== CREATE ====================

@router.post("/passengers", response_model=Dict[str, Any], status_code=201)
async def create_passenger(passenger: Passenger):
    """
    새로운 승객 데이터 생성
    
    - **PassengerId**: 승객 ID (고유값)
    - **Survived**: 생존 여부 (0=사망, 1=생존)
    - **Pclass**: 승객 등급 (1, 2, 3)
    - **Name**: 승객 이름
    - **Sex**: 성별 (male/female)
    - **Age**: 나이
    - **SibSp**: 형제/자매/배우자 수
    - **Parch**: 부모/자녀 수
    - **Ticket**: 티켓 번호
    - **Fare**: 요금
    - **Cabin**: 객실 번호
    - **Embarked**: 승선 항구 (S/C/Q)
    """
    # Passenger 모델을 딕셔너리로 변환 (alias 사용)
    passenger_dict = passenger.model_dump(by_alias=True)
    result = titanic_service.create_passenger(passenger_dict)
    if result is None:
        raise HTTPException(
            status_code=400,
            detail=f"PassengerId {passenger.passenger_id} already exists or creation failed"
        )
    return result


@router.post("/passengers/dict", response_model=Dict[str, Any], status_code=201)
async def create_passenger_from_dict(data: Dict[str, Any] = Body(...)):
    """
    딕셔너리로부터 승객 데이터 생성
    """
    result = titanic_service.create_passenger_from_dict(data)
    if result is None:
        raise HTTPException(
            status_code=400,
            detail="Failed to create passenger from dictionary"
        )
    return result


# ==================== READ ====================

# ⚠️ 중요: 구체적인 경로를 동적 경로보다 먼저 정의해야 합니다!
# FastAPI는 위에서 아래로 경로를 매칭하므로, /passengers/search가 
# /passengers/{passenger_id}보다 먼저 와야 합니다.

@router.get("/passengers", response_model=List[Dict[str, Any]])
async def get_all_passengers(
    limit: Optional[int] = Query(None, description="조회할 최대 개수"),
    offset: int = Query(0, description="시작 위치")
):
    """
    모든 승객 조회 (페이지네이션 지원)
    """
    passengers = titanic_service.get_all_passengers(limit=limit, offset=offset)
    return passengers


@router.get("/passengers/search", response_model=List[Dict[str, Any]])
async def search_passengers(
    name: Optional[str] = Query(None, description="이름 (부분 일치)"),
    sex: Optional[str] = Query(None, description="성별 (male/female)"),
    survived: Optional[int] = Query(None, description="생존 여부 (0/1)"),
    pclass: Optional[int] = Query(None, description="등급 (1/2/3)"),
    min_age: Optional[float] = Query(None, description="최소 나이"),
    max_age: Optional[float] = Query(None, description="최대 나이"),
    min_fare: Optional[float] = Query(None, description="최소 요금"),
    max_fare: Optional[float] = Query(None, description="최대 요금"),
    limit: int = Query(20, description="결과 개수 제한")
):
    """
    승객 검색 (다중 필터 지원)
    """
    passengers = titanic_service.search_passengers(
        name=name,
        sex=sex,
        survived=survived,
        pclass=pclass,
        min_age=min_age,
        max_age=max_age,
        min_fare=min_fare,
        max_fare=max_fare,
        limit=limit
    )
    return passengers


@router.get("/passengers/top/{top_n}", response_model=Dict[str, Any])
async def get_top_passengers(
    top_n: int = Path(..., ge=1, le=100, description="조회할 개수")
):
    """
    요금 기준 상위 N명 조회
    
    챗봇 호환을 위해 {passengers: [...], count: N} 형식으로 반환
    """
    passengers = titanic_service.get_top_passengers_by_fare(top_n=top_n)
    return {
        "passengers": passengers,
        "count": len(passengers)
    }


@router.get("/passengers/{passenger_id}", response_model=Dict[str, Any])
async def get_passenger(passenger_id: int = Path(..., description="승객 ID")):
    """
    ID로 승객 조회
    
    ⚠️ 이 경로는 마지막에 정의되어야 합니다.
    동적 경로 {passenger_id}는 구체적인 경로들(/search, /top/{n})보다 나중에 와야 합니다.
    """
    passenger = titanic_service.get_passenger_by_id(passenger_id)
    if passenger is None:
        raise HTTPException(
            status_code=404,
            detail=f"Passenger with ID {passenger_id} not found"
        )
    return passenger


# ==================== 챗봇 호환 엔드포인트 ====================
# 챗봇에서 사용하는 기존 엔드포인트와의 호환성을 위한 별도 엔드포인트
# ⚠️ 중요: 구체적인 경로를 동적 경로보다 먼저 정의해야 합니다!

@router.get("/top10", response_model=Dict[str, Any])
async def get_top10_passengers():
    """
    요금 기준 상위 10명 조회 (챗봇 호환용)
    
    챗봇에서 사용하는 기존 엔드포인트와의 호환성을 위해 제공
    """
    passengers = titanic_service.get_top_passengers_by_fare(top_n=10)
    return {
        "passengers": passengers,
        "count": len(passengers)
    }


@router.get("/stats", response_model=Dict[str, Any])
async def get_statistics():
    """
    타이타닉 승객 통계
    """
    stats = titanic_service.get_statistics()
    return stats


@router.get("/preprocess", response_model=Dict[str, Any])
async def run_preprocess():
    """
    데이터 전처리 실행
    """
    try:
        result = titanic_service.preprocess()
        if result.get("status") == "error":
            error_msg = result.get("message", "전처리 중 에러 발생")
            ic(f"❌ 전처리 에러: {error_msg}")
            raise HTTPException(status_code=500, detail=error_msg)
        return result
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_detail = f"서버 에러: {str(e)}\n{traceback.format_exc()}"
        ic(f"❌ 예상치 못한 에러: {error_detail}")
        raise HTTPException(status_code=500, detail=f"서버 에러: {str(e)}")


# ==================== UPDATE ====================

@router.put("/passengers/{passenger_id}", response_model=Dict[str, Any])
async def update_passenger(
    passenger_id: int = Path(..., description="승객 ID"),
    passenger: Passenger = Body(...)
):
    """
    승객 데이터 전체 수정
    """
    # PassengerId 일치 확인
    if passenger.passenger_id != passenger_id:
        raise HTTPException(
            status_code=400,
            detail="PassengerId in path and body must match"
        )
    
    # Passenger 모델을 딕셔너리로 변환 (alias 사용)
    passenger_dict = passenger.model_dump(by_alias=True)
    result = titanic_service.update_passenger(passenger_id, passenger_dict)
    if result is None:
        raise HTTPException(
            status_code=404,
            detail=f"Passenger with ID {passenger_id} not found"
        )
    return result


@router.patch("/passengers/{passenger_id}", response_model=Dict[str, Any])
async def update_passenger_partial(
    passenger_id: int = Path(..., description="승객 ID"),
    updates: Dict[str, Any] = Body(..., description="수정할 필드")
):
    """
    승객 데이터 부분 수정
    """
    result = titanic_service.update_passenger_partial(passenger_id, updates)
    if result is None:
        raise HTTPException(
            status_code=404,
            detail=f"Passenger with ID {passenger_id} not found"
        )
    return result


# ==================== DELETE ====================

@router.delete("/passengers/{passenger_id}", status_code=204)
async def delete_passenger(
    passenger_id: int = Path(..., description="승객 ID")
):
    """
    승객 데이터 삭제
    """
    success = titanic_service.delete_passenger(passenger_id)
    if not success:
        raise HTTPException(
            status_code=404,
            detail=f"Passenger with ID {passenger_id} not found"
        )
    return None


@router.delete("/passengers", status_code=204)
async def delete_all_passengers():
    """
    모든 승객 데이터 삭제 (주의: 되돌릴 수 없음)
    """
    success = titanic_service.delete_all_passengers()
    if not success:
        raise HTTPException(
            status_code=500,
            detail="Failed to delete all passengers"
        )
    return None


@router.get("/evaluate", response_model=Dict[str, Any])
async def evaluate_model():
    """
    모델 평가 실행
    전처리 → 모델 생성 → 학습 → 평가까지 전체 파이프라인 실행
    """
    try:
        # 1. 전처리
        preprocess_result = titanic_service.preprocess()
        if preprocess_result.get("status") == "error":
            raise HTTPException(status_code=500, detail=preprocess_result.get("message", "전처리 실패"))
        
        # 2. 모델 생성
        titanic_service.modeling()
        
        # 3. 모델 학습
        titanic_service.learning()
        
        # 4. 모델 평가
        evaluate_result = titanic_service.evaluate()
        
        if evaluate_result is None:
            raise HTTPException(status_code=500, detail="모델 평가 실패")
        
        return {
            "status": "success",
            "message": "모델 평가 완료",
            "preprocessing": preprocess_result,
            "evaluation": evaluate_result
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_detail = f"서버 에러: {str(e)}\n{traceback.format_exc()}"
        ic(f"❌ 예상치 못한 에러: {error_detail}")
        raise HTTPException(status_code=500, detail=f"서버 에러: {str(e)}")