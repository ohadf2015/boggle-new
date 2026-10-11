export type LessonOutcome = 'done' | 'skipped';

export const lessonStorageKey = (lessonId: string) => `lexiclash.lesson.${lessonId}.v1`;

function localStorageOrNull(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readLessonOutcome(
  lessonId: string,
  storage: Storage | null = localStorageOrNull(),
): LessonOutcome | null {
  try {
    const v = storage?.getItem(lessonStorageKey(lessonId));
    return v === 'done' || v === 'skipped' ? v : null;
  } catch {
    return null;
  }
}

export function writeLessonOutcome(
  lessonId: string,
  outcome: LessonOutcome,
  storage: Storage | null = localStorageOrNull(),
): void {
  try {
    storage?.setItem(lessonStorageKey(lessonId), outcome);
  } catch {
    /* blocked storage: the lesson shows again next game */
  }
}
