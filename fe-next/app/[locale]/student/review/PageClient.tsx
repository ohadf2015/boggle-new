'use client';

/**
 * /[locale]/student/review[?lesson=<id>] — Missed Words Review.
 *
 * Data: lessons from /api/education/practice/lessons + the student's own
 * `student_lesson_progress` rows (words_attempted / words_mastered, written by
 * live classroom games). No rows → every unmastered lesson word is a
 * candidate. Leitner boxes live on the device, per student
 * (lib/education/missedWordsLeitnerStore — ponytail upgrade path in there).
 *
 * XP: one run = one `flashcard` practice session on the run's lesson —
 * startSession('flashcard') + completePracticeSession({ cardsReviewed,
 * cardsCorrect }) → PATCH /api/education/practice (server-scored).
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { PracticeLesson } from '@/hooks/usePracticeLessons';
import { useAuthedLessons } from '@/components/education/academyModes/useAuthedLessons';
import { usePracticeProgress } from '@/hooks/usePracticeSession';
import { PracticeSessionProvider } from '@/components/education/PracticeSessionProvider';
import MissedWordsReview from '@/components/education/academyModes/MissedWordsReview';
import { AcademyLoading, AcademyNotice } from '@/components/education/academyModes/AcademyStates';
import { ACADEMY_ART } from '@/components/education/academyModes/AcademyChrome';
import { useRecordedXp } from '@/components/education/academyModes/useRecordedXp';
import { useAcademyPlayer } from '@/components/education/academyModes/useAcademyPlayer';
import { getStudentProgress } from '@/lib/supabase/education/progress';
import { toVocabularyWords } from '@/lib/education/practiceWordShape';
import {
  applyRunToLeitner,
  buildReviewRun,
  collectReviewCandidates,
  pickRunLesson,
  type ReviewCard,
  type ReviewLessonInput,
  type ReviewProgressRow,
} from '@/lib/education/missedWordsReview';
import { loadLeitnerState, saveLeitnerState } from '@/lib/education/missedWordsLeitnerStore';

interface Deck {
  lessonId: string | null;
  lessonName: string;
  cards: ReviewCard[];
}

function toReviewLesson(l: PracticeLesson): ReviewLessonInput {
  return {
    id: l.id,
    name: l.name,
    language: l.language as ReviewLessonInput['language'],
    words: toVocabularyWords(l.words).map((w) => ({ word: w.word, definition: w.definition })),
  };
}

function ReviewSession({ deck, studentId, onBack, onPlayAgain }: { deck: Deck & { lessonId: string }; studentId: string; onBack: () => void; onPlayAgain: () => void }) {
  const { startSession } = usePracticeProgress(deck.lessonId);
  const record = useRecordedXp();
  const player = useAcademyPlayer();

  const onFinish = async (answers: boolean[]): Promise<number | null> => {
    // Boxes move first: the retrieval happened whether or not XP saves.
    saveLeitnerState(studentId, applyRunToLeitner(loadLeitnerState(studentId), deck.cards, answers, Date.now()));
    const started = await startSession('flashcard');
    if (!started.success) return null;
    return record({
      type: 'flashcard',
      sessionId: started.sessionId,
      cardsReviewed: answers.length,
      cardsCorrect: answers.filter(Boolean).length,
    });
  };

  return <MissedWordsReview cards={deck.cards} lessonName={deck.lessonName} onBack={onBack} onFinish={onFinish} onPlayAgain={onPlayAgain} player={player} />;
}

export default function MissedWordsReviewPageClient() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const lessonParam = searchParams?.get('lesson') || null;
  const { lessons, error: lessonsError, signedOut, retry } = useAuthedLessons();

  const [progress, setProgress] = useState<ReviewProgressRow[] | null>(null);
  const userId = user?.id;
  const lessonsReady = lessons !== null;
  useEffect(() => {
    // Only after the authed lessons land: a browser-client read fired while
    // the auth session is still initialising can stall auth itself.
    if (!userId || !lessonsReady) return;
    let cancelled = false;
    // A failed read is treated as "no misses recorded": the run still works off unmastered words.
    void getStudentProgress(userId).then((r) => {
      if (!cancelled) setProgress((r.data ?? []) as ReviewProgressRow[]);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, lessonsReady]);

  const [deck, setDeck] = useState<Deck | null>(null);
  const [runKey, setRunKey] = useState(0);
  const buildDeck = useCallback(() => {
    if (!userId || progress === null || lessons === null) return;
    const reviewLessons = lessons.map(toReviewLesson);
    const candidates = collectReviewCandidates(reviewLessons, progress);
    const state = loadLeitnerState(userId);
    const now = Date.now();
    const lessonId = pickRunLesson(candidates, state, now, lessonParam);
    const cards = buildReviewRun(candidates, state, now, lessonId, Math.floor(Math.random() * 1_000_000));
    setDeck({ lessonId, lessonName: reviewLessons.find((l) => l.id === lessonId)?.name ?? '', cards });
  }, [userId, progress, lessons, lessonParam]);
  useEffect(() => {
    buildDeck();
  }, [buildDeck]);

  const onBack = () => router.push(`/${language}/student`);
  const title = t('academy.modes.review.title', 'Missed Words Review');

  if (signedOut) {
    return (
      <AcademyNotice
        testId="review-signed-out"
        theme="vault"
        title={title}
        art={ACADEMY_ART.lesson}
        heading={t('academy.modes.review.signedOutTitle', 'Join your class to unlock reviews')}
        body={t('academy.modes.review.signedOutBody', 'Your missed words are saved to your student account. Sign in or join a class first.')}
        onBack={onBack}
      />
    );
  }
  if (lessonsError) {
    return (
      <AcademyNotice
        testId="review-load-error"
        theme="vault"
        title={title}
        art={ACADEMY_ART.lesson}
        heading={t('academy.modes.review.loadErrorTitle', "Couldn't load your words")}
        body={t('academy.modes.review.loadErrorBody', 'Check your connection and try again.')}
        onBack={onBack}
        onRetry={retry}
      />
    );
  }
  if (!user || !deck) return <AcademyLoading title={title} onBack={onBack} theme="vault" />;
  if (!deck.lessonId || deck.cards.length === 0) {
    return <MissedWordsReview cards={[]} lessonName="" onBack={onBack} onFinish={async () => null} />;
  }

  return (
    <PracticeSessionProvider studentId={user.id} lessonId={deck.lessonId}>
      <ReviewSession
        key={`${deck.lessonId}-${runKey}`}
        deck={deck as Deck & { lessonId: string }}
        studentId={user.id}
        onBack={onBack}
        onPlayAgain={() => {
          setRunKey((k) => k + 1);
          buildDeck();
        }}
      />
    </PracticeSessionProvider>
  );
}
