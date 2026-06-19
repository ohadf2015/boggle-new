/**
 * useWordCategories - Shared hook for categorizing and analyzing word data
 *
 * Consolidates duplicated word processing logic from:
 * - ResultsPlayerCard.tsx
 * - SinglePlayerResults.tsx / useResultsData.ts
 */

import { useMemo } from 'react';
import { categorizeWords, calculateWordStats } from './utils';
import type { WordObject } from './types';

export interface UseWordCategoriesResult {
  // Categorized word lists
  validWords: WordObject[];
  invalidWords: WordObject[];
  duplicateWords: WordObject[];

  // Grouped by points for display
  wordsByPoints: Record<number, WordObject[]>;
  sortedPointGroups: number[];

  // Summary statistics
  totalComboBonus: number;
  totalFireRoundBonus: number;
  longestWord: string;
  accuracy: number;

  // Best word by score
  bestWord: WordObject | null;
}

/**
 * Hook to process and categorize word data for results display
 *
 * @example
 * ```tsx
 * const { validWords, wordsByPoints, sortedPointGroups, totalComboBonus } =
 *   useWordCategories(player.allWords);
 *
 * // Use with WordPointsGroup component
 * <WordPointsGroup
 *   wordsByPoints={wordsByPoints}
 *   sortedPointGroups={sortedPointGroups}
 *   t={t}
 *   mode="simple"
 * />
 * ```
 */
export function useWordCategories(allWords: WordObject[] | undefined): UseWordCategoriesResult {
  return useMemo(() => {
    const {
      validWords,
      invalidWords,
      duplicateWords,
      wordsByPoints,
      sortedPointGroups,
    } = categorizeWords(allWords);

    const stats = calculateWordStats(allWords);

    // Find best word by score
    const bestWord = validWords.length > 0
      ? validWords.reduce((best, w) =>
          (w.score || 0) > (best?.score || 0) ? w : best, validWords[0]
        )
      : null;

    return {
      validWords,
      invalidWords,
      duplicateWords,
      wordsByPoints,
      sortedPointGroups,
      totalComboBonus: stats.totalComboBonus,
      totalFireRoundBonus: stats.totalFireRoundBonus,
      longestWord: stats.longestWord,
      accuracy: stats.accuracy,
      bestWord,
    };
  }, [allWords]);
}

export default useWordCategories;
