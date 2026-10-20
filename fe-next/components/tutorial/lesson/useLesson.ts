'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  replayLesson,
  type LessonDefinition,
  type LessonStep,
  type LessonWord,
} from '@/lib/tutorial/lesson/lessonEngine';
import { readLessonOutcome, writeLessonOutcome, type LessonOutcome } from '@/lib/tutorial/lesson/lessonStorage';

export const SUCCESS_MS = 1700;
export const OOPS_MS = 1300;
export const COMPLETE_MS = 3600;
/** The last word's win lands on the board before the finale covers it. */
export const FINALE_DELAY_MS = 450;

export interface LessonFeedback {
  id: string;
  type: string;
  message?: string;
}

export interface UseLessonArgs {
  definition: LessonDefinition;
  /** Mode gate: false keeps the lesson off (practice, quick play, game over). */
  enabled: boolean;
  words: readonly LessonWord[];
  feedback: LessonFeedback | null;
}

export type LessonEvent =
  | { key: string; kind: 'success'; word: string; streak: number; stepIndex: number }
  | { key: string; kind: 'oops'; message: string; streak: 0 };

export interface UseLessonResult {
  active: boolean;
  steps: readonly LessonStep[];
  completedCount: number;
  /** The step being taught, or null once all are done. */
  step: LessonStep | null;
  event: LessonEvent | null;
  /** The finale card is on screen. */
  complete: boolean;
  /** From the last step until the finale closes: the round's clock should wait. */
  holdClock: boolean;
  bestStreak: number;
  skip: () => void;
  closeComplete: () => void;
  /** Player tapped skip (this session or a remembered one). */
  skipped: boolean;
}

export function useLesson({ definition, enabled, words, feedback }: UseLessonArgs): UseLessonResult {
  const { id, steps } = definition;
  const [outcome, setOutcome] = useState<LessonOutcome | null>(() => readLessonOutcome(id));
  const [finale, setFinale] = useState<'off' | 'pending' | 'on'>('off');
  const [event, setEvent] = useState<LessonEvent | null>(null);
  const streakRef = useRef(0);
  const [bestStreak, setBestStreak] = useState(0);
  const seenCountRef = useRef(0);
  const seenFeedbackRef = useRef<string | null>(null);

  const { completedCount, lastWord } = useMemo(() => replayLesson(steps, words), [steps, words]);
  const running = enabled && !outcome;

  useEffect(() => {
    if (completedCount <= seenCountRef.current) return;
    seenCountRef.current = completedCount;
    if (!running) return;
    streakRef.current += 1;
    setBestStreak((b) => Math.max(b, streakRef.current));
    setEvent({
      key: `s${completedCount}`,
      kind: 'success',
      word: lastWord ?? '',
      streak: streakRef.current,
      stepIndex: completedCount - 1,
    });
    if (completedCount >= steps.length) {
      writeLessonOutcome(id, 'done');
      setFinale('pending');
      setOutcome('done');
    }
  }, [completedCount, lastWord, running, steps.length, id]);

  useEffect(() => {
    if (!feedback || feedback.id === seenFeedbackRef.current) return;
    seenFeedbackRef.current = feedback.id;
    if (!running || feedback.type !== 'rejected') return;
    streakRef.current = 0;
    setEvent({ key: feedback.id, kind: 'oops', message: feedback.message ?? '', streak: 0 });
  }, [feedback, running]);

  useEffect(() => {
    if (!event) return;
    const ms = event.kind === 'success' ? SUCCESS_MS : OOPS_MS;
    const t = window.setTimeout(() => setEvent(null), ms);
    return () => window.clearTimeout(t);
  }, [event]);

  useEffect(() => {
    if (finale === 'off') return;
    const t = window.setTimeout(
      () => setFinale(finale === 'pending' ? 'on' : 'off'),
      finale === 'pending' ? FINALE_DELAY_MS : COMPLETE_MS,
    );
    return () => window.clearTimeout(t);
  }, [finale]);

  const skip = useCallback(() => {
    writeLessonOutcome(id, 'skipped');
    setOutcome('skipped');
    setEvent(null);
  }, [id]);
  const closeComplete = useCallback(() => setFinale('off'), []);
  const finishing = finale !== 'off';

  return {
    active: running || finishing,
    steps,
    completedCount,
    step: steps[completedCount] ?? null,
    event: running || finishing ? event : null,
    complete: finale === 'on',
    holdClock: finishing,
    bestStreak,
    skip,
    closeComplete,
    skipped: outcome === 'skipped',
  };
}

export default useLesson;
