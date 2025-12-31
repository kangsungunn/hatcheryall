'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Image as ImageIcon, Download, Loader2, Sparkles, RefreshCw, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

interface DetectionResult {
    filename: string;
    task_type: string;
    success: boolean;
    original_path: string;
    result_path: string;
    person_count: number;
    total_detections?: number;
    total_segments?: number;
    total_poses?: number;
    total_classifications?: number;
    top_class?: string;
    top_confidence?: number;
    detections?: Array<{
        class_id: number;
        class_name: string;
        confidence: number;
        bbox: {
            x1: number;
            y1: number;
            x2: number;
            y2: number;
        };
    }>;
    segments?: Array<{
        class_id: number;
        class_name: string;
        confidence: number;
        bbox: {
            x1: number;
            y1: number;
            x2: number;
            y2: number;
        };
        mask_points?: number[][];
    }>;
    poses?: Array<{
        class_id: number;
        class_name: string;
        confidence: number;
        bbox: {
            x1: number;
            y1: number;
            x2: number;
            y2: number;
        };
        keypoints?: Array<{
            x: number;
            y: number;
            confidence: number;
        }>;
    }>;
    classifications?: Array<{
        class_id: number;
        class_name: string;
        confidence: number;
        rank: number;
    }>;
    message?: string;
    error?: string;
}

interface ResultData {
    processed_count: number;
    total_count: number;
    results: DetectionResult[];
}

function ResultContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [resultData, setResultData] = useState<ResultData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [showOriginal, setShowOriginal] = useState<{ [key: string]: boolean }>({});
    const hasReadSessionStorage = useRef(false); // sessionStorage를 이미 읽었는지 추적

    // Next.js API Routes 사용 (포트 3000)
    // FastAPI 서버는 백엔드에서만 사용하고, 프론트엔드는 Next.js API Routes를 통해 접근
    const apiUrl = ''; // 상대 경로 사용

    useEffect(() => {
        // 이미 sessionStorage를 읽었다면 다시 읽지 않음 (중복 실행 방지)
        if (hasReadSessionStorage.current) {
            console.log('⚠️ Already read sessionStorage, skipping...');
            return;
        }

        // sessionStorage에서 결과 데이터 가져오기 (431 에러 방지를 위해 쿼리 파라미터 대신 사용)
        let decoded: any = null;

        // 데이터 처리 함수
        const processDecodedData = (data: any) => {
            try {
                // 경로 정규화: 모든 결과의 경로를 슬래시로 통일
                if (data.results && Array.isArray(data.results)) {
                    data.results = data.results.map((r: any) => {
                        if (r.original_path) {
                            // 백슬래시, #, %2F 등을 모두 슬래시로 변환
                            r.original_path = String(r.original_path)
                                .replace(/\\/g, '/')
                                .replace(/#/g, '/')
                                .replace(/%2F/gi, '/')
                                .replace(/\/+/g, '/');
                        }
                        if (r.result_path) {
                            r.result_path = String(r.result_path)
                                .replace(/\\/g, '/')
                                .replace(/#/g, '/')
                                .replace(/%2F/gi, '/')
                                .replace(/\/+/g, '/');
                        }
                        return r;
                    });
                }

                console.log('Normalized result paths:', data.results?.map((r: any) => ({
                    filename: r.filename,
                    original_path: r.original_path,
                    result_path: r.result_path
                })));
                setResultData(data);
                setIsLoading(false);
            } catch (error) {
                console.error('Failed to process result data:', error);
                handleNoData();
            }
        };

        // 데이터 없음 처리 함수
        const handleNoData = () => {
            console.log('No result data found. Please upload files first.');
            setResultData({
                processed_count: 0,
                total_count: 0,
                results: []
            });
            setIsLoading(false);
        };

        // sessionStorage 읽기 함수 (삭제하지 않고 읽기만)
        const readSessionStorage = (removeAfterRead: boolean = false): any => {
            try {
                const storedData = sessionStorage.getItem('yolo_result_data');
                if (storedData) {
                    const parsed = JSON.parse(storedData);
                    console.log('✅ Parsed result data from sessionStorage:', parsed);
                    console.log('✅ Results count:', parsed.results?.length);
                    console.log('✅ First result filename:', parsed.results?.[0]?.filename);
                    console.log('✅ First result original_path:', parsed.results?.[0]?.original_path);
                    console.log('✅ First result result_path:', parsed.results?.[0]?.result_path);
                    // 삭제는 호출자가 결정
                    if (removeAfterRead) {
                        sessionStorage.removeItem('yolo_result_data');
                        console.log('✅ Removed data from sessionStorage');
                    }
                    return parsed;
                }
            } catch (e) {
                console.error('Failed to parse sessionStorage data:', e);
            }
            return null;
        };

        // 1. sessionStorage에서 먼저 확인 (즉시 시도, 삭제하지 않음)
        decoded = readSessionStorage(false);

        if (!decoded) {
            console.log('⚠️ No data in sessionStorage, retrying after 100ms...');
            // 약간의 지연 후 재시도 (router.push와의 타이밍 문제 해결)
            setTimeout(() => {
                if (hasReadSessionStorage.current) {
                    console.log('⚠️ Already processed, skipping retry');
                    return;
                }
                decoded = readSessionStorage(true); // 재시도 시에는 삭제
                if (decoded) {
                    hasReadSessionStorage.current = true; // 읽었다고 표시
                    processDecodedData(decoded);
                } else {
                    console.log('⚠️ Still no data in sessionStorage after retry');
                    // 2. sessionStorage에 없으면 쿼리 파라미터에서 확인 (하위 호환성)
                    const dataParam = searchParams.get('data');
                    if (dataParam) {
                        try {
                            decoded = JSON.parse(decodeURIComponent(dataParam));
                            console.log('Parsed result data from query param:', decoded);
                            hasReadSessionStorage.current = true; // 읽었다고 표시
                            processDecodedData(decoded);
                        } catch (e) {
                            console.error('Failed to parse query param data:', e);
                            hasReadSessionStorage.current = true; // 읽었다고 표시 (에러 처리 완료)
                            handleNoData();
                        }
                    } else {
                        hasReadSessionStorage.current = true; // 읽었다고 표시 (데이터 없음 처리 완료)
                        handleNoData();
                    }
                }
            }, 100);
            return; // 재시도 중이면 여기서 종료
        }

        // 데이터를 성공적으로 읽었으면 삭제하고 읽었다고 표시
        hasReadSessionStorage.current = true; // 읽었다고 표시
        sessionStorage.removeItem('yolo_result_data');
        console.log('✅ Removed data from sessionStorage after successful read');

        // 2. sessionStorage에 없으면 쿼리 파라미터에서 확인 (하위 호환성)
        if (!decoded) {
            const dataParam = searchParams.get('data');
            if (dataParam) {
                try {
                    decoded = JSON.parse(decodeURIComponent(dataParam));
                    console.log('Parsed result data from query param:', decoded);
                } catch (e) {
                    console.error('Failed to parse query param data:', e);
                }
            }
        }

        // 3. 데이터가 있으면 처리
        if (decoded) {
            processDecodedData(decoded);
        } else {
            hasReadSessionStorage.current = true; // 읽었다고 표시 (데이터 없음 처리 완료)
            handleNoData();
        }
    }, [searchParams]);

    const fetchLatestResults = async (taskType: string = 'detection') => {
        try {
            const response = await fetch(`/api/yolo/files?task_type=${taskType}`);
            console.log('Files API response:', { status: response.status, ok: response.ok });
            if (response.ok) {
                const data = await response.json();
                console.log('Files API data:', data);
                if (data.success && data.result_files.length > 0) {
                    // 원본 파일과 결과 파일을 매칭
                    const originalMap = new Map(
                        data.original_files.map((file: any) => [
                            file.filename.replace(/^\d{8}_\d{6}_\d{3}_/, ''),
                            file.path
                        ])
                    );

                    // 최신 결과 파일들을 결과 데이터 형식으로 변환
                    const results: DetectionResult[] = data.result_files.map((file: any) => {
                        const originalFilename = file.filename.replace('result_', '').replace(/^\d{8}_\d{6}_\d{3}_/, '');
                        return {
                            filename: originalFilename,
                            task_type: taskType,
                            success: true,
                            original_path: originalMap.get(originalFilename) || '',
                            result_path: file.path,
                            person_count: 0, // API에서 제공하지 않음
                            total_detections: (taskType === 'segment' || taskType === 'pose' || taskType === 'classification') ? undefined : 0,
                            total_segments: taskType === 'segment' ? 0 : undefined,
                            total_poses: taskType === 'pose' ? 0 : undefined,
                            total_classifications: taskType === 'classification' ? 0 : undefined,
                            detections: (taskType === 'segment' || taskType === 'pose' || taskType === 'classification') ? undefined : [],
                            segments: taskType === 'segment' ? [] : undefined,
                            poses: taskType === 'pose' ? [] : undefined,
                            classifications: taskType === 'classification' ? [] : undefined
                        };
                    });
                    setResultData({
                        processed_count: results.length,
                        total_count: results.length,
                        results
                    });
                }
            } else {
                const errorText = await response.text();
                console.error('Files API error:', errorText);
            }
        } catch (error) {
            console.error('Failed to fetch latest results:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = async (result: DetectionResult) => {
        try {
            // S3에 저장하는 API 호출
            const saveUrl = `/api/yolo/save?original_path=${encodeURIComponent(result.original_path)}&result_path=${encodeURIComponent(result.result_path)}&task_type=${result.task_type}`;

            const response = await fetch(saveUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: '저장 실패' }));
                throw new Error(errorData.detail || 'S3 저장 실패');
            }

            const saveResult = await response.json();

            if (saveResult.success) {
                alert('S3에 저장되었습니다.');
                // 업로드 페이지로 리다이렉트
                router.push('/yolo/upload');
            } else {
                throw new Error('저장에 실패했습니다.');
            }
        } catch (error) {
            console.error('Download error:', error);
            const errorMessage = error instanceof Error ? error.message : '다운로드 중 오류가 발생했습니다.';
            alert(`저장 실패: ${errorMessage}`);
        }
    };

    const toggleOriginal = (resultPath: string) => {
        setShowOriginal(prev => ({
            ...prev,
            [resultPath]: !prev[resultPath]
        }));
    };

    const getImageUrl = (path: string) => {
        if (!path || typeof path !== 'string') {
            console.warn('⚠️ getImageUrl: path is empty or not a string');
            return '';
        }

        if (path.startsWith('http')) {
            return path;
        }

        // 경로 정규화: 모든 형태의 구분자를 슬래시로 통일
        let normalizedPath = String(path)
            .replace(/\\\\/g, '/')
            .replace(/\\/g, '/')
            .replace(/#/g, '/')
            .replace(/%2F/gi, '/')
            .replace(/\/+/g, '/');

        // 경로가 올바른 형식인지 확인 (app/로 시작해야 함)
        if (!normalizedPath.startsWith('app/')) {
            console.warn('⚠️ getImageUrl: Invalid path format (must start with app/):', normalizedPath);
            return '';
        }

        // URL 생성: 각 경로 세그먼트를 개별적으로 인코딩 (슬래시는 유지)
        const pathSegments = normalizedPath.split('/').filter(s => s);
        const encodedSegments = pathSegments.map(segment => encodeURIComponent(segment));
        const encodedPath = encodedSegments.join('/');

        const url = `/api/yolo/image/${encodedPath}`;
        console.log('🔍 Image URL:', { originalPath: path, normalizedPath, encodedPath, url });
        return url;
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-white">
                <div className="container mx-auto px-4 py-12">
                    <div className="flex items-center justify-center min-h-[400px]">
                        <div className="text-center">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                            <p className="text-gray-600">결과를 불러오는 중...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!resultData || resultData.results.length === 0) {
        return (
            <div className="min-h-screen bg-white">
                <div className="container mx-auto px-4 py-12">
                    <div className="text-center">
                        <ImageIcon className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                        <h2 className="text-2xl font-bold mb-2">결과가 없습니다</h2>
                        <p className="text-gray-600 mb-6">아직 처리된 이미지가 없습니다.</p>
                        <Link href="/yolo/upload">
                            <Button>이미지 업로드하기</Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

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
                        <Link href="/yolo/upload" className="text-sm hover:text-blue-600 transition">
                            업로드
                        </Link>
                        <Link href="/history" className="text-sm hover:text-blue-600 transition">
                            히스토리
                        </Link>
                        <Link href="/profile/analysis" className="text-sm hover:text-blue-600 transition">
                            마이페이지
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <div className="pt-24 pb-12 px-4">
                <div className="container mx-auto max-w-6xl">
                    {/* 헤더 */}
                    <div className="mb-8">
                        <Link
                            href="/yolo/upload"
                            className="text-blue-600 hover:text-blue-700 mb-6 inline-flex items-center gap-2 transition"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            업로드 페이지로
                        </Link>
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                    {resultData.results[0]?.task_type === 'segment' ? 'Segment 결과' :
                                        resultData.results[0]?.task_type === 'classification' ? 'Classification 결과' :
                                            resultData.results[0]?.task_type === 'pose' ? 'Pose 결과' :
                                                'Detection 결과'}
                                </h1>
                                <p className="text-lg text-gray-600">
                                    처리된 파일: {resultData.processed_count}개
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    const taskType = resultData.results[0]?.task_type || 'detection';
                                    fetchLatestResults(taskType);
                                }}
                                className="flex items-center gap-2"
                            >
                                <RefreshCw className="h-4 w-4" />
                                새로고침
                            </Button>
                        </div>
                    </div>

                    {/* 결과 그리드 - 중앙 정렬, 1열로 변경하여 더 크게 */}
                    <div className="flex flex-col items-center gap-8">
                        {resultData.results.map((result, index) => (
                            <Card key={index} className="hover:shadow-lg transition-shadow w-full max-w-5xl">
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <CardTitle className="text-lg truncate mb-2">
                                                {result.filename}
                                            </CardTitle>
                                            <div className="flex flex-wrap gap-2">
                                                {result.success && (
                                                    <>
                                                        <Badge variant="default" className="bg-green-500">
                                                            사람 {result.person_count}명
                                                        </Badge>
                                                        <Badge variant="secondary">
                                                            {result.task_type === 'segment' ? `세그먼트 ${result.total_segments || 0}개` :
                                                                result.task_type === 'classification' ? `분류 ${result.total_classifications || 0}개` :
                                                                    result.task_type === 'pose' ? `포즈 ${result.total_poses || 0}개` :
                                                                        `객체 ${result.total_detections || 0}개`}
                                                        </Badge>
                                                        {result.task_type === 'classification' && result.top_class && (
                                                            <Badge variant="outline" className="bg-purple-100 text-purple-700">
                                                                최상위: {result.top_class} ({((result.top_confidence || 0) * 100).toFixed(1)}%)
                                                            </Badge>
                                                        )}
                                                    </>
                                                )}
                                                {!result.success && (
                                                    <Badge variant="destructive">실패</Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {result.success ? (
                                        <>
                                            {/* 이미지 표시 - 원본과 결과를 나란히, 크게 */}
                                            <div className="mb-4 grid grid-cols-2 gap-4">
                                                {/* 원본 이미지 */}
                                                {result.original_path && (
                                                    <div className="relative rounded-lg overflow-hidden bg-gray-100" style={{ height: '500px' }}>
                                                        <div className="absolute top-3 left-3 z-10 bg-blue-600 text-white text-sm font-semibold px-3 py-1.5 rounded shadow-lg">
                                                            원본
                                                        </div>
                                                        <img
                                                            src={getImageUrl(result.original_path)}
                                                            alt="원본"
                                                            className="w-full h-full object-contain"
                                                            onLoad={() => {
                                                                console.log('✅ Original image loaded:', result.original_path);
                                                            }}
                                                            onError={(e) => {
                                                                const img = e.target as HTMLImageElement;
                                                                console.error('❌ Failed to load original image:', {
                                                                    path: result.original_path,
                                                                    url: img.src,
                                                                    constructedUrl: getImageUrl(result.original_path)
                                                                });
                                                                img.style.display = 'none';
                                                            }}
                                                        />
                                                    </div>
                                                )}

                                                {/* 결과 이미지 */}
                                                <div className="relative rounded-lg overflow-hidden bg-gray-100" style={{ height: '500px' }}>
                                                    <div className={`absolute top-3 left-3 z-10 text-white text-sm font-semibold px-3 py-1.5 rounded shadow-lg ${result.task_type === 'segment' ? 'bg-green-600' :
                                                        result.task_type === 'classification' ? 'bg-purple-600' :
                                                            result.task_type === 'pose' ? 'bg-orange-600' :
                                                                'bg-green-600'
                                                        }`}>
                                                        {result.task_type === 'segment' ? 'Segment 결과' :
                                                            result.task_type === 'classification' ? 'Classification 결과' :
                                                                result.task_type === 'pose' ? 'Pose 결과' :
                                                                    'Detection 결과'}
                                                    </div>
                                                    <img
                                                        src={getImageUrl(result.result_path)}
                                                        alt={`${result.task_type === 'segment' ? 'Segment' :
                                                            result.task_type === 'classification' ? 'Classification' :
                                                                result.task_type === 'pose' ? 'Pose' :
                                                                    'Detection'} 결과`}
                                                        className="w-full h-full object-contain"
                                                        onLoad={() => {
                                                            console.log('✅ Result image loaded:', result.result_path);
                                                        }}
                                                        onError={async (e) => {
                                                            const img = e.target as HTMLImageElement;
                                                            console.error('❌ Failed to load result image:', {
                                                                path: result.result_path,
                                                                url: img.src,
                                                                constructedUrl: getImageUrl(result.result_path)
                                                            });

                                                            // 재시도 로직
                                                            if (result.result_path) {
                                                                const retryUrl = getImageUrl(result.result_path);
                                                                console.log('🔄 Retrying with:', retryUrl);
                                                                try {
                                                                    const res = await fetch(retryUrl);
                                                                    if (res.ok) {
                                                                        const blob = await res.blob();
                                                                        const objectUrl = URL.createObjectURL(blob);
                                                                        img.src = objectUrl;
                                                                        console.log('✅ Retry successful');
                                                                    } else {
                                                                        console.error('❌ Retry failed:', res.status);
                                                                        img.style.display = 'none';
                                                                    }
                                                                } catch (err) {
                                                                    console.error('❌ Retry error:', err);
                                                                    img.style.display = 'none';
                                                                }
                                                            } else {
                                                                img.style.display = 'none';
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            {/* 검출/세그먼트/포즈/분류 정보 */}
                                            {((result.detections && result.detections.length > 0) ||
                                                (result.segments && result.segments.length > 0) ||
                                                (result.poses && result.poses.length > 0) ||
                                                (result.classifications && result.classifications.length > 0)) && (
                                                    <div className="mb-4">
                                                        <p className="text-sm font-semibold mb-2">
                                                            {result.task_type === 'segment' ? '세그먼트된 객체:' :
                                                                result.task_type === 'classification' ? '분류 결과 (상위 5개):' :
                                                                    result.task_type === 'pose' ? '포즈 검출:' :
                                                                        '검출된 객체:'}
                                                        </p>
                                                        <div className="space-y-1 max-h-32 overflow-y-auto">
                                                            {(result.detections || result.segments || result.poses || result.classifications || []).slice(0, 5).map((item: any, idx: number) => (
                                                                <div key={idx} className="text-xs bg-gray-50 p-2 rounded">
                                                                    {result.task_type === 'classification' ? (
                                                                        <>
                                                                            <span className="font-medium">#{item.rank} {item.class_name}</span>
                                                                            <span className="text-gray-500 ml-2">
                                                                                {(item.confidence * 100).toFixed(1)}%
                                                                            </span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <span className="font-medium">{item.class_name}</span>
                                                                            <span className="text-gray-500 ml-2">
                                                                                {(item.confidence * 100).toFixed(1)}%
                                                                            </span>
                                                                            {result.task_type === 'pose' && item.keypoints && (
                                                                                <span className="text-gray-400 ml-2">
                                                                                    ({item.keypoints.length}개 키포인트)
                                                                                </span>
                                                                            )}
                                                                        </>
                                                                    )}
                                                                </div>
                                                            ))}
                                                            {((result.detections?.length || result.segments?.length || result.poses?.length || result.classifications?.length || 0) > 5) && (
                                                                <p className="text-xs text-gray-500">
                                                                    외 {((result.detections?.length || result.segments?.length || result.poses?.length || result.classifications?.length || 0) - 5)}개...
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                            {/* 다운로드 버튼 */}
                                            <Button
                                                variant="outline"
                                                className="w-full"
                                                onClick={() => handleDownload(result)}
                                            >
                                                <Download className="h-4 w-4 mr-2" />
                                                결과 다운로드
                                            </Button>
                                        </>
                                    ) : (
                                        <div className="text-center py-8">
                                            <p className="text-red-600 mb-2">처리 실패</p>
                                            <p className="text-sm text-gray-500">{result.error}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ResultPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-white flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        }>
            <ResultContent />
        </Suspense>
    );
}

