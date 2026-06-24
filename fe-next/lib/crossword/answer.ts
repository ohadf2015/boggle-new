// Pure answer-checking + display helpers.
// Solutions are stored normalized; player input is normalized before comparison so a Hebrew
// player typing a final (sofit) letter still matches the regular-form solution.

import { applyHebrewFinalLetters, normalizeWord } from '@/shared/utils/wordNormalization';
import type { Language } from '@/shared/types/game';
import type { CrosswordPuzzle, PuzzleLocale } from './types';

// Spanish crosswords omit diacritics in the grid (standard convention) — clue text keeps accents,
// but the grid cells are plain letters. Fold the accent MARKS (á→a … ü→u) so a player typing an
// accented letter still matches, and so accented/unaccented words interlock at crossings (without
// this, "í" can't cross "i" and the sparse Spanish pool can't fill a 4×4). ñ is a distinct letter
// and is intentionally NOT folded. (Swedish å/ä/ö are likewise distinct letters — es only.)
const ES_ACCENT_FOLD: Record<string, string> = {
  á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u',
};
export function foldEsAccents(s: string): string {
  return s.toLowerCase().replace(/[áéíóúü]/g, (c) => ES_ACCENT_FOLD[c] ?? c);
}

/** Normalize a single typed cell letter for comparison (locale-aware; folds HE sofit + ES accents). */
export function normalizeCell(input: string, locale: PuzzleLocale): string {
  const base = normalizeWord((input ?? '').trim(), locale as Language);
  return locale === 'es' ? foldEsAccents(base) : base;
}

/** True if a typed letter matches the (already-normalized) solution letter. */
export function checkCell(entered: string, solution: string, locale: PuzzleLocale): boolean {
  const e = normalizeCell(entered, locale);
  return e.length > 0 && e === solution;
}

const key = (row: number, col: number) => `${row},${col}`;

/** True when every non-block cell is filled with a correct letter. */
export function isSolved(
  puzzle: CrosswordPuzzle,
  entries: Record<string, string>,
  locale: PuzzleLocale = puzzle.locale,
): boolean {
  for (const cell of puzzle.cells) {
    if (cell.block) continue;
    if (!checkCell(entries[key(cell.row, cell.col)] ?? '', cell.solution, locale)) {
      return false;
    }
  }
  return true;
}

/**
 * Letter to render in a cell. For Hebrew, the regular-form solution is converted to its final
 * (sofit) form only when the cell is the last letter of a word.
 */
export function displayLetter(
  letter: string,
  ctx: { isWordEnd: boolean },
  locale: PuzzleLocale,
): string {
  if (!letter) return letter;
  if (locale === 'he' && ctx.isWordEnd) return applyHebrewFinalLetters(letter);
  return letter;
}
