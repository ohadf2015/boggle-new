'use client';

/**
 * /[locale]/student/craft?lesson=<id> — Word Workshop.
 * Without `?lesson` it opens the student's first lesson that has words.
 * XP: the same practice-session path as Word Craft homework —
 * startSession('solo_board', { variant: 'wordcraft' }) then
 * completePracticeSession → PATCH /api/education/practice (server-scored,
 * lesson words verified by gateWordCraftCompletion).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePracticeLesson, type PracticeLesson } from '@/hooks/usePracticeLessons';
import { useAuthedLessons } from '@/components/education/academyModes/useAuthedLessons';
import { usePracticeProgress } from '@/hooks/usePracticeSession';
import { PracticeSessionProvider } from '@/components/education/PracticeSessionProvider';
import WordWorkshop from '@/components/education/academyModes/WordWorkshop';
import { AcademyLoading, AcademyNotice } from '@/components/education/academyModes/AcademyStates';
import { ACADEMY_ART } from '@/components/education/academyModes/AcademyChrome';
import { useRecordedXp } from '@/components/education/academyModes/useRecordedXp';
import { useAcademyPlayer } from '@/components/education/academyModes/useAcademyPlayer';
import { toVocabularyWords } from '@/lib/education/practiceWordShape';
import { getGuestSessionId } from '@/utils/guestManager';

function WorkshopSession({ lesson, onBack }: { lesson: PracticeLesson; onBack: () => void }) {
  const words = useMemo(() => toVocabularyWords(lesson.words).map((w) => w.word), [lesson.words]);
  const { startSession } = usePracticeProgress(lesson.id, undefined, { totalWords: words.length });
  const record = useRecordedXp();
  const sessionIdRef = useRef<string | undefined>(undefined);
  const player = useAcademyPlayer();

  return (
    <WordWorkshop
      lessonName={lesson.name}
      lessonWords={words}
      lessonLanguage={lesson.language}
      onBack={onBack}
      player={player}
      startSession={async () => {
        const result = await startSession('solo_board', { variant: 'wordcraft' });
        sessionIdRef.current = result.sessionId;
        return result.success;
      }}
      recordResult={({ vocabularyWordsFound, wordsFound }) =>
        record({ type: 'solo_board', sessionId: sessionIdRef.current, vocabularyWordsFound, wordsFound, newWordsFound: [] })
      }
    />
  );
}

export default function WordWorkshopPageClient() {
  const { user, loading } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const lessonParam = searchParams?.get('lesson') || undefined;

  const { lesson: oneLesson, isLoading: oneLoading } = usePracticeLesson(lessonParam);
  // No `?lesson`: the student's first lesson with words (signed-in only).
  const { lessons, signedOut, error: listError } = useAuthedLessons();
  const listLoading = !signedOut && !listError && lessons === null;
  const lesson = lessonParam
    ? oneLesson
    : ((lessons ?? []).find((l) => toVocabularyWords(l.words).length > 0) ?? null);

  // Same on-device guest identity the lesson practice page uses.
  const [guestId, setGuestId] = useState<string | null>(null);
  useEffect(() => {
    if (!user) setGuestId(getGuestSessionId());
  }, [user]);
  const studentId = user?.id ?? guestId;

  const onBack = () => router.push(`/${language}/student`);
  const title = t('academy.modes.workshop.title', 'Word Workshop');

  if (loading || (lessonParam ? oneLoading : listLoading) || !studentId) {
    return <AcademyLoading title={title} onBack={onBack} />;
  }
  if (!lesson) {
    return (
      <AcademyNotice
        testId="workshop-no-lesson"
        title={title}
        art={ACADEMY_ART.wordcraft}
        heading={t('academy.modes.workshop.noLessonTitle', 'No lesson words yet')}
        body={t('academy.modes.workshop.noLessonBody', 'When your teacher adds a lesson, its words become your workshop stars.')}
        onBack={onBack}
      />
    );
  }

  return (
    <PracticeSessionProvider studentId={studentId} lessonId={lesson.id}>
      <WorkshopSession lesson={lesson} onBack={onBack} />
    </PracticeSessionProvider>
  );
}
