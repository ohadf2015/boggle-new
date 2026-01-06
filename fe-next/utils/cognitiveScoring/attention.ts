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
 * Formula:
 * - comboRate = maxCombo / wordsFound (what % of words were in a combo)
 * - noHintBonus = 1.1 if no hints, else 1.0
 * - Score = comboRate * 100 * noHintBonus, capped at 100
 *
 * Tuned so that:
 * - 50% combo rate with no hints = 55 points
 * - 80% combo rate with no hints = 88 points
 * - 100% combo rate with no hints = 100 points (perfect)
 */
export function calculateAttention(input: AttentionInput): number {
  const { wordsFound, maxCombo, hintsUsed } = input;

  if (wordsFound === 0) {
    return 0;
  }

  // Calculate combo rate (percentage of words that were part of max combo chain)
  // This is an approximation - true combo calculation would need full history
  const comboRate = Math.min(1, maxCombo / wordsFound);

  // Bonus for not using hints (shows self-reliance)
  const noHintBonus = hintsUsed === 0 ? 1.1 : 1.0;

  // Calculate score
  const rawScore = comboRate * 100 * noHintBonus;

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
