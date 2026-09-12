/**
 * Student Lesson Practice Page — the shell around the practice loop.
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
 *
 * This file decides WHETHER a student may practise (auth, lesson fetch, the
 * dead-link card) and hands the loop itself to `PracticeContent`.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePracticeLesson } from '@/hooks/usePracticeLessons';
import { usePracticeProgress, type PracticeType } from '@/hooks/usePracticeSession';
import { EducationHeader } from '@/components/education/EducationHeader';
import { EducationShell } from '@/components/education/shell/EducationShell';
import { PageLoader } from '@/components/ui/PageLoader';
import { parseFocusParam } from '@/lib/education/vocabFocus';
import { recordGuestPracticeResult } from '@/lib/education/practiceGuestProgress';
import { getGuestSessionId } from '@/utils/guestManager';
// PERF: deep import, not the '@/components/education' barrel — the barrel
// statically re-exports the whole teacher surface, none of which a student
// practising a lesson renders.
import { PracticeSessionProvider } from '@/components/education/PracticeSessionProvider';
import PracticeContent, { type PracticeLessonShape } from './PracticeContent';

const VALID_PRACTICE_TYPES: PracticeType[] = ['flashcard', 'solo_board', 'word_list', 'warmup', 'matching', 'spelling', 'blitz', 'vocab_focus'];

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
      <EducationShell header={<EducationHeader showBackButton title={t('education.practicePicker.title')} />} contentClassName="flex items-center justify-center">
        <PageLoader size="lg" text={t('common.loading')} />
      </EducationShell>
    );
  }

  /*
    A dead link is a sentence, not a spinner — and a retry, not only an exit.
    The r2 capture watched this flow dead-end twice on a lesson that was fine
    two minutes later, with nothing on screen to try again with. `border-3` is
    also not a Tailwind width (preflight zeroes it), so the card and its button
    were drawing no border at all.
  */
  if (!lesson) {
    return (
      <EducationShell header={<EducationHeader showBackButton title={t('education.practicePicker.title')} />} contentClassName="flex items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-neo border-[3px] border-black bg-neo-lime p-6 text-neo-black shadow-hard">
          <h1 className="mb-2 font-neo-display text-xl font-black">
            {t('education.practice.lessonUnavailable')}
          </h1>
          <p className="mb-5 font-neo-body text-neo-black/80">
            {lessonError ?? t('education.practice.lessonUnavailableBody')}
          </p>
          <button
            type="button"
            data-primary="true"
            data-testid="practice-lesson-retry"
            onClick={() => window.location.reload()}
            className="min-h-[52px] w-full rounded-neo border-[3px] border-black bg-neo-black px-6 py-3 font-neo-display text-lg font-black uppercase text-neo-lime shadow-hard-sm"
          >
            {t('student.practiceFun.tryAgain')}
          </button>
          <button
            type="button"
            data-testid="practice-lesson-exit"
            onClick={() => router.push(`/${language}/student`)}
            className="mx-auto mt-2 block min-h-[40px] w-3/5 rounded-neo border-[2px] border-black bg-neo-cream px-4 font-neo-body text-xs font-bold uppercase text-neo-black"
          >
            {t('student.practiceFun.myLessons')}
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
