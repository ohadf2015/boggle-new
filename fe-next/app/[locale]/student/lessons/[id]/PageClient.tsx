/**
 * Student Lesson Practice Page
 *
 * Lesson → mode → playing, in three taps, with or without an account.
 *
 * Two things used to stand between a student and their teacher's words:
 *   - This page redirected anyone not yet authenticated to the marketing home
 *     page, so a lesson link handed out in class dead-ended for every student
 *     without an account.
 *   - The lesson was fetched with the browser Supabase client, whose SELECT
 *     policy on `vocabulary_lessons` resolves through `lesson_assignments`. An
 *     anonymous visitor got nothing; a signed-in student got nothing for any
 *     lesson their teacher had not separately "assigned".
 *
 * Both are now one call to `/api/education/practice/lessons`, which treats a
 * lesson link as the share link it looks like.
 */

'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePracticeLesson } from '@/hooks/usePracticeLessons';
import { usePracticeProgress, usePracticeWords, type PracticeType } from '@/hooks/usePracticeSession';
import { EducationHeader } from '@/components/education/EducationHeader';
import { EducationShell } from '@/components/education/shell/EducationShell';
import { PageLoader } from '@/components/ui/PageLoader';
import { parseFocusParam, type VocabFocus } from '@/lib/education/vocabFocus';
import PracticePicker from '@/components/education/practicePicker/PracticePicker';
import PracticeModeStage from '@/components/education/practice/PracticeModeStage';
import {
  buildPracticeTiles,
  nextReadyTile,
  WORD_TOWER_TILE_ID,
  type PracticeTile,
  type PracticeVariant,
} from '@/lib/education/practicePicker';
import { recordGuestPracticeResult } from '@/lib/education/practiceGuestProgress';
import { getGuestSessionId } from '@/utils/guestManager';
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
import type { Language, VocabularyWord } from '@/lib/supabase/education/types';

// Renders only after a level-up event, so it must not ship in the first load
// of the practice page. Celebratory UI never needs SSR.
const LevelUpCelebration = dynamic(
  () => import('@/components/education/LevelUpCelebration').then(m => m.LevelUpCelebration),
  { ssr: false }
);

const VALID_PRACTICE_TYPES: PracticeType[] = ['flashcard', 'solo_board', 'word_list', 'warmup', 'matching', 'spelling', 'blitz', 'vocab_focus'];

interface PracticeLessonShape {
  id: string;
  name: string;
  /** Narrow, not `string`: the practice screens key their letter bags and
   *  distractor banks off this and only accept the supported set. */
  language: Language;
  words: VocabularyWord[];
}

/**
 * Inner practice content component that uses XP session context
 */
