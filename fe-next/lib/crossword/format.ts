// Which size of crossword a player is solving.
//
// `mini` is the NYT-Mini-shaped board this mode shipped with: a 4×4/5×5 that fits any phone whole,
// solvable in a couple of minutes. `full` is the newspaper board — an 11×11 with 40-odd clues that
// is panned and zoomed rather than seen all at once.
//
// 11 is not an arbitrary "bigger": it is the largest grid the clue bank can actually fill. Every
// answer in the bank is 3–5 letters, so every white run must be 3–5 long, which forces a dense
// block lattice. Past 11 the only patterns that still fill are over half black, which reads as a
// filler puzzle rather than a crossword. See scripts/crossword/search-templates.ts.

import { defaultSize } from './templates';
import type { PuzzleLocale } from './types';

export type CrosswordFormat = 'mini' | 'full';

export const FULL_SIZE = 11;

/**
 * Locales whose clue bank can fill a full-size grid. en has ~2,400 clued answers; sv (786),
 * he (1,206) and es (623) cannot fill 40+ doubly-checked slots, and offering a format that
 * silently falls back to a mini is worse than not offering it.
 */
const FULL_LOCALES: ReadonlySet<string> = new Set(['en']);

export function supportsFull(locale: PuzzleLocale): boolean {
  return FULL_LOCALES.has(locale);
}

/** Grid dimension for a (locale, format). Falls back to the mini where full isn't supported. */
export function sizeFor(locale: PuzzleLocale, format: CrosswordFormat): number {
  return format === 'full' && supportsFull(locale) ? FULL_SIZE : defaultSize(locale);
}

/**
 * True once a puzzle has more clues than the clue bar's prev/next can reasonably walk. Drives
 * two behaviours that are right for a mini and wrong for a newspaper grid: the jump-to-clue sheet
 * (needed only here) and the per-slot Clue Scramble (a nice flourish over ten clues, minutes of
 * forced mini-games over forty).
 */
export function isNewspaperScale(slotCount: number): boolean {
  return slotCount > 12;
}

const FORMAT_KEY = 'lexiclash:crossword:format';

export function loadFormat(locale: PuzzleLocale): CrosswordFormat {
  if (typeof window === 'undefined') return 'mini';
  try {
    const raw = window.localStorage.getItem(FORMAT_KEY);
    return raw === 'full' && supportsFull(locale) ? 'full' : 'mini';
  } catch {
    return 'mini';
  }
}

export function saveFormat(format: CrosswordFormat): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FORMAT_KEY, format);
  } catch {
    /* storage full — the choice just doesn't survive a reload */
  }
}
