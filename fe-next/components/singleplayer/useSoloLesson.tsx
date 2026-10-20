'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLesson, type LessonFeedback } from '@/components/tutorial/lesson/useLesson';
import { LessonHud } from '@/components/tutorial/lesson/LessonHud';
import { LessonBoardLayer, type LessonBurst } from '@/components/tutorial/lesson/LessonBoardLayer';
import { LessonSheet } from '@/components/tutorial/lesson/LessonSheet';
import { LessonComplete } from '@/components/tutorial/lesson/LessonComplete';
import { CLASSIC_LESSON, nextTraceIndex, type LessonWord } from '@/lib/tutorial/lesson/lessonEngine';
import { findStarterOnGrid } from '@/lib/tutorial/lesson/starterWords';
import { pickStepHint, pickTraceHint } from '@/lib/tutorial/lesson/stepHint';
import { findWordPath } from '@/utils/wordPathFinder';
import type { CategorizedWords } from '@/utils/findMixedDirectionWord';
import type { Language, LetterGrid } from '@/types';

/** A find step shows the hand again after this long without a drag. */
export const FIND_IDLE_MS = 6000;
const BOARD_SELECTOR = '[data-testid=solo-slot-board]';

export interface UseSoloLessonArgs {
  enabled: boolean;
  grid: LetterGrid | null;
  language: Language;
  availableWords: CategorizedWords | null;
  foundWords: readonly (LessonWord & { score?: number })[];
  formedWord: string;
  feedback: LessonFeedback | null;
  score: number;
  friendHref: string;
}

export interface SoloLesson {
  active: boolean;
  /** Freeze the clock: the finale is covering the board. */
  holdClock: boolean;
  hud: ReactNode;
  overlay: ReactNode;
  /** Lesson step id while the lesson is running; null otherwise. */
  stepId: string | null;
  complete: boolean;
  skipped: boolean;
}

/** Classic solo's first round, taught as a lesson on the real board. */
export function useSoloLesson({
  enabled,
  grid,
  language,
  availableWords,
  foundWords,
  formedWord,
  feedback,
  score,
  friendHref,
}: UseSoloLessonArgs): SoloLesson {
  const lesson = useLesson({ definition: CLASSIC_LESSON, enabled: enabled && !!grid, words: foundWords, feedback });
  const { step, event } = lesson;

  const found = useMemo(
    () => new Set(foundWords.filter((w) => w.isValid === true).map((w) => w.word.toLowerCase())),
    [foundWords],
  );
  const starter = useMemo(() => findStarterOnGrid(grid, language), [grid, language]);

  const [idle, setIdle] = useState(false);
  useEffect(() => {
    setIdle(false);
    if (!lesson.active || step?.kind !== 'find') return;
    const t = window.setTimeout(() => setIdle(true), FIND_IDLE_MS);
    return () => window.clearTimeout(t);
  }, [formedWord, lesson.completedCount, lesson.active, step?.kind]);

  const hint = useMemo(() => {
    if (!lesson.active || !step) return null;
    if (step.kind === 'trace') {
      if (starter && !found.has(starter.word.toLowerCase())) return starter;
      return pickTraceHint(availableWords, grid, language, found);
    }
    return idle ? pickStepHint(availableWords, grid, language, step.minLength, found) : null;
  }, [lesson.active, step, starter, found, availableWords, grid, language, idle]);

  const burst = useMemo<LessonBurst | null>(() => {
    if (event?.kind !== 'success' || !grid) return null;
    const path = findWordPath(event.word, grid, language);
    const points = foundWords.find((w) => w.word === event.word)?.score;
    return path ? { key: event.key, cells: path, points } : null;
  }, [event, grid, language, foundWords]);

  if (!lesson.active) {
    return {
      active: false,
      holdClock: false,
      hud: null,
      overlay: null,
      stepId: null,
      complete: lesson.complete,
      skipped: lesson.skipped,
    };
  }

  const dragging = formedWord.length > 0;
  const nextIndex = hint && dragging ? nextTraceIndex(hint.word, formedWord) : -1;
  const handPath = hint && (dragging ? nextIndex >= 0 : !event) ? hint.path : null;

  return {
    active: true,
    holdClock: lesson.holdClock,
    hud: (
      <LessonHud
        steps={lesson.steps}
        completedCount={lesson.completedCount}
        step={step}
        target={step?.kind === 'trace' ? hint?.word ?? null : null}
        targetPath={step?.kind === 'trace' ? hint?.path ?? null : null}
        formedWord={formedWord}
        event={event}
        onSkip={lesson.skip}
      />
    ),
    overlay: (
      <>
        {!lesson.complete && (
          <LessonBoardLayer boardSelector={BOARD_SELECTOR} handPath={handPath} nextIndex={nextIndex} burst={burst} />
        )}
        <LessonSheet
          event={event}
          retryWord={step?.kind === 'trace' ? hint?.word ?? null : null}
          points={burst?.points}
        />
        {lesson.complete && (
          <LessonComplete
            words={found.size}
            points={score}
            bestStreak={lesson.bestStreak}
            onClose={lesson.closeComplete}
            friendHref={friendHref}
          />
        )}
      </>
    ),
    stepId: step?.id ?? null,
    complete: lesson.complete,
    skipped: lesson.skipped,
  };
}

export default useSoloLesson;
