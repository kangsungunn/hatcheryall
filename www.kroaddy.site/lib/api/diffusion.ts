/**
 * Diffusion API 클라이언트
 * 이미지 생성 서비스와 통신하는 함수들
 */

export interface GenerateImageRequest {
    prompt: string;
    negative_prompt?: string;
    width?: number;
    height?: number;
    steps?: number;
    guidance_scale?: number;
    seed?: number;
}

export interface GenerateImageResponse {
    id: string;
    image_url: string;
    meta_url: string;
    meta: {
        model_id?: string;
        prompt: string;
        negative_prompt?: string;
        width: number;
        height: number;
        steps: number;
        guidance_scale: number;
        seed?: number;
        device: string;
        [key: string]: any;
    };
}

// Diffusers 서비스의 기본 URL
// 환경 변수로 설정 가능, 기본값은 로컬 개발 서버
const DIFFUSION_API_BASE_URL =
    process.env.NEXT_PUBLIC_DIFFUSION_API_URL || 'http://localhost:8000';

/**
 * 이미지 생성 API 호출
 * @param request 이미지 생성 요청 파라미터
 * @returns 생성된 이미지 정보
 */
export async function generateImage(
    request: GenerateImageRequest
): Promise<GenerateImageResponse> {
    try {
        const response = await fetch(`${DIFFUSION_API_BASE_URL}/api/v1/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({
                message: `HTTP ${response.status}: ${response.statusText}`,
            }));
            throw new Error(errorData.message || `이미지 생성 실패: ${response.statusText}`);
        }

        const data: GenerateImageResponse = await response.json();

        // 이미지 URL이 상대 경로인 경우 절대 경로로 변환
        if (data.image_url && !data.image_url.startsWith('http')) {
            data.image_url = `${DIFFUSION_API_BASE_URL}${data.image_url}`;
        }

        return data;
    } catch (error: any) {
        // 네트워크 에러 처리
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error(
                '서버에 연결할 수 없습니다. Diffusers 서비스가 실행 중인지 확인해주세요.'
            );
        }
        throw error;
    }
}

/**
 * Health check - 서버 상태 확인
 */
export async function checkHealth(): Promise<boolean> {
    try {
        const response = await fetch(`${DIFFUSION_API_BASE_URL}/health`, {
            method: 'GET',
        });
        return response.ok;
    } catch {
        return false;
    }
}

