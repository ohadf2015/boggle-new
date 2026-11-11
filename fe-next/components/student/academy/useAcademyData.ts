'use client';

/**
 * Everything the student home reads, from the same sources the old hub zones used:
 *  - lessons: `useStudentProgress` + `usePracticeLessons` merged by `mergeStudentLessons`
 *  - review lesson: the first lesson with words (its due count comes from `ReviewCountBridge`)
 *  - streak: `useWinStreak`
 */

import { useMemo } from 'react';
import { useStudentProgress } from '@/hooks/useStudentProgress';
import { usePracticeLessons } from '@/hooks/usePracticeLessons';
import { useWinStreak } from '@/hooks/useWinStreak';
import { mergeStudentLessons } from '@/lib/education/mergeLessons';
import type { VocabularyLevel } from '@/lib/supabase/education/types';
import { totalStars } from './academyNodes';

/** `reviewPending`: the due count is not read yet, so nothing it decides may render. */
export type AcademyData = ReturnType<typeof useAcademyData> & { reviewCount: number; reviewPending?: boolean };

export function useAcademyData(level: VocabularyLevel | null | undefined) {
  const { lessons, isLoading } = useStudentProgress();
  const { lessons: practisable, isLoading: practisableLoading } = usePracticeLessons();
  const merged = useMemo(() => mergeStudentLessons(lessons, practisable), [lessons, practisable]);

  const firstLesson = merged.find((l) => l.lesson?.words?.length);
  const reviewLessonId = firstLesson?.lessonId ?? '';
  const reviewWords = useMemo(
    () => (firstLesson?.lesson?.words ?? []).map((w: { word: string }) => w.word),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reviewLessonId],
  );

  const { currentStreak, isStreakAtRisk, lastWinDate } = useWinStreak();
  const stars = useMemo(() => totalStars(merged, level), [merged, level]);

  return {
    lessons: merged,
    lessonsLoading: isLoading || practisableLoading,
    reviewLessonId,
    reviewWords,
    streak: currentStreak,
    streakAtRisk: isStreakAtRisk,
    streakDoneToday: !!lastWinDate && new Date(lastWinDate).toDateString() === new Date().toDateString(),
    stars,
  };
}
