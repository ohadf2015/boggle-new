'use client';

/**
 * Everything the Academy Map reads, from the SAME sources the old hub zones
 * used — rewired, not replaced:
 *  - lessons: `useStudentProgress` + `usePracticeLessons` merged by
 *    `mergeStudentLessons` (the Learn zone and the lessons list use it too)
 *  - review badge: `useSpacedRepetition` on the first lesson with words
 *  - streak: `useWinStreak` (the Progress zone's streak tile)
 */

import { useMemo } from 'react';
import { useStudentProgress } from '@/hooks/useStudentProgress';
import { usePracticeLessons } from '@/hooks/usePracticeLessons';
import { useSpacedRepetition } from '@/hooks/useSpacedRepetition';
import { useWinStreak } from '@/hooks/useWinStreak';
import { mergeStudentLessons } from '@/lib/education/mergeLessons';
import type { VocabularyLevel } from '@/lib/supabase/education/types';
import { totalStars } from './academyNodes';

export function useAcademyData(level: VocabularyLevel | null | undefined) {
  const { lessons, isLoading } = useStudentProgress();
  const { lessons: practisable, isLoading: practisableLoading } = usePracticeLessons();
  const merged = useMemo(() => mergeStudentLessons(lessons, practisable), [lessons, practisable]);

  const firstLesson = merged.find((l) => l.lesson?.words?.length);
  const reviewLessonId = firstLesson?.lessonId ?? '';
  const words = useMemo(
    () => (firstLesson?.lesson?.words ?? []).map((w: { word: string }) => w.word),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reviewLessonId],
  );
  const { wordsForToday } = useSpacedRepetition(words, reviewLessonId);

  const { currentStreak } = useWinStreak();
  const stars = useMemo(() => totalStars(merged, level), [merged, level]);

  return {
    lessons: merged,
    lessonsLoading: isLoading || practisableLoading,
    reviewLessonId,
    reviewCount: reviewLessonId ? wordsForToday.length : 0,
    streak: currentStreak,
    stars,
  };
}
