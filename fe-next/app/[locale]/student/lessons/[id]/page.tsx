/**
 * Student Lesson Practice Page
 *
 * Practice vocabulary with multiple modes: flashcards, solo board, word list, warmup
 * Integrates XP system for education mode.
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
import {
  PracticeSessionProvider,
  usePracticeSession,
  XpProgressBar,
  StreakBonusIndicator,
  LevelUpCelebration,
} from '@/components/education';
import { cn } from '@/lib/utils';

/**
 * Inner practice content component that uses XP session context
 */
function PracticeContent({
  lesson,
  user,
  language,
  isRTL,
  progress,
  mastery,
  startSession,
  router,
}: {
  lesson: NonNullable<ReturnType<typeof useLesson>['lesson']>;
  user: NonNullable<ReturnType<typeof useAuth>['user']>;
  language: string;
  isRTL: boolean;
  progress: ReturnType<typeof usePracticeProgress>['progress'];
  mastery: ReturnType<typeof usePracticeProgress>['mastery'];
  startSession: ReturnType<typeof usePracticeProgress>['startSession'];
  router: ReturnType<typeof useRouter>;
}) {
  const { t } = useLanguage();
  const [selectedMode, setSelectedMode] = useState<PracticeType | null>(null);

  // Access XP context
  const {
    totalXp,
    streak,
    sessionXpEarned,
    sessionMasteryMessage,
    completePracticeSession,
    levelUpData,
    dismissLevelUp,
  } = usePracticeSession();

  // Handle mode selection
  const handleSelectMode = useCallback(async (mode: PracticeType) => {
    setSelectedMode(mode);
    await startSession(mode);
  }, [startSession]);

  // Handle back to mode selector
  const handleBack = useCallback(() => {
    setSelectedMode(null);
  }, []);

  // Handle flashcard practice completion
  const handleFlashcardComplete = useCallback(async (results: { correct: number; total: number }) => {
    await completePracticeSession({
      type: 'flashcard',
      cardsReviewed: results.total,
      cardsCorrect: results.correct,
    });
  }, [completePracticeSession]);

  // Handle solo board practice completion
  const handleBoardComplete = useCallback(async (results: { wordsFound: string[]; vocabularyWordsFound: string[]; score: number }) => {
    await completePracticeSession({
      type: 'solo_board',
      vocabularyWordsFound: results.vocabularyWordsFound,
      // Detect new words - words found for first time would be tracked elsewhere
      newWordsFound: [],
    });
  }, [completePracticeSession]);

  // Handle word found during practice
  const handleWordFound = useCallback((word: string, isVocabularyWord: boolean) => {
    // Could track individual word progress here if needed
  }, []);

  // XP session data for practice components
  const xpSessionData = {
    sessionXpEarned,
    sessionMasteryMessage,
  };

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
            onComplete={handleFlashcardComplete}
            onBack={handleBack}
            xpSessionData={xpSessionData}
          />
        );
      case 'solo_board':
        return (
          <SoloPracticeBoard
            {...commonProps}
            onComplete={handleBoardComplete}
            onWordFound={handleWordFound}
            xpSessionData={xpSessionData}
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
            onComplete={handleBoardComplete}
            onWordFound={handleWordFound}
          />
        );
      default:
        return null;
    }
  };

  // If a mode is selected, render it full-screen with XP header
  if (selectedMode) {
    return (
      <>
        {/* XP Header for practice modes */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-neo-navy/95 backdrop-blur-sm border-b border-neo-black/30 px-4 py-2">
          <div className="max-w-2xl mx-auto flex items-center gap-4">
            <div className="flex-1">
              <XpProgressBar totalXp={totalXp} recentXpGain={sessionXpEarned} size="sm" />
            </div>
            {streak.currentStreak > 0 && (
              <StreakBonusIndicator currentStreak={streak.currentStreak} size="sm" />
            )}
          </div>
        </div>

        {/* Practice content with top padding for XP header */}
        <div className="pt-16">
          {renderPracticeMode()}
        </div>

        {/* Level up celebration modal */}
        <LevelUpCelebration levelUpData={levelUpData} onClose={dismissLevelUp} />
      </>
    );
  }

  // Mode selector view
  return (
    <div className={cn('flex-1 flex flex-col bg-neo-navy w-full overflow-x-hidden min-h-screen', isRTL && 'rtl')}>
      <Header />

      <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex-1">
        {/* XP Progress above mode selector */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex-1">
            <XpProgressBar totalXp={totalXp} size="md" />
          </div>
          {streak.currentStreak > 0 && (
            <StreakBonusIndicator currentStreak={streak.currentStreak} />
          )}
        </div>

        <PracticeModeSelector
          lessonName={lesson.name}
          wordCount={lesson.words?.length || 0}
          progress={{ mastery, progress }}
          onSelectMode={handleSelectMode}
          onBack={() => router.push(`/${language}/student`)}
        />
      </div>

      {/* Level up celebration modal */}
      <LevelUpCelebration levelUpData={levelUpData} onClose={dismissLevelUp} />
    </div>
  );
}

export default function LessonPracticePage() {
  const { user, isAuthenticated } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const params = useParams();
  const isRTL = language === 'he';
  const [isChecking, setIsChecking] = useState(true);

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

  // Wrap practice content in PracticeSessionProvider for XP integration
  return (
    <PracticeSessionProvider
      studentId={user.id}
      lessonId={lessonId}
    >
      <PracticeContent
        lesson={lesson}
        user={user}
        language={language}
        isRTL={isRTL}
        progress={progress}
        mastery={mastery}
        startSession={startSession}
        router={router}
      />
    </PracticeSessionProvider>
  );
}
