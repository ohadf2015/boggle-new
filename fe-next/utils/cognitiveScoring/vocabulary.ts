/**
 * Vocabulary Domain Calculation
 *
 * Measures depth and breadth of word knowledge.
 * Based on ratio of rare/legendary words found.
 *
 * Finding obscure words shows deeper vocabulary knowledge
 * beyond common everyday words.
 */

interface VocabularyInput {
  wordsFound: number;
  rareWordCount: number;
  legendaryWordCount: number;
}

/**
 * Calculate Vocabulary score (0-100)
 *
 * Formula uses absolute rare word count + ratio bonus:
 * - baseScore = rareWordCount * 15 + legendaryWordCount * 30
 * - ratioBonus = (rareRatio * 50) if rareRatio > 0.1
 * - Score = baseScore + ratioBonus, capped at 100
 *
 * Legendary words count double because they're much harder to find.
 *
 * Tuned so that:
 * - 2 rare words (10%) = ~35 points (decent)
 * - 3 rare words (15%) = ~55 points (good)
 * - 5 rare words (25%) = ~85 points (excellent)
 * - 1 legendary word adds significant bonus
 *
 * This formula rewards finding rare words without requiring
 * unrealistic ratios for decent scores.
 */
export function calculateVocabulary(input: VocabularyInput): number {
  const { wordsFound, rareWordCount, legendaryWordCount } = input;

  if (wordsFound === 0) {
    return 0;
  }

  // Base score from absolute rare word count
  // Each rare word = 15 points, each legendary = 30 points
  const baseScore = (rareWordCount * 15) + (legendaryWordCount * 30);

  // Bonus for higher rare ratio (rewards efficiency)
  const weightedRareCount = rareWordCount + (legendaryWordCount * 2);
  const rareRatio = weightedRareCount / wordsFound;
  const ratioBonus = rareRatio > 0.1 ? rareRatio * 50 : 0;

  // Calculate score
  const rawScore = baseScore + ratioBonus;

  // Cap at 100 and round
  return Math.min(100, Math.round(rawScore));
}

/**
 * Calculate rare word ratio
 */
export function calculateRareWordRatio(
  rareWordCount: number,
  legendaryWordCount: number,
  wordsFound: number
): number {
  if (wordsFound === 0) return 0;
  const weightedRareCount = rareWordCount + (legendaryWordCount * 2);
  return Math.round((weightedRareCount / wordsFound) * 100) / 100;
}
