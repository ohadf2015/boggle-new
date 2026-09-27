/**
 * Academy Map — per-lesson helpers (stars, mastery, where a lesson opens) and
 * the island geometry of the shipped art. The island LIST (what sits where,
 * what is recommended) lives in `academyIslands.ts`.
 */

import type { StudentLesson } from '@/hooks/useStudentProgress';
import type { VocabularyLevel } from '@/lib/supabase/education/types';
import { wordsForLevel } from '@/lib/education/differentiation';
import { readAssignmentMode, wordCraftPracticeHref } from '@/lib/education/wordcraftAssignment';
import { readAssignmentFocus, focusPracticeHref } from '@/lib/education/vocabFocus';

export type NodeType = 'lesson' | 'quiz' | 'wordcraft' | 'arena' | 'boss' | 'locked';
/** Island tops as % of the art (physical x from the left; never mirrored for RTL). */
export interface IslandPoint { x: number; y: number }

/**
 * Measured on the shipped art (academy-map-portrait 1080x1910, academy-map-
 * landscape 1920x1086). Ordered along the path toward the castle (the boss).
 */
export const ISLANDS: Record<'portrait' | 'landscape', IslandPoint[]> = {
  portrait: [
    { x: 41.5, y: 80.5 },
    { x: 63, y: 66.5 },
    { x: 36, y: 54.5 },
    { x: 64, y: 43.5 },
    { x: 38, y: 34 },
  ],
  // Ordered TOWARD the castle (which sits at the far left of this art).
  landscape: [
    { x: 91.2, y: 51 },
    { x: 72.3, y: 47 },
    { x: 52.4, y: 44 },
    { x: 32.5, y: 45 },
  ],
};

/** The castle — the boss node at the end of the path. */
export const CASTLE: Record<'portrait' | 'landscape', IslandPoint> = {
  portrait: { x: 50, y: 18 },
  landscape: { x: 14, y: 36 },
};

/** Native aspect ratio (w/h) of each art file. */
export const MAP_ASPECT = { portrait: 1080 / 1910, landscape: 1920 / 1086 } as const;

export function lessonStars(status: StudentLesson['status'], mastery: number): number {
  if (status !== 'completed') return 0;
  if (mastery >= 90) return 3;
  if (mastery >= 50) return 2;
  return 1;
}

export function lessonMastery(entry: StudentLesson, level?: VocabularyLevel | null): number {
  const atLevel = wordsForLevel(entry.lesson?.words ?? [], level ?? null).length;
  if (!entry.progress || atLevel === 0) return 0;
  const mastered = (entry.progress.words_mastered ?? []).length;
  return Math.min(100, Math.round((mastered / atLevel) * 100));
}

export function lessonHref(entry: StudentLesson, locale: string): { type: NodeType; href: string } {
  if (readAssignmentMode(entry.assignment) === 'wordcraft') {
    return { type: 'wordcraft', href: wordCraftPracticeHref(locale, entry.lessonId) };
  }
  const focus = readAssignmentFocus(entry.assignment);
  if (focus) return { type: 'quiz', href: focusPracticeHref(locale, entry.lessonId, focus) };
  return { type: 'lesson', href: `/${locale}/student/lessons/${entry.lessonId}` };
}

/** Stars across every lesson — the HUD's running total. */
export function totalStars(lessons: StudentLesson[], level?: VocabularyLevel | null): number {
  return lessons.reduce((sum, l) => sum + lessonStars(l.status, lessonMastery(l, level)), 0);
}
