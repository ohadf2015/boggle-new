/**
 * useAdventureWordValidation Hook
 *
 * Validates words for Adventure Mode using client-side validation:
 * 1. On mount, fetches all valid words for the grid from /api/adventure/solve-grid
 * 2. Validates words synchronously against the pre-solved word set (instant, like multiplayer)
 * 3. Falls back to per-word API validation if pre-solve fails
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
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
  /** Wheel mode: center letter that must be included in every word */
  centerLetter?: string | null;
}

export interface UseAdventureWordValidationReturn {
  /** Whether validation is in progress (only true during fallback API call) */
  isValidating: boolean;
  /** Whether the solve-grid pre-solve is still loading (first load) */
  isSolveGridLoading: boolean;
  /** Last validation result */
  lastValidationResult: WordValidationResult | null;
  /** Validate a word with its path */
  validateWord: (
    word: string,
    path: Array<{ row: number; col: number }>
  ) => Promise<WordValidationResult>;
  /** The pre-solved word set (null while loading) */
  solvedWords: Set<string> | null;
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

    if (visited.has(key)) {
      return false;
    }
    visited.add(key);

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
 * Calculate base score for a valid word (no special tile multipliers).
 */
function calculateScore(wordLength: number): number {
  const baseScore = wordLength * BASE_SCORE_PER_LETTER;
  const lengthMultiplier = LENGTH_BONUS_MULTIPLIER[wordLength] || (wordLength >= 8 ? 4 : 1);
  return Math.round(baseScore * lengthMultiplier);
}

/**
 * Generate a stable cache key for a grid
 */
function gridCacheKey(grid: string[][]): string {
  return grid.map(row => row.join('')).join('|');
}

// ==============================================
// MODULE-LEVEL GRID SOLUTION CACHE
// Persists across component re-mounts within same session
// ==============================================

/** LRU-capped cache — keeps last N grid solutions to prevent unbounded memory growth */
const MAX_CACHE_ENTRIES = 10;
const gridSolutionCache = new Map<string, Set<string>>();

function gridCacheSet(key: string, value: Set<string>) {
  // Delete first so re-insertion moves key to end (Map preserves insertion order)
  gridSolutionCache.delete(key);
  gridSolutionCache.set(key, value);
  // Evict oldest entries if over limit
  if (gridSolutionCache.size > MAX_CACHE_ENTRIES) {
    const oldest = gridSolutionCache.keys().next().value;
    if (oldest !== undefined) gridSolutionCache.delete(oldest);
  }
}

/**
 * Clear caches (exported for testing)
 */
export function clearWordValidationCache(): void {
  gridSolutionCache.clear();
}

// ==============================================
// HOOK
// ==============================================

export function useAdventureWordValidation({
  grid,
  language,
  minWordLength,
  foundWords,
  centerLetter,
}: UseAdventureWordValidationProps): UseAdventureWordValidationReturn {
  const [isValidating, setIsValidating] = useState(false);
  const [lastValidationResult, setLastValidationResult] =
    useState<WordValidationResult | null>(null);

  // Pre-solved word set for instant client-side validation
  const validWordsRef = useRef<Set<string> | null>(null);

  // Abort controller for fallback API calls
  const abortControllerRef = useRef<AbortController | null>(null);

  // Normalize found words for comparison
  const normalizedFoundWords = useMemo(
    () => new Set(foundWords.map((w) => w.toLowerCase())),
    [foundWords]
  );

  // Pre-solve grid on mount / grid change via TanStack Query
  const gridKey = useMemo(() => gridCacheKey(grid), [grid]);

  const { data: solvedWords, isLoading: isSolveGridLoading } = useQuery<Set<string>>({
    queryKey: queryKeys.adventure.solveGrid(language, gridKey),
    queryFn: async ({ signal }): Promise<Set<string>> => {
      // Check module-level cache first
      const cached = gridSolutionCache.get(`${language}:${gridKey}`);
      if (cached) return cached;

      const res = await fetch('/api/adventure/solve-grid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grid, language, minLength: minWordLength }),
        signal,
      });
      if (!res.ok) {
        const err = new Error(`solve-grid ${res.status}`) as Error & { status?: number };
        err.status = res.status;
        throw err;
      }
      const data = await res.json();
      if (data.words && Array.isArray(data.words)) {
        const wordSet = new Set<string>(data.words);
        gridCacheSet(`${language}:${gridKey}`, wordSet);
        return wordSet;
      }
      return new Set<string>();
    },
    staleTime: Infinity,
    retry: (failureCount, error) => {
      const status = (error as Error & { status?: number })?.status;
      if (status !== undefined && status >= 400 && status < 500) return false;
      return failureCount < 3;
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  });

  // Keep ref in sync with query data for use in validateWord callback
  if (solvedWords) {
    validWordsRef.current = solvedWords;
  }

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

      // 2. Check path validity
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

      // 3b. Wheel mode: word must include the center letter
      if (centerLetter && !word.toLowerCase().includes(centerLetter.toLowerCase())) {
        const result: WordValidationResult = {
          isValid: false,
          errorKey: 'adventure.errors.missingCenterLetter',
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

      // 5. Client-side validation against pre-solved word set (INSTANT)
      // Check module-level cache as fallback in case ref hasn't synced yet after query resolved
      const resolvedWords = validWordsRef.current ?? gridSolutionCache.get(`${language}:${gridCacheKey(grid)}`);
      if (resolvedWords) {
        // Keep ref in sync for subsequent calls
        validWordsRef.current = resolvedWords;
        const normalizedWord = word.toLowerCase();
        if (resolvedWords.has(normalizedWord)) {
          const result: WordValidationResult = {
            isValid: true,
            score: calculateScore(word.length),
          };
          setLastValidationResult(result);
          return result;
        } else {
          const result: WordValidationResult = {
            isValid: false,
            errorKey: 'adventure.errors.notInDictionary',
          };
          setLastValidationResult(result);
          recordNotInDictionary(word, language as Language, 'adventure');
          return result;
        }
      }

      // 6. Fallback: per-word API validation (only if pre-solve hasn't loaded yet)
      // Abort any previous in-flight fallback request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const timeoutId = setTimeout(() => controller.abort(), 8000);

      setIsValidating(true);

      try {
        const normalizedWord = word.toLowerCase().trim();
        const response = await fetch('/api/dictionary/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ word: normalizedWord, language }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const data = await response.json();

        const result: WordValidationResult = data.isValid
          ? { isValid: true, score: calculateScore(word.length) }
          : { isValid: false, errorKey: 'adventure.errors.notInDictionary' };

        setLastValidationResult(result);
        setIsValidating(false);

        if (!data.isValid) {
          recordNotInDictionary(word, language as Language, 'adventure');
        }

        return result;
      } catch (error) {
        clearTimeout(timeoutId);
        setIsValidating(false);

        // Aborted by a newer submission — return empty result so caller can ignore
        if (error instanceof Error && error.name === 'AbortError') {
          // Check if aborted by timeout (same controller) vs newer request (different controller)
          if (abortControllerRef.current === controller) {
            // Timed out — return timeout error
            return { isValid: false, errorKey: 'adventure.errors.validationTimeout' };
          }
          // Superseded by newer submission — return no-op result
          return { isValid: false };
        }

        const result: WordValidationResult = {
          isValid: false,
          errorKey: 'adventure.errors.validationFailed',
        };
        setLastValidationResult(result);
        return result;
      }
    },
    [grid, language, minWordLength, normalizedFoundWords, centerLetter]
  );

  return {
    isValidating,
    isSolveGridLoading,
    lastValidationResult,
    validateWord,
    /** The pre-solved word set for this grid (used by hunt mode to pick a target) */
    solvedWords: solvedWords ?? null,
  };
}
