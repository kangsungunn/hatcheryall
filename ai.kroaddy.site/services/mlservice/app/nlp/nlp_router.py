from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response
from typing import Dict, Any, Optional
from io import BytesIO
from pathlib import Path

# 라우터 생성 (게이트웨이 라우팅과 일치하도록 /nlp로 설정)
router = APIRouter(prefix="/nlp", tags=["nlp"])

# 서비스 인스턴스 생성 (에러 발생 시에도 라우터는 등록되도록 처리)
import logging
logger = logging.getLogger(__name__)

try:
    from app.nlp.emma.emma_wordcloud import NLPService
    logger.info("NLPService import 성공")
except Exception as e:
    logger.error(f"NLPService import 실패: {e}")
    import traceback
    logger.error(traceback.format_exc())
    NLPService = None

try:
    from app.nlp.samsung.samsung_wordcloud import SamsungWordCloud
    logger.info("SamsungWordCloud import 성공")
except Exception as e:
    logger.error(f"SamsungWordCloud import 실패: {e}")
    import traceback
    logger.error(traceback.format_exc())
    SamsungWordCloud = None

# 서비스 인스턴스 초기화
try:
    if NLPService is not None:
        nlp_service = NLPService(download_nltk_data=True)
        logger.info("NLPService 인스턴스 생성 성공")
    else:
        nlp_service = None
        logger.warning("NLPService가 None이므로 인스턴스를 생성하지 않습니다.")
    
    _services_loaded = (NLPService is not None) and (SamsungWordCloud is not None)
    if _services_loaded:
        logger.info("모든 NLP 서비스가 성공적으로 로드되었습니다.")
    else:
        logger.warning(f"일부 NLP 서비스가 로드되지 않았습니다. NLPService: {NLPService is not None}, SamsungWordCloud: {SamsungWordCloud is not None}")
except Exception as e:
    logger.error(f"NLP 서비스 인스턴스 생성 실패: {e}")
    import traceback
    logger.error(traceback.format_exc())
    nlp_service = None
    _services_loaded = False


@router.get("")
@router.get("/")
async def nlp_root():
    """NLP 서비스 루트 엔드포인트 - 라우터 등록 확인용"""
    return {
        "service": "NLP Service",
        "status": "running",
        "router_prefix": "/nlp",
        "endpoints": {
            "emma": "/nlp/emma (게이트웨이: /api/ml/nlp/emma)",
            "emma_stats": "/nlp/emma/stats (게이트웨이: /api/ml/nlp/emma/stats)",
            "samsung": "/nlp/samsung (게이트웨이: /api/ml/nlp/samsung)",
            "samsung_stats": "/nlp/samsung/stats (게이트웨이: /api/ml/nlp/samsung/stats)"
        },
        "note": "게이트웨이를 통해 접근 시 /api/ml/nlp/** 경로 사용"
    }


@router.get("/emma")
async def generate_emma_wordcloud(
    width: int = Query(1000, description="이미지 너비"),
    height: int = Query(600, description="이미지 높이"),
    background_color: str = Query("white", description="배경색"),
    random_state: int = Query(0, description="랜덤 시드")
):
    """
    Emma 말뭉치를 사용하여 워드클라우드 생성
    
    - Emma 말뭉치를 로드하고
    - 토큰화 및 빈도 분석을 수행한 후
    - 워드클라우드 이미지를 생성하여 반환합니다.
    
    **Query 파라미터:**
    - `width`: 이미지 너비 (기본값: 1000)
    - `height`: 이미지 높이 (기본값: 600)
    - `background_color`: 배경색 (기본값: "white")
    - `random_state`: 랜덤 시드 (기본값: 0)
    
    **반환:**
    - PNG 형식의 워드클라우드 이미지
    """
    try:
        # 1. Emma 말뭉치 로드
        emma_raw = nlp_service.load_corpus("austen-emma.txt")
        
        # 2. 토큰화 (정규식 사용)
        emma_tokens = nlp_service.tokenize_regex(emma_raw)
        
        # 3. POS 태깅
        tagged_tokens = nlp_service.pos_tag(emma_tokens)
        
        # 4. 고유명사(NNP)만 필터링 (stopwords 제외)
        stopwords = ["Mr.", "Mrs.", "Miss", "Mr", "Mrs", "Dear"]
        names = nlp_service.filter_tokens_by_pos(
            pos_tag="NNP",
            stopwords=stopwords,
            tagged_list=tagged_tokens
        )
        
        # 5. 빈도 분포 생성
        fd_names = nlp_service.create_freq_dist(names)
        
        # 6. 워드클라우드 생성 (show=False로 설정하여 이미지만 생성)
        wc = nlp_service.generate_wordcloud(
            freq_dist=fd_names,
            width=width,
            height=height,
            background_color=background_color,
            random_state=random_state,
            show=False
        )
        
        # 7. 이미지를 BytesIO로 변환
        from PIL import Image
        import numpy as np
        
        # WordCloud를 numpy 배열로 변환 후 PIL Image로 변환
        img_array = wc.to_array()
        img = Image.fromarray(img_array)
        
        img_buffer = BytesIO()
        img.save(img_buffer, format='PNG')
        img_buffer.seek(0)
        
        # 8. Response로 반환
        return Response(
            content=img_buffer.getvalue(),
            media_type="image/png",
            headers={
                "Content-Disposition": "inline; filename=emma_wordcloud.png"
            }
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"워드클라우드 생성 실패: {str(e)}"
        )


