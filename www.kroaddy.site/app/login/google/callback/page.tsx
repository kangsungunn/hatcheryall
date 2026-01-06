'use client';
import { useEffect } from 'react';
import { handleLoginSuccess } from '@/service/mainservice';

export default function GoogleCallbackPage() {
    useEffect(() => {
        // 백엔드에서 Refresh Token을 HttpOnly 쿠키에 저장한 후 콜백으로 리다이렉트됨
        // handleLoginSuccess에서 후처리 수행
        handleLoginSuccess('google', '/onboarding').catch((error) => {
            console.error('로그인 성공 처리 실패:', error);
        });
    }, []);

    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">구글 로그인 처리 중...</p>
            </div>
        </div>
    );
}

