import { NextRequest, NextResponse } from 'next/server';

// FastAPI 서버 URL (환경 변수 또는 기본값)
const CV_SERVICE_URL = process.env.CV_SERVICE_URL || 'http://localhost:9008';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const pathArray = resolvedParams.path;
    
    console.log('[YOLO Image API] Received path array:', pathArray);
    console.log('[YOLO Image API] Path array length:', pathArray.length);
    console.log('[YOLO Image API] Full path array:', JSON.stringify(pathArray));
    
    // 경로 배열의 각 요소를 URL 디코딩
    const decodedArray = pathArray.map(segment => {
      try {
        const decoded = decodeURIComponent(segment);
        console.log(`[YOLO Image API] Decoded segment: "${segment}" -> "${decoded}"`);
        return decoded;
      } catch (e) {
        console.log(`[YOLO Image API] Failed to decode segment: "${segment}", using as-is`);
        return segment;
      }
    });
    
    // 경로 배열을 슬래시로 조인
    let path = decodedArray.join('/');
    
    console.log('[YOLO Image API] Joined path before normalization:', path);
    
    // 경로 정규화 (백슬래시를 슬래시로 변환, 중복 슬래시 제거)
    path = path.replace(/\\\\/g, '/'); // 이스케이프된 백슬래시
    path = path.replace(/\\/g, '/'); // 일반 백슬래시
    path = path.replace(/#/g, '/'); // # 기호를 슬래시로 변환
    path = path.replace(/([^:])\/+/g, '$1/'); // 중복 슬래시 제거 (단, http:// 같은 경우는 유지)
    
    // 경로가 올바른 형식인지 확인 (app/data/yolo/... 또는 app/yolo/temp/... 모두 허용)
    if (!path.startsWith('app/')) {
      console.error('[YOLO Image API] Invalid path format:', path);
      return NextResponse.json(
        { error: 'Invalid path format', path },
        { status: 400 }
      );
    }
    
    // FastAPI 서버의 이미지 엔드포인트로 프록시
    // 경로를 URL 인코딩하여 전달 (슬래시는 유지)
    const pathSegments = path.split('/');
    const encodedSegments = pathSegments.map(segment => encodeURIComponent(segment));
    const encodedPath = encodedSegments.join('/');
    const imageUrl = `${CV_SERVICE_URL}/yolo/image/${encodedPath}`;
    
    console.log('[YOLO Image API] Decoded array:', decodedArray);
    console.log('[YOLO Image API] Final normalized path:', path);
    console.log('[YOLO Image API] Encoded path:', encodedPath);
    console.log('[YOLO Image API] Proxying request to FastAPI:', imageUrl);
    console.log('[YOLO Image API] CV_SERVICE_URL:', CV_SERVICE_URL);
    
    const response = await fetch(imageUrl, {
      method: 'GET',
      headers: {
        'Accept': 'image/*',
      },
    });

    console.log('[YOLO Image API] Response status:', response.status);
    console.log('[YOLO Image API] Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[YOLO Image API] Error response:', errorText);
      return NextResponse.json(
        { 
          error: '이미지를 불러올 수 없습니다.',
          status: response.status,
          details: errorText
        },
        { status: response.status }
      );
    }

    // 이미지 데이터를 스트림으로 전달
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('[YOLO Image API] Error:', error);
    return NextResponse.json(
      { 
        error: '이미지 로드 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

