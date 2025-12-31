"""
Transformer Service - FastAPI 애플리케이션

KoELECTRA 모델을 사용한 감정 분석 서비스를 제공합니다.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# 라우터 임포트
try:
    from app.koelectra.koelectra_router import router as koelectra_router
    koelectra_router_loaded = True
    logger.info("KoELECTRA 라우터 로딩 성공")
except Exception as e:
    logger.error(f"KoELECTRA 라우터 import 실패: {e}")
    import traceback
    logger.error(traceback.format_exc())
    koelectra_router = None
    koelectra_router_loaded = False

# FastAPI 애플리케이션 생성
app = FastAPI(
    title="Transformer Service",
    description="""
    ## Transformer Service - KoELECTRA 감정 분석
    
    KoELECTRA 모델을 사용하여 영화 리뷰 등의 텍스트의 긍정/부정 감정을 분석하는 서비스입니다.
    
    ### 주요 기능
    
    * **단일 텍스트 감정 분석**: 하나의 텍스트를 입력받아 감정 분석
    * **배치 텍스트 감정 분석**: 여러 텍스트를 한 번에 감정 분석
    * **모델 정보 조회**: 로딩된 모델의 정보 확인
    
    ### API 엔드포인트
    
    - `POST /koelectra/analyze` - 단일 텍스트 감정 분석 (Request Body)
    - `POST /koelectra/analyze-batch` - 배치 텍스트 감정 분석
    - `GET /koelectra/model-info` - 모델 정보 조회
    
    ### Swagger UI (게이트웨이 경유)
    
    - **Swagger UI**: http://localhost:8080/transformer-docs/
    - **직접 접속**: http://localhost:9007/docs
    - **ReDoc**: http://localhost:9007/redoc
    - **OpenAPI JSON**: http://localhost:9007/openapi.json
    
    ### 사용 예시 (게이트웨이 경유)
    
    **POST 요청:**
    ```json
    POST http://localhost:8080/api/ai/transformer/analyze
    Content-Type: application/json
    
    {
        "text": "이 영화 정말 재미있고 감동적이에요! 강력 추천합니다."
    }
    
    Response:
    {
        "text": "이 영화 정말 재미있고 감동적이에요! 강력 추천합니다.",
        "sentiment": "긍정",
        "confidence": 0.9876,
        "positive_prob": 0.9876,
        "negative_prob": 0.0124
    }
    ```
    """,
    version="1.0.0",
    terms_of_service="http://example.com/terms/",
    contact={
        "name": "Transformer Service Team",
        "url": "http://example.com/contact/",
        "email": "transformerservice@example.com",
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
            "name": "koelectra",
            "description": "KoELECTRA 모델을 사용한 감정 분석",
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

# KoELECTRA 서비스 라우터 등록
if koelectra_router_loaded and koelectra_router is not None:
    app.include_router(
        koelectra_router,
        prefix="",  # koelectra_router.py에서 이미 /koelectra prefix가 설정되어 있음
        tags=["koelectra"]
    )
    logger.info("KoELECTRA 라우터 등록 완료")
else:
    logger.warning("KoELECTRA 라우터가 등록되지 않았습니다. import 에러를 확인하세요.")


@app.get("/")
async def root():
    """서비스 상태 확인"""
    return {
        "service": "Transformer Service",
        "status": "running",
        "version": "1.0.0",
        "model": "KoELECTRA",
        "endpoints": {
            "analyze": "POST /koelectra/analyze",
            "analyze_batch": "POST /koelectra/analyze-batch",
            "model_info": "GET /koelectra/model-info",
            "docs": "/docs",
            "redoc": "/redoc"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9007)

