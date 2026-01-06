import axios from "axios";
import { useAuthStore } from "@/store/authStore";
import {
  refreshAccessToken,
  getIsRefreshing,
  setIsRefreshing,
  addToFailedQueue,
  processFailedQueue,
} from "@/service/mainservice";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.hatchery.kr";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // CORS 쿠키 지원
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * 요청 인터셉터: Access Token을 헤더에 추가
 * - Zustand 스토어에서 access_token을 가져와 Authorization 헤더에 추가
 * - 토큰이 유효하지 않으면 헤더에 추가하지 않음
 */
api.interceptors.request.use((config) => {
  // 클라이언트 사이드에서만 실행
  if (typeof window !== "undefined") {
    const { accessToken, isTokenValid } = useAuthStore.getState();

    // 토큰이 있고 유효하면 Authorization 헤더에 추가
    if (accessToken && isTokenValid()) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
  }

  return config;
});

/**
 * 응답 인터셉터: Access Token을 Zustand 스토어에 저장
 * - 응답에서 access_token을 받으면 zustand 스토어에 저장 (localStorage 사용 금지)
 * - expires_in이 있으면 만료 시간도 함께 저장
 */
api.interceptors.response.use(
  (response) => {
    // 클라이언트 사이드에서만 실행
    if (typeof window !== "undefined") {
      const data = response.data;

      // 응답에 access_token이 포함되어 있으면 zustand 스토어에 저장
      if (data?.access_token || data?.accessToken) {
        const token = data.access_token || data.accessToken;
        const expiresIn = data.expires_in || data.expiresIn || 600; // 기본값: 10분

        useAuthStore.getState().setAccessToken(token, expiresIn);
        console.log("✅ Access Token이 Zustand 스토어에 저장되었습니다 (localStorage 미사용)");
      }
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // 401 Unauthorized 에러이고, refresh 요청이 아닌 경우
    if (
      error.response?.status === 401 &&
      typeof window !== "undefined" &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/api/auth/refresh")
    ) {
      // 이미 갱신 중이면 대기
      if (getIsRefreshing()) {
        return new Promise((resolve, reject) => {
          addToFailedQueue({ resolve, reject });
        })
          .then((token) => {
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      setIsRefreshing(true);

      try {
        // Refresh Token을 사용하여 새로운 Access Token 발급
        const newToken = await refreshAccessToken();

        processFailedQueue(null, newToken);

        // 원래 요청 재시도 (새로운 토큰 사용)
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh Token도 만료되었거나 유효하지 않은 경우
        processFailedQueue(refreshError, null);
        return Promise.reject(refreshError);
      } finally {
        setIsRefreshing(false);
      }
    }

    // 401 에러이지만 refresh 요청이거나 이미 재시도한 경우
    if (error.response?.status === 401 && typeof window !== "undefined") {
      useAuthStore.getState().setAccessToken(null);
      useAuthStore.getState().setIsAuthenticated(false);
    }

    return Promise.reject(error);
  }
);

export { api };
export default api;
