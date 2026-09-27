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
 * Locales whose clue bank can fill a full-size grid, i.e. the ones with a baked `grids.<l>11.json`
 * pool. en (~2,400 clued answers) and he (1,206, of which 1,089 are the 3–5 letters a full grid
 * needs). sv (786) and es (623) still cannot fill 40+ doubly-checked slots, and offering a format
 * that silently falls back to a mini is worse than not offering it.
 */
const FULL_LOCALES: ReadonlySet<string> = new Set(['en', 'he']);

export function supportsFull(locale: PuzzleLocale): boolean {
  return FULL_LOCALES.has(locale);
}

/**
 * Whether a locale's across answers run right-to-left. Single source of truth: the generator, the
 * offline baker and the baked-pool loader must all agree, or an across answer baked left-to-right
 * is read back reversed (and vice versa).
 */
export function isRtlLocale(locale: PuzzleLocale): boolean {
  return locale === 'he';
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

/**
 * What a player who has never touched the toggle gets. The full board IS the mode ("a real
 * crossword"), so wherever the clue bank can fill one it opens by default — a first-time visitor
 * landing on a 5×5 reads the whole feature as a mini and never finds the toggle. Locales without
 * a full-capable bank still open on their mini.
 *
 * Deterministic from the locale alone (no storage, no window), so it is safe as SSR initial state.
 */
export function defaultFormat(locale: PuzzleLocale): CrosswordFormat {
  return supportsFull(locale) ? 'full' : 'mini';
}

export function loadFormat(locale: PuzzleLocale): CrosswordFormat {
  if (typeof window === 'undefined') return defaultFormat(locale);
  try {
    const raw = window.localStorage.getItem(FORMAT_KEY);
    // An explicit past choice wins — including a deliberate "mini". Only an absent/garbage value
    // falls through to the default, so flipping the default can't override a player's pick.
    if (raw === 'full') return supportsFull(locale) ? 'full' : 'mini';
    if (raw === 'mini') return 'mini';
    return defaultFormat(locale);
  } catch {
    return defaultFormat(locale);
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
