import { create } from "zustand";

interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  tokenExpiry: number | null; // 토큰 만료 시간 (timestamp)
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  setAccessToken: (token: string | null, expiresIn?: number) => void; // expiresIn: 초 단위 (기본 10분)
  logout: () => void;
  isTokenValid: () => boolean;
}

/**
 * Access Token 저장소 (Zustand)
 * 
 * 🔒 보안 원칙:
 * - Access Token은 짧게(5~15분) 브라우저 메모리(React state/모듈 변수)에만 보관
 * - localStorage는 절대 사용하지 않음 (XSS 공격 위험)
 * - Zustand 스토어는 메모리에 저장되므로 안전함
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  accessToken: null,
  tokenExpiry: null,

  setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),

  /**
   * Access Token 설정
   * @param token - Access Token 문자열
   * @param expiresIn - 토큰 만료 시간 (초 단위, 기본값: 10분 = 600초)
   */
  setAccessToken: (token, expiresIn = 600) => {
    const expiry = token ? Date.now() + expiresIn * 1000 : null;
    set({
      accessToken: token,
      tokenExpiry: expiry,
      isAuthenticated: !!token
    });
  },

  /**
   * 토큰 유효성 검사
   * @returns 토큰이 존재하고 만료되지 않았으면 true
   */
  isTokenValid: () => {
    const { accessToken, tokenExpiry } = get();
    if (!accessToken || !tokenExpiry) return false;
    return Date.now() < tokenExpiry;
  },

  /**
   * 로그아웃 - 모든 인증 정보 초기화
   */
  logout: () => {
    set({
      isAuthenticated: false,
      accessToken: null,
      tokenExpiry: null
    });
  },
}));
