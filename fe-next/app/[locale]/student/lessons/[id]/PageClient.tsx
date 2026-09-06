/**
 * Student Lesson Practice Page
 *
 * Practice vocabulary with multiple modes: flashcards, solo board, word list, warmup
 * Integrates XP system for education mode.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLesson } from '@/hooks/useVocabularyLesson';
import { usePracticeProgress, usePracticeWords, type PracticeType } from '@/hooks/usePracticeSession';
import { EducationHeader } from '@/components/education/EducationHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import {
  FlashcardReview,
  SoloPracticeBoard,
  WordListPreview,
  WarmupRound,
  WordMatchingPractice,
  SpellingChallengePractice,
  TimedBlitzPractice,
  VocabFocusPractice,
} from '@/components/practice';
import { availableFocuses, parseFocusParam, type VocabFocus } from '@/lib/education/vocabFocus';
import PracticePicker from '@/components/education/practicePicker/PracticePicker';
// PERF: deep imports, not the '@/components/education' barrel. The barrel
// statically re-exports EducationHeader, ClassroomGameLobby, TeacherOnboarding,
// ClassroomLeaderboard, EducationBadgeGrid and AchievementProgressCard, all of
// which a student practising a lesson never renders.
import {
  PracticeSessionProvider,
  usePracticeSession,
} from '@/components/education/PracticeSessionProvider';
import XpProgressBar from '@/components/education/XpProgressBar';
import StreakBonusIndicator from '@/components/education/StreakBonusIndicator';
import { cn } from '@/lib/utils';

// Renders only after a level-up event, so it must not ship in the first load
// of the practice page. Celebratory UI never needs SSR.
const LevelUpCelebration = dynamic(
  () => import('@/components/education/LevelUpCelebration').then(m => m.LevelUpCelebration),
  { ssr: false }
);

/**
 * Inner practice content component that uses XP session context
 */
const VALID_PRACTICE_TYPES: PracticeType[] = ['flashcard', 'solo_board', 'word_list', 'warmup', 'matching', 'spelling', 'blitz', 'vocab_focus'];

