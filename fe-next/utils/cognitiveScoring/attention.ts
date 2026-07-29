/**
 * Attention Domain Calculation
 *
 * Measures sustained focus and concentration.
 * Based on combo maintenance and hint avoidance.
 *
 * High combos indicate sustained attention without breaks.
 * Not using hints shows self-reliance and focus.
 */

interface AttentionInput {
  wordsFound: number;
  maxCombo: number;
  hintsUsed: number;
}

/**
 * Calculate Attention score (0-100)
 *
 * Formula uses absolute combo achievement + word finding bonus:
 * - comboScore = maxCombo * 12 (achieving combos shows sustained focus)
 * - wordBonus = log2(wordsFound) * 5 (finding more words is good, not bad!)
 * - noHintBonus = +10 if no hints used
 * - Score = comboScore + wordBonus + noHintBonus, capped at 100
 *
 * This formula DOES NOT penalize finding more words.
 *
 * Tuned so that:
 * - 3 combo, 10 words, no hints = ~52 points (decent game)
 * - 5 combo, 20 words, no hints = ~72 points (good game)
 * - 8 combo, 30 words, no hints = ~100 points (excellent game)
 */
export function calculateAttention(input: AttentionInput): number {
  const { wordsFound, maxCombo, hintsUsed } = input;

  if (wordsFound === 0) {
    return 0;
  }

  // Base score from combo achievement (sustained attention indicator)
  // maxCombo of 5 = 60 points, maxCombo of 8 = 96 points
  const comboScore = maxCombo * 12;

  // Bonus for finding words (logarithmic to prevent infinite scaling)
  // 10 words = ~17, 20 words = ~22, 30 words = ~25
  const wordBonus = Math.log2(Math.max(1, wordsFound)) * 5;

  // Bonus for not using hints (shows self-reliance)
  const noHintBonus = hintsUsed === 0 ? 10 : 0;

  // Calculate score
  const rawScore = comboScore + wordBonus + noHintBonus;

  // Cap at 100 and round
  return Math.min(100, Math.round(rawScore));
}

/**
 * Calculate combo rate
 */
export function calculateComboRate(maxCombo: number, wordsFound: number): number {
  if (wordsFound === 0) return 0;
  return Math.round((Math.min(1, maxCombo / wordsFound)) * 100) / 100;
}
