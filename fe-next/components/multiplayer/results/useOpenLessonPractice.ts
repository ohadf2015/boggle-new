'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * The ONE non-MP navigation left on the results screens: a classroom
 * student's "practice these words" deep link into their lesson. `mpExit` has
 * no reason for it yet (FOUNDATION owns that list), so it is isolated here and
 * allowlisted by file in lib/multiplayer/__tests__/mpNoRawExits.test.ts —
 * nothing else in results/ may navigate.
 */
export function useOpenLessonPractice() {
  const router = useRouter();
  const { language } = useLanguage();
  return useCallback(
    (lessonId: string) => router.push(`/${language}/student/lessons/${lessonId}?mode=flashcard`),
    [router, language],
  );
}
