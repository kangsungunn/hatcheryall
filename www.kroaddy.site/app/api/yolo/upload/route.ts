import { NextRequest, NextResponse } from 'next/server';

// FastAPI 서버 URL (환경 변수 또는 기본값)
const CV_SERVICE_URL = process.env.CV_SERVICE_URL || 'http://localhost:9008';

export async function POST(request: NextRequest) {
  try {
    // 쿼리 파라미터에서 task_type 가져오기
    const searchParams = request.nextUrl.searchParams;
    const taskType = searchParams.get('task_type') || 'detection';
    
    // 요청 헤더 크기 확인 (디버깅용)
    const headersSize = JSON.stringify(Object.fromEntries(request.headers.entries())).length;
    console.log('[YOLO Upload API] Request headers size:', headersSize, 'bytes');
    
    // 요청 본문(FormData)을 그대로 FastAPI로 전달
    const formData = await request.formData();
    
    console.log('[YOLO Upload API] Proxying upload request:', {
      taskType,
      taskTypeType: typeof taskType,
      fileCount: formData.getAll('files').length
    });
    console.log('[YOLO Upload API] Full URL:', `${CV_SERVICE_URL}/yolo/upload?task_type=${taskType}`);
    
    // FastAPI 서버로 프록시
    const uploadUrl = `${CV_SERVICE_URL}/yolo/upload?task_type=${taskType}`;
    
    // 원본 FormData를 그대로 사용 (Node.js 환경에서는 재생성 시 문제 발생 가능)
    // 헤더를 최소화하여 431 에러 방지
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
      // Content-Type은 명시하지 않음 - FormData가 자동으로 multipart/form-data 설정
      // 불필요한 헤더는 자동으로 제거됨
    });

    console.log('[YOLO Upload API] Response status:', response.status);

    const responseText = await response.text();
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { detail: responseText };
      }
      console.error('[YOLO Upload API] Error response:', errorData);
      return NextResponse.json(
        { 
          error: errorData.detail || '업로드 실패',
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
    console.error('[YOLO Upload API] Error:', error);
    
    // 431 에러인 경우 특별 처리
    if (error instanceof Error && error.message.includes('431')) {
      return NextResponse.json(
        { 
          error: '요청 헤더가 너무 큽니다. 파일 크기를 줄이거나 다른 방법을 시도해주세요.',
          details: 'HTTP 431: Request Header Fields Too Large',
          suggestion: '파일을 다시 업로드하거나 브라우저를 새로고침해주세요.'
        },
        { status: 431 }
      );
    }
    
    return NextResponse.json(
      { 
        error: '업로드 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

