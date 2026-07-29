'use client';

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { selectRandomRevealWord, getRevealableWordCount } from '@/utils/wordPathFinder';
import type { LetterGrid, Language } from '@/shared/types/game';

/** Duration in ms to show the highlighted path */
const HIGHLIGHT_DURATION_MS = 4000; // 4 seconds

interface CellPosition {
  row: number;
  col: number;
}

interface AvailableWords {
  easy: string[];
  medium: string[];
  hard: string[];
}

interface RevealResult {
  word: string;
  path: CellPosition[];
}

interface UseRevealWordOptions {
  /** Available words from grid solver */
  availableWords: AvailableWords | null;
  /** Current grid */
  grid: LetterGrid | null;
  /** List of valid found words */
  foundValidWords: string[];
  /** Game language */
  language: Language;
}

interface UseRevealWordReturn {
  /** Number of reveals used this game */
  revealsUsed: number;
  /** Whether a reveal is currently loading */
  isLoading: boolean;
  /** Currently highlighted path from reveal */
  highlightedPath: CellPosition[];
  /** Number of words that can still be revealed */
  revealableWordCount: number;
  /** Trigger a reveal - returns the revealed word and path, or null if none available */
  handleReveal: () => Promise<RevealResult | null>;
  /** Clear the highlighted path */
  clearHighlight: () => void;
  /** Reset reveal state for new game */
  resetRevealState: () => void;
}

/**
 * Hook to manage the reveal word system
 * Allows players to reveal a word on the board to help them progress
 */
export function useRevealWord({
  availableWords,
  grid,
  foundValidWords,
  language,
}: UseRevealWordOptions): UseRevealWordReturn {
  const [revealsUsed, setRevealsUsed] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedPath, setHighlightedPath] = useState<CellPosition[]>([]);

  // Track highlight timeout for cleanup
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  // Calculate revealable word count
  const revealableWordCount = useMemo(() => {
    if (!availableWords || !grid) return 0;
    return getRevealableWordCount(availableWords, foundValidWords, language);
  }, [availableWords, foundValidWords, grid, language]);

  const clearHighlight = useCallback(() => {
    setHighlightedPath([]);
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }
  }, []);

  const handleReveal = useCallback(async (): Promise<RevealResult | null> => {
    if (isLoading || !availableWords || !grid) return null;

    setIsLoading(true);

    const result = selectRandomRevealWord(availableWords, foundValidWords, grid, language);

    if (!result) {
      setIsLoading(false);
      return null;
    }

    const { word, path } = result;

    // Only highlight the path on the grid - don't add the word to found words
    // Player must trace the word themselves to get the points
    const pathPositions = path.map(p => ({ row: p.row, col: p.col }));

    setRevealsUsed(prev => prev + 1);
    setIsLoading(false);
    setHighlightedPath(pathPositions);

    // Clear any existing highlight timeout
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }

    // Clear highlight after duration
    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightedPath([]);
    }, HIGHLIGHT_DURATION_MS);

    return { word, path: pathPositions };
  }, [isLoading, availableWords, grid, foundValidWords, language]);

  const resetRevealState = useCallback(() => {
    setRevealsUsed(0);
    setIsLoading(false);
    setHighlightedPath([]);
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }
  }, []);

  return {
    revealsUsed,
    isLoading,
    highlightedPath,
    revealableWordCount,
    handleReveal,
    clearHighlight,
    resetRevealState,
  };
}
