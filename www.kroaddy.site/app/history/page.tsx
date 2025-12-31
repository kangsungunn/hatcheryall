'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Eye, RefreshCw, Trash2, Calendar, TrendingUp } from 'lucide-react';

export default function HistoryPage() {
  // TODO: 실제 API에서 데이터 가져오기
  const [history] = useState([
    {
      id: 1,
      date: '2024-12-15',
      problem: '문제는 어렵지만 열심히 공부하면...',
      originalAnswer: '문제는 어렵지만 열심히 공부하면 좋은 결과를 얻을 수 있을 것 같습니다.',
      correctedAnswer: '문제는 어렵지만, 체계적인 학습 계획을 수립하고...',
      scores: { logic: 85, grammar: 90, context: 80 },
      status: 'completed'
    },
    {
      id: 2,
      date: '2024-12-14',
      problem: '자기소개서 작성',
      originalAnswer: '저는 성실하고 책임감이 강한 사람입니다.',
      correctedAnswer: '저는 성실함과 책임감을 바탕으로...',
      scores: { logic: 88, grammar: 92, context: 85 },
      status: 'completed'
    }
  ]);

  const handleRecheck = (id: number) => {
    // TODO: 재첨삭 API 호출
    alert(`답안 #${id} 재첨삭을 시작합니다.`);
  };

  const handleDelete = (id: number) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      // TODO: 삭제 API 호출
      alert(`답안 #${id}가 삭제되었습니다.`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:underline mb-4 inline-block">
            <ArrowLeft className="inline h-4 w-4 mr-1" />
            홈으로
          </Link>
          <h1 className="text-3xl font-bold mb-2">첨삭 히스토리</h1>
          <p className="text-gray-600">이전에 제출한 답안들을 확인하고 비교해보세요</p>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">전체</TabsTrigger>
            <TabsTrigger value="recent">최근 7일</TabsTrigger>
            <TabsTrigger value="month">이번 달</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <div className="space-y-4">
              {history.map((item) => (
                <Card key={item.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-500">{item.date}</span>
                          <Badge variant="outline" className="bg-green-50">
                            완료
                          </Badge>
                        </div>
                        <CardTitle className="text-lg mb-2 line-clamp-2">
                          {item.problem}
                        </CardTitle>
                        <CardDescription className="line-clamp-2">
                          {item.originalAnswer}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">논리력</p>
                        <p className="text-xl font-bold text-blue-600">{item.scores.logic}점</p>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">문법</p>
                        <p className="text-xl font-bold text-green-600">{item.scores.grammar}점</p>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">맥락</p>
                        <p className="text-xl font-bold text-purple-600">{item.scores.context}점</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/result?id=${item.id}`} className="flex-1">
                        <Button variant="outline" className="w-full">
                          <Eye className="mr-2 h-4 w-4" />
                          상세 보기
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        onClick={() => handleRecheck(item.id)}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        재첨삭
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {history.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-gray-500 mb-4">아직 첨삭 기록이 없습니다.</p>
                    <Link href="/submit">
                      <Button>첫 답안 제출하기</Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="recent" className="mt-6">
            <div className="text-center py-12 text-gray-500">
              최근 7일 기록이 없습니다.
            </div>
          </TabsContent>

          <TabsContent value="month" className="mt-6">
            <div className="text-center py-12 text-gray-500">
              이번 달 기록이 없습니다.
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

