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
import { recordNotInDictionary } from '@/utils/invalidWordTracker';
import type { Language } from '@/types';

// ==============================================
// TYPES
// ==============================================

export interface WordValidationResult {
  isValid: boolean;
  errorKey?: string;
  score?: number;
}

/** Tile state for score calculation with special tile multipliers */
export interface TileStateForValidation {
  letter: string;
  type: 'standard' | 'gold' | 'ice' | 'bomb' | 'rainbow' | 'chain' | 'time' | 'locked' | 'multiplier';
  isCleared: boolean;
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
  /** Optional tile states for special tile multiplier calculation */
  tiles?: TileStateForValidation[][];
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

/** Gold tile score multiplier */
const GOLD_MULTIPLIER = 3;

/** Rainbow tile score multiplier */
const RAINBOW_MULTIPLIER = 1.25;

/** Maximum cache size to prevent memory leaks */
const MAX_CACHE_SIZE = 500;

// ==============================================
// WORD VALIDATION CACHE
// Module-level cache persists across component re-mounts
// Provides instant validation for previously checked words
// ==============================================

/** Cache key format: "language:word" (lowercase) */
type CacheKey = string;

/** Cached validation result (true = valid, false = invalid) */
const wordValidationCache = new Map<CacheKey, boolean>();

/**
 * Get cache key for a word+language combination
 */
function getCacheKey(word: string, language: string): CacheKey {
  return `${language}:${word.toLowerCase()}`;
}

/**
 * Get cached validation result if available
 */
function getCachedValidation(word: string, language: string): boolean | undefined {
  return wordValidationCache.get(getCacheKey(word, language));
}

/**
 * Store validation result in cache with LRU eviction
 */
function setCachedValidation(word: string, language: string, isValid: boolean): void {
  const key = getCacheKey(word, language);

  // Simple LRU: if cache is full, delete oldest entries (first 100)
  if (wordValidationCache.size >= MAX_CACHE_SIZE) {
    const keysToDelete = Array.from(wordValidationCache.keys()).slice(0, 100);
    keysToDelete.forEach(k => wordValidationCache.delete(k));
  }

  wordValidationCache.set(key, isValid);
}

/**
 * Clear the word validation cache (exported for testing)
 */
export function clearWordValidationCache(): void {
  wordValidationCache.clear();
}

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
 * Calculate score for a valid word including special tile multipliers
 * @param wordLength - Length of the word
 * @param tiles - Optional 2D array of tile states
 * @param path - Optional path of positions to check for special tiles
 */
function calculateScore(
  wordLength: number,
  tiles?: TileStateForValidation[][],
  path?: Array<{ row: number; col: number }>
): number {
  const baseScore = wordLength * BASE_SCORE_PER_LETTER;
  const lengthMultiplier = LENGTH_BONUS_MULTIPLIER[wordLength] || (wordLength >= 8 ? 4 : 1);
  let score = Math.round(baseScore * lengthMultiplier);

  // Apply special tile multipliers if tiles and path are provided
  if (tiles && path && path.length > 0) {
    // Check for gold tile in path (3x multiplier)
    const hasGold = path.some(
      (pos) => tiles[pos.row]?.[pos.col]?.type === 'gold'
    );
    if (hasGold) {
      score = Math.round(score * GOLD_MULTIPLIER);
    }

    // Check for rainbow tile in path (1.25x multiplier)
    const hasRainbow = path.some(
      (pos) => tiles[pos.row]?.[pos.col]?.type === 'rainbow'
    );
    if (hasRainbow) {
      score = Math.floor(score * RAINBOW_MULTIPLIER);
    }
  }

  return score;
}

// ==============================================
// HOOK
// ==============================================

export function useAdventureWordValidation({
  grid,
  language,
  minWordLength,
  foundWords,
  tiles,
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

      // 5. Check client-side cache first (instant validation for repeated words)
      const cachedResult = getCachedValidation(word, language);
      if (cachedResult !== undefined) {
        if (cachedResult) {
          const result: WordValidationResult = {
            isValid: true,
            score: calculateScore(word.length, tiles, path),
          };
          setLastValidationResult(result);
          return result;
        } else {
          const result: WordValidationResult = {
            isValid: false,
            errorKey: 'adventure.errors.notInDictionary',
          };
          setLastValidationResult(result);
          return result;
        }
      }

      // 6. Validate against dictionary (API call)
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
          // Cache the valid result
          setCachedValidation(word, language, true);

          const result: WordValidationResult = {
            isValid: true,
            score: calculateScore(word.length, tiles, path),
          };
          setLastValidationResult(result);
          setIsValidating(false);
          return result;
        } else {
          // Cache the invalid result
          setCachedValidation(word, language, false);

          const result: WordValidationResult = {
            isValid: false,
            errorKey: 'adventure.errors.notInDictionary',
          };
          setLastValidationResult(result);
          setIsValidating(false);
          // Track invalid word for admin review
          recordNotInDictionary(word, language as Language, 'adventure');
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
    [grid, language, minWordLength, normalizedFoundWords, tiles]
  );

  return {
    isValidating,
    lastValidationResult,
    validateWord,
  };
}
