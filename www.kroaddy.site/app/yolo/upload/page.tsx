'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Image as ImageIcon, Video, X, Loader2, Sparkles, ArrowLeft, Download, Folder } from 'lucide-react';
import Link from 'next/link';

interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  uploadDate: Date;
  type: 'image' | 'video';
}

export default function UploadPage() {
  const router = useRouter();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [isImageDragging, setIsImageDragging] = useState(false);
  const [isVideoDragging, setIsVideoDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // 파일 정보를 alert로 표시
  const showFileInfo = useCallback((file: File) => {
    const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
    const fileSizeKB = (file.size / 1024).toFixed(2);
    const fileSize = file.size < 1024 * 1024 ? `${fileSizeKB} KB` : `${fileSizeMB} MB`;
    const lastModified = new Date(file.lastModified).toLocaleString('ko-KR');

    const fileInfo = `
파일명: ${file.name}
파일 크기: ${fileSize}
파일 타입: ${file.type}
마지막 수정일: ${lastModified}
    `.trim();

    alert(fileInfo);
  }, []);

  // 이미지 파일 처리
  const handleImageFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }

    // 파일 정보 alert 표시
    showFileInfo(file);

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      const preview = reader.result as string;
      setImagePreview(preview);

      // 업로드된 파일 배열에 추가
      const newFile: UploadedFile = {
        id: `${Date.now()}-${Math.random()}`,
        file,
        preview,
        uploadDate: new Date(),
        type: 'image',
      };
      setUploadedFiles(prev => [...prev, newFile]);
    };
    reader.readAsDataURL(file);
  }, [showFileInfo]);

  // 영상 파일 처리
  const handleVideoFile = useCallback((file: File) => {
    if (!file.type.startsWith('video/')) {
      alert('영상 파일만 업로드 가능합니다.');
      return;
    }

    // 파일 정보 alert 표시
    showFileInfo(file);

    setVideoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      const preview = reader.result as string;
      setVideoPreview(preview);

      // 업로드된 파일 배열에 추가
      const newFile: UploadedFile = {
        id: `${Date.now()}-${Math.random()}`,
        file,
        preview,
        uploadDate: new Date(),
        type: 'video',
      };
      setUploadedFiles(prev => [...prev, newFile]);
    };
    reader.readAsDataURL(file);
  }, [showFileInfo]);

  // 이미지 드래그 앤 드롭
  const handleImageDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsImageDragging(true);
  }, []);

  const handleImageDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsImageDragging(false);
  }, []);

  const handleImageDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsImageDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleImageFile(file);
    }
  }, [handleImageFile]);

  // 영상 드래그 앤 드롭
  const handleVideoDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsVideoDragging(true);
  }, []);

  const handleVideoDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsVideoDragging(false);
  }, []);

  const handleVideoDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsVideoDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleVideoFile(file);
    }
  }, [handleVideoFile]);

  // 이미지 파일 선택
  const handleImageInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageFile(file);
    }
  }, [handleImageFile]);

  // 영상 파일 선택
  const handleVideoInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleVideoFile(file);
    }
  }, [handleVideoFile]);

  // 이미지 제거
  const handleRemoveImage = useCallback(() => {
    setImageFile(null);
    setImagePreview(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  }, []);

  // 영상 제거
  const handleRemoveVideo = useCallback(() => {
    setVideoFile(null);
    setVideoPreview(null);
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  }, []);

  // 파일 삭제
  const handleRemoveFile = useCallback((id: string) => {
    setUploadedFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove) {
        // 이미지나 비디오 상태도 초기화
        if (fileToRemove.type === 'image' && imageFile === fileToRemove.file) {
          handleRemoveImage();
        } else if (fileToRemove.type === 'video' && videoFile === fileToRemove.file) {
          handleRemoveVideo();
        }
      }
      return prev.filter(f => f.id !== id);
    });
  }, [imageFile, videoFile, handleRemoveImage, handleRemoveVideo]);

  // 모든 파일 삭제
  const handleRemoveAllFiles = useCallback(() => {
    if (uploadedFiles.length === 0) return;
    if (confirm('모든 파일을 삭제하시겠습니까?')) {
      setUploadedFiles([]);
      handleRemoveImage();
      handleRemoveVideo();
    }
  }, [uploadedFiles.length, handleRemoveImage, handleRemoveVideo]);

  // 파일 다운로드
  const handleDownloadFile = useCallback((uploadedFile: UploadedFile) => {
    const url = uploadedFile.preview;
    const link = document.createElement('a');
    link.href = url;
    link.download = uploadedFile.file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  // 파일 크기 포맷팅
  const formatFileSize = useCallback((bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }, []);

  // 업로드 처리 (작업 타입별)
  const handleUpload = useCallback(async (taskType: 'detection' | 'segment' | 'classification' | 'pose') => {
    if (uploadedFiles.length === 0) {
      alert('사진 또는 영상을 업로드해주세요.');
      return;
    }

    // 이미지 파일만 필터링 (현재는 이미지만 지원)
    const imageFiles = uploadedFiles.filter(f => f.type === 'image');
    if (imageFiles.length === 0) {
      alert('현재는 이미지 파일만 지원합니다.');
      return;
    }

    setIsUploading(true);

    try {
      // 멀티파트 폼 데이터 생성
      // FormData를 사용하면 브라우저가 자동으로 Content-Type: multipart/form-data로 설정
      const formData = new FormData();
      imageFiles.forEach((uploadedFile) => {
        formData.append('files', uploadedFile.file);
      });

      // Next.js API Route를 통해 업로드 (포트 3000)
      // FastAPI 서버는 백엔드에서만 사용하고, 프론트엔드는 Next.js API Routes를 통해 접근

      // 멀티파트 업로드: Content-Type 헤더를 명시하지 않음 (브라우저가 자동 설정)
      const response = await fetch(`/api/yolo/upload?task_type=${taskType}`, {
        method: 'POST',
        body: formData,
        // Content-Type 헤더를 명시하지 않음 - FormData 사용 시 브라우저가 자동으로
        // multipart/form-data; boundary=... 형식으로 설정함
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: '서버 오류가 발생했습니다.' }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        const successCount = result.processed_count || 0;
        const totalCount = result.total_count || 0;

        // 성공한 결과만 필터링
        const successfulResults = result.results?.filter((r: any) => r.success) || [];

        if (successfulResults.length > 0) {
          // 결과 페이지로 리다이렉트 (결과 데이터를 sessionStorage로 전달하여 431 에러 방지)
          const resultData = {
            processed_count: successCount,
            total_count: totalCount,
            results: successfulResults
          };
          console.log('📤 Saving to sessionStorage:', {
            processed_count: successCount,
            total_count: totalCount,
            results_count: successfulResults.length,
            first_result: successfulResults[0] ? {
              filename: successfulResults[0].filename,
              original_path: successfulResults[0].original_path,
              result_path: successfulResults[0].result_path,
              task_type: successfulResults[0].task_type
            } : null
          });
          // 이전 데이터 삭제 (혼동 방지)
          sessionStorage.removeItem('yolo_result_data');
          // sessionStorage에 저장 (페이지 새로고침 시까지 유지)
          sessionStorage.setItem('yolo_result_data', JSON.stringify(resultData));

          // sessionStorage 저장 확인
          const verifyData = sessionStorage.getItem('yolo_result_data');
          console.log('✅ SessionStorage 저장 확인:', verifyData ? '성공' : '실패');

          // 약간의 지연 후 리다이렉트 (sessionStorage 저장 보장)
          setTimeout(() => {
            router.push('/yolo/result');
          }, 100);
        } else {
          alert('처리된 파일이 없습니다.');
          // 업로드 후 초기화
          setUploadedFiles([]);
          handleRemoveImage();
          handleRemoveVideo();
        }
      } else {
        throw new Error('업로드 처리에 실패했습니다.');
      }
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : '업로드 중 오류가 발생했습니다.';
      alert(`업로드 실패: ${errorMessage}`);
    } finally {
      setIsUploading(false);
    }
  }, [uploadedFiles, handleRemoveImage, handleRemoveVideo, router]);

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
            <Link href="/login">
              <Button variant="outline" size="sm">로그인</Button>
            </Link>
            <Link href="/submit">
              <Button size="sm">시작하기</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-5xl">
          {/* 헤더 */}
          <div className="mb-8 text-center">
            <Link
              href="/yolo/result"
              className="text-blue-600 hover:text-blue-700 mb-6 inline-flex items-center gap-2 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              결과 보기
            </Link>
            <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              포트폴리오 업로드
            </h1>
            <p className="text-lg text-gray-600">
              드래그 앤 드롭으로 파일을 업로드하거나 클릭하여 파일을 선택하세요
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* 이미지 업로드 */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <ImageIcon className="h-6 w-6 text-blue-600" />
                  사진 업로드
                </CardTitle>
                <CardDescription>
                  이미지 파일을 드래그하거나 클릭하여 업로드하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className={`
                    border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all
                    ${isImageDragging ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}
                    ${imagePreview ? 'border-blue-500 bg-blue-50/50' : ''}
                  `}
                  onDragOver={handleImageDragOver}
                  onDragLeave={handleImageDragLeave}
                  onDrop={handleImageDrop}
                  onClick={() => imageInputRef.current?.click()}
                >
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageInputChange}
                    className="hidden"
                  />

                  <div className="py-4">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 mb-4">
                      <Folder className="h-10 w-10 text-blue-600" />
                    </div>
                    <p className="text-gray-700 font-medium mb-2">
                      파일을 여기에 드래그하세요
                    </p>
                    <p className="text-sm text-gray-500 mb-4">
                      또는 클릭하여 파일을 선택하세요
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        imageInputRef.current?.click();
                      }}
                      className="mb-2"
                    >
                      파일 선택
                    </Button>
                    <p className="text-xs text-gray-400 mt-4">
                      지원 형식: JPG, PNG, GIF, WebP (최대 10MB)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 영상 업로드 */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Video className="h-6 w-6 text-purple-600" />
                  영상 업로드
                </CardTitle>
                <CardDescription>
                  영상 파일을 드래그하거나 클릭하여 업로드하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className={`
                    border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all
                    ${isVideoDragging ? 'border-purple-500 bg-purple-50 scale-[1.02]' : 'border-gray-300 hover:border-purple-400 hover:bg-gray-50'}
                    ${videoPreview ? 'border-purple-500 bg-purple-50/50' : ''}
                  `}
                  onDragOver={handleVideoDragOver}
                  onDragLeave={handleVideoDragLeave}
                  onDrop={handleVideoDrop}
                  onClick={() => videoInputRef.current?.click()}
                >
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleVideoInputChange}
                    className="hidden"
                  />

                  <div className="py-4">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-purple-100 mb-4">
                      <Folder className="h-10 w-10 text-purple-600" />
                    </div>
                    <p className="text-gray-700 font-medium mb-2">
                      파일을 여기에 드래그하세요
                    </p>
                    <p className="text-sm text-gray-500 mb-4">
                      또는 클릭하여 파일을 선택하세요
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        videoInputRef.current?.click();
                      }}
                      className="mb-2"
                    >
                      파일 선택
                    </Button>
                    <p className="text-xs text-gray-400 mt-4">
                      지원 형식: MP4, AVI, MOV, WEBM (최대 10MB)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 업로드된 파일 목록 */}
          {uploadedFiles.length > 0 && (
            <div className="mb-6 bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                업로드된 파일 ({uploadedFiles.length}개)
              </h3>
              <div className="flex flex-wrap gap-3">
                {uploadedFiles.map((uploadedFile) => (
                  <div
                    key={uploadedFile.id}
                    className="relative bg-white border rounded-lg p-2 hover:shadow-sm transition-shadow flex-shrink-0"
                    style={{ width: '200px' }}
                  >
                    {/* 삭제 버튼 */}
                    <button
                      onClick={() => handleRemoveFile(uploadedFile.id)}
                      className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors z-10 shadow-sm"
                    >
                      <X className="h-3 w-3" />
                    </button>

                    {/* 썸네일 */}
                    <div className="mb-2 rounded overflow-hidden bg-gray-100" style={{ height: '120px' }}>
                      {uploadedFile.type === 'image' ? (
                        <img
                          src={uploadedFile.preview}
                          alt={uploadedFile.file.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <video
                          src={uploadedFile.preview}
                          className="w-full h-full object-cover"
                          muted
                        />
                      )}
                    </div>

                    {/* 파일 정보 */}
                    <div className="px-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        {uploadedFile.type === 'image' ? (
                          <ImageIcon className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                        ) : (
                          <Video className="h-3.5 w-3.5 text-purple-600 flex-shrink-0" />
                        )}
                        <p className="text-xs font-medium text-gray-900 truncate flex-1">
                          {uploadedFile.file.name}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 mb-1">
                        {formatFileSize(uploadedFile.file.size)}
                      </p>
                      <p className="text-xs text-gray-400 mb-2">
                        {uploadedFile.uploadDate.toLocaleString('ko-KR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: true,
                        })}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadFile(uploadedFile)}
                        className="w-full h-7 text-xs"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        다운로드
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 액션 버튼들 */}
          <div className="flex flex-col gap-4 mb-6">
            {/* 모든 파일 삭제 버튼 */}
            <Button
              variant="outline"
              onClick={handleRemoveAllFiles}
              disabled={uploadedFiles.length === 0}
              className="w-full"
            >
              모든 파일 삭제
            </Button>

            {/* 작업 버튼들 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button
                onClick={() => handleUpload('detection')}
                disabled={uploadedFiles.length === 0 || isUploading}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    처리 중...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Detection
                  </>
                )}
              </Button>

              <Button
                onClick={() => handleUpload('segment')}
                disabled={uploadedFiles.length === 0 || isUploading}
                size="lg"
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    처리 중...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Segment
                  </>
                )}
              </Button>

              <Button
                onClick={() => handleUpload('classification')}
                disabled={uploadedFiles.length === 0 || isUploading}
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    처리 중...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Classification
                  </>
                )}
              </Button>

              <Button
                onClick={() => handleUpload('pose')}
                disabled={uploadedFiles.length === 0 || isUploading}
                size="lg"
                className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    처리 중...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Pose
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* 이전 페이지로 링크 */}
          <div className="text-center">
            <Link
              href="/"
              className="text-gray-600 hover:text-gray-800 inline-flex items-center gap-2 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              이전 페이지로
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

