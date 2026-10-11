import type { PathCell } from '@/utils/wordPathFinder';

/**
 * One tutorial system for every mode: a mode supplies a LessonDefinition and
 * the shared hook/components (components/tutorial/lesson) run it. Progress is
 * replayed from the words the game already accepted, so the lesson can never
 * disagree with the score.
 */

export type LessonStepKind = 'trace' | 'find';

export interface LessonStep {
  id: string;
  /** trace = follow the hand on a shown word; find = any word of minLength+. */
  kind: LessonStepKind;
  minLength: number;
}

export interface LessonDefinition {
  id: string;
  steps: readonly LessonStep[];
}

export const CLASSIC_LESSON: LessonDefinition = {
  id: 'classic',
  steps: [
    { id: 'trace', kind: 'trace', minLength: 2 },
    { id: 'find-any', kind: 'find', minLength: 3 },
    { id: 'find-4', kind: 'find', minLength: 4 },
    { id: 'find-5', kind: 'find', minLength: 5 },
  ],
};

export interface LessonWord {
  word: string;
  isValid: boolean | null;
}

export interface LessonHint {
  word: string;
  path: PathCell[];
}

const chars = (s: string) => [...s];

export function stepAccepts(step: LessonStep, input: LessonWord): boolean {
  return input.isValid === true && chars(input.word).length >= step.minLength;
}

export function replayLesson(
  steps: readonly LessonStep[],
  words: readonly LessonWord[],
): { completedCount: number; lastWord: string | null } {
  let completedCount = 0;
  let lastWord: string | null = null;
  for (const w of words) {
    const step = steps[completedCount];
    if (!step) break;
    if (stepAccepts(step, w)) {
      completedCount += 1;
      lastWord = w.word;
    }
  }
  return { completedCount, lastWord };
}

export type SlotState = 'ghost' | 'match' | 'miss' | 'empty' | 'filled' | 'ready';

export interface LessonSlot {
  char: string;
  state: SlotState;
}

/** What the target strip shows while the player drags: it fills letter by letter. */
export function liveSlots(step: LessonStep, target: string | null, formed: string): LessonSlot[] {
  const typed = chars(formed.toUpperCase());
  if (step.kind === 'trace' && target) {
    return chars(target.toUpperCase()).map((ch, i) => {
      if (i >= typed.length) return { char: ch, state: 'ghost' };
      return { char: ch, state: typed[i] === ch ? 'match' : 'miss' };
    });
  }
  const ready = typed.length >= step.minLength;
  const size = Math.max(step.minLength, typed.length);
  return Array.from({ length: size }, (_, i) => {
    if (i >= typed.length) return { char: '', state: 'empty' };
    return { char: typed[i], state: ready ? 'ready' : 'filled' };
  });
}

/** Index of the next letter to trace, or -1 once the player leaves (or completes) the target. */
export function nextTraceIndex(target: string, formed: string): number {
  const t = chars(target.toUpperCase());
  const f = chars(formed.toUpperCase());
  if (f.length >= t.length) return -1;
  return f.every((ch, i) => ch === t[i]) ? f.length : -1;
}
