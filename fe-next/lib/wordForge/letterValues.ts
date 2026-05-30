/**
 * Word Forge — shared letter-value + classification table.
 *
 * Single source of truth for per-letter scoring and vowel/rare classification,
 * consumed by BOTH scoring.ts and runeEngine.ts. Previously each file kept its
 * own inline English-only A–Z map, which meant every Hebrew word scored 0 base
 * points. This is a leaf module (no Word Forge imports) so there is no circular
 * dependency with scoring.ts.
 *
 * Hebrew values reuse the app's canonical Scrabble-style tile bag
 * (lib/word-craft/tileBags/he.ts) rather than inventing a divergent scheme.
 */
import { values as HEBREW_VALUES } from '@/lib/word-craft/tileBags/he';

// ─── English values (Scrabble-inspired — unchanged) ───────────
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

/** Combined point table: English ∪ Hebrew base letters. Hebrew code points never
 *  collide with A–Z, so one flat map serves every language. */
export const LETTER_POINTS: Record<string, number> = {
  ...ENGLISH_POINTS,
  ...HEBREW_POINTS,
};

/** Point value for a single letter (case-insensitive, sofit-aware). 0 if unknown. */
export function getLetterPoints(letter: string): number {
  const base = SOFIT_TO_BASE[letter] ?? letter;
  return LETTER_POINTS[base.toUpperCase()] ?? 0;
}

/** Sum of all letter points in a word. */
export function getBasePoints(word: string): number {
  return word.split('').reduce((sum, ch) => sum + getLetterPoints(ch), 0);
}

// ─── Vowel / rare classification ──────────────────────────────

/** English vowels + Hebrew matres lectionis (א ה ו י). */
export const VOWELS = new Set(['A', 'E', 'I', 'O', 'U', 'א', 'ה', 'ו', 'י']);

/** "Rare" letters: English J/K/Q/X/Z + the highest-value (6-pt) Hebrew letters. */
export const RARE_LETTERS = new Set(['J', 'K', 'Q', 'X', 'Z', 'ז', 'ט', 'צ', 'ק']);

/** True for an English (A–Z) or Hebrew (base) letter. */
export function isAlphaLetter(ch: string): boolean {
  return /[A-Z]/.test(ch.toUpperCase()) || (ch >= 'א' && ch <= 'ת');
}
