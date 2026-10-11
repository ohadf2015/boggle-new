import type { Language, LetterGrid } from '@/types';
import { findWordPath } from '@/utils/wordPathFinder';
import type { CategorizedWords } from '@/utils/findMixedDirectionWord';
import type { LessonHint } from './lessonEngine';

const MAX_CANDIDATES = 40;

/** The shortest word still on the board that would complete a step. */
export function pickStepHint(
  available: CategorizedWords | null,
  grid: LetterGrid | null,
  language: Language,
  minLength: number,
  found: ReadonlySet<string>,
): LessonHint | null {
  if (!available || !grid?.length) return null;
  const candidates = [...available.easy, ...available.medium, ...available.hard]
    .filter((w) => [...w].length >= minLength && !found.has(w.toLowerCase()))
    .sort((a, b) => [...a].length - [...b].length)
    .slice(0, MAX_CANDIDATES);
  for (const w of candidates) {
    const path = findWordPath(w, grid, language);
    if (path) return { word: w.toUpperCase(), path };
  }
  return null;
}

/** The first word to trace: three letters when the board has one, else two (Japanese boards deal kanji pairs). */
export function pickTraceHint(
  available: CategorizedWords | null,
  grid: LetterGrid | null,
  language: Language,
  found: ReadonlySet<string>,
): LessonHint | null {
  return pickStepHint(available, grid, language, 3, found) ?? pickStepHint(available, grid, language, 2, found);
}
