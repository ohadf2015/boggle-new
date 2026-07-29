/**
 * useAdventureHints Hook
 *
 * Provides hint functionality for adventure mode when players are stuck.
 * Features:
 * - Fetches valid words from grid via solve-grid API
 * - Finds paths for hint words using client-side DFS
 * - Tracks inactivity and triggers auto-hints after threshold
 * - Prioritizes easy words for hints
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

// ==============================================
// TYPES
// ==============================================

export interface GridPosition {
  row: number;
  col: number;
}

export interface HintResult {
  word: string;
  path: GridPosition[];
}

/** Default gold cost for a paid hint */
export const DEFAULT_HINT_GOLD_COST = 15;

export interface UseAdventureHintsOptions {
  /** The current grid letters */
  grid: string[][];
  /** Language for word validation */
  language: string;
  /** Words already found by the player */
  foundWords: string[];
  /** Whether the game is currently playing (not paused) */
  isPlaying: boolean;
  /** Inactivity threshold in milliseconds (default: 15000) */
  inactivityThresholdMs?: number;
  /** Max hints per level from Word Radar upgrade (undefined = unlimited) */
  maxHintsPerLevel?: number;
  /** Free hints per level before gold is charged (default: 1) */
  freeHintsPerLevel?: number;
  /** Gold cost per hint after free hints are used (default: 15) */
  goldCostPerHint?: number;
  /** Callback to deduct gold — returns true if player can afford it */
  onSpendGold?: (amount: number) => boolean;
  /** Callback when auto-hint is triggered */
  onAutoHint?: (hint: HintResult) => void;
}

export interface UseAdventureHintsReturn {
  /** Whether words are still being fetched */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Whether hints are available (unfound words exist) */
  hasHintsAvailable: boolean;
  /** List of remaining unfound words */
  remainingHintWords: string[];
  /** Get a hint (returns word and path) */
  getHint: () => HintResult | null;
  /** Find path for a specific word */
  findPathForWord: (word: string) => GridPosition[] | null;
  /** Reset inactivity timer (call when player is active) */
  recordActivity: () => void;
  /** Whether auto-hint should be shown */
  showAutoHint: boolean;
  /** Dismiss the auto-hint */
  dismissAutoHint: () => void;
  /** Currently active hint (for UI highlighting) */
  currentHint: HintResult | null;
  /** Clear the current hint */
  clearCurrentHint: () => void;
  /** Remaining hint budget (undefined = unlimited) */
  hintsRemaining?: number;
  /** Free hints remaining before gold is charged */
  freeHintsRemaining: number;
  /** Gold cost of the next hint (0 if free hints remain) */
  nextHintCost: number;
}

// Direction vectors for 8-way adjacent movement (matching boggleSolver)
const DIRECTIONS: [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1],  // up-left, up, up-right
  [0, -1],           [0, 1],   // left, right
  [1, -1],  [1, 0],  [1, 1]    // down-left, down, down-right
];

// ==============================================
// PATH FINDING UTILITIES
// ==============================================

/**
 * Find a valid path for a word on the grid using DFS
 * Returns null if no valid path exists
 */
function findWordPath(
  grid: string[][],
  word: string
): GridPosition[] | null {
  const upperWord = word.toUpperCase();
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  if (rows === 0 || cols === 0 || upperWord.length === 0) {
    return null;
  }

  // Find all starting positions (cells matching first letter)
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (grid[row][col].toUpperCase() === upperWord[0]) {
        const visited = new Set<string>();
        const path = dfsPath(grid, upperWord, row, col, 0, visited);
        if (path) {
          return path;
        }
      }
    }
  }

  return null;
}

/**
 * DFS helper to find path
 */
