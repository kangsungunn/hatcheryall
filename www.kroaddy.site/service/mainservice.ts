import api, { API_BASE_URL } from '@/lib/api';
import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

// 토큰 갱신 중인지 추적 (무한 루프 방지)
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (error?: any) => void;
}> = [];

/**
 * 대기 중인 요청들을 처리하는 함수
 */
const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

/**
 * Refresh Token을 사용하여 새로운 Access Token 발급
 * - HttpOnly 쿠키에 저장된 Refresh Token을 사용
 * - 백엔드가 새로운 Access Token을 쿠키에 저장 (프론트엔드는 읽을 수 없음)
 * 
 * @returns 새로운 Access Token 또는 null (쿠키에만 저장된 경우)
 */
export const refreshAccessToken = async (): Promise<string | null> => {
    try {
        // Refresh Token을 사용하여 새로운 Access Token 발급 요청
        // HttpOnly 쿠키에 저장된 Refresh Token이 자동으로 전송됨
        const refreshResponse = await axios.post(
            `${API_BASE_URL}/api/auth/refresh`,
            {},
            {
                withCredentials: true, // 쿠키 포함
            }
        );

        // 백엔드가 새로운 Access Token을 쿠키에 저장했지만,
        // 프론트엔드는 HttpOnly 쿠키를 읽을 수 없으므로
        // 응답 body에 access_token이 있으면 저장, 없으면 쿠키만 사용
        const refreshData = refreshResponse.data;
        if (refreshData?.access_token || refreshData?.accessToken) {
            const token = refreshData.access_token || refreshData.accessToken;
            const expiresIn = refreshData.expires_in || refreshData.expiresIn || 600;
            useAuthStore.getState().setAccessToken(token, expiresIn);
            console.log("✅ Access Token이 갱신되었습니다 (Refresh Token 사용)");
            return token;
        } else {
            // 백엔드가 쿠키에만 저장한 경우, Zustand 스토어는 비워두고 쿠키만 사용
            // 이후 요청은 쿠키가 자동으로 전송됨
            console.log("✅ Access Token이 쿠키에 저장되었습니다 (HttpOnly)");
            return null;
        }
    } catch (refreshError) {
        // Refresh Token도 만료되었거나 유효하지 않은 경우
        useAuthStore.getState().setAccessToken(null);
        useAuthStore.getState().setIsAuthenticated(false);
        useAuthStore.getState().logout();

        // 로그인 페이지로 리다이렉트
        if (typeof window !== "undefined") {
            window.location.href = "/login";
        }

        throw refreshError;
    }
};

/**
 * 토큰 갱신 상태 관리
 */
export const getIsRefreshing = (): boolean => isRefreshing;
export const setIsRefreshing = (value: boolean): void => {
    isRefreshing = value;
};
export const addToFailedQueue = (promise: {
    resolve: (value?: any) => void;
    reject: (error?: any) => void;
}): void => {
    failedQueue.push(promise);
};
export const processFailedQueue = processQueue;

/**
 * 소셜 로그인 URL 가져오기
 * @param {string} provider - 'kakao', 'naver', 'google'
 * @returns {Promise<string>} 인가 URL
 */
export const getSocialLoginUrl = async (provider: string): Promise<string> => {
    const url = `/api/auth/${provider}/login`;

    try {
        console.log(`🔹 ${provider} 로그인 URL 요청: ${API_BASE_URL}${url}`);
        console.log(`🔹 API_BASE_URL: ${API_BASE_URL}`);
        console.log(`🔹 현재 Origin: ${typeof window !== "undefined" ? window.location.origin : "N/A"}`);

        const response = await api.get(url);

        console.log(`✅ ${provider} 인가 URL 받음`);

        if (!response.data.authUrl) {
            throw new Error(`응답에 authUrl이 없습니다. 응답 데이터: ${JSON.stringify(response.data)}`);
        }

        return response.data.authUrl;
    } catch (error) {
        let errorMessage: string;
        let isNetworkError = false;

        if (axios.isAxiosError(error)) {
            if (error.response) {
                // 서버가 응답했지만 오류 상태 코드
                errorMessage = `HTTP ${error.response.status}: ${JSON.stringify(error.response.data) || error.message}`;
                console.error(`   응답 상태: ${error.response.status}`);
                console.error(`   응답 데이터:`, error.response.data);
                console.error(`   응답 헤더:`, error.response.headers);
            } else if (error.request) {
                // 요청은 보냈지만 응답을 받지 못함 (Network Error)
                isNetworkError = true;
                errorMessage = `Network Error: 서버에 연결할 수 없습니다`;
                console.error(`   요청 객체:`, error.request);
                console.error(`   요청 URL: ${error.config?.url || url}`);
                console.error(`   요청 메서드: ${error.config?.method || "GET"}`);
                console.error(`   전체 baseURL: ${error.config?.baseURL || API_BASE_URL}`);
            } else {
                // 요청 설정 중 오류
                errorMessage = `Request Error: ${error.message}`;
                console.error(`   요청 설정 오류:`, error.message);
            }
        } else {
            errorMessage = error instanceof Error ? error.message : String(error);
        }

        console.error(`❌ 소셜 로그인 URL 가져오기 실패 (${provider}):`, errorMessage);
        console.error(`   요청 URL: ${API_BASE_URL}${url}`);
        console.error(`   API_BASE_URL: ${API_BASE_URL}`);
        console.error(`   현재 Origin: ${typeof window !== "undefined" ? window.location.origin : "N/A"}`);
        console.error(`   전체 오류 객체:`, error);

        if (isNetworkError) {
            const detailedMessage =
                `백엔드 서버에 연결할 수 없습니다.\n\n` +
                `확인 사항:\n` +
                `1. 백엔드 서버 실행 확인: ${API_BASE_URL}\n` +
                `   → 브라우저에서 직접 접속 테스트: ${API_BASE_URL}\n` +
                `2. 백엔드 서버 재시작 확인 (CORS 설정 변경 후 필수)\n` +
                `3. CORS 설정 확인:\n` +
                `   - allowedOrigins에 "${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}" 포함 여부\n` +
                `   - allowCredentials: true 설정 여부\n` +
                `   - OPTIONS 메서드 허용 여부\n` +
                `4. Security 설정에서 "/api/auth/**" 경로 permitAll() 확인\n` +
                `5. 브라우저 개발자 도구 → Network 탭에서 요청 확인\n` +
                `6. 방화벽/보안 소프트웨어가 차단하지 않는지 확인`;

            throw new Error(detailedMessage);
        }

        throw new Error(errorMessage);
    }
};

