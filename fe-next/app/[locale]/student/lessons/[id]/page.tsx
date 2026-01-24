/**
 * Student Lesson Practice Page
 *
 * Practice vocabulary with multiple modes: flashcards, solo board, word list, warmup
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLesson } from '@/hooks/useVocabularyLesson';
import { usePracticeProgress, type PracticeType } from '@/hooks/usePracticeSession';
import Header from '@/components/Header';
import { NeoLoader } from '@/components/ui/NeoLoader';
import {
  PracticeModeSelector,
  FlashcardReview,
  SoloPracticeBoard,
  WordListPreview,
  WarmupRound,
} from '@/components/practice';
import { cn } from '@/lib/utils';

export default function LessonPracticePage() {
  const { user, isAuthenticated } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const params = useParams();
  const isRTL = language === 'he';
  const [isChecking, setIsChecking] = useState(true);
  const [selectedMode, setSelectedMode] = useState<PracticeType | null>(null);

  const lessonId = params?.id as string;
  const { lesson, isLoading: isLoadingLesson } = useLesson(lessonId);
  const { progress, mastery, startSession, isLoading: isLoadingProgress } = usePracticeProgress(lessonId, user?.id);

  useEffect(() => {
    // Check authentication
    if (!isAuthenticated) {
      router.push(`/${language}`);
      return;
    }

    if (!lessonId) {
      router.push(`/${language}/student`);
      return;
    }

    setIsChecking(false);
  }, [isAuthenticated, lessonId, router, language]);

  // Handle mode selection
  const handleSelectMode = useCallback(async (mode: PracticeType) => {
    setSelectedMode(mode);
    // Start a practice session
    await startSession(mode);
  }, [startSession]);

  // Handle back to mode selector
  const handleBack = useCallback(() => {
    setSelectedMode(null);
  }, []);

  // Handle practice completion
  const handleComplete = useCallback((results: { wordsFound?: string[]; vocabularyWordsFound?: string[]; score?: number; correct?: number; total?: number }) => {
    // Results are handled by each practice component internally
    // Session tracking can be enhanced later if needed
  }, []);

  // Handle word found during practice
  const handleWordFound = useCallback((word: string, isVocabularyWord: boolean) => {
    // Could track individual word progress here if needed
  }, []);

  if (isChecking || isLoadingLesson || isLoadingProgress) {
    return (
      <div className="flex-1 flex items-center justify-center bg-neo-navy">
        <NeoLoader variant="mascot-letters" size="lg" text={t('common.loading')} />
      </div>
    );
  }

  if (!user || !lessonId || !lesson) {
    return null;
  }

  // Render the selected practice mode
  const renderPracticeMode = () => {
    if (!selectedMode || !lesson.words) return null;

    const commonProps = {
      lessonName: lesson.name,
      words: lesson.words,
      language: lesson.language,
      onBack: handleBack,
    };

    switch (selectedMode) {
      case 'flashcard':
        return (
          <FlashcardReview
            words={lesson.words}
            onComplete={handleComplete}
            onBack={handleBack}
          />
        );
      case 'solo_board':
        return (
          <SoloPracticeBoard
            {...commonProps}
            onComplete={handleComplete}
            onWordFound={handleWordFound}
          />
        );
      case 'word_list':
        return (
          <WordListPreview
            {...commonProps}
            onBack={handleBack}
          />
        );
      case 'warmup':
        return (
          <WarmupRound
            {...commonProps}
            onComplete={handleComplete}
            onWordFound={handleWordFound}
          />
        );
      default:
        return null;
    }
  };

  // If a mode is selected, render it full-screen without header
  if (selectedMode) {
    return renderPracticeMode();
  }

  // Mode selector view
  return (
    <div className={cn('flex-1 flex flex-col bg-neo-navy w-full overflow-x-hidden min-h-screen', isRTL && 'rtl')}>
      <Header />

      <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex-1">
        <PracticeModeSelector
          lessonName={lesson.name}
          wordCount={lesson.words?.length || 0}
          progress={{ mastery, progress }}
          onSelectMode={handleSelectMode}
          onBack={() => router.push(`/${language}/student`)}
        />
      </div>
    </div>
  );
}