function PracticeContent({
  lesson,
  user,
  language,
  isRTL,
  progress,
  mastery,
  startSession,
  router,
  initialMode,
  initialFocus,
}: {
  lesson: NonNullable<ReturnType<typeof useLesson>['lesson']>;
  user: NonNullable<ReturnType<typeof useAuth>['user']>;
  language: string;
  isRTL: boolean;
  progress: ReturnType<typeof usePracticeProgress>['progress'];
  mastery: ReturnType<typeof usePracticeProgress>['mastery'];
  startSession: ReturnType<typeof usePracticeProgress>['startSession'];
  router: ReturnType<typeof useRouter>;
  initialMode: PracticeType | null;
  /** vocab_focus only: skill pinned by the teacher's assignment / deep link. */
  initialFocus: VocabFocus | null;
}) {
  const { t } = useLanguage();
  const [selectedMode, setSelectedMode] = useState<PracticeType | null>(initialMode);
  const [selectedFocus, setSelectedFocus] = useState<VocabFocus | null>(initialFocus);
  const [hasInitialized, setHasInitialized] = useState(false);
  // Per-student differentiation: every practice mode below takes its words from here
  // (filtered by the student's classroom level), never from raw `lesson.words`.
  const { words: practiceWords } = usePracticeWords(lesson.words);

  // Auto-start session if we have an initial mode from URL
  useEffect(() => {
    if (initialMode && !hasInitialized) {
      setHasInitialized(true);
      startSession(initialMode, initialFocus ? { focus: initialFocus } : undefined);
    }
  }, [initialMode, initialFocus, hasInitialized, startSession]);

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
  const handleSelectMode = useCallback(async (mode: PracticeType, options?: { focus?: VocabFocus }) => {
    setSelectedMode(mode);
    setSelectedFocus(options?.focus ?? null);
    await startSession(mode, options);
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
    if (!selectedMode || practiceWords.length === 0) return null;

    const commonProps = {
      lessonName: lesson.name,
      words: practiceWords,
      language: lesson.language,
      onBack: handleBack,
    };

    switch (selectedMode) {
      case 'flashcard':
        return (
          <FlashcardReview
            words={practiceWords}
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
            xpSessionData={xpSessionData}
          />
        );
      case 'matching':
        return (
          <WordMatchingPractice
            words={practiceWords}
            onComplete={async (results) => {
              await completePracticeSession({
                type: 'matching',
                cardsReviewed: results.total,
                cardsCorrect: results.correct,
              });
            }}
            onBack={handleBack}
            xpSessionData={xpSessionData}
          />
        );
      case 'spelling':
        return (
          <SpellingChallengePractice
            words={practiceWords}
            onComplete={async (results) => {
              await completePracticeSession({
                type: 'spelling',
                cardsReviewed: results.total,
                cardsCorrect: results.correct,
              });
            }}
            onBack={handleBack}
            xpSessionData={xpSessionData}
          />
        );
      case 'blitz':
        return (
          <TimedBlitzPractice
            words={practiceWords}
            onComplete={async (results) => {
              await completePracticeSession({
                type: 'blitz',
                cardsReviewed: results.wordsAttempted,
                cardsCorrect: results.wordsFound,
              });
            }}
            onBack={handleBack}
            xpSessionData={xpSessionData}
          />
        );
      case 'vocab_focus': {
        const focus =
          selectedFocus ??
          availableFocuses(practiceWords, { language: lesson.language })[0] ??
          'definition';
        return (
          <VocabFocusPractice
            words={practiceWords}
            focus={focus}
            language={lesson.language}
            onComplete={async (results) => {
              await completePracticeSession({
                type: 'vocab_focus',
                focus: results.focus,
                cardsReviewed: results.total,
                cardsCorrect: results.correct,
              });
            }}
            onBack={handleBack}
            xpSessionData={xpSessionData}
          />
        );
      }
      default:
        return null;
    }
  };

  // If a mode is selected, render it full-screen with XP header
  if (selectedMode) {
    return (
      <>
        {/* XP Header for practice modes */}
        <div
          className="fixed top-0 left-0 right-0 z-50 bg-neo-navy/95 backdrop-blur-xs border-b border-neo-black/30 px-4 py-2"
          style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0.5rem))' }}
        >
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
    <div className={cn('flex-1 flex flex-col bg-neo-navy w-full overflow-x-hidden min-h-dvh', isRTL && 'rtl')}>
      <EducationHeader showBackButton />

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

        {/*
          One word list, many games. The picker lists every practice type this
          lesson can drive, with a readiness badge per tile, so a student never
          taps into a drill the lesson has no material for.
        */}
        <PracticePicker
          lessonName={lesson.name}
          words={practiceWords}
          language={lesson.language}
          mastery={mastery}
          sessions={progress}
          onSelectMode={handleSelectMode}
          onBack={() => router.push(`/${language}/student`)}
        />
      </div>

      {/* Level up celebration modal */}
      <LevelUpCelebration levelUpData={levelUpData} onClose={dismissLevelUp} />
    </div>
  );
}

export default function LessonPracticePageClient() {
  const { user, isAuthenticated, loading } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const isRTL = language === 'he';
  const [isChecking, setIsChecking] = useState(true);

  const lessonId = params?.id as string;

  // Read mode from URL query parameter and validate it
  const modeParam = searchParams?.get('mode');
  const initialMode: PracticeType | null =
    modeParam && VALID_PRACTICE_TYPES.includes(modeParam as PracticeType)
      ? (modeParam as PracticeType)
      : null;
  const initialFocus = parseFocusParam(searchParams?.get('focus'));
  const { lesson, isLoading: isLoadingLesson } = useLesson(lessonId);
  const { progress, mastery, startSession, isLoading: isLoadingProgress } = usePracticeProgress(lessonId, user?.id);

  useEffect(() => {
    // Wait for auth to finish loading before checking authentication
    if (loading) {
      return; // Still loading, don't make any decisions yet
    }

    // Check authentication (only after loading completes)
    if (!isAuthenticated) {
      router.push(`/${language}`);
      return;
    }

    if (!lessonId) {
      router.push(`/${language}/student`);
      return;
    }

    setIsChecking(false);
  }, [isAuthenticated, loading, lessonId, router, language]);

  // Show loader during auth check or while auth is loading
  if (isChecking || loading || isLoadingLesson || isLoadingProgress) {
    return (
      <div className="flex-1 flex items-center justify-center bg-neo-navy">
        <PageLoader size="lg" text={t('common.loading')} />
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
        initialMode={initialMode}
        initialFocus={initialFocus}
      />
    </PracticeSessionProvider>
  );
}
