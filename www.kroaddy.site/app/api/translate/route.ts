import { NextRequest, NextResponse } from 'next/server';

/**
 * 번역 API
 * Google Translate 무료 버전 사용 (클라이언트 사이드)
 * 또는 간단한 딕셔너리 기반 번역
 */

// 간단한 한국어-영어 매핑 (일반적인 이미지 생성 프롬프트)
const TRANSLATION_DICT: Record<string, string> = {
    '귀여운': 'cute',
    '아름다운': 'beautiful',
    '멋진': 'cool',
    '로봇': 'robot',
    '바리스타': 'barista',
    '영화 같은': 'cinematic',
    '조명': 'lighting',
    '바다': 'ocean',
    '석양': 'sunset',
    '도시': 'city',
    '야경': 'night view',
    '네온사인': 'neon sign',
    '미래': 'futuristic',
    '고품질': 'high quality',
    '상세한': 'detailed',
    '프로페셔널': 'professional',
};

/**
 * 간단한 단어 기반 번역 (딕셔너리)
 */
function simpleTranslate(text: string): string {
    let translated = text;
    
    // 딕셔너리의 단어들을 순서대로 치환
    Object.entries(TRANSLATION_DICT).forEach(([ko, en]) => {
        const regex = new RegExp(ko, 'g');
        translated = translated.replace(regex, en);
    });

    return translated.trim();
}

/**
 * Google Translate 무료 버전 사용
 * CORS 문제를 피하기 위해 서버 사이드에서 호출
 */
async function translateWithGoogle(text: string, sourceLang: string, targetLang: string): Promise<string> {
    try {
        // Google Translate 웹 버전 사용 (무료, API 키 불필요)
        // 서버 사이드에서 호출하므로 CORS 문제 없음
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
        });
        
        if (!response.ok) {
            throw new Error('Translation failed');
        }

        const data = await response.json();
        // Google Translate 응답 파싱
        if (data && data[0] && Array.isArray(data[0])) {
            const translated = data[0].map((item: any[]) => item[0]).join('');
            return translated || text;
        }
        
        return text;
    } catch (error) {
        console.error('Google Translate error:', error);
        // 실패 시 간단한 번역 시도
        return simpleTranslate(text);
    }
}

export async function POST(request: NextRequest) {
    let text = '';
    try {
        const body = await request.json();
        text = body.text || '';
        const { sourceLang, targetLang } = body;

        if (!text || typeof text !== 'string') {
            return NextResponse.json(
                { error: 'Text is required' },
                { status: 400 }
            );
        }

        if (sourceLang === targetLang) {
            return NextResponse.json({
                translatedText: text,
            });
        }

        // 한국어 → 영어 번역
        if (sourceLang === 'ko' && targetLang === 'en') {
            const translated = await translateWithGoogle(text, sourceLang, targetLang);
            return NextResponse.json({
                translatedText: translated,
            });
        }

        // 다른 언어 조합도 지원 가능
        const translated = await translateWithGoogle(text, sourceLang, targetLang);
        
        return NextResponse.json({
            translatedText: translated,
        });
    } catch (error: any) {
        console.error('Translation error:', error);
        return NextResponse.json(
            { error: 'Translation failed', translatedText: text || '' },
            { status: 500 }
        );
    }
}

