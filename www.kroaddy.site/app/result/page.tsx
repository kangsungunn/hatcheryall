'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, FileText, TrendingUp, Save } from 'lucide-react';
import Link from 'next/link';

function ResultContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // TODO: 실제 API에서 데이터 가져오기
    const [result] = useState({
        correctedAnswer: `문제는 어렵지만, 체계적인 학습 계획을 수립하고 꾸준한 노력을 기울인다면 좋은 결과를 얻을 수 있습니다. 다양한 학습 방법을 시도하며 자신에게 맞는 방법을 찾아 지속적으로 개선한다면 성공에 이를 수 있습니다.`,
        originalAnswer: `문제는 어렵지만 열심히 공부하면 좋은 결과를 얻을 수 있을 것 같습니다. 여러 가지 방법을 시도해보고 노력하면 성공할 수 있습니다.`,
        logicScore: 85,
        grammarScore: 90,
        contextScore: 80,
        structureAnalysis: {
            introduction: '있음',
            body: '부족함',
            conclusion: '있음',
            logicGap: '중간 부분에서 논리 비약 발견',
            missingKeyPoints: ['구체적인 학습 방법 제시 부족', '시간 관리 전략 언급 없음']
        },
        grammarCorrections: [
            { original: '어렵지만', corrected: '어렵지만,', reason: '접속부사 뒤 쉼표 필요' },
            { original: '시도해보고', corrected: '시도하며', reason: '문맥상 더 자연스러운 표현' }
        ],
        sampleAnswer: `문제 해결을 위해서는 체계적인 접근이 필요합니다. 먼저 문제의 핵심을 파악하고, 단계별로 해결 방안을 모색해야 합니다. 구체적으로는 학습 계획 수립, 시간 관리, 그리고 지속적인 피드백을 통한 개선이 중요합니다. 이러한 과정을 통해 문제를 효과적으로 해결할 수 있을 것입니다.`
    });

    const handleSave = () => {
        // TODO: 히스토리에 저장
        alert('히스토리에 저장되었습니다.');
        router.push('/history');
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="container mx-auto max-w-6xl">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/submit" className="text-blue-600 hover:underline mb-4 inline-block">
                        <ArrowLeft className="inline h-4 w-4 mr-1" />
                        다시 제출하기
                    </Link>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">AI 첨삭 결과</h1>
                            <p className="text-gray-600">답안이 분석되었습니다</p>
                        </div>
                        <Button onClick={handleSave}>
                            <Save className="mr-2 h-4 w-4" />
                            히스토리에 저장
                        </Button>
                    </div>
                </div>

                {/* 점수 요약 */}
                <div className="grid md:grid-cols-3 gap-4 mb-8">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">논리력 점수</p>
                                    <p className="text-3xl font-bold">{result.logicScore}점</p>
                                </div>
                                <TrendingUp className="h-10 w-10 text-blue-600" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">문법 점수</p>
                                    <p className="text-3xl font-bold">{result.grammarScore}점</p>
                                </div>
                                <CheckCircle2 className="h-10 w-10 text-green-600" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">맥락 적합도</p>
                                    <p className="text-3xl font-bold">{result.contextScore}점</p>
                                </div>
                                <FileText className="h-10 w-10 text-purple-600" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* 주요 결과 카드들 */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                    {/* 1. 첨삭된 문장 (수정 버전) */}
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                첨삭된 문장 (수정 버전)
                            </CardTitle>
                            <CardDescription>
                                원래 답안 대비 수정된 부분을 확인하세요
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="corrected" className="w-full">
                                <TabsList>
                                    <TabsTrigger value="original">원본 답안</TabsTrigger>
                                    <TabsTrigger value="corrected">수정된 답안</TabsTrigger>
                                    <TabsTrigger value="compare">비교 보기</TabsTrigger>
                                </TabsList>
                                <TabsContent value="original" className="mt-4">
                                    <div className="bg-gray-50 border rounded-lg p-4 min-h-[200px]">
                                        <p className="text-gray-700 whitespace-pre-wrap">{result.originalAnswer}</p>
                                    </div>
                                </TabsContent>
                                <TabsContent value="corrected" className="mt-4">
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 min-h-[200px]">
                                        <p className="text-gray-700 whitespace-pre-wrap">{result.correctedAnswer}</p>
                                    </div>
                                </TabsContent>
                                <TabsContent value="compare" className="mt-4">
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm font-semibold mb-2 text-red-600">원본</p>
                                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 min-h-[200px]">
                                                <p className="text-gray-700 whitespace-pre-wrap">{result.originalAnswer}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold mb-2 text-blue-600">수정본</p>
                                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 min-h-[200px]">
                                                <p className="text-gray-700 whitespace-pre-wrap">{result.correctedAnswer}</p>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>

                    {/* 2. 논리 구조 분석 */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5" />
                                논리 구조 분석
                            </CardTitle>
                            <CardDescription>
                                서론-본론-결론 흐름 및 논리성 평가
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm">서론</span>
                                    <Badge variant="outline" className="bg-green-50">
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        {result.structureAnalysis.introduction}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm">본론</span>
                                    <Badge variant="outline" className="bg-yellow-50">
                                        <AlertCircle className="h-3 w-3 mr-1" />
                                        {result.structureAnalysis.body}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm">결론</span>
                                    <Badge variant="outline" className="bg-green-50">
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        {result.structureAnalysis.conclusion}
                                    </Badge>
                                </div>
                            </div>
                            <div className="border-t pt-4">
                                <p className="text-sm font-semibold mb-2">논리 비약</p>
                                <p className="text-sm text-gray-600">{result.structureAnalysis.logicGap}</p>
                            </div>
                            <div className="border-t pt-4">
                                <p className="text-sm font-semibold mb-2">누락된 핵심 문장</p>
                                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                                    {result.structureAnalysis.missingKeyPoints.map((point, idx) => (
                                        <li key={idx}>{point}</li>
                                    ))}
                                </ul>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 3. 문법 / 맞춤법 교정 */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5" />
                                문법 / 맞춤법 교정
                            </CardTitle>
                            <CardDescription>
                                발견된 문법 오류 및 수정 사항
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {result.grammarCorrections.map((correction, idx) => (
                                    <div key={idx} className="border rounded-lg p-4">
                                        <div className="flex items-start gap-2 mb-2">
                                            <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                                            <div className="flex-1">
                                                <p className="text-sm">
                                                    <span className="line-through text-red-600">{correction.original}</span>
                                                    {' → '}
                                                    <span className="text-green-600 font-semibold">{correction.corrected}</span>
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">{correction.reason}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {result.grammarCorrections.length === 0 && (
                                    <p className="text-sm text-gray-500 text-center py-4">
                                        문법 오류가 발견되지 않았습니다.
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* 4. 고득점 예시 답안 */}
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                고득점 예시 답안 (모범 답안)
                            </CardTitle>
                            <CardDescription>
                                같은 문제에 대한 완전히 교정된 모범 답안입니다
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
                                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                                    {result.sampleAnswer}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* 액션 버튼 */}
                <div className="flex gap-4 justify-center">
                    <Link href="/submit">
                        <Button variant="outline" size="lg">
                            새로운 답안 제출
                        </Button>
                    </Link>
                    <Link href="/history">
                        <Button size="lg">
                            히스토리 보기
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function ResultPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 py-8 px-4 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600">로딩 중...</p>
                </div>
            </div>
        }>
            <ResultContent />
        </Suspense>
    );
}

