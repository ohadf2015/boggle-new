import { findMixedDirectionWord, type CategorizedWords } from '@/utils/findMixedDirectionWord';
import type { LetterGrid, Language } from '@/types';
import type { PathCell } from '@/utils/wordPathFinder';

export type LessonStepKind = 'hint' | 'word';

export interface LessonStep {
  id: string;
  kind: LessonStepKind;
  minLength: number;
}

export const CLASSIC_FIRST_ROUND_STEPS: readonly LessonStep[] = [
  { id: 'trace-hint', kind: 'hint', minLength: 3 },
  { id: 'any-word', kind: 'word', minLength: 3 },
  { id: 'long-word', kind: 'word', minLength: 4 },
  { id: 'longer-word', kind: 'word', minLength: 5 },
];

export interface LessonWord {
  word: string;
  isValid: boolean | null;
}

export interface LessonInput extends LessonWord {
  hintWord: string | null;
}

export interface LessonAdvance {
  completedCount: number;
  completedStep: LessonStep | null;
}

export function stepAccepts(step: LessonStep, input: LessonInput): boolean {
  if (input.isValid !== true) return false;
  const word = input.word.toLowerCase();
  if (step.kind === 'hint') {
    return !!input.hintWord && word === input.hintWord.toLowerCase();
  }
  return word.length >= step.minLength;
}

/** One valid word completes at most one step: the lesson is taught in order. */
export function applyLessonWord(
  steps: readonly LessonStep[],
  completedCount: number,
  input: LessonInput,
): LessonAdvance {
  const next = steps[completedCount];
  if (!next || !stepAccepts(next, input)) return { completedCount, completedStep: null };
  return { completedCount: completedCount + 1, completedStep: next };
}

export function replayLesson(
  steps: readonly LessonStep[],
  words: readonly LessonWord[],
  hintWord: string | null,
): { completedCount: number; lastCompleted: LessonStep | null } {
  let completedCount = 0;
  let lastCompleted: LessonStep | null = null;
  for (const w of words) {
    const r = applyLessonWord(steps, completedCount, { ...w, hintWord });
    if (r.completedStep) {
      completedCount = r.completedCount;
      lastCompleted = r.completedStep;
    }
  }
  return { completedCount, lastCompleted };
}

export interface LessonHint {
  word: string;
  path: PathCell[];
}

export function pickLessonHint(
  availableWords: CategorizedWords | null,
  grid: LetterGrid | null,
  language: Language,
): LessonHint | null {
  if (!grid) return null;
  const found = findMixedDirectionWord(availableWords, grid, language);
  return found ? { word: found.word, path: found.path } : null;
}
