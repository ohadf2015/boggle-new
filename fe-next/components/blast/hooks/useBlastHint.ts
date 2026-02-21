'use client';

import { useState, useCallback, useMemo } from 'react';
import { findHintPath, hasValidWords } from '../utils/blastDeadEndDetector';

interface UseBlastHintReturn {
  /** Current hint cell path (null when no hint active) */
  hintPath: Array<{ row: number; col: number }> | null;
  /** Whether a hint word exists in the current grid */
  hasHintAvailable: boolean;
  /** Find and display a hint word path */
  requestHint: () => void;
  /** Clear the hint path */
  clearHint: () => void;
}

/**
 * useBlastHint - Finds and displays a valid word path hint.
 *
 * Uses the same DFS as dead-end detection but returns the full path
 * for grid highlight via BlastGrid's highlightedPath prop.
 *
 * @param grid - Current grid (empty strings for cleared cells)
 * @param language - Game language
 * @param checkWord - Dictionary lookup from useDictionaryCache
 * @param foundWords - Words already found (excluded from hint)
 * @param minWordLength - Min word length (matches wave config)
 */
export function useBlastHint(
  grid: string[][],
  language: string,
  checkWord: (word: string) => boolean,
  foundWords: Set<string>,
  minWordLength: number = 3,
): UseBlastHintReturn {
  const [hintPath, setHintPath] = useState<Array<{ row: number; col: number }> | null>(null);

  // Check if any hint is available (same check as dead-end detection)
  const hasHintAvailable = useMemo(
    () => hasValidWords(grid, language, checkWord, foundWords, minWordLength),
    [grid, language, checkWord, foundWords, minWordLength],
  );

  const requestHint = useCallback(() => {
    const result = findHintPath(grid, language, checkWord, foundWords, minWordLength);
    if (result) {
      setHintPath(result.path);
    }
  }, [grid, language, checkWord, foundWords, minWordLength]);

  const clearHint = useCallback(() => {
    setHintPath(null);
  }, []);

  return { hintPath, hasHintAvailable, requestHint, clearHint };
}
