'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CLASSIC_FIRST_ROUND_STEPS,
  replayLesson,
  type LessonHint,
  type LessonStep,
  type LessonWord,
} from '@/lib/tutorial/lesson/lessonEngine';
import { readLessonOutcome, writeLessonOutcome, type LessonOutcome } from '@/lib/tutorial/lesson/lessonStorage';

const FINISH_HOLD_MS = 2200;

export interface UseLessonArgs {
  /** Mode gate: false keeps the lesson off (practice, quick play, paused, game over). */
  enabled: boolean;
  hint: LessonHint | null;
  words: readonly LessonWord[];
  steps?: readonly LessonStep[];
}

export interface UseLessonResult {
  active: boolean;
  steps: readonly LessonStep[];
  completedCount: number;
  hint: LessonHint | null;
  skip: () => void;
}

/** Progress is replayed from played words, so it cannot drift from what the game counted. */
export function useLesson({ enabled, hint, words, steps = CLASSIC_FIRST_ROUND_STEPS }: UseLessonArgs): UseLessonResult {
  const [outcome, setOutcome] = useState<LessonOutcome | null>(() => readLessonOutcome());

  const completedCount = useMemo(
    () => replayLesson(steps, words, hint?.word ?? null).completedCount,
    [steps, words, hint],
  );
  const finished = completedCount >= steps.length;

  useEffect(() => {
    if (!finished || outcome) return;
    writeLessonOutcome('done');
    const id = window.setTimeout(() => setOutcome('done'), FINISH_HOLD_MS);
    return () => window.clearTimeout(id);
  }, [finished, outcome]);

  const skip = useCallback(() => {
    writeLessonOutcome('skipped');
    setOutcome('skipped');
  }, []);

  return {
    active: enabled && !outcome && !!hint,
    steps,
    completedCount,
    hint,
    skip,
  };
}

export default useLesson;
