import type { BlastComboType } from './blastCombos';

/**
 * Returns a word-length scaling factor for area-of-effect radii.
 * 3-4 letters = 1.0 (base), 5-6 letters = 1.5 (larger), 7+ letters = 2.0 (largest).
 * This factor applies ONLY to area/radius parameters — NOT to score multipliers.
 */
export function getWordLengthScaleFactor(wordLength: number): number {
  if (wordLength >= 7) return 2.0;
  if (wordLength >= 5) return 1.5;
  return 1.0;
}

/**
 * Scales a base radius by the word-length factor, rounding up (ceil).
 * Example: scaledRadius(1, 1.5) = 2 (ceil of 1.5)
 */
export function scaledRadius(base: number, scale: number): number {
  return Math.ceil(base * scale);
}

/**
 * All 24 codex-eligible combo types (21 cross-type pairs + 3 same-type pairs).
 * Excludes catch-all types: gold_special, rainbow_special, triple_special.
 * Used by Plan 02 to track player discovery progress.
 */
export const CODEX_COMBOS: readonly BlastComboType[] = [
  'bomb_bomb',
  'bomb_lightning',
  'bomb_prism',
  'bomb_rainbow',
  'bomb_magnet',
  'bomb_gem',
  'bomb_frozen',
  'lightning_lightning',
  'lightning_prism',
  'lightning_rainbow',
  'lightning_magnet',
  'lightning_gem',
  'lightning_frozen',
  'prism_prism',
  'prism_rainbow',
  'prism_magnet',
  'prism_gem',
  'prism_frozen',
  'rainbow_magnet',
  'rainbow_gem',
  'rainbow_frozen',
  'magnet_gem',
  'magnet_frozen',
  'gem_frozen',
] as const;

/** Total number of codex-eligible combos (convenience constant). */
export const CODEX_COMBO_COUNT = CODEX_COMBOS.length;
