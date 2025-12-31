'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Send, Image as ImageIcon, Loader2, Download, Settings, X, Languages } from 'lucide-react';
import { generateImage } from '@/lib/api/diffusion';
import type { GenerateImageRequest, GenerateImageResponse } from '@/lib/api/diffusion';
import { detectLanguage, translateText } from '@/service/translateService';
import type { LanguageCode } from '@/lib/types';

/**
 * 간단한 언어 감지 (한글 체크)
 * API가 없을 때 사용하는 fallback
 */
function detectLanguageSimple(text: string): LanguageCode {
    // 한글 유니코드 범위: AC00-D7AF (가-힣)
    const koreanRegex = /[가-힣]/;
    if (koreanRegex.test(text)) {
        return 'ko';
    }
    // 기본값은 영어
    return 'en';
}

interface Message {
    id: string;
    type: 'user' | 'assistant';
    prompt: string;
    originalPrompt?: string; // 원본 프롬프트 (한국어 등)
    translatedPrompt?: string; // 번역된 프롬프트 (영어)
    imageUrl?: string;
    meta?: any;
    timestamp: Date;
    status?: 'generating' | 'success' | 'error';
    error?: string;
}

export default function DiffusionChatPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [prompt, setPrompt] = useState('');
    const [negativePrompt, setNegativePrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [settings, setSettings] = useState({
        width: 768,
        height: 768,
        steps: 4,
        guidanceScale: 0.0,
        seed: undefined as number | undefined,
    });
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // 메시지 추가 시 자동 스크롤
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleGenerate = async () => {
        if (!prompt.trim() || isGenerating) return;

        const originalPrompt = prompt.trim();
        let finalPrompt = originalPrompt;
        let translatedPrompt: string | undefined;

        // 언어 감지 및 번역 (한국어면 영어로)
        try {
            // 먼저 간단한 언어 감지 시도
            let detectedLang = detectLanguageSimple(originalPrompt);

            // API가 있으면 더 정확한 감지 시도
            try {
                const apiDetectedLang = await detectLanguage(originalPrompt);
                detectedLang = apiDetectedLang;
            } catch (apiError) {
                // API가 없으면 간단한 감지 결과 사용
                console.log('언어 감지 API 사용 불가, 간단한 감지 사용');
            }

            if (detectedLang !== 'en') {
                // 영어가 아니면 영어로 번역 시도
                try {
                    translatedPrompt = await translateText(originalPrompt, detectedLang, 'en');
                    // 번역이 성공하고 원본과 다르면 사용
                    if (translatedPrompt && translatedPrompt !== originalPrompt) {
                        finalPrompt = translatedPrompt;
                    }
                } catch (translateError) {
                    console.warn('번역 실패, 원본 프롬프트 사용:', translateError);
                    // 번역 실패 시 원본 사용
                }
            }
        } catch (error) {
            console.warn('언어 감지/번역 실패, 원본 프롬프트 사용:', error);
            // 전체 실패 시 원본 사용
        }

        const userMessage: Message = {
            id: Date.now().toString(),
            type: 'user',
            prompt: originalPrompt,
            originalPrompt: translatedPrompt ? originalPrompt : undefined,
            translatedPrompt: translatedPrompt,
            timestamp: new Date(),
        };

        const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            type: 'assistant',
            prompt: finalPrompt,
            originalPrompt: translatedPrompt ? originalPrompt : undefined,
            translatedPrompt: translatedPrompt,
            timestamp: new Date(),
            status: 'generating',
        };

        setMessages((prev) => [...prev, userMessage, assistantMessage]);
        setPrompt('');
        setIsGenerating(true);

        try {
            const request: GenerateImageRequest = {
                prompt: finalPrompt, // 번역된 프롬프트 사용
                negative_prompt: negativePrompt.trim() || undefined,
                width: settings.width,
                height: settings.height,
                steps: settings.steps,
                guidance_scale: settings.guidanceScale,
                seed: settings.seed,
            };

            const response = await generateImage(request);

            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === assistantMessage.id
                        ? {
                            ...msg,
                            imageUrl: response.image_url,
                            meta: response.meta,
                            status: 'success',
                        }
                        : msg
                )
            );
        } catch (error: any) {
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === assistantMessage.id
                        ? {
                            ...msg,
                            status: 'error',
                            error: error.message || '이미지 생성 중 오류가 발생했습니다.',
                        }
                        : msg
                )
            );
        } finally {
            setIsGenerating(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleGenerate();
        }
    };

    const handleDownload = (imageUrl: string, prompt: string) => {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `generated-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="container mx-auto max-w-6xl py-8 px-4">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        AI 이미지 생성
                    </h1>
                    <p className="text-gray-600">텍스트로 이미지를 생성해보세요</p>
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* 메인 채팅 영역 */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* 메시지 목록 */}
                        <Card className="h-[600px] flex flex-col">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2">
                                        <ImageIcon className="h-5 w-5" />
                                        생성 대화
                                    </CardTitle>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowSettings(!showSettings)}
                                    >
                                        <Settings className="h-4 w-4 mr-2" />
                                        설정
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 overflow-hidden flex flex-col p-0">
                                <div
                                    ref={scrollContainerRef}
                                    className="flex-1 overflow-y-auto p-4 space-y-4"
                                >
                                    {messages.length === 0 ? (
                                        <div className="flex items-center justify-center h-full text-gray-400">
                                            <div className="text-center">
                                                <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                                <p>프롬프트를 입력하고 이미지를 생성해보세요</p>
                                            </div>
                                        </div>
                                    ) : (
                                        messages.map((message) => (
                                            <div
                                                key={message.id}
                                                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'
                                                    }`}
                                            >
                                                <div
                                                    className={`max-w-[80%] ${message.type === 'user'
                                                        ? 'bg-blue-500 text-white rounded-lg p-3'
                                                        : 'bg-white border rounded-lg p-4'
                                                        }`}
                                                >
                                                    {message.type === 'user' ? (
                                                        <div className="space-y-1">
                                                            <p className="text-sm">{message.prompt}</p>
                                                            {message.translatedPrompt && message.translatedPrompt !== message.prompt && (
                                                                <p className="text-xs opacity-80 italic">
                                                                    → {message.translatedPrompt}
                                                                </p>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            {message.status === 'generating' && (
                                                                <div className="space-y-2">
                                                                    <div className="flex items-center gap-2 text-gray-600">
                                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                                        <span className="text-sm">이미지 생성 중...</span>
                                                                    </div>
                                                                    {message.translatedPrompt && message.translatedPrompt !== message.prompt && (
                                                                        <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                                                                            <Languages className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                                                            <div>
                                                                                <p className="font-medium mb-1">번역된 프롬프트:</p>
                                                                                <p>{message.translatedPrompt}</p>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {message.status === 'error' && (
                                                                <div className="text-red-600 text-sm">
                                                                    {message.error}
                                                                </div>
                                                            )}
                                                            {message.status === 'success' && message.imageUrl && (
                                                                <div className="space-y-2">
                                                                    <img
                                                                        src={message.imageUrl}
                                                                        alt={message.prompt}
                                                                        className="rounded-lg w-full max-w-md"
                                                                    />
                                                                    <div className="flex gap-2">
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={() =>
                                                                                handleDownload(message.imageUrl!, message.prompt)
                                                                            }
                                                                        >
                                                                            <Download className="h-4 w-4 mr-2" />
                                                                            다운로드
                                                                        </Button>
                                                                    </div>
                                                                    {message.meta && (
                                                                        <details className="text-xs text-gray-500 mt-2">
                                                                            <summary className="cursor-pointer">
                                                                                생성 정보 보기
                                                                            </summary>
                                                                            <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto">
                                                                                {JSON.stringify(message.meta, null, 2)}
                                                                            </pre>
                                                                        </details>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>
                            </CardContent>
                        </Card>

                        {/* 입력 영역 */}
                        <Card>
                            <CardContent className="p-4">
                                <div className="space-y-3">
                                    <div>
                                        <Label htmlFor="prompt">프롬프트</Label>
                                        <Textarea
                                            id="prompt"
                                            value={prompt}
                                            onChange={(e) => setPrompt(e.target.value)}
                                            onKeyPress={handleKeyPress}
                                            placeholder="생성하고 싶은 이미지를 설명해주세요 (한국어 또는 영어 가능)"
                                            className="min-h-[100px] mt-1"
                                            disabled={isGenerating}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="negative-prompt">네거티브 프롬프트 (선택)</Label>
                                        <Input
                                            id="negative-prompt"
                                            value={negativePrompt}
                                            onChange={(e) => setNegativePrompt(e.target.value)}
                                            placeholder="제외하고 싶은 요소 (예: blurry, low quality)"
                                            className="mt-1"
                                            disabled={isGenerating}
                                        />
                                    </div>
                                    <Button
                                        onClick={handleGenerate}
                                        disabled={!prompt.trim() || isGenerating}
                                        className="w-full"
                                        size="lg"
                                    >
                                        {isGenerating ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                생성 중...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="h-4 w-4 mr-2" />
                                                이미지 생성
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* 설정 사이드바 */}
                    {showSettings && (
                        <div className="lg:col-span-1">
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle>고급 설정</CardTitle>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setShowSettings(false)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <CardDescription>
                                        이미지 생성 파라미터를 조정하세요
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <Label htmlFor="width">너비</Label>
                                        <Input
                                            id="width"
                                            type="number"
                                            value={settings.width}
                                            onChange={(e) =>
                                                setSettings({ ...settings, width: parseInt(e.target.value) || 768 })
                                            }
                                            min={64}
                                            max={1024}
                                            step={64}
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="height">높이</Label>
                                        <Input
                                            id="height"
                                            type="number"
                                            value={settings.height}
                                            onChange={(e) =>
                                                setSettings({ ...settings, height: parseInt(e.target.value) || 768 })
                                            }
                                            min={64}
                                            max={1024}
                                            step={64}
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="steps">스텝 수</Label>
                                        <Input
                                            id="steps"
                                            type="number"
                                            value={settings.steps}
                                            onChange={(e) =>
                                                setSettings({ ...settings, steps: parseInt(e.target.value) || 4 })
                                            }
                                            min={1}
                                            max={50}
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="guidance">Guidance Scale</Label>
                                        <Input
                                            id="guidance"
                                            type="number"
                                            value={settings.guidanceScale}
                                            onChange={(e) =>
                                                setSettings({
                                                    ...settings,
                                                    guidanceScale: parseFloat(e.target.value) || 0.0,
                                                })
                                            }
                                            min={0}
                                            max={20}
                                            step={0.1}
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="seed">Seed (선택)</Label>
                                        <Input
                                            id="seed"
                                            type="number"
                                            value={settings.seed || ''}
                                            onChange={(e) =>
                                                setSettings({
                                                    ...settings,
                                                    seed: e.target.value ? parseInt(e.target.value) : undefined,
                                                })
                                            }
                                            placeholder="랜덤"
                                            className="mt-1"
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