function PracticeContent({
  lesson,
  language,
  isRTL,
  progress,
  mastery,
  startSession,
  router,
  initialMode,
  initialFocus,
  onGuestResult,
}: {
  lesson: PracticeLessonShape;
  language: string;
  isRTL: boolean;
  progress: ReturnType<typeof usePracticeProgress>['progress'];
  mastery: ReturnType<typeof usePracticeProgress>['mastery'];
  startSession: ReturnType<typeof usePracticeProgress>['startSession'];
  router: ReturnType<typeof useRouter>;
  initialMode: PracticeType | null;
  /** vocab_focus only: skill pinned by the teacher's assignment / deep link. */
  initialFocus: VocabFocus | null;
  /** Records a finished round on the device when there is no account. */
  onGuestResult: (result: { cardsReviewed?: number; cardsCorrect?: number; vocabularyWordsFound?: string[] }) => void;
}) {
  const { t } = useLanguage();
  const [selectedMode, setSelectedMode] = useState<PracticeType | null>(initialMode);
  const [selectedFocus, setSelectedFocus] = useState<VocabFocus | null>(initialFocus);
  // Word Tower records as `solo_board` (no 'word_tower' value exists in the
  // practice_type CHECK), so the variant is what decides which screen opens.
  // Client-side only: there is no `?mode=` deep link for it yet.
  const [selectedVariant, setSelectedVariant] = useState<PracticeVariant | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  // Set the moment a round finishes, cleared on every mode change. It is what
  // turns the round-end into a fork rather than a dead end.
  const [roundFinished, setRoundFinished] = useState(false);
  // Per-student differentiation: every practice mode below takes its words from here
  // (filtered by the student's classroom level), never from raw `lesson.words`.
  const { words: practiceWords } = usePracticeWords(lesson.words);

  const tiles = useMemo(
    () => buildPracticeTiles(practiceWords, { language: lesson.language, sessions: progress }),
    [practiceWords, lesson.language, progress]
  );

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

  const openMode = useCallback(async (
    mode: PracticeType,
    options?: { focus?: VocabFocus; variant?: PracticeVariant }
  ) => {
    setSelectedMode(mode);
    setSelectedFocus(options?.focus ?? null);
    setSelectedVariant(options?.variant ?? null);
    // A fresh round is not a finished one. Without this the next-mode bar from
    // the previous round survives into the new one (Class 2: stale state
    // carried across a reset path).
    setRoundFinished(false);
    // The variant is a client-side routing detail; the session still starts as
    // the practice type the database accepts.
    await startSession(mode, options?.focus ? { focus: options.focus } : undefined);
  }, [startSession]);

  // Handle back to mode selector
  const handleBack = useCallback(() => {
    setSelectedMode(null);
    // Clear the variant with the mode, or the next plain solo_board tap would
    // re-open Word Tower instead of the board (Class 2: stale state across a
    // reset path).
    setSelectedVariant(null);
    setRoundFinished(false);
  }, []);

  /**
   * One completion path for every mode. Each drill reports a different shape,
   * so the shape is normalised here and then fanned out to the three things a
   * finished round must touch: XP, the on-device guest record, and the
   * round-end fork.
   */
  const finishRound = useCallback(async (
    type: Parameters<typeof completePracticeSession>[0]['type'],
    payload: {
      focus?: VocabFocus;
      cardsReviewed?: number;
      cardsCorrect?: number;
      vocabularyWordsFound?: string[];
      newWordsFound?: string[];
    }
  ) => {
    setRoundFinished(true);
    onGuestResult({
      cardsReviewed: payload.cardsReviewed,
      cardsCorrect: payload.cardsCorrect,
      vocabularyWordsFound: payload.vocabularyWordsFound,
    });
    await completePracticeSession({ type, ...payload });
  }, [completePracticeSession, onGuestResult]);

  // XP session data for practice components
  const xpSessionData = {
    sessionXpEarned,
    sessionMasteryMessage,
  };

  /** The tile currently on screen, so the round-end knows what "next" means. */
  const currentTileId = selectedVariant === 'word_tower'
    ? WORD_TOWER_TILE_ID
    : selectedMode === 'vocab_focus' && selectedFocus
      ? `vocab_focus:${selectedFocus}`
      : selectedMode ?? '';
  const nextTile: PracticeTile | null = roundFinished ? nextReadyTile(tiles, currentTileId) : null;

  const handleNextTile = useCallback(() => {
    if (!nextTile) return;
    void openMode(nextTile.mode, {
      ...(nextTile.focus ? { focus: nextTile.focus } : {}),
      ...(nextTile.variant ? { variant: nextTile.variant } : {}),
    });
  }, [nextTile, openMode]);

  // Playing: the XP bar is the shell's header, the round is the one scroller.
  if (selectedMode) {
    return (
      <>
        <EducationShell
          className={cn(isRTL && 'rtl')}
          scrollRegionLabel={lesson.name}
          header={
            /*
              The XP bar used to be `position: fixed` with a `pt-16` spacer
              under it, which left the document scrolling behind a floating
              bar on every phone. As the shell's header slot it is the same
              always-visible strip, but now the shell owns the height and the
              round below it is the only thing that scrolls.

              It must stay mounted here: it carries `data-xp-flight-target`,
              and the coins a finished round throws aim at that node.
            */
            <div
              className="flex shrink-0 items-center gap-3 border-b-2 border-neo-white/15 bg-neo-navy px-3 py-2"
              style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0.5rem))' }}
            >
              <div className="min-w-0 flex-1">
                <XpProgressBar
                  totalXp={totalXp}
                  recentXpGain={sessionXpEarned}
                  size="sm"
                  showNextLevel={false}
                />
              </div>
              {streak.currentStreak > 0 && (
                <StreakBonusIndicator currentStreak={streak.currentStreak} size="sm" />
              )}
            </div>
          }
        >
          {/*
            The round itself. The old layout added a fixed bottom strip carrying
            "next game" while the score card carried "play again" — two halves of
            one decision, 400px apart, with the strip regularly off-screen on a
            phone. Both now live on the completion card, so `onNext` goes down
            into the mode rather than a bar being stacked on top of it.
          */}
          <PracticeModeStage
            mode={selectedMode}
            variant={selectedVariant}
            focus={selectedFocus}
            lessonName={lesson.name}
            language={lesson.language}
            words={practiceWords}
            onFinish={finishRound}
            onBack={handleBack}
            xpSessionData={xpSessionData}
            onNext={nextTile ? handleNextTile : undefined}
            nextLabel={nextTile ? t(nextTile.titleKey) : undefined}
          />
        </EducationShell>

        {/* Level up celebration modal */}
        <LevelUpCelebration levelUpData={levelUpData} onClose={dismissLevelUp} />
      </>
    );
  }

  // Mode selector view
  return (
    <EducationShell className={cn(isRTL && 'rtl')} header={<EducationHeader showBackButton />}
      scrollRegionLabel={lesson.name}
      contentClassName="flex flex-col overflow-hidden px-3 py-3 sm:px-6">
      {/*
        `h-full min-h-0 flex-col` is what hands the scroll to the tile grid.
        Without it the picker's own `h-full` resolved against an auto-height
        scroll context, the grid grew to its full 1700px, and the shell scrolled
        instead — taking the title, the XP bar and the readiness line off the
        top of the phone on the first flick.
      */}
      <div className="flex h-full min-h-0 w-full max-w-4xl flex-col mx-auto">
        {/* XP progress: one slim line. The "next level" preview is a second
            row of chrome on a screen whose job is showing games. */}
        <div className="mb-2 flex shrink-0 items-center gap-3">
          <div className="min-w-0 flex-1">
            <XpProgressBar totalXp={totalXp} size="sm" showNextLevel={false} />
          </div>
          {streak.currentStreak > 0 && (
            <StreakBonusIndicator currentStreak={streak.currentStreak} size="sm" />
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
          onSelectMode={openMode}
          onBack={() => router.push(`/${language}/student`)}
        />
      </div>

      {/* Level up celebration modal */}
      <LevelUpCelebration levelUpData={levelUpData} onClose={dismissLevelUp} />
    </EducationShell>
  );
}

export default function LessonPracticePageClient() {
  const { user, loading } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const isRTL = language === 'he';

  const lessonId = params?.id as string;

  // Read mode from URL query parameter and validate it
  const modeParam = searchParams?.get('mode');
  const initialMode: PracticeType | null =
    modeParam && VALID_PRACTICE_TYPES.includes(modeParam as PracticeType)
      ? (modeParam as PracticeType)
      : null;
  const initialFocus = parseFocusParam(searchParams?.get('focus'));

  const { lesson, isLoading: isLoadingLesson, error: lessonError } = usePracticeLesson(lessonId);
  const totalWords = lesson?.words?.length ?? 0;
  const { progress, mastery, startSession, isLoading: isLoadingProgress } =
    usePracticeProgress(lessonId, undefined, { totalWords });

  // The XP provider, the streak and every achievement counter are keyed by this
  // id. A student with no account still needs ONE stable value, or each page
  // load reads as a different person and the streak never grows. `getGuestSessionId`
  // is the app's existing on-device guest identity, shared with the daily games.
  const [guestId, setGuestId] = useState<string | null>(null);
  useEffect(() => {
    if (!user) setGuestId(getGuestSessionId());
  }, [user]);
  const studentId = user?.id ?? guestId;

  const handleGuestResult = useCallback(
    (result: { cardsReviewed?: number; cardsCorrect?: number; vocabularyWordsFound?: string[] }) => {
      if (user || !lessonId) return;
      recordGuestPracticeResult(lessonId, result);
    },
    [user, lessonId]
  );

  useEffect(() => {
    if (!loading && !lessonId) router.push(`/${language}/student`);
  }, [loading, lessonId, router, language]);

  if (loading || isLoadingLesson || isLoadingProgress || !studentId) {
    return (
      <EducationShell header={<EducationHeader showBackButton />} contentClassName="flex items-center justify-center">
        <PageLoader size="lg" text={t('common.loading')} />
      </EducationShell>
    );
  }

  // A dead link is a sentence, not a spinner. Practice used to `return null`
  // here, leaving a student staring at an empty navy page with no way back.
  if (!lesson) {
    return (
      <EducationShell header={<EducationHeader showBackButton />} contentClassName="flex items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-neo border-3 border-black bg-neo-lime p-6 text-neo-black shadow-hard">
          <h1 className="mb-2 font-neo-display text-xl font-black">
            {t('education.practice.lessonUnavailable')}
          </h1>
          <p className="mb-5 font-neo-body text-neo-black/80">
            {lessonError ?? t('education.practice.lessonUnavailableBody')}
          </p>
          <button
            type="button"
            onClick={() => router.push(`/${language}/student`)}
            className="min-h-[44px] w-full rounded-neo border-3 border-black bg-neo-black px-6 py-3 font-neo-display font-black text-neo-lime shadow-hard-sm"
          >
            {t('common.back')}
          </button>
        </div>
      </EducationShell>
    );
  }

  // Wrap practice content in PracticeSessionProvider for XP integration
  return (
    <PracticeSessionProvider studentId={studentId} lessonId={lessonId}>
      <PracticeContent
        lesson={lesson as PracticeLessonShape}
        language={language}
        isRTL={isRTL}
        progress={progress}
        mastery={mastery}
        startSession={startSession}
        router={router}
        initialMode={initialMode}
        initialFocus={initialFocus}
        onGuestResult={handleGuestResult}
      />
    </PracticeSessionProvider>
  );
}
