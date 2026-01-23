/**
 * useAdventureWordValidation Hook
 *
 * Validates words for Adventure Mode by checking:
 * 1. Path validity (adjacent tiles, no repeats)
 * 2. Word matches path letters
 * 3. Minimum length requirement
 * 4. Not already found
 * 5. Exists in dictionary (via API)
 */

import { useState, useCallback, useMemo, useRef } from 'react';

// ==============================================
// TYPES
// ==============================================

export interface WordValidationResult {
  isValid: boolean;
  errorKey?: string;
  score?: number;
}

export interface UseAdventureWordValidationProps {
  /** The letter grid (2D array) */
  grid: string[][];
  /** Language for dictionary validation */
  language: string;
  /** Minimum word length */
  minWordLength: number;
  /** Already found words */
  foundWords: string[];
}

export interface UseAdventureWordValidationReturn {
  /** Whether validation is in progress */
  isValidating: boolean;
  /** Last validation result */
  lastValidationResult: WordValidationResult | null;
  /** Validate a word with its path */
  validateWord: (
    word: string,
    path: Array<{ row: number; col: number }>
  ) => Promise<WordValidationResult>;
}

// ==============================================
// CONSTANTS
// ==============================================

/** Base score per letter */
const BASE_SCORE_PER_LETTER = 10;

/** Bonus score multiplier for longer words */
const LENGTH_BONUS_MULTIPLIER: Record<number, number> = {
  3: 1,
  4: 1.5,
  5: 2,
  6: 2.5,
  7: 3,
  8: 4,
};

// ==============================================
// HELPER FUNCTIONS
// ==============================================

/**
 * Check if two positions are adjacent (including diagonals)
 */
function isAdjacent(
  pos1: { row: number; col: number },
  pos2: { row: number; col: number }
): boolean {
  const rowDiff = Math.abs(pos1.row - pos2.row);
  const colDiff = Math.abs(pos1.col - pos2.col);
  return rowDiff <= 1 && colDiff <= 1 && !(rowDiff === 0 && colDiff === 0);
}

/**
 * Validate that path forms a valid sequence of adjacent tiles without repeats
 */
function isValidPath(path: Array<{ row: number; col: number }>): boolean {
  if (path.length === 0) return true;

  const visited = new Set<string>();

  for (let i = 0; i < path.length; i++) {
    const pos = path[i];
    const key = `${pos.row},${pos.col}`;

    // Check for repeated tile
    if (visited.has(key)) {
      return false;
    }
    visited.add(key);

    // Check adjacency (skip first tile)
    if (i > 0 && !isAdjacent(path[i - 1], pos)) {
      return false;
    }
  }

  return true;
}

/**
 * Get the word formed by following a path on the grid
 */
function getWordFromPath(
  grid: string[][],
  path: Array<{ row: number; col: number }>
): string {
  return path.map((pos) => grid[pos.row]?.[pos.col] ?? '').join('');
}

/**
 * Calculate score for a valid word
 */
function calculateScore(wordLength: number): number {
  const baseScore = wordLength * BASE_SCORE_PER_LETTER;
  const multiplier = LENGTH_BONUS_MULTIPLIER[wordLength] || (wordLength >= 8 ? 4 : 1);
  return Math.round(baseScore * multiplier);
}

// ==============================================
// HOOK
// ==============================================

export function useAdventureWordValidation({
  grid,
  language,
  minWordLength,
  foundWords,
}: UseAdventureWordValidationProps): UseAdventureWordValidationReturn {
  const [isValidating, setIsValidating] = useState(false);
  const [lastValidationResult, setLastValidationResult] =
    useState<WordValidationResult | null>(null);

  // Abort controller for request deduplication
  // Cancels previous in-flight request when new validation starts
  const abortControllerRef = useRef<AbortController | null>(null);

  // Normalize found words for comparison
  const normalizedFoundWords = useMemo(
    () => new Set(foundWords.map((w) => w.toLowerCase())),
    [foundWords]
  );

  const validateWord = useCallback(
    async (
      word: string,
      path: Array<{ row: number; col: number }>
    ): Promise<WordValidationResult> => {
      // 1. Check minimum length
      if (word.length < minWordLength) {
        const result: WordValidationResult = {
          isValid: false,
          errorKey: 'adventure.errors.tooShort',
        };
        setLastValidationResult(result);
        return result;
      }

      // 2. Check path validity (adjacent tiles, no repeats)
      if (!isValidPath(path)) {
        const result: WordValidationResult = {
          isValid: false,
          errorKey: 'adventure.errors.invalidPath',
        };
        setLastValidationResult(result);
        return result;
      }

      // 3. Check word matches path letters
      const pathWord = getWordFromPath(grid, path);
      if (pathWord.toUpperCase() !== word.toUpperCase()) {
        const result: WordValidationResult = {
          isValid: false,
          errorKey: 'adventure.errors.wordMismatch',
        };
        setLastValidationResult(result);
        return result;
      }

      // 4. Check if already found
      if (normalizedFoundWords.has(word.toLowerCase())) {
        const result: WordValidationResult = {
          isValid: false,
          errorKey: 'adventure.errors.alreadyFound',
        };
        setLastValidationResult(result);
        return result;
      }

      // 5. Validate against dictionary (API call)
      // Cancel any previous in-flight request (request deduplication)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setIsValidating(true);

      try {
        const response = await fetch('/api/validate-word', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ word, language }),
          signal: abortControllerRef.current.signal,
        });

        const data = await response.json();

        if (data.isValid) {
          const result: WordValidationResult = {
            isValid: true,
            score: calculateScore(word.length),
          };
          setLastValidationResult(result);
          setIsValidating(false);
          return result;
        } else {
          const result: WordValidationResult = {
            isValid: false,
            errorKey: 'adventure.errors.notInDictionary',
          };
          setLastValidationResult(result);
          setIsValidating(false);
          return result;
        }
      } catch (error) {
        // Ignore aborted requests (user started new validation)
        if (error instanceof Error && error.name === 'AbortError') {
          return {
            isValid: false,
            errorKey: 'adventure.errors.validationCancelled',
          };
        }

        const result: WordValidationResult = {
          isValid: false,
          errorKey: 'adventure.errors.validationFailed',
        };
        setLastValidationResult(result);
        setIsValidating(false);
        return result;
      }
    },
    [grid, language, minWordLength, normalizedFoundWords]
  );

  return {
    isValidating,
    lastValidationResult,
    validateWord,
  };
}
