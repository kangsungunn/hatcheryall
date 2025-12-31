from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# 라우터 임포트
from app.titanic.titanic_router import router as titanic_router
from app.seoul_crime.seoul_router import router as seoul_router
from app.us_unemployment.router import router as usa_router

# NLP 라우터 임포트 (에러 발생 시에도 계속 진행)
try:
    from app.nlp.nlp_router import router as nlp_router
    nlp_router_loaded = True
except Exception as e:
    import logging
    logging.error(f"NLP 라우터 import 실패: {e}")
    import traceback
    logging.error(traceback.format_exc())
    nlp_router = None
    nlp_router_loaded = False

# FastAPI 애플리케이션 생성
app = FastAPI(
    title="ML Service",
    description="""
    ## Machine Learning Service for Titanic Dataset
    
    타이타닉 승객 데이터를 위한 머신러닝 서비스입니다.
    
    ### 주요 기능
    
    * **CRUD 작업**: 승객 데이터 생성, 조회, 수정, 삭제
    * **검색 기능**: 다양한 필터를 통한 승객 검색
    * **통계 정보**: 타이타닉 승객 데이터 통계
    * **상위 조회**: 요금 기준 상위 N명 승객 조회
    
    ### API 엔드포인트
    
    - `GET /titanic/passengers` - 모든 승객 조회
    - `GET /titanic/passengers/{passenger_id}` - 특정 승객 조회
    - `POST /titanic/passengers` - 새 승객 생성
    - `PUT /titanic/passengers/{passenger_id}` - 승객 정보 전체 수정
    - `PATCH /titanic/passengers/{passenger_id}` - 승객 정보 부분 수정
    - `DELETE /titanic/passengers/{passenger_id}` - 승객 삭제
    - `GET /titanic/passengers/search` - 승객 검색
    - `GET /titanic/passengers/top/{top_n}` - 요금 기준 상위 N명
    - `GET /titanic/stats` - 통계 정보
    
    ### Swagger UI
    
    - **Swagger UI**: http://localhost:9006/docs
    - **ReDoc**: http://localhost:9006/redoc
    - **OpenAPI JSON**: http://localhost:9006/openapi.json
    
    ### 데이터 모델
    
    Passenger 모델은 다음 필드를 포함합니다:
    - `PassengerId`: 승객 ID (고유값)
    - `Survived`: 생존 여부 (0=사망, 1=생존)
    - `Pclass`: 승객 등급 (1, 2, 3)
    - `Name`: 승객 이름
    - `Sex`: 성별 (male/female)
    - `Age`: 나이
    - `SibSp`: 형제/자매/배우자 수
    - `Parch`: 부모/자녀 수
    - `Ticket`: 티켓 번호
    - `Fare`: 요금
    - `Cabin`: 객실 번호
    - `Embarked`: 승선 항구 (S/C/Q)
    """,
    version="1.0.0",
    terms_of_service="http://example.com/terms/",
    contact={
        "name": "ML Service Team",
        "url": "http://example.com/contact/",
        "email": "mlservice@example.com",
    },
    license_info={
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT",
    },
    # Swagger UI 설정
    swagger_ui_parameters={
        "deepLinking": True,
        "displayRequestDuration": True,
        "filter": True,
        "showExtensions": True,
        "showCommonExtensions": True,
        "tryItOutEnabled": True,
    },
    # OpenAPI 스키마 설정
    openapi_tags=[
        {
            "name": "titanic",
            "description": "타이타닉 승객 데이터 CRUD 작업",
        },
        {
            "name": "seoul",
            "description": "서울 범죄 데이터 작업",
        },
        {
            "name": "usa",
            "description": "미국 실업률 데이터 시각화",
        },
        {
            "name": "nlp",
            "description": "자연어 처리 및 워드클라우드 생성",
        },
    ],
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== 라우터 등록 ====================
# 각 서비스의 라우터를 여기에 등록합니다.

# 타이타닉 서비스 라우터 등록
# prefix: /titanic (titanic_router.py에서 이미 설정됨)
# 예시 엔드포인트:
#   - GET    /titanic/passengers
#   - POST   /titanic/passengers
#   - GET    /titanic/passengers/{passenger_id}
#   - PUT    /titanic/passengers/{passenger_id}
#   - DELETE /titanic/passengers/{passenger_id}
app.include_router(
    titanic_router,
    prefix="",  # titanic_router.py에서 이미 /titanic prefix가 설정되어 있음
    tags=["titanic"]  # Swagger UI에서 그룹화를 위한 태그
)

# 서울 서비스 라우터 등록
app.include_router(
    seoul_router,
    prefix="",  # seoul_router.py에서 이미 /seoul prefix가 설정되어 있음
    tags=["seoul"]
)

# 미국 실업률 서비스 라우터 등록
app.include_router(
    usa_router,
    prefix="",  # router.py에서 이미 /usa prefix가 설정되어 있음
    tags=["usa"]
)

# NLP 서비스 라우터 등록
if nlp_router_loaded and nlp_router is not None:
    app.include_router(
        nlp_router,
        prefix="",  # nlp_router.py에서 이미 /nlp prefix가 설정되어 있음
        tags=["nlp"]
    )
else:
    import logging
    logging.warning("NLP 라우터가 등록되지 않았습니다. import 에러를 확인하세요.")

@app.get("/")
async def root():
    """서비스 상태 확인"""
    # 등록된 라우트 확인
    routes = []
    nlp_routes = []
    for route in app.routes:
        if hasattr(route, 'path') and hasattr(route, 'methods'):
            route_info = {
                "path": route.path,
                "methods": list(route.methods)
            }
            routes.append(route_info)
            if "/nlp" in route.path:
                nlp_routes.append(route_info)
    
    return {
        "service": "ML Service",
        "status": "running",
        "version": "1.0.0",
        "endpoints": {
            "titanic": "/titanic",
            "seoul": "/seoul",
            "usa": "/usa",
            "nlp": "/nlp (게이트웨이: /api/ml/nlp)",
            "docs": "/docs",
            "redoc": "/redoc"
        },
        "nlp_router_loaded": nlp_router_loaded,
        "nlp_routes_registered": len(nlp_routes) > 0,
        "nlp_routes": nlp_routes,
        "total_routes": len(routes),
        "all_nlp_paths": [r["path"] for r in nlp_routes]
    }



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9006)
