# 번역 기능 구현 옵션

한국어 프롬프트를 영어로 번역하는 여러 방법이 있습니다.

## ✅ 현재 구현된 방법

### 1. Next.js API Route + Google Translate (무료)
- **위치**: `/app/api/translate/route.ts`
- **장점**: 
  - 무료 (API 키 불필요)
  - 서버 사이드에서 호출하므로 CORS 문제 없음
  - Google Translate의 정확한 번역
- **단점**:
  - Google이 API 사용을 제한할 수 있음
  - Rate limiting 가능

### 2. 간단한 딕셔너리 기반 번역
- **위치**: `TRANSLATION_DICT` in `/app/api/translate/route.ts`
- **장점**: 
  - 완전 무료
  - 빠름
- **단점**:
  - 제한적인 단어만 지원
  - 문맥 이해 없음

## 🔄 다른 옵션들

### 옵션 1: 클라이언트 사이드 번역 라이브러리

```bash
npm install @vitalets/google-translate-api
```

**장점**:
- 클라이언트에서 직접 번역
- 서버 부하 없음

**단점**:
- CORS 문제 가능
- 브라우저에서 실행되므로 보안 고려 필요

### 옵션 2: Papago API (네이버)

```typescript
// 환경 변수에 PAPAGO_CLIENT_ID, PAPAGO_CLIENT_SECRET 추가
const response = await fetch('https://openapi.naver.com/v1/papago/n2mt', {
  method: 'POST',
  headers: {
    'X-Naver-Client-Id': process.env.PAPAGO_CLIENT_ID,
    'X-Naver-Client-Secret': process.env.PAPAGO_CLIENT_SECRET,
  },
  body: JSON.stringify({
    source: 'ko',
    target: 'en',
    text: text,
  }),
});
```

**장점**:
- 한국어 번역에 최적화
- 정확도 높음
- 공식 API

**단점**:
- API 키 필요 (무료 할당량 있음)
- 월 사용량 제한

### 옵션 3: DeepL API

```typescript
const response = await fetch('https://api-free.deepl.com/v2/translate', {
  method: 'POST',
  headers: {
    'Authorization': `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
  },
  body: new URLSearchParams({
    text: text,
    source_lang: 'KO',
    target_lang: 'EN',
  }),
});
```

**장점**:
- 매우 정확한 번역
- 자연스러운 문장

**단점**:
- 유료 (무료 플랜 제한적)
- API 키 필요

### 옵션 4: OpenAI GPT 번역

```typescript
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
  },
  body: JSON.stringify({
    model: 'gpt-3.5-turbo',
    messages: [{
      role: 'user',
      content: `Translate this image generation prompt from Korean to English: ${text}`,
    }],
  }),
});
```

**장점**:
- 이미지 생성 프롬프트에 최적화 가능
- 문맥 이해

**단점**:
- 유료
- API 키 필요

## 🎯 추천 방법

**현재 구현 (Google Translate 무료 버전)**이 가장 실용적입니다:
- ✅ 무료
- ✅ API 키 불필요
- ✅ 정확도 높음
- ✅ 서버 사이드에서 안전하게 호출

**더 나은 번역이 필요하면**:
1. Papago API 추가 (한국어 최적화)
2. 딕셔너리 확장 (이미지 생성 관련 용어 추가)

## 📝 딕셔너리 확장 방법

`/app/api/translate/route.ts`의 `TRANSLATION_DICT`에 더 많은 단어를 추가:

```typescript
const TRANSLATION_DICT: Record<string, string> = {
    // 기존 단어들...
    '고해상도': 'high resolution',
    '4K': '4k',
    'HD': 'hd',
    '초상화': 'portrait',
    '풍경': 'landscape',
    // ... 더 추가
};
```

