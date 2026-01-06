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
 * Formula:
 * - rareRatio = (rareWords + legendaryWords * 2) / wordsFound
 * - Score = rareRatio * 200, capped at 100
 *
 * Legendary words count double because they're much harder to find.
 *
 * Tuned so that:
 * - 10% rare words = 20 points
 * - 25% rare words = 50 points
 * - 50%+ rare words = 100 points
 *
 * Most players find mostly common words, so high rare % is impressive.
 */
export function calculateVocabulary(input: VocabularyInput): number {
  const { wordsFound, rareWordCount, legendaryWordCount } = input;

  if (wordsFound === 0) {
    return 0;
  }

  // Weight legendary words more heavily (they're much rarer)
  const weightedRareCount = rareWordCount + (legendaryWordCount * 2);

  // Calculate ratio of rare/legendary to total
  const rareRatio = weightedRareCount / wordsFound;

  // Calculate score with multiplier
  const rawScore = rareRatio * 200;

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
