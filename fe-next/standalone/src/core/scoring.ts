/**
 * Canonical Scoring Calculation Utilities
 *
 * This is the SINGLE SOURCE OF TRUTH for all scoring logic in LexiClash.
 *
 * Handles:
 * - Base word scoring (exponential, length-based)
 * - Combo bonuses (flat bonuses that scale with word length)
 * - Combo multipliers (currently unused, but available for future)
 * - Fire round multipliers (2x during earthquake fire rounds)
 * - Keyboard bonus multiplier (+10% for keyboard input in multiplayer)
 *
 * IMPORTANT: All other scoring implementations should import from this file.
 * Do not duplicate scoring logic elsewhere.
 *
 * @module shared/utils/scoring
 */

/**
 * Keyboard input bonus multiplier.
 * Desktop players using keyboard get +10% score reward to balance
 * the effort of keyboard input vs tap/drag on mobile.
 */
export const KB_BONUS_MULT = 1.1;

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
 * NOTE: Base word scoring uses getComboBonus() (flat additive), NOT this.
 * This multiplier powers downstream systems that layer on top of base score:
 *   - Blast mode (components/blast/BlastGame.tsx) — combo × word score
 *   - Skill effects (utils/skillEffects.ts, hooks/useSkillEffects.ts)
 *   - Scoring engine tier rewards (backend/modules/scoringEngine.ts)
 *   - How-to-play demo (components/how-to-play/InteractiveGridDemo.tsx)
 * Keep tier breakpoints in sync with getComboTierName() above.
 *
 * @param comboLevel - Current combo level (0-∞)
 * @returns Multiplier value (1.0 - 3.0)
 */
export function getComboMultiplier(comboLevel: number): number {
  if (!Number.isFinite(comboLevel) || comboLevel <= 2) return 1.0;
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
  if (!Number.isFinite(comboLevel) || comboLevel <= 0) return 0;
  if (!Number.isFinite(wordLength)) return 0;

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
 * Base score lookup by word length.
 *
 * Exponential curve rewards longer words dramatically:
 * - 2 letters = 5 pts (baseline)
 * - 3 letters = 10 pts
 * - 4 letters = 20 pts
 * - 5 letters = 50 pts
 * - 6 letters = 100 pts
 * - 7 letters = 200 pts
 * - 8+ letters = 500 pts (jackpot!)
 */
const BASE_SCORES: Record<number, number> = {
  2: 5,
  3: 10,
  4: 20,
  5: 50,
  6: 100,
  7: 200,
};
const BASE_SCORE_8_PLUS = 500;

function getBaseScore(wordLength: number): number {
  if (wordLength < 2) return 0;
  if (wordLength >= 8) return BASE_SCORE_8_PLUS;
  return BASE_SCORES[wordLength] ?? 0;
}

/**
 * Metadata for score calculation (input method, etc.)
 */
export interface ScoringMeta {
  inputMethod?: 'kb' | 'drag';
}

/**
 * Calculate score for a single word
 *
 * Exponential base scoring rewards longer words dramatically.
 * Combo bonus is added based on word length (longer words benefit more).
 * Fire round multiplier (2x) is applied to the final score.
 * Keyboard bonus (1.1x) is applied last as the final multiplier.
 *
 * Final formula: floor((baseScore + comboBonus) * fireRoundMultiplier * rarityMultiplier * kbBonus)
 * Where kbBonus = 1.1 if inputMethod='kb', else 1.0
 *
 * @param word - The word being scored (string)
 * @param comboLevel - Current combo level (default: 0)
 * @param fireRoundMultiplier - Fire round multiplier (default: 1, or 2 during fire rounds)
 * @param rarityMultiplier - Rarity multiplier (default: 1, or 1.15-1.5 for rare words)
 * @param meta - Metadata including inputMethod (default: { inputMethod: 'drag' })
 * @returns Total score for the word
 *
 * @example
 * calculateWordScore('CAT') // => 10 (3 letters = 10 pts)
 * calculateWordScore('HOUSE') // => 50 (5 letters = 50 pts)
 * calculateWordScore('TESTING', 5, 2) // => 420 ((200 + 10) * 2)
 * calculateWordScore('CAT', 0, 1, 1, { inputMethod: 'kb' }) // => 11 (10 * 1.1)
 */
export function calculateWordScore(
  word: string,
  comboLevel: number = 0,
  fireRoundMultiplier: number = 1,
  rarityMultiplier: number = 1,
  meta: ScoringMeta = {}
): number {
  const length = word.length;
  if (length < 2) return 0;

  const baseScore = getBaseScore(length);
  const bonus = getComboBonus(comboLevel, length);

  let score = Math.floor((baseScore + bonus) * fireRoundMultiplier * rarityMultiplier);

  // Apply keyboard bonus as final multiplier (after all other multipliers)
  if (meta.inputMethod === 'kb') {
    score = Math.round(score * KB_BONUS_MULT);
  }

  return score;
}

/** Base score lookup — derived from BASE_SCORES for backward compat */
export const WORD_SCORES: Record<number, number> = {
  ...BASE_SCORES,
  8: BASE_SCORE_8_PLUS,
} as const;

/**
 * Calculate score based on word length only (simplified version).
 * Prefer calculateWordScore(word, ...) when you have the actual word.
 */
export function calculateWordScoreByLength(
  wordLength: number,
  comboLevel: number = 0,
  fireRoundMultiplier: number = 1,
  rarityMultiplier: number = 1,
  meta: ScoringMeta = {}
): number {
  if (wordLength < 2) return 0;
  const dummyWord = 'A'.repeat(wordLength);
  return calculateWordScore(dummyWord, comboLevel, fireRoundMultiplier, rarityMultiplier, meta);
}

// ==============================================
// WORD HUNT RANKING
// ==============================================

/**
 * Sort players so the Word Hunt target finder ranks first, with ties broken by score.
 * Used by both server (gameScores.ts) and client (useResultsData.ts) to ensure consistency.
 *
 * @param items - Array of objects with `username` and a score field
 * @param targetFinder - Username of the player who found the target word
 * @param getScore - Accessor for the score field (default: `item.score`)
 */
export function sortWithWordHuntWinner<T extends { username: string }>(
  items: T[],
  targetFinder: string,
  getScore: (item: T) => number = (item: T) => (item as any).score ?? (item as any).totalScore ?? 0,
): T[] {
  return [...items].sort((a, b) => {
    if (a.username === targetFinder && b.username !== targetFinder) return -1;
    if (b.username === targetFinder && a.username !== targetFinder) return 1;
    return getScore(b) - getScore(a);
  });
}
