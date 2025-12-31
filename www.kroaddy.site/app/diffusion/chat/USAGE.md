# Diffusion Chat 사용 가이드

## 빠른 시작

### 1. 환경 설정

`.env.local` 파일에 다음 환경 변수를 추가하세요:

```env
# Diffusion 서비스 URL
NEXT_PUBLIC_DIFFUSION_API_URL=http://localhost:8000

# 또는 API Gateway를 통해 접근하는 경우
# NEXT_PUBLIC_DIFFUSION_API_URL=http://localhost:8080/api/cv/diffusion
```

### 2. 서비스 실행

#### Diffusers 서비스 실행
```bash
cd cv.krodaay.site/app/diffusers
conda activate diffxl
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

#### Next.js 개발 서버 실행
```bash
cd www.kroaddy.site
npm run dev
```

### 3. 접속

브라우저에서 다음 URL로 접속:
```
http://localhost:3000/diffusion/chat
```

## 사용 방법

### 기본 사용

1. **프롬프트 입력**: 생성하고 싶은 이미지를 설명하는 텍스트 입력
   - 예: "a beautiful sunset over the ocean with birds flying"
   - 예: "a futuristic city at night with neon lights"

2. **네거티브 프롬프트 (선택)**: 제외하고 싶은 요소 입력
   - 예: "blurry, low quality, distorted"
   - 예: "text, watermark, signature"

3. **이미지 생성 버튼 클릭**

4. **결과 확인**: 생성된 이미지가 표시됩니다

### 고급 설정

"설정" 버튼을 클릭하여 다음 파라미터를 조정할 수 있습니다:

- **너비/높이**: 이미지 크기 (64의 배수, 최대 1024)
- **스텝 수**: 생성 품질 (1-50, 높을수록 품질 좋지만 느림)
- **Guidance Scale**: 프롬프트 준수도 (0-20, 높을수록 프롬프트에 가까움)
- **Seed**: 재현 가능한 결과를 위한 랜덤 시드

## 프롬프트 작성 팁

### 좋은 프롬프트 예시

```
✅ 구체적이고 상세한 설명
"a serene Japanese garden with cherry blossoms, koi pond, traditional stone lanterns, soft morning light, 4k, highly detailed"

✅ 스타일 명시
"digital art, concept art, fantasy landscape, epic composition, vibrant colors, cinematic lighting"

✅ 품질 키워드
"high quality, detailed, professional, 8k, sharp focus"
```

### 나쁜 프롬프트 예시

```
❌ 너무 짧거나 모호함
"picture"
"nice image"

❌ 모순되는 설명
"black and white colorful image"
```

## 문제 해결

### 이미지가 생성되지 않을 때

1. **서버 상태 확인**
   ```bash
   curl http://localhost:8000/health
   ```

2. **에러 메시지 확인**: 브라우저 개발자 도구 콘솔 확인

3. **CORS 에러**: 서버에서 CORS 설정 확인

4. **메모리 부족**: GPU 메모리 확인 (RTX 3050 6GB는 제한적)

### 연결 오류

- Diffusers 서비스가 실행 중인지 확인
- 포트 번호 확인 (기본값: 8000)
- 방화벽 설정 확인

### 느린 생성 속도

- GPU 사용 확인 (CUDA 사용 가능 여부)
- 스텝 수 줄이기 (기본값: 4)
- 이미지 크기 줄이기 (기본값: 768x768)

## API 직접 호출 예시

```bash
curl -X POST http://localhost:8000/api/v1/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "a beautiful sunset over the ocean",
    "negative_prompt": "blurry, low quality",
    "width": 768,
    "height": 768,
    "steps": 4,
    "guidance_scale": 0.0
  }'
```

## 다음 단계

더 많은 기능을 사용하려면 [ROADMAP.md](./ROADMAP.md)를 참고하세요.