@router.get("/emma/stats")
async def get_emma_stats():
    """
    Emma 말뭉치 통계 정보 조회
    
    - 전체 단어 수
    - 가장 빈도 높은 단어 Top 10
    - "Emma" 단어의 출현 횟수 및 확률
    """
    try:
        if not _services_loaded or nlp_service is None:
            raise HTTPException(
                status_code=503,
                detail="NLPService가 초기화되지 않았습니다. 서버 로그를 확인하세요."
            )
        # 1. Emma 말뭉치 로드
        emma_raw = nlp_service.load_corpus("austen-emma.txt")
        
        # 2. 토큰화
        emma_tokens = nlp_service.tokenize_regex(emma_raw)
        
        # 3. POS 태깅
        tagged_tokens = nlp_service.pos_tag(emma_tokens)
        
        # 4. 고유명사만 필터링
        stopwords = ["Mr.", "Mrs.", "Miss", "Mr", "Mrs", "Dear"]
        names = nlp_service.filter_tokens_by_pos(
            pos_tag="NNP",
            stopwords=stopwords,
            tagged_list=tagged_tokens
        )
        
        # 5. 빈도 분포 생성
        fd_names = nlp_service.create_freq_dist(names)
        
        # 6. 통계 정보 수집
        total, emma_count, emma_freq = nlp_service.get_freq_statistics(fd_names, "Emma")
        most_common = nlp_service.get_most_common(fd_names, 10)
        
        return {
            "status": "success",
            "total_words": total,
            "emma_count": emma_count,
            "emma_frequency": round(emma_freq, 4),
            "top_10_words": [
                {"word": word, "count": count} 
                for word, count in most_common
            ]
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"통계 조회 실패: {str(e)}"
        )


@router.get("/samsung")
async def generate_samsung_wordcloud(
    file_path: Optional[str] = Query(None, description="분석할 파일 경로 (기본값: data/kr-Report_2018.txt)"),
    stopword_path: Optional[str] = Query(None, description="스탑워드 파일 경로 (기본값: data/stopwords.txt)"),
    width: int = Query(1200, description="이미지 너비"),
    height: int = Query(1200, description="이미지 높이"),
    relative_scaling: float = Query(0.2, description="상대적 크기 조정"),
    background_color: str = Query("white", description="배경색")
):
    """
    삼성전자 보고서를 사용하여 워드클라우드 생성
    
    - 삼성전자 보고서 파일을 읽고
    - 한글 추출 및 명사 추출을 수행한 후
    - 스탑워드 제거 및 빈도 분석을 거쳐
    - 워드클라우드 이미지를 생성하여 반환합니다.
    
    **Query 파라미터:**
    - `file_path`: 분석할 파일 경로 (기본값: data/kr-Report_2018.txt)
    - `stopword_path`: 스탑워드 파일 경로 (기본값: data/stopwords.txt)
    - `width`: 이미지 너비 (기본값: 1200)
    - `height`: 이미지 높이 (기본값: 1200)
    - `relative_scaling`: 상대적 크기 조정 (기본값: 0.2)
    - `background_color`: 배경색 (기본값: "white")
    
    **반환:**
    - PNG 형식의 워드클라우드 이미지
    """
    try:
        # emma와 동일한 패턴: 서비스 체크 없이 바로 사용 (에러 발생 시 예외 처리)
        if SamsungWordCloud is None:
            raise HTTPException(
                status_code=503,
                detail="SamsungWordCloud 클래스를 import할 수 없습니다. 서버 로그를 확인하세요."
            )
        
        # 기본 파일 경로 설정 (app/nlp/data/) - emma와 동일한 패턴
        nlp_data_dir = Path(__file__).parent / 'data'
        if file_path is None:
            file_path = str(nlp_data_dir / 'kr-Report_2018.txt')
        if stopword_path is None:
            stopword_path = str(nlp_data_dir / 'stopwords.txt')
        
        # 파일 존재 확인
        file_path_obj = Path(file_path)
        stopword_path_obj = Path(stopword_path)
        
        if not file_path_obj.exists():
            raise HTTPException(
                status_code=404,
                detail=f"분석할 파일을 찾을 수 없습니다: {file_path} (경로: {file_path_obj.absolute()})"
            )
        if not stopword_path_obj.exists():
            raise HTTPException(
                status_code=404,
                detail=f"스탑워드 파일을 찾을 수 없습니다: {stopword_path} (경로: {stopword_path_obj.absolute()})"
            )
        
        # SamsungWordCloud 인스턴스 생성
        swc = SamsungWordCloud(
            file_path=str(file_path_obj),
            stopword_path=str(stopword_path_obj)
        )
        
        # 파일 읽기
        swc.read_file()
        
        # 워드클라우드 생성 (show=False로 설정하여 이미지만 생성)
        wc = swc.draw_wordcloud(
            width=width,
            height=height,
            relative_scaling=relative_scaling,
            background_color=background_color,
            show=False,
            save=True
        )
        
        # 이미지를 BytesIO로 변환 - emma와 동일한 패턴
        from PIL import Image
        import numpy as np
        
        # WordCloud를 numpy 배열로 변환 후 PIL Image로 변환
        img_array = wc.to_array()
        img = Image.fromarray(img_array)
        
        img_buffer = BytesIO()
        img.save(img_buffer, format='PNG')
        img_buffer.seek(0)
        
        # Response로 반환 - emma와 동일한 패턴
        return Response(
            content=img_buffer.getvalue(),
            media_type="image/png",
            headers={
                "Content-Disposition": "inline; filename=samsung_wordcloud.png"
            }
        )
        
    except HTTPException:
        # HTTPException은 그대로 전달
        raise
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=404,
            detail=f"파일을 찾을 수 없습니다: {str(e)}"
        )
    except Exception as e:
        import traceback
        error_detail = f"{str(e)}\n{traceback.format_exc()}"
        raise HTTPException(
            status_code=500,
            detail=f"워드클라우드 생성 실패: {error_detail}"
        )


