import { NextRequest, NextResponse } from 'next/server';

// FastAPI 서버 URL (환경 변수 또는 기본값)
const CV_SERVICE_URL = process.env.CV_SERVICE_URL || 'http://localhost:9008';

export async function GET(request: NextRequest) {
  try {
    // 쿼리 파라미터에서 task_type 가져오기
    const searchParams = request.nextUrl.searchParams;
    const taskType = searchParams.get('task_type') || 'detection';
    
    // FastAPI 서버로 프록시
    const filesUrl = `${CV_SERVICE_URL}/yolo/files?task_type=${taskType}`;
    
    console.log('[YOLO Files API] Proxying request:', filesUrl);
    
    const response = await fetch(filesUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('[YOLO Files API] Response status:', response.status);

    const responseText = await response.text();
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { detail: responseText };
      }
      console.error('[YOLO Files API] Error response:', errorData);
      return NextResponse.json(
        { 
          error: errorData.detail || '파일 목록 조회 실패',
          status: response.status,
          details: errorData
        },
        { status: response.status }
      );
    }

    // 성공 응답 처리
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { message: responseText };
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[YOLO Files API] Error:', error);
    return NextResponse.json(
      { 
        error: '파일 목록 조회 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

