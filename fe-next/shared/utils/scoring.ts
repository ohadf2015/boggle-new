/**
 * Canonical Scoring Calculation Utilities
 *
 * This is the SINGLE SOURCE OF TRUTH for all scoring logic in LexiClash.
 *
 * Handles:
 * - Base word scoring (length-based)
 * - Combo bonuses (flat bonuses that scale with word length)
 * - Combo multipliers (currently unused, but available for future)
 * - Fire round multipliers (2x during earthquake fire rounds)
 *
 * IMPORTANT: All other scoring implementations should import from this file.
 * Do not duplicate scoring logic elsewhere.
 *
 * @module shared/utils/scoring
 */

/**
 * Combo tier names for UI display and logic branching.
 */
export type ComboTierName = 'none' | 'basic' | 'good' | 'great' | 'amazing' | 'legendary' | 'mythic' | 'transcendent';

/**
 * Get combo tier name based on combo level.
 *
 * @param comboLevel - Current combo level
 * @returns Tier name string
 */
export function getComboTierName(comboLevel: number): ComboTierName {
  if (comboLevel <= 2) return 'none';
  if (comboLevel <= 4) return 'basic';
  if (comboLevel <= 6) return 'good';
  if (comboLevel <= 8) return 'great';
  if (comboLevel <= 10) return 'amazing';
  if (comboLevel <= 14) return 'legendary';
  if (comboLevel <= 19) return 'mythic';
  return 'transcendent';
}

/**
 * Get combo multiplier based on combo level (no cap).
 *
 * @param comboLevel - Current combo level (0-∞)
 * @returns Multiplier value (1.0 - 3.0)
 */
export function getComboMultiplier(comboLevel: number): number {
  if (comboLevel <= 2) return 1.0;
  if (comboLevel <= 4) return 1.25;
  if (comboLevel <= 6) return 1.5;
  if (comboLevel <= 8) return 1.75;
  if (comboLevel <= 10) return 2.0;
  if (comboLevel <= 14) return 2.25;
  if (comboLevel <= 19) return 2.5;
  if (comboLevel <= 24) return 2.75;
  return 3.0;
}

/**
 * Get flat combo bonus based on combo level and word length
 *
 * Combo bonus scales with word length to reward longer words in combos.
 * This helps slower/perfectionist players who find quality words.
 *
 * Formula: comboBonus = floor(comboLevel * wordLengthFactor)
 *
 * Word length factors:
 * - 3 letters or less: 0.2 (minimal bonus, discourages spam)
 * - 4 letters: 0.5 (modest bonus)
 * - 5 letters: 1.0 (full base bonus)
 * - 6 letters: 1.5 (1.5x bonus)
 * - 7+ letters: 2.0 (2x bonus - perfectionist reward)
 *
 * @param comboLevel - Current combo level (0-∞, typically 0-15)
 * @param wordLength - Length of the word being scored (default: 4)
 * @returns Flat bonus points (0-20 typically)
 *
 * @example
 * getComboBonus(0, 4) // => 0 (no combo)
 * getComboBonus(5, 3) // => 1 (5 * 0.2 = 1)
 * getComboBonus(5, 5) // => 5 (5 * 1.0 = 5)
 * getComboBonus(5, 7) // => 10 (5 * 2.0 = 10)
 */
export function getComboBonus(comboLevel: number, wordLength: number = 4): number {
  if (comboLevel <= 0) return 0; // No bonus for combo 0

  // Word length factor - longer words get significantly better combo bonuses
  let wordLengthFactor: number;
  if (wordLength <= 3) {
    wordLengthFactor = 0.2;  // Very short words - minimal combo bonus
  } else if (wordLength === 4) {
    wordLengthFactor = 0.5;  // Short words - modest combo bonus
  } else if (wordLength === 5) {
    wordLengthFactor = 1.0;  // Medium words - full base bonus
  } else if (wordLength === 6) {
    wordLengthFactor = 1.5;  // Good words - 1.5x bonus
  } else {
    wordLengthFactor = 2.0;  // Long words (7+) - 2x bonus
  }

  const baseBonus = comboLevel;

  return Math.floor(baseBonus * wordLengthFactor);
}

/**
 * Calculate score for a single word
 *
 * Base scoring: Each letter beyond the first gets 1 point
 * - 2 letters = 1 point
 * - 3 letters = 2 points
 * - 4 letters = 3 points
 * - etc.
 *
 * Combo bonus is added based on word length (longer words benefit more)
 * Fire round multiplier (2x) is applied to the final score
 *
 * Final formula: (baseScore + comboBonus) * fireRoundMultiplier
 *
 * @param word - The word being scored (string)
 * @param comboLevel - Current combo level (default: 0)
 * @param fireRoundMultiplier - Fire round multiplier (default: 1, or 2 during fire rounds)
 * @returns Total score for the word
 *
 * @example
 * calculateWordScore('CAT') // => 2 (3 letters - 1 = 2)
 * calculateWordScore('CAT', 5) // => 3 (base 2 + combo bonus 1)
 * calculateWordScore('TESTING', 5, 2) // => 26 ((6 + 10) * 2)
 */
export function calculateWordScore(
  word: string,
  comboLevel: number = 0,
  fireRoundMultiplier: number = 1,
  rarityMultiplier: number = 1
): number {
  const length = word.length;
  if (length < 2) return 0;

  const baseScore = length - 1;
  const bonus = getComboBonus(comboLevel, length);

  return Math.floor((baseScore + bonus) * fireRoundMultiplier * rarityMultiplier);
}

/**
 * Calculate score based on word length only (simplified version)
 *
 * This is a compatibility function for code that only has access to word length.
 * Internally calls calculateWordScore with a dummy word of the specified length.
 *
 * @param wordLength - Length of the word
 * @param comboLevel - Current combo level (default: 0)
 * @param fireRoundMultiplier - Fire round multiplier (default: 1)
 * @returns Score for a word of this length
 *
 * @example
 * calculateWordScoreByLength(4) // => 3 (same as calculateWordScore('ABCD'))
 * calculateWordScoreByLength(6, 5) // => 12 (base 5 + combo 7 = 12)
 *
 * @deprecated Prefer calculateWordScore(word, comboLevel, fireRoundMultiplier) when you have the actual word
 */
export function calculateWordScoreByLength(
  wordLength: number,
  comboLevel: number = 0,
  fireRoundMultiplier: number = 1
): number {
  if (wordLength < 2) return 0;

  // Create a dummy word of the specified length for scoring
  const dummyWord = 'A'.repeat(wordLength);
  return calculateWordScore(dummyWord, comboLevel, fireRoundMultiplier);
}

/**
 * Word score lookup table (legacy compatibility)
 *
 * This table provides base scores for words without combo or fire bonuses.
 * Based on the formula: score = wordLength - 1
 *
 * @deprecated Use calculateWordScore() instead for accurate scoring
 */
export const WORD_SCORES: Record<number, number> = {
  2: 1,  // 2 letters - 1 = 1 point
  3: 2,  // 3 letters - 1 = 2 points
  4: 3,  // 4 letters - 1 = 3 points
  5: 4,  // 5 letters - 1 = 4 points
  6: 5,  // 6 letters - 1 = 5 points
  7: 6,  // 7 letters - 1 = 6 points
  8: 7,  // 8 letters - 1 = 7 points
} as const;