@router.get("/samsung/stats")
async def get_samsung_stats(
    file_path: Optional[str] = Query(None, description="분석할 파일 경로 (기본값: data/kr-Report_2018.txt)"),
    stopword_path: Optional[str] = Query(None, description="스탑워드 파일 경로 (기본값: data/stopwords.txt)"),
    top_n: int = Query(10, description="상위 N개 단어 조회")
):
    """
    삼성전자 보고서 통계 정보 조회
    
    - 전체 단어 수
    - 가장 빈도 높은 단어 Top N
    - 필터링된 토큰 수
    
    **Query 파라미터:**
    - `file_path`: 분석할 파일 경로 (기본값: data/kr-Report_2018.txt)
    - `stopword_path`: 스탑워드 파일 경로 (기본값: data/stopwords.txt)
    - `top_n`: 상위 N개 단어 조회 (기본값: 10)
    """
    try:
        # emma와 동일한 패턴: 서비스 체크 없이 바로 사용 (에러 발생 시 예외 처리)
        if SamsungWordCloud is None:
            raise HTTPException(
                status_code=503,
                detail="SamsungWordCloud 클래스를 import할 수 없습니다. 서버 로그를 확인하세요."
            )
        
        # 기본 파일 경로 설정 (app/nlp/data/) - emma와 동일한 패턴
        nlp_data_dir = Path(__file__).parent / 'data'
        if file_path is None:
            file_path = str(nlp_data_dir / 'kr-Report_2018.txt')
        if stopword_path is None:
            stopword_path = str(nlp_data_dir / 'stopwords.txt')
        
        # 파일 존재 확인
        file_path_obj = Path(file_path)
        stopword_path_obj = Path(stopword_path)
        
        if not file_path_obj.exists():
            raise HTTPException(
                status_code=404,
                detail=f"분석할 파일을 찾을 수 없습니다: {file_path}"
            )
        if not stopword_path_obj.exists():
            raise HTTPException(
                status_code=404,
                detail=f"스탑워드 파일을 찾을 수 없습니다: {stopword_path}"
            )
        
        # SamsungWordCloud 인스턴스 생성
        swc = SamsungWordCloud(
            file_path=str(file_path_obj),
            stopword_path=str(stopword_path_obj)
        )
        
        # 파일 읽기
        swc.read_file()
        
        # 빈도 분석
        freq = swc.find_freq()
        
        # 통계 정보 수집
        total_words = len(swc.filtered_texts) if swc.filtered_texts else 0
        top_words = freq.head(top_n).to_dict()
        
        return {
            "status": "success",
            "total_words": total_words,
            "top_words": [
                {"word": word, "count": int(count)} 
                for word, count in top_words.items()
            ]
        }
        
    except HTTPException:
        # HTTPException은 그대로 전달
        raise
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=404,
            detail=f"파일을 찾을 수 없습니다: {str(e)}"
        )
    except Exception as e:
        import traceback
        error_detail = f"{str(e)}\n{traceback.format_exc()}"
        raise HTTPException(
            status_code=500,
            detail=f"통계 조회 실패: {error_detail}"
        )
