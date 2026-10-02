'use client';

/**
 * The teacher dashboard's URL contract, in one place.
 *
 * `?tab=` and `?reviewWords=` were both written and neither was ever read. The
 * "Practice these words" button on the after-game insights card pushed
 * `?tab=lessons&reviewWords=…`; `lessons` is not a tab id, `activeTab` was local
 * state seeded to `'play'`, and no file in the repo consumed `reviewWords`. The
 * teacher tapped it at the bell and the words were dropped on the floor.
 *
 * Anything added here must have a reader on the other side. A query param with
 * no consumer is indistinguishable from a working feature until someone taps it.
 */
import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

export type TeacherTab = 'play' | 'prepare' | 'review';

const TEACHER_TABS: readonly TeacherTab[] = ['play', 'prepare', 'review'] as const;

/** Highest number of words worth pre-filling a lesson draft with. */
const MAX_REVIEW_WORDS = 60;

export function isTeacherTab(value: string | null | undefined): value is TeacherTab {
  return !!value && (TEACHER_TABS as readonly string[]).includes(value);
}

/** Parse the comma-separated `reviewWords` param: trimmed, de-duplicated, capped. */
export function parseReviewWords(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  for (const part of raw.split(',')) {
    const word = part.trim();
    if (word) seen.add(word);
    if (seen.size >= MAX_REVIEW_WORDS) break;
  }
  return [...seen];
}

/** `?assign=1` — open the assignment creator (written by `teacherAssignHref`). */
export function parseOpenAssignment(raw: string | null | undefined): boolean {
  return raw === '1';
}

/** The dashboard with `classroomId` preselected and its assignment creator open. */
export function teacherAssignHref(locale: string, classroomId: string): string {
  const params = new URLSearchParams({ classroomId, assign: '1' });
  return `/${locale}/teacher?${params.toString()}`;
}

export interface TeacherDashboardDeepLink {
  /** The tab named in `?tab=`, or null when absent or not a real tab id. */
  tab: TeacherTab | null;
  /** Words from `?reviewWords=`, ready to seed a lesson draft. */
  reviewWords: string[];
  /** `?assign=1`: open the assignment creator on arrival. */
  openAssignment: boolean;
}

export function useTeacherDashboardDeepLink(): TeacherDashboardDeepLink {
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get('tab') ?? null;
  const wordsParam = searchParams?.get('reviewWords') ?? null;
  const assignParam = searchParams?.get('assign') ?? null;

  return useMemo(
    () => ({
      tab: isTeacherTab(tabParam) ? tabParam : null,
      reviewWords: parseReviewWords(wordsParam),
      openAssignment: parseOpenAssignment(assignParam),
    }),
    [tabParam, wordsParam, assignParam]
  );
}
