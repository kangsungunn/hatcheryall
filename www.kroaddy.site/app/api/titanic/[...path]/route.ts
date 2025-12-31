// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';

// 환경 변수에서 API URL 가져오기
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const path = resolvedParams.path.join('/');
    const apiUrl = `${API_BASE_URL}/api/ai/titanic/${path}`;
    
    // 쿼리 파라미터 추가
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();
    const fullUrl = queryString ? `${apiUrl}?${queryString}` : apiUrl;
    
    console.log('[Titanic API Route] Calling:', fullUrl);
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('[Titanic API Route] Response status:', response.status);

    // 응답 본문을 텍스트로 먼저 읽기 (한 번만 읽기)
    const responseText = await response.text();
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = responseText;
      }
      console.error('[Titanic API Route] Error response:', errorData);
      return NextResponse.json(
        { 
          error: typeof errorData === 'string' ? errorData : (errorData?.error || 'API 요청 실패'),
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
    console.error('[Titanic API Route] Error:', error);
    return NextResponse.json(
      { 
        error: '서버 오류가 발생했습니다.', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

