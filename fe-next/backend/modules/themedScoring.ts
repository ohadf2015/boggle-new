/**
 * Themed Scoring Module
 * Bonus scoring for words that belong to an active word pack theme.
 */

export const THEMED_MULTIPLIER = 2;

/**
 * Returns true if the word (case-insensitive) is in the pack set.
 */
export function isThemedWord(word: string, packWords: Set<string>): boolean {
  return packWords.has(word.toUpperCase());
}

/**
 * Returns baseScore * THEMED_MULTIPLIER for themed words, baseScore otherwise.
 */
export function calculateThemedBonus(
  baseScore: number,
  word: string,
  packWords: Set<string> | null
): number {
  if (!packWords || !isThemedWord(word, packWords)) return baseScore;
  return baseScore * THEMED_MULTIPLIER;
}

/**
 * Returns count of player words that match the pack (case-insensitive).
 */
export function getThemedWordsFound(
  playerWords: string[],
  packWords: Set<string>
): number {
  return playerWords.filter(w => packWords.has(w.toUpperCase())).length;
}

/**
 * Returns { found, total, words } summary of themed words found by player.
 */
export function getThemedSummary(
  playerWords: string[],
  packWords: Set<string>
): { found: number; total: number; words: string[] } {
  const themed = playerWords.filter(w => packWords.has(w.toUpperCase()));
  return { found: themed.length, total: packWords.size, words: themed };
}
