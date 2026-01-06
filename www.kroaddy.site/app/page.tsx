'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Sparkles, FileText, TrendingUp, Users, ArrowRight, BookOpen, PenTool, LogOut, User } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';



interface UserInfo {
  id: string;
  email?: string;
  name?: string;
  profileImage?: string;
}


export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 로그인 상태 확인
    // 로컬 개발 환경에서 백엔드 서버가 없을 수 있으므로 에러를 조용히 처리
    const checkAuth = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5초 타임아웃

        const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
          credentials: 'include', // 쿠키 포함
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          setIsAuthenticated(true);
          const userData = await res.json();
          if (userData) setUser(userData);
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        // 네트워크 에러나 타임아웃은 조용히 처리 (로컬 개발 환경에서 정상)
        // 백엔드 서버가 없으면 비로그인 상태로 처리
        setIsAuthenticated(false);
        setUser(null);

        // 개발 환경에서만 콘솔에 경고 표시
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ 백엔드 서버에 연결할 수 없습니다. 로컬 개발 모드로 실행됩니다.');
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include', // 쿠키 포함
      });
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }

    setIsAuthenticated(false);
    setUser(null);
    router.refresh(); // 페이지 새로고침
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-bold">AI 첨삭</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/history" className="text-sm hover:text-blue-600 transition">
              히스토리
            </Link>
            <Link href="/profile/analysis" className="text-sm hover:text-blue-600 transition">
              마이페이지
            </Link>
            {loading ? (
              <div className="w-20 h-8 flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              </div>
            ) : isAuthenticated ? (
              <>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <User className="h-4 w-4" />
                  <span>{user?.name || user?.email || `사용자 ${user?.id?.substring(0, 8)}`}</span>
                </div>
                <Button variant="outline" size="sm" onClick={handleLogout} className="flex items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  로그아웃
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" asChild>
                <Link href="/login">로그인</Link>
              </Button>
            )}
            <Button size="sm" asChild>
              <Link href="/submit">시작하기</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="animate-fade-in-up">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              서술형 답안, 내가 교정해드립니다
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              문장력·논리·문법·맥락을 종합 분석하여 정확한 첨삭과 고득점 예시 답안을 제공합니다
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/submit">
                <Button size="lg" className="text-lg px-8">
                  지금 바로 첨삭받기
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="#features">
                <Button variant="outline" size="lg" className="text-lg px-8">
                  더 알아보기
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">실시간 첨삭 데모</h2>
            <p className="text-gray-600">입력한 답안이 어떻게 개선되는지 확인해보세요</p>
          </div>
          <Card className="shadow-lg">
            <CardContent className="p-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-red-600">원본 답안</h3>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 min-h-[200px]">
                    <p className="text-gray-700">
                      문제는 어렵지만 열심히 공부하면 좋은 결과를 얻을 수 있을 것 같습니다.
                      여러 가지 방법을 시도해보고 노력하면 성공할 수 있습니다.
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-blue-600">AI 첨삭 결과</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 min-h-[200px]">
                    <p className="text-gray-700">
                      <span className="bg-blue-200">문제는 어렵지만,</span> 체계적인 학습 계획을 수립하고
                      <span className="bg-blue-200">꾸준한 노력을 기울인다면</span> 좋은 결과를 얻을 수 있습니다.
                      다양한 학습 방법을 시도하며 자신에게 맞는 방법을 찾아 <span className="bg-blue-200">지속적으로 개선한다면</span> 성공에 이를 수 있습니다.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">왜 AI 첨삭인가요?</h2>
            <p className="text-gray-600">정확한 분석과 빠른 피드백으로 학습 효율을 높이세요</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CheckCircle2 className="h-10 w-10 text-green-600 mb-2" />
                <CardTitle>정확한 첨삭</CardTitle>
                <CardDescription>
                  문장력, 논리 구조, 문법, 맥락을 종합적으로 분석하여 정확한 피드백 제공
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <FileText className="h-10 w-10 text-blue-600 mb-2" />
                <CardTitle>문장 구조 분석</CardTitle>
                <CardDescription>
                  서론-본론-결론 흐름, 논리 비약, 핵심 문장 누락 여부를 체계적으로 분석
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <Sparkles className="h-10 w-10 text-purple-600 mb-2" />
                <CardTitle>예시 답안 제공</CardTitle>
                <CardDescription>
                  같은 문제에 대한 고득점 모범 답안을 생성하여 학습 방향 제시
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">누가 사용하나요?</h2>
            <p className="text-gray-600">다양한 분야에서 활용 가능합니다</p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <BookOpen className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <CardTitle>수험생</CardTitle>
                <CardDescription>논술 시험 대비 및 서술형 문제 연습</CardDescription>
              </CardHeader>
            </Card>
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <Users className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <CardTitle>대학생</CardTitle>
                <CardDescription>과제 및 리포트 작성 능력 향상</CardDescription>
              </CardHeader>
            </Card>
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <PenTool className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                <CardTitle>자기소개서</CardTitle>
                <CardDescription>취업 준비생의 자기소개서 완성도 향상</CardDescription>
              </CardHeader>
            </Card>
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <TrendingUp className="h-12 w-12 text-orange-600 mx-auto mb-4" />
                <CardTitle>논술 대비</CardTitle>
                <CardDescription>대학 입시 논술 시험 준비</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0">
            <CardContent className="p-12">
              <h2 className="text-3xl font-bold mb-4">지금 바로 시작하세요</h2>
              <p className="text-xl mb-8 opacity-90">
                AI 첨삭으로 더 나은 답안을 작성해보세요
              </p>
              <Link href="/submit">
                <Button size="lg" variant="secondary" className="text-lg px-8">
                  무료로 시작하기
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t bg-white">
        <div className="container mx-auto text-center text-gray-600">
          <p>© 2024 AI 첨삭 서비스. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