/**
 * 소셜 로그인 시작 (인가 URL로 리다이렉트)
 * @param {string} provider - 'kakao', 'naver', 'google'
 */
export const startSocialLogin = async (provider: string): Promise<void> => {
    try {
        const authUrl = await getSocialLoginUrl(provider);
        console.log(`🔹 ${provider} 로그인 페이지로 리다이렉트합니다...`);
        window.location.href = authUrl; // 카카오/네이버/구글 로그인 페이지로 리다이렉트
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ 소셜 로그인 시작 실패 (${provider}):`, errorMessage);

        // 사용자에게 더 명확한 오류 메시지 표시
        alert(
            `로그인에 실패했습니다.\n\n` +
            `${errorMessage}\n\n` +
            `확인 사항:\n` +
            `1. 백엔드 서버가 실행 중인지 확인 (${API_BASE_URL})\n` +
            `2. 환경 변수 NEXT_PUBLIC_API_BASE_URL 설정 확인\n` +
            `3. 브라우저 콘솔에서 자세한 오류 확인`
        );
    }
};

/**
 * 로그인 성공 후 처리
 * - 백엔드에서 Refresh Token을 HttpOnly 쿠키에 저장한 후 콜백으로 리다이렉트됨
 * - 프론트엔드는 쿠키를 확인하고 필요한 후처리를 수행
 * 
 * @param provider - 로그인 제공자 ('kakao', 'naver', 'google')
 * @param redirectPath - 성공 후 리다이렉트할 경로 (기본값: '/onboarding')
 */
export const handleLoginSuccess = async (
    provider: string,
    redirectPath: string = '/onboarding'
): Promise<void> => {
    try {
        console.log(`✅ ${provider} 로그인 성공 처리 중...`);

        // 로그인 성공 로그 기록
        await fetch(`${API_BASE_URL}/api/log/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // 쿠키 포함 (Refresh Token이 HttpOnly 쿠키로 저장됨)
            body: JSON.stringify({
                action: '로그인 성공',
                provider,
                url: typeof window !== 'undefined' ? window.location.href : '',
            }),
        }).catch(() => {
            // 로그 기록 실패는 무시
        });

        // 백엔드에서 Refresh Token을 HttpOnly 쿠키에 저장했으므로
        // 프론트엔드는 별도로 저장할 필요 없음
        // 이후 API 요청 시 쿠키가 자동으로 전송됨
        console.log('✅ Refresh Token이 HttpOnly 쿠키에 저장되었습니다 (백엔드에서 처리)');

        // 리다이렉트
        if (typeof window !== 'undefined') {
            window.location.href = redirectPath;
        }
    } catch (error) {
        console.error(`❌ 로그인 성공 처리 실패 (${provider}):`, error);
        throw error;
    }
};

/**
 * 소셜 로그인 핸들러를 생성하는 IIFE (Immediately Invoked Function Expression)
 * 각 핸들러는 이너 함수로 구성되어 공통 로직을 공유합니다.
 */
export const { handleKakaoLogin, handleNaverLogin, handleGoogleLogin } = (() => {
    /**
     * Gateway 로그를 기록하는 공통 함수
     */
    const logLoginAction = async (action: string): Promise<void> => {
        try {
            await fetch(`${API_BASE_URL}/api/log/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // 쿠키 포함
                body: JSON.stringify({ action }),
            }).catch(() => { });
        } catch (error) {
            // 로그 기록 실패는 무시
            console.error('로그 기록 실패:', error);
        }
    };

    /**
     * 카카오 로그인 핸들러 (이너 함수)
     */
    const handleKakaoLogin = async (): Promise<void> => {
        try {
            await logLoginAction('Gateway 카카오 연결 시작');
            await startSocialLogin('kakao');
        } catch (error) {
            console.error('카카오 로그인 실패:', error);
        }
    };

    /**
     * 네이버 로그인 핸들러 (이너 함수)
     */
    const handleNaverLogin = async (): Promise<void> => {
        try {
            await logLoginAction('Gateway 네이버 연결 시작');
            await startSocialLogin('naver');
        } catch (error) {
            console.error('네이버 로그인 실패:', error);
        }
    };

    /**
     * 구글 로그인 핸들러 (이너 함수)
     */
    const handleGoogleLogin = async (): Promise<void> => {
        try {
            await logLoginAction('Gateway 구글 연결 시작');
            await startSocialLogin('google');
        } catch (error) {
            console.error('구글 로그인 실패:', error);
        }
    };

    // 핸들러들을 객체로 반환
    return {
        handleKakaoLogin,
        handleNaverLogin,
        handleGoogleLogin,
    };
})();

