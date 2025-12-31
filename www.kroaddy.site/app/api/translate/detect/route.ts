import { NextRequest, NextResponse } from 'next/server';

/**
 * 간단한 언어 감지 API
 * 한글 유니코드 체크로 한국어 감지
 */
export async function POST(request: NextRequest) {
    try {
        const { text } = await request.json();

        if (!text || typeof text !== 'string') {
            return NextResponse.json(
                { error: 'Text is required' },
                { status: 400 }
            );
        }

        // 간단한 언어 감지 (한글 체크)
        const koreanRegex = /[가-힣]/;
        const detectedLanguage = koreanRegex.test(text) ? 'ko' : 'en';

        return NextResponse.json({
            detectedLanguage,
        });
    } catch (error: any) {
        console.error('Language detection error:', error);
        return NextResponse.json(
            { error: 'Language detection failed', detectedLanguage: 'en' },
            { status: 500 }
        );
    }
}

