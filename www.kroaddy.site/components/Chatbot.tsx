// @ts-nocheck
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Send, Languages, Music, TreePine, Activity, BookOpen, Building2 } from 'lucide-react';
import { Message, LanguageCode } from '../lib/types';
import { translateText, getLanguageCode, detectLanguage } from '../service/translateService';
import { t, getCurrentLanguage } from '../lib/i18n';

interface ChatbotProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
}

export function Chatbot({ messages, onSendMessage }: ChatbotProps) {
  const [input, setInput] = useState('');
  const [isTranslateEnabled, setIsTranslateEnabled] = useState(false);
  const [translatedMessages, setTranslatedMessages] = useState<Message[]>([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [selectedTargetLanguage, setSelectedTargetLanguage] = useState<LanguageCode>('ko');
  const [uiLanguage, setUiLanguage] = useState<LanguageCode>(getCurrentLanguage());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [typingMessages, setTypingMessages] = useState<Record<number, string>>({});
  const typingTimeoutsRef = useRef<Record<number, NodeJS.Timeout>>({});

  // 선택된 언어 가져오기 및 변경 감지
  useEffect(() => {
    const updateTargetLanguage = () => {
      const currentLang = typeof window !== 'undefined'
        ? localStorage.getItem('selectedLanguage') || '한국어'
        : '한국어';
      const targetLang = getLanguageCode(currentLang);
      setSelectedTargetLanguage(targetLang);
    };

    // 초기 언어 설정
    updateTargetLanguage();

    const handleLanguageChange = (event: CustomEvent) => {
      updateTargetLanguage();
      // UI 언어도 업데이트
      setUiLanguage(getCurrentLanguage());
      // 언어 변경 시 번역 재실행
      if (isTranslateEnabled) {
        translateAllMessages();
      }
    };

    window.addEventListener('languageChanged', handleLanguageChange as EventListener);
    return () => {
      window.removeEventListener('languageChanged', handleLanguageChange as EventListener);
    };
  }, [isTranslateEnabled]);

  // 번역 활성화 시 메시지 번역
  useEffect(() => {
    if (isTranslateEnabled && messages.length > 0) {
      translateAllMessages();
    } else {
      setTranslatedMessages(messages);
    }
  }, [isTranslateEnabled, messages, selectedTargetLanguage]);

  // 타이핑 효과 구현
  useEffect(() => {
    const displayMessages = isTranslateEnabled ? translatedMessages : messages;

    displayMessages.forEach((message, index) => {
      // Assistant 메시지만 타이핑 효과 적용
      if (message.role === 'assistant') {
        const fullContent = message.content;
        const currentTyping = typingMessages[index];

        // 이미 타이핑이 완료된 경우 스킵
        if (currentTyping === fullContent) {
          return;
        }

        // 기존 타이핑 타이머 정리
        if (typingTimeoutsRef.current[index]) {
          clearTimeout(typingTimeoutsRef.current[index]);
        }

        // 타이핑 시작 (새 메시지이거나 이전 타이핑이 중단된 경우)
        let currentIndex = currentTyping ? currentTyping.length : 0;

        const typeNextChar = () => {
          if (currentIndex < fullContent.length) {
            const nextChar = fullContent[currentIndex];
            setTypingMessages(prev => ({
              ...prev,
              [index]: (prev[index] || '') + nextChar
            }));
            currentIndex++;

            // 타이핑 중 스크롤 자동 이동
            setTimeout(() => {
              if (messagesContainerRef.current) {
                messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
              }
            }, 0);

            // 다음 글자 타이핑 (일반 텍스트는 빠르게, 줄바꿈이나 특수문자는 조금 느리게)
            const delay = nextChar === '\n' ? 50 : nextChar === ' ' ? 15 : 10;
            typingTimeoutsRef.current[index] = setTimeout(typeNextChar, delay);
          } else {
            // 타이핑 완료
            setTypingMessages(prev => ({
              ...prev,
              [index]: fullContent
            }));
            // 타이핑 완료 후 최종 스크롤
            setTimeout(() => {
              if (messagesContainerRef.current) {
                messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
              }
            }, 0);
          }
        };

        // 타이핑 시작
        if (currentIndex < fullContent.length) {
          typeNextChar();
        }
      }
    });

    // cleanup 함수
    return () => {
      Object.values(typingTimeoutsRef.current).forEach(timeout => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, [messages, translatedMessages, isTranslateEnabled]);

  // 메시지가 변경될 때마다 스크롤을 맨 아래로 이동
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    };

    // 메시지가 추가된 후 약간의 지연을 두고 스크롤 (렌더링 완료 대기)
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [messages, translatedMessages, isTranslateEnabled]);

  // 타이핑 중에도 스크롤이 따라 내려가도록
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    };

    // typingMessages가 변경될 때마다 스크롤 업데이트
    const timeoutId = setTimeout(scrollToBottom, 10);
    return () => clearTimeout(timeoutId);
  }, [typingMessages]);

  const translateAllMessages = async () => {
    setIsTranslating(true);
    try {
      const translated = await Promise.all(
        messages.map(async (msg) => {
          // 사용자 메시지는 원본 그대로 유지
          if (msg.role === 'user') {
            return { ...msg, content: msg.content };
          }

          // Assistant 메시지만 번역
          // 각 메시지의 언어를 감지
          const detectedLang = await detectLanguage(msg.content);

          // 감지된 언어가 선택한 언어와 같으면 번역 불필요
          if (detectedLang === selectedTargetLanguage) {
            return { ...msg, content: msg.content };
          }

          // 감지된 언어 → 선택한 언어로 번역
          const translatedText = await translateText(msg.content, detectedLang, selectedTargetLanguage);
          return { ...msg, translatedContent: translatedText, content: translatedText };
        })
      );
      setTranslatedMessages(translated);
    } catch (error) {
      console.error('Translation error:', error);
      setTranslatedMessages(messages);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      // 입력한 메시지는 번역하지 않고 원본 그대로 전송
      onSendMessage(input);
      setInput('');
    }
  };

  // 마크다운 렌더링 함수 (ChatGPT 스타일)
  const renderMarkdown = (text: string) => {
    if (!text) return null;

    // 줄바꿈 처리
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let currentParagraph: string[] = [];

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        const paragraphText = currentParagraph.join(' ').trim();
        if (paragraphText) {
          elements.push(
            <p key={elements.length} className="text-sm mb-2 leading-relaxed">
              {renderInlineMarkdown(paragraphText)}
            </p>
          );
        }
        currentParagraph = [];
      }
    };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      // 구분선 처리 (---)
      if (trimmedLine === '---' || trimmedLine.match(/^-{3,}$/)) {
        flushParagraph();
        elements.push(
          <hr key={elements.length} className="my-4 border-gray-300" />
        );
        return;
      }

      // 제목 처리 (##)
      if (trimmedLine.startsWith('## ')) {
        flushParagraph();
        const titleText = trimmedLine.substring(3).trim();
        elements.push(
          <h2 key={elements.length} className="text-base font-bold mt-4 mb-2 text-gray-900">
            {renderInlineMarkdown(titleText)}
          </h2>
        );
        return;
      }

      // 빈 줄 처리
      if (trimmedLine === '') {
        flushParagraph();
        return;
      }

      // 일반 텍스트
      currentParagraph.push(trimmedLine);
    });

    flushParagraph();

    return <div className="markdown-content">{elements}</div>;
  };

  // 인라인 마크다운 처리 (볼드 등)
  const renderInlineMarkdown = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const boldRegex = /\*\*(.+?)\*\*/g;
    let match;

    while ((match = boldRegex.exec(text)) !== null) {
      // 볼드 앞의 텍스트
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      // 볼드 텍스트
      parts.push(
        <strong key={match.index} className="font-bold">
          {match[1]}
        </strong>
      );
      lastIndex = match.index + match[0].length;
    }

    // 남은 텍스트
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 헤더 */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center relative overflow-hidden"
              style={{
                backgroundColor: 'rgba(34, 83, 133, 0.8)',
              }}
            >
              <span className="text-white relative z-10">R</span>
            </div>
            <div>
              <h2 className="text-gray-900">{t('chatbot.title', uiLanguage)}</h2>
              <p className="text-xs text-gray-500">{t('chatbot.subtitle', uiLanguage)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">{t('chatbot.translate', uiLanguage)}</span>
            <button
              onClick={() => setIsTranslateEnabled(!isTranslateEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${isTranslateEnabled
                ? 'bg-green-500 focus:ring-green-500'
                : 'bg-gray-300 focus:ring-gray-400'
                }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-200 ease-in-out ${isTranslateEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 메시지 영역 */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-6 pb-6 space-y-4 relative">
        {isTranslating && (
          <div className="absolute top-4 right-4 bg-blue-500 text-white px-3 py-1 rounded-full text-xs flex items-center gap-2 z-10">
            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            {t('chatbot.translating', uiLanguage)}
          </div>
        )}

        {/* 카테고리 버튼 영역 - sticky로 고정 */}
        <div className="sticky top-0 z-20 bg-white py-2 -mx-6 px-6 border-b border-gray-100">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {[
              { labelKey: 'chatbot.category.kpop', keyword: 'K-POP' },
              { labelKey: 'chatbot.category.nature', keyword: '자연' },
              { labelKey: 'chatbot.category.activity', keyword: '액티비티' },
              { labelKey: 'chatbot.category.history', keyword: '역사' },
              { labelKey: 'chatbot.category.museum', keyword: '박물관' },
            ].map((category, index) => (
              <button
                key={index}
                onClick={() => onSendMessage(category.keyword)}
                className="px-3 py-1.5 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all whitespace-nowrap flex-shrink-0 text-xs font-medium text-gray-900"
              >
                {t(category.labelKey, uiLanguage)}
              </button>
            ))}
          </div>
        </div>

        {(isTranslateEnabled ? translatedMessages : messages).length === 0 ? (
          <div className="text-center text-gray-400 mt-20">
            <p>{t('chatbot.welcome.title', uiLanguage)}</p>
            <p className="text-xs mt-2">{t('chatbot.welcome.subtitle', uiLanguage)}</p>
          </div>
        ) : (
          (isTranslateEnabled ? translatedMessages : messages).map((message, index) => {
            // Assistant 메시지는 타이핑 효과 적용
            const displayContent = message.role === 'assistant'
              ? (typingMessages[index] || '')
              : message.content;
            const isTyping = message.role === 'assistant' && typingMessages[index] !== message.content;

            return (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${message.role === 'user'
                    ? 'bg-gradient-to-r from-[#0088FF] to-[#0088FF]/90 text-white'
                    : 'bg-gray-100 text-gray-900'
                    }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{displayContent}{isTyping && <span className="inline-block w-2 h-4 bg-gray-600 ml-1 animate-pulse">|</span>}</p>
                  {isTranslateEnabled && message.role === 'assistant' && message.translatedContent && message.translatedContent !== message.content && (
                    <p className="text-xs mt-1 opacity-70 italic">(Translated)</p>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <form onSubmit={handleSubmit} className="p-6 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('chatbot.placeholder', uiLanguage)}
            className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0088FF] focus:border-transparent"
          />
          <button
            type="submit"
            className="px-6 py-3 text-white rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center relative overflow-hidden"
            style={{
              backgroundColor: 'rgba(34, 83, 133, 0.8)',
            }}
          >
            <Send className="w-5 h-5 relative z-10" />
          </button>
        </div>
      </form>
    </div>
  );
}
