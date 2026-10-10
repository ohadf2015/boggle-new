export const LESSON_STORAGE_KEY = 'lexiclash.lesson.classic.v1';

export type LessonOutcome = 'done' | 'skipped';

function localStorageOrNull(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readLessonOutcome(storage: Storage | null = localStorageOrNull()): LessonOutcome | null {
  try {
    const v = storage?.getItem(LESSON_STORAGE_KEY);
    return v === 'done' || v === 'skipped' ? v : null;
  } catch {
    return null;
  }
}

export function writeLessonOutcome(outcome: LessonOutcome, storage: Storage | null = localStorageOrNull()): void {
  try {
    storage?.setItem(LESSON_STORAGE_KEY, outcome);
  } catch {
    /* private mode or blocked storage: the lesson simply shows again next game */
  }
}
