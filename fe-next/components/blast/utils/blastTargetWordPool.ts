/**
 * blastTargetWordPool — curated word pools for target_word objectives per language.
 *
 * Words selected for:
 * - 4–7 letters (sweet spot for Blast boards, not trivial but solvable)
 * - High-frequency, recognizable words
 * - Reasonable letter distribution (vowels, common consonants)
 *
 * Hebrew words flagged for native review.
 */

import type { Language } from '@/shared/types/game';

/** English target words — common, solvable on 6x6 grids */
export const ENGLISH_TARGET_WORDS = [
  'CRYSTAL', 'LISTEN', 'PUZZLE', 'FRIEND', 'CHANCE', 'CHANGE',
  'SCREEN', 'THANKS', 'SIMPLE', 'CLEVER', 'STRONG', 'BROKEN',
  'COMMON', 'ANSWER', 'DOUBLE', 'CIRCLE', 'SPRING', 'SUMMER',
  'WINTER', 'BRIGHT', 'SMOOTH', 'SHADOW',
] as const;

/** Swedish target words */
export const SWEDISH_TARGET_WORDS = [
  'SNÖSTORM', 'BLOMMA', 'STRAND', 'ÄLSKA', 'DRÖM', 'HIMMEL',
  'VIND', 'VATTEN', 'BERGET', 'DJUNGELBOK',
] as const;

/** Japanese target words — common Hiragana/Katakana */
export const JAPANESE_TARGET_WORDS = [
  'せんせい', 'かんじ', 'えんぴつ', 'りんご', 'さくら', 'あしたは',
  'わたしは', 'あいうえお', 'かきくけこ',
] as const;

/** Spanish target words */
export const SPANISH_TARGET_WORDS = [
  'CRISTAL', 'ESCUCHAR', 'AMIGO', 'CAMBIAR', 'FUERTE', 'HERMOSO',
  'PALABRA', 'MUNDO', 'PERSONA', 'TIEMPO', 'ESPACIO', 'CORAZÓN',
] as const;

/** Hebrew target words — NEEDS NATIVE REVIEW
 *  Expanded 2026-04-30: prior pool had several 2-3 letter entries that fail
 *  the path-solver's adjacency check on a 6×6 grid often enough to force
 *  re-rolls. New entries are 4-6 letters, common nouns/verbs.
 */
export const HEBREW_TARGET_WORDS = [
  // 4 letters
  'מילה', 'חבר', 'שלום', 'אהבה', 'בית', 'ספר', 'מורה', 'מקום',
  'חתול', 'תפוח', 'שמלה', 'שעון', 'חלום', 'חופש', 'דרך', 'יום',
  // 5-6 letters
  'מילון', 'שולחן', 'מסעדה', 'מכונית', 'ספרים', 'תלמיד', 'גלידה',
  'כוכב', 'ירח', 'שמש', 'צבע', 'עץ', 'ים',
] as const;

export type TargetWordPool = typeof ENGLISH_TARGET_WORDS | typeof SWEDISH_TARGET_WORDS
  | typeof JAPANESE_TARGET_WORDS | typeof SPANISH_TARGET_WORDS | typeof HEBREW_TARGET_WORDS;

/**
 * Get the target word pool for a given language.
 * Returns empty array for unsupported languages.
 */
export function getTargetWordPool(language: Language): string[] {
  switch (language) {
    case 'en':
      return Array.from(ENGLISH_TARGET_WORDS);
    case 'sv':
      return Array.from(SWEDISH_TARGET_WORDS);
    case 'ja':
      return Array.from(JAPANESE_TARGET_WORDS);
    case 'es':
      return Array.from(SPANISH_TARGET_WORDS);
    case 'he':
      return Array.from(HEBREW_TARGET_WORDS);
    default:
      return [];
  }
}

/**
 * Pick a random word from the pool.
 * Returns null if pool is empty.
 */
export function pickRandomTargetWord(pool: string[]): string | null {
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