function dfsPath(
  grid: string[][],
  word: string,
  row: number,
  col: number,
  charIndex: number,
  visited: Set<string>
): GridPosition[] | null {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const key = `${row},${col}`;

  // Bounds check
  if (row < 0 || row >= rows || col < 0 || col >= cols) {
    return null;
  }

  // Already visited this cell
  if (visited.has(key)) {
    return null;
  }

  // Letter doesn't match
  if (grid[row][col].toUpperCase() !== word[charIndex].toUpperCase()) {
    return null;
  }

  // Found complete word
  if (charIndex === word.length - 1) {
    return [{ row, col }];
  }

  // Mark as visited and continue search
  visited.add(key);

  // Try all adjacent cells
  for (const [dRow, dCol] of DIRECTIONS) {
    const newRow = row + dRow;
    const newCol = col + dCol;
    const restPath = dfsPath(grid, word, newRow, newCol, charIndex + 1, visited);
    if (restPath) {
      visited.delete(key);
      return [{ row, col }, ...restPath];
    }
  }

  // Backtrack
  visited.delete(key);
  return null;
}

// ==============================================
// AUTO-HINT TRIGGER
// ==============================================

/**
 * Trigger an auto-hint: find the first remaining word, resolve its path,
 * set it as the current hint, and invoke the callback.
 */
function triggerAutoHint(
  remainingWords: string[],
  grid: string[][],
  setCurrentHint: (hint: HintResult | null) => void,
  setShowAutoHint: (show: boolean) => void,
  onAutoHintRef: { current: ((hint: HintResult) => void) | undefined }
): void {
  setShowAutoHint(true);

  const word = remainingWords[0];
  if (!word) return;

  const path = findWordPath(grid, word);
  if (!path) return;

  const hint = { word, path };
  setCurrentHint(hint);
  onAutoHintRef.current?.(hint);
}

// ==============================================
// HOOK
// ==============================================

