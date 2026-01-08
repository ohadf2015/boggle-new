'use client';

/**
 * useFirstPlayTutorial Hook
 *
 * Manages the first-play tutorial that shows a highlighted word path
 * with combined directions on the grid. The tutorial persists until
 * the player successfully traces a word using combined directions themselves.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { LetterGrid, Language, GridPosition } from '@/types';
import type { PathCell } from '@/utils/wordPathFinder';
import {
  findMixedDirectionWord,
  hasDirectionChange,
  type CategorizedWords,
} from '@/utils/findMixedDirectionWord';
import {
  shouldShowGuidance,
  markGuidanceShown,
} from '@/utils/contextualGuidanceStorage';

export interface UseFirstPlayTutorialProps {
  /** Current letter grid */
  grid: LetterGrid | null;
  /** Available valid words from the board solver */
  availableWords: CategorizedWords | null;
  /** Current game language */
  language: Language;
  /** Whether the game is currently active and interactive */
  isGameActive: boolean;
}

export interface UseFirstPlayTutorialReturn {
  /** Path to highlight on the grid (null if tutorial not active) */
  tutorialPath: PathCell[] | null;
  /** The word being demonstrated */
  tutorialWord: string;
  /** Call this when user submits a word path to check for completion */
  trackUserPath: (cells: GridPosition[]) => void;
  /** Whether the tutorial is currently active */
  isActive: boolean;
  /** Whether the tutorial has been completed (user made mixed-direction word) */
  isCompleted: boolean;
}

/**
 * Hook to manage the first-play tutorial that shows a word path
 * with combined directions on the grid.
 *
 * The tutorial:
 * 1. Activates on first game if user hasn't completed it before
 * 2. Finds a valid word with mixed directions on the current board
 * 3. Highlights the word path on the grid
 * 4. Tracks user's word submissions
 * 5. Completes when user makes any word with combined directions
 */
export function useFirstPlayTutorial({
  grid,
  availableWords,
  language,
  isGameActive,
}: UseFirstPlayTutorialProps): UseFirstPlayTutorialReturn {
  const [tutorialPath, setTutorialPath] = useState<PathCell[] | null>(null);
  const [tutorialWord, setTutorialWord] = useState<string>('');
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  // Track if we've already searched for a word this game
  const hasSearchedRef = useRef(false);

  // Check if tutorial should show (not completed before)
  // Use state to handle SSR hydration properly
  const [shouldShow, setShouldShow] = useState(false);

  // Initialize shouldShow on client side
  useEffect(() => {
    setShouldShow(shouldShowGuidance('firstPlayTutorialCompleted'));
  }, []);

  // Reset search flag when grid changes (new game)
  useEffect(() => {
    hasSearchedRef.current = false;
    setTutorialPath(null);
    setTutorialWord('');
  }, [grid]);

  // Find mixed-direction word when game becomes active
  useEffect(() => {
    // Skip if already searched, not active, or shouldn't show tutorial
    if (hasSearchedRef.current || !shouldShow || !isGameActive) return;

    // Need both grid and available words
    if (!grid || !availableWords) return;

    hasSearchedRef.current = true;

    const mixedWord = findMixedDirectionWord(availableWords, grid, language);
    if (mixedWord) {
      setTutorialPath(mixedWord.path);
      setTutorialWord(mixedWord.word);
    }
  }, [shouldShow, isGameActive, availableWords, grid, language]);

  // Track user's word submissions to detect mixed-direction success
  const trackUserPath = useCallback(
    (cells: GridPosition[]) => {
      // Skip if tutorial already completed or not active
      if (!shouldShow || isCompleted) return;

      // Check if user made a word with combined directions
      if (cells.length >= 3 && hasDirectionChange(cells)) {
        // User made a mixed-direction word - tutorial complete!
        markGuidanceShown('firstPlayTutorialCompleted');
        setIsCompleted(true);
        setTutorialPath(null);
        setShouldShow(false);
      }
    },
    [shouldShow, isCompleted]
  );

  return {
    tutorialPath: shouldShow && !isCompleted ? tutorialPath : null,
    tutorialWord,
    trackUserPath,
    isActive: shouldShow && !isCompleted && tutorialPath !== null,
    isCompleted,
  };
}

export default useFirstPlayTutorial;
