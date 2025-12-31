'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, TrendingUp, AlertCircle, CheckCircle2, BarChart3, Target } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function AnalysisPage() {
  // TODO: 실제 API에서 데이터 가져오기
  const [scoreData] = useState([
    { week: '1주', logic: 70, grammar: 75, context: 68 },
    { week: '2주', logic: 75, grammar: 80, context: 72 },
    { week: '3주', logic: 80, grammar: 85, context: 78 },
    { week: '4주', logic: 85, grammar: 90, context: 80 },
  ]);

  const [commonIssues] = useState([
    { issue: '논리 비약', frequency: 12, severity: 'high' },
    { issue: '불필요한 비문', frequency: 8, severity: 'medium' },
    { issue: '서술 순서 오류', frequency: 6, severity: 'medium' },
    { issue: '핵심 문장 누락', frequency: 5, severity: 'low' },
  ]);

  const [keywordAnalysis] = useState([
    { keyword: '학습', count: 25, trend: 'up' },
    { keyword: '문제', count: 20, trend: 'up' },
    { keyword: '노력', count: 18, trend: 'down' },
    { keyword: '성공', count: 15, trend: 'up' },
  ]);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/profile" className="text-blue-600 hover:underline mb-4 inline-block">
            <ArrowLeft className="inline h-4 w-4 mr-1" />
            마이페이지로
          </Link>
          <h1 className="text-3xl font-bold mb-2">성장 분석</h1>
          <p className="text-gray-600">답안 분석을 통한 성장 추세와 개선점을 확인하세요</p>
        </div>

        {/* 점수 추세 그래프 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              점수 추세 분석
            </CardTitle>
            <CardDescription>
              주차별 문장력, 논리력, 맥락 적합도 점수 변화
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={scoreData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="logic" stroke="#3b82f6" strokeWidth={2} name="논리력" />
                <Line type="monotone" dataKey="grammar" stroke="#10b981" strokeWidth={2} name="문법" />
                <Line type="monotone" dataKey="context" stroke="#8b5cf6" strokeWidth={2} name="맥락" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* 자주 등장하는 문제점 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                자주 등장하는 문제점
              </CardTitle>
              <CardDescription>
                반복적으로 발견되는 오류 패턴
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {commonIssues.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{item.issue}</span>
                        <Badge
                          variant="outline"
                          className={
                            item.severity === 'high'
                              ? 'bg-red-50 text-red-600'
                              : item.severity === 'medium'
                              ? 'bg-yellow-50 text-yellow-600'
                              : 'bg-blue-50 text-blue-600'
                          }
                        >
                          {item.severity === 'high' ? '높음' : item.severity === 'medium' ? '보통' : '낮음'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{item.frequency}회 발견</p>
                    </div>
                    <div className="text-right">
                      <BarChart3 className="h-8 w-8 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 키워드 분석 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                키워드 분석
              </CardTitle>
              <CardDescription>
                답안에서 자주 사용하는 키워드
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={keywordAnalysis}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="keyword" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {keywordAnalysis.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span>{item.keyword}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">{item.count}회</span>
                      {item.trend === 'up' ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 성장 요약 */}
        <Card>
          <CardHeader>
            <CardTitle>성장 요약</CardTitle>
            <CardDescription>
              최근 4주간의 성장 지표 요약
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-6 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">평균 논리력</p>
                <p className="text-3xl font-bold text-blue-600">77.5점</p>
                <p className="text-sm text-green-600 mt-2">+15.5점 향상</p>
              </div>
              <div className="text-center p-6 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">평균 문법 점수</p>
                <p className="text-3xl font-bold text-green-600">82.5점</p>
                <p className="text-sm text-green-600 mt-2">+15점 향상</p>
              </div>
              <div className="text-center p-6 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">평균 맥락 적합도</p>
                <p className="text-3xl font-bold text-purple-600">74.5점</p>
                <p className="text-sm text-green-600 mt-2">+12.5점 향상</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 액션 버튼 */}
        <div className="flex gap-4 justify-center mt-8">
          <Link href="/history">
            <Button variant="outline" size="lg">
              히스토리 보기
            </Button>
          </Link>
          <Link href="/submit">
            <Button size="lg">
              새로운 답안 제출
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