export function useAdventureHints(options: UseAdventureHintsOptions): UseAdventureHintsReturn {
  const {
    grid,
    language,
    foundWords,
    isPlaying,
    inactivityThresholdMs = 15000,
    maxHintsPerLevel,
    freeHintsPerLevel = 1,
    goldCostPerHint = DEFAULT_HINT_GOLD_COST,
    onSpendGold,
    onAutoHint,
  } = options;

  // Hint budget tracking (undefined = unlimited)
  const [hintsUsed, setHintsUsed] = useState(0);
  const hintsRemaining = maxHintsPerLevel !== undefined ? Math.max(0, maxHintsPerLevel - hintsUsed) : undefined;

  // State
  const [showAutoHint, setShowAutoHint] = useState(false);
  const [currentHint, setCurrentHint] = useState<HintResult | null>(null);

  // Refs
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onAutoHintRef = useRef(onAutoHint);
  // Refs for timer callback to avoid stale closures and prevent effect re-runs
  const gridRef = useRef(grid);
  const remainingHintWordsRef = useRef<string[]>([]);

  // Keep refs updated
  useEffect(() => {
    onAutoHintRef.current = onAutoHint;
  }, [onAutoHint]);

  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);

  // Note: remainingHintWordsRef is updated after remainingHintWords is declared below

  // Fetch valid words from solve-grid API via TanStack Query
  const gridKey = useMemo(() => grid.map(row => row.join('')).join('|'), [grid]);

  const {
    data: allWords = { easy: [], medium: [], hard: [] },
    isLoading,
    error: queryError,
  } = useQuery<{ easy: string[]; medium: string[]; hard: string[] }>({
    queryKey: queryKeys.adventure.hintsSolveGrid(language, gridKey),
    queryFn: async ({ signal }) => {
      const response = await fetch('/api/solve-grid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grid, language }),
        signal,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch words');
      }

      const data = await response.json();
      if (!data.success || !data.words) {
        throw new Error('Invalid response from solve-grid');
      }

      return data.words;
    },
    staleTime: Infinity,
  });

  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Unknown error') : null;

  // Calculate remaining words (not yet found)
  const remainingHintWords = useMemo(() => {
    const foundSet = new Set(foundWords.map(w => w.toUpperCase()));
    const remaining: string[] = [];

    // Add in order of priority: easy first, then medium, then hard
    for (const word of allWords.easy) {
      if (!foundSet.has(word.toUpperCase())) {
        remaining.push(word);
      }
    }
    for (const word of allWords.medium) {
      if (!foundSet.has(word.toUpperCase())) {
        remaining.push(word);
      }
    }
    for (const word of allWords.hard) {
      if (!foundSet.has(word.toUpperCase())) {
        remaining.push(word);
      }
    }

    return remaining;
  }, [allWords, foundWords]);

  // Keep remainingHintWordsRef updated for timer callback
  useEffect(() => {
    remainingHintWordsRef.current = remainingHintWords;
  }, [remainingHintWords]);

  // Check if hints are available (respects hint budget from Word Radar upgrade)
  const hasHintsAvailable = !isLoading && !error && remainingHintWords.length > 0
    && (hintsRemaining === undefined || hintsRemaining > 0);

  // Find path for word
  const findPathForWord = useCallback((word: string): GridPosition[] | null => {
    return findWordPath(grid, word);
  }, [grid]);

  // Free hints remaining before gold is charged
  const freeHintsRemaining = Math.max(0, freeHintsPerLevel - hintsUsed);
  const nextHintCost = freeHintsRemaining > 0 ? 0 : goldCostPerHint;

  // Get a hint
  const getHint = useCallback((): HintResult | null => {
    if (!hasHintsAvailable || remainingHintWords.length === 0) {
      return null;
    }

    // Check if this hint costs gold (free hints exhausted)
    const isFreeHint = hintsUsed < freeHintsPerLevel;
    if (!isFreeHint) {
      // Try to charge gold
      if (onSpendGold) {
        const canAfford = onSpendGold(goldCostPerHint);
        if (!canAfford) return null;
      }
    }

    // Get first remaining word (prioritized by difficulty)
    const word = remainingHintWords[0];
    const path = findPathForWord(word);

    if (!path) {
      return null;
    }

    const hint = { word, path };
    setCurrentHint(hint);
    setHintsUsed(prev => prev + 1);
    return hint;
  }, [hasHintsAvailable, remainingHintWords, findPathForWord, hintsUsed, freeHintsPerLevel, goldCostPerHint, onSpendGold]);

  // Ref to track if timer was started (declared before recordActivity)
  const timerStartedRef = useRef(false);

  // Record activity (resets inactivity timer)
  const recordActivity = useCallback(() => {
    // Clear existing timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }

    // Hide any auto-hint
    setShowAutoHint(false);

    // Start new timer if playing (use refs to avoid stale closures)
    if (isPlaying && hasHintsAvailable) {
      timerStartedRef.current = true;
      inactivityTimerRef.current = setTimeout(() => {
        triggerAutoHint(remainingHintWordsRef.current, gridRef.current, setCurrentHint, setShowAutoHint, onAutoHintRef);
      }, inactivityThresholdMs);
    }
  }, [isPlaying, hasHintsAvailable, inactivityThresholdMs]);

  // Dismiss auto-hint
  const dismissAutoHint = useCallback(() => {
    setShowAutoHint(false);
  }, []);

  // Clear current hint
  const clearCurrentHint = useCallback(() => {
    setCurrentHint(null);
  }, []);

  // Start inactivity timer when playing and hints available
  // Uses refs for remainingHintWords and grid to avoid effect re-runs on their changes
  useEffect(() => {
    // Only start timer once when conditions are first met
    if (isPlaying && hasHintsAvailable && !isLoading && !timerStartedRef.current) {
      timerStartedRef.current = true;

      // Start the inactivity timer
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }

      inactivityTimerRef.current = setTimeout(() => {
        // Use refs to get current values, avoiding stale closures
        triggerAutoHint(remainingHintWordsRef.current, gridRef.current, setCurrentHint, setShowAutoHint, onAutoHintRef);
      }, inactivityThresholdMs);
    }

    // Pause timer when game is paused
    if (!isPlaying && inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
      timerStartedRef.current = false;
    }

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
    };
  }, [isPlaying, hasHintsAvailable, isLoading, inactivityThresholdMs]);

  return {
    isLoading,
    error,
    hasHintsAvailable,
    remainingHintWords,
    getHint,
    findPathForWord,
    recordActivity,
    showAutoHint,
    dismissAutoHint,
    currentHint,
    clearCurrentHint,
    hintsRemaining,
    freeHintsRemaining,
    nextHintCost,
  };
}
