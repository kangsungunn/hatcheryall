import { NextRequest, NextResponse } from 'next/server';

// FastAPI 서버 URL (환경 변수 또는 기본값)
const CV_SERVICE_URL = process.env.CV_SERVICE_URL || 'http://localhost:9008';

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const originalPath = searchParams.get('original_path');
    const resultPath = searchParams.get('result_path');
    const taskType = searchParams.get('task_type') || 'detection';
    
    if (!originalPath || !resultPath) {
      return NextResponse.json(
        { error: 'original_path와 result_path가 필요합니다.' },
        { status: 400 }
      );
    }
    
    console.log('[YOLO Save API] Saving to S3:', {
      originalPath,
      resultPath,
      taskType
    });
    
    const saveUrl = `${CV_SERVICE_URL}/yolo/save?original_path=${encodeURIComponent(originalPath)}&result_path=${encodeURIComponent(resultPath)}&task_type=${taskType}`;
    
    const response = await fetch(saveUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('[YOLO Save API] Response status:', response.status);

    const responseText = await response.text();
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { detail: responseText };
      }
      console.error('[YOLO Save API] Error response:', errorData);
      return NextResponse.json(
        { 
          error: errorData.detail || 'S3 저장 실패',
          status: response.status,
          details: errorData
        },
        { status: response.status }
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { message: responseText };
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[YOLO Save API] Error:', error);
    return NextResponse.json(
      { 
        error: 'S3 저장 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

