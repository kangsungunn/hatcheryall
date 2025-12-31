'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Upload, FileText, Sparkles, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function SubmitPage() {
    const router = useRouter();
    const [problem, setProblem] = useState('');
    const [answer, setAnswer] = useState('');
    const [answerType, setAnswerType] = useState('essay');
    const [correctionMode, setCorrectionMode] = useState('normal');
    const [isUploading, setIsUploading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        // TODO: OCR API 호출
        // const formData = new FormData();
        // formData.append('image', file);
        // const response = await fetch('/api/ocr', { method: 'POST', body: formData });
        // const { text } = await response.json();
        // setProblem(text);

        setTimeout(() => {
            setIsUploading(false);
            // 임시로 파일명만 표시
            alert('OCR 기능은 곧 추가될 예정입니다.');
        }, 1000);
    };

    const handleSubmit = async () => {
        if (!problem.trim() || !answer.trim()) {
            alert('문제와 답안을 모두 입력해주세요.');
            return;
        }

        setIsProcessing(true);

        // TODO: API 호출
        // const response = await fetch('/api/feedback', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ problem, answer, answerType, correctionMode })
        // });
        // const result = await response.json();

        // 임시: 2초 후 결과 페이지로 이동
        setTimeout(() => {
            setIsProcessing(false);
            router.push('/result');
        }, 2000);
    };

    const wordCount = answer.length;

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="container mx-auto max-w-4xl">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/" className="text-blue-600 hover:underline mb-4 inline-block">
                        ← 홈으로
                    </Link>
                    <h1 className="text-3xl font-bold mb-2">답안 제출</h1>
                    <p className="text-gray-600">문제와 답안을 입력하거나 사진을 업로드하세요</p>
                </div>

                <div className="grid gap-6">
                    {/* 문제 입력 */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                문제 입력
                            </CardTitle>
                            <CardDescription>
                                문제를 직접 입력하거나 시험지 사진을 업로드하세요
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="problem">문제</Label>
                                <Textarea
                                    id="problem"
                                    placeholder="문제를 입력하세요..."
                                    value={problem}
                                    onChange={(e) => setProblem(e.target.value)}
                                    className="mt-2 min-h-[120px]"
                                />
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex-1 border-t"></div>
                                <span className="text-sm text-gray-500">또는</span>
                                <div className="flex-1 border-t"></div>
                            </div>
                            <div>
                                <Label>사진 업로드 (OCR)</Label>
                                <div className="mt-2">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                        id="image-upload"
                                    />
                                    <label htmlFor="image-upload">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="w-full"
                                            disabled={isUploading}
                                        >
                                            {isUploading ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    처리 중...
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="mr-2 h-4 w-4" />
                                                    시험지 사진 업로드
                                                </>
                                            )}
                                        </Button>
                                    </label>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 답안 입력 */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5" />
                                답안 입력
                            </CardTitle>
                            <CardDescription>
                                작성한 답안을 입력하세요
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <Label htmlFor="answer">답안</Label>
                                    <span className="text-sm text-gray-500">{wordCount}자</span>
                                </div>
                                <Textarea
                                    id="answer"
                                    placeholder="답안을 입력하세요..."
                                    value={answer}
                                    onChange={(e) => setAnswer(e.target.value)}
                                    className="min-h-[300px]"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* 옵션 설정 */}
                    <Card>
                        <CardHeader>
                            <CardTitle>첨삭 옵션</CardTitle>
                            <CardDescription>
                                첨삭 방식을 선택하세요
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <Label className="mb-3 block">채점 기준</Label>
                                <Select value={answerType} onValueChange={setAnswerType}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="essay">논술형</SelectItem>
                                        <SelectItem value="cover-letter">자기소개서형</SelectItem>
                                        <SelectItem value="thesis">논문형</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="mb-3 block">교정 강도</Label>
                                <RadioGroup value={correctionMode} onValueChange={setCorrectionMode}>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="gentle" id="gentle" />
                                        <Label htmlFor="gentle" className="cursor-pointer">
                                            부드러운 교정 (원문 의도 최대한 유지)
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="normal" id="normal" />
                                        <Label htmlFor="normal" className="cursor-pointer">
                                            일반 교정 (균형잡힌 수정)
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="strong" id="strong" />
                                        <Label htmlFor="strong" className="cursor-pointer">
                                            강력한 교정 (대폭 개선)
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 제출 버튼 */}
                    <div className="flex gap-4">
                        <Button
                            onClick={handleSubmit}
                            disabled={isProcessing || !problem.trim() || !answer.trim()}
                            size="lg"
                            className="flex-1"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    AI 첨삭 중...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="mr-2 h-5 w-5" />
                                    AI 첨삭 시작하기
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

