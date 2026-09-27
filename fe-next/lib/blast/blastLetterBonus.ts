/**
 * Deterministic per-word letter-value bonus for Blast mode.
 *
 * Reuses Scrabble-style tile values (multilingual: EN + HE) so:
 *  - totals look organic (e.g. +113, +27) instead of round (+100, +50), and
 *  - rare letters (Q/Z/X, ז/ט/צ/ק) feel rewarding.
 *
 * DETERMINISTIC by design: the same word always yields the same bonus, so the
 * client's optimistic score-fly and the server's authoritative total stay in
 * lock-step. (A Math.random() jitter here would make the "+N" popup disagree
 * with the leaderboard — never do that on a server-authoritative path.)
 *
 * Note: Previously imported from lib/wordForge/letterValues, which was deleted.
 * Letter values are inlined here since they are a shared utility needed by Blast,
 * independent of the wordForge mode.
 */

import { values as HEBREW_VALUES } from '@/lib/word-craft/tileBags/he';

// ─── English values (Scrabble-inspired) ───────────
const ENGLISH_POINTS: Record<string, number> = {
  A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4,
  I: 1, J: 8, K: 5, L: 1, M: 3, N: 1, O: 1, P: 3,
  Q: 10, R: 1, S: 1, T: 1, U: 1, V: 4, W: 4, X: 8,
  Y: 4, Z: 10,
};

/** Hebrew final (sofit) glyph → its base letter. Board tiles only ever use base
 *  forms, but a display/sofit form may leak in — fold it before lookup. */
const SOFIT_TO_BASE: Record<string, string> = {
  ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ',
};

// Hebrew base-letter values from the canonical tile bag (drop the blank '_').
const HEBREW_POINTS: Record<string, number> = Object.fromEntries(
  Object.entries(HEBREW_VALUES).filter(([ch]) => ch !== '_'),
);

/** Combined point table: English ∪ Hebrew base letters. */
const LETTER_POINTS: Record<string, number> = {
  ...ENGLISH_POINTS,
  ...HEBREW_POINTS,
};

/** Point value for a single letter (case-insensitive, sofit-aware). 0 if unknown. */
function getLetterPoints(letter: string): number {
  const base = SOFIT_TO_BASE[letter] ?? letter;
  return LETTER_POINTS[base.toUpperCase()] ?? 0;
}

/** Sum of all letter points in a word. */
export function blastLetterBonus(word: string): number {
  if (!word) return 0;
  return word.split('').reduce((sum, ch) => sum + getLetterPoints(ch), 0);
}
