/**
 * Word Rarity System
 *
 * Classifies words by rarity using letter frequency and word length as heuristic.
 * Words with rare letters (Q, Z, X, J) and longer length score higher rarity.
 */

export type WordRarity = 'common' | 'uncommon' | 'rare' | 'epic';

// Letters scored by rarity (higher = rarer)
const LETTER_RARITY: Record<string, number> = {
  Q: 10, Z: 10, X: 8, J: 8,
  K: 5, V: 4, W: 4, Y: 3, F: 3, B: 3,
  G: 2, H: 2, P: 2, M: 2, U: 2, C: 2,
  D: 1, L: 1, R: 1, N: 1, T: 1, O: 1,
  A: 0, E: 0, I: 0, S: 0,
};

/**
 * Calculate a rarity score for a word based on letter composition and length.
 */
function calculateRarityScore(word: string): number {
  if (word.length <= 1) return 0;

  const upper = word.toUpperCase();

  // Sum letter rarity values
  let letterScore = 0;
  for (const ch of upper) {
    letterScore += LETTER_RARITY[ch] ?? 0;
  }

  // Length bonus: longer words are rarer
  const lengthBonus = Math.max(0, upper.length - 4) * 2;

  return letterScore + lengthBonus;
}

/**
 * Get the rarity classification of a word.
 *
 * Uses word length + letter frequency as heuristic:
 * - common: short words with common letters
 * - uncommon: medium words or words with slightly rare letters
 * - rare: words with rare letters (Q, Z, X, J) or long length
 * - epic: words combining rare letters AND long length
 */
export function getWordRarity(word: string): WordRarity {
  const score = calculateRarityScore(word);

  if (score >= 22) return 'epic';
  if (score >= 10) return 'rare';
  if (score >= 5) return 'uncommon';
  return 'common';
}

/**
 * Get score multiplier for a given rarity level.
 */
export function getRarityMultiplier(rarity: WordRarity): number {
  switch (rarity) {
    case 'common': return 1.0;
    case 'uncommon': return 1.25;
    case 'rare': return 1.5;
    case 'epic': return 2.0;
  }
}
