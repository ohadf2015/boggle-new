'use client';

/**
 * useFirstPlayTutorial Hook
 *
 * Manages the first-play tutorial that shows a highlighted word path
 * with combined directions on the grid. The tutorial:
 *
 * - Only shows after a delay (INITIAL_DELAY_MS) to give players time to explore
 * - Auto-hides after being shown (DISPLAY_DURATION_MS) so it doesn't persist
 * - Re-shows after extended inactivity (INACTIVITY_THRESHOLD_MS) for confused players
 * - Permanently completes when player traces a word with combined directions
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

/** Delay before showing the first tutorial hint (give players time to explore) */
const INITIAL_DELAY_MS = 5000; // 5 seconds

/** How long to display the hint before auto-hiding */
const DISPLAY_DURATION_MS = 4000; // 4 seconds (includes blink + fade animation)

/** Time of inactivity before re-showing hint for confused players */
const INACTIVITY_THRESHOLD_MS = 5000; // 5 seconds

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
  /** Path to highlight on the grid (null if tutorial not active or hidden) */
  tutorialPath: PathCell[] | null;
  /** The word being demonstrated */
  tutorialWord: string;
  /** Call this when user submits a word path to check for completion */
  trackUserPath: (cells: GridPosition[]) => void;
  /** Whether the tutorial is currently active (even if not displayed) */
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
 * 2. Waits for INITIAL_DELAY_MS before showing the hint
 * 3. Finds a valid word with mixed directions on the current board
 * 4. Shows the word path for DISPLAY_DURATION_MS then auto-hides
 * 5. Re-shows after INACTIVITY_THRESHOLD_MS if player hasn't made progress
 * 6. Permanently completes when user makes any word with combined directions
 */
export function useFirstPlayTutorial({
  grid,
  availableWords,
  language,
  isGameActive,
}: UseFirstPlayTutorialProps): UseFirstPlayTutorialReturn {
  // The found word path (stored even when not displayed)
  const [foundPath, setFoundPath] = useState<PathCell[] | null>(null);
  const [tutorialWord, setTutorialWord] = useState<string>('');
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  // Whether the hint is currently visible (separate from having found a path)
  const [isHintVisible, setIsHintVisible] = useState<boolean>(false);

  // Track if we've already searched for a word this game
  const hasSearchedRef = useRef(false);

  // Track last user activity time (initialized in useEffect to avoid impure function call during render)
  const lastActivityTimeRef = useRef<number>(0);

  // Timer refs for cleanup
  const initialDelayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const displayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inactivityCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check if tutorial should show (not completed before)
  // Use state to handle SSR hydration properly
  const [shouldShow, setShouldShow] = useState(false);

  // Initialize shouldShow and activity time on client side
  useEffect(() => {
    setShouldShow(shouldShowGuidance('firstPlayTutorialCompleted'));
    lastActivityTimeRef.current = Date.now();
  }, []);

  // Reset search flag and timers when grid changes (new game)
  useEffect(() => {
    hasSearchedRef.current = false;
    setFoundPath(null);
    setTutorialWord('');
    setIsHintVisible(false);
    lastActivityTimeRef.current = Date.now();

    // Clear any existing timers
    if (initialDelayTimerRef.current) {
      clearTimeout(initialDelayTimerRef.current);
      initialDelayTimerRef.current = null;
    }
    if (displayTimerRef.current) {
      clearTimeout(displayTimerRef.current);
      displayTimerRef.current = null;
    }
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
      setFoundPath(mixedWord.path);
      setTutorialWord(mixedWord.word);
    }
  }, [shouldShow, isGameActive, availableWords, grid, language]);

  // Show hint after initial delay when path is found
  useEffect(() => {
    if (!foundPath || !shouldShow || isCompleted || !isGameActive) return;

    // Clear any existing timer
    if (initialDelayTimerRef.current) {
      clearTimeout(initialDelayTimerRef.current);
    }

    // Wait before showing the hint (give player time to explore first)
    initialDelayTimerRef.current = setTimeout(() => {
      setIsHintVisible(true);

      // Auto-hide after display duration
      displayTimerRef.current = setTimeout(() => {
        setIsHintVisible(false);
      }, DISPLAY_DURATION_MS);
    }, INITIAL_DELAY_MS);

    return () => {
      if (initialDelayTimerRef.current) {
        clearTimeout(initialDelayTimerRef.current);
      }
      if (displayTimerRef.current) {
        clearTimeout(displayTimerRef.current);
      }
    };
  }, [foundPath, shouldShow, isCompleted, isGameActive]);

  // Re-show hint after extended inactivity
  useEffect(() => {
    if (!foundPath || !shouldShow || isCompleted || !isGameActive) return;

    // Check inactivity periodically
    inactivityCheckRef.current = setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivityTimeRef.current;

      // If inactive for threshold and hint not visible, show it again
      if (timeSinceActivity >= INACTIVITY_THRESHOLD_MS && !isHintVisible) {
        setIsHintVisible(true);

        // Auto-hide after display duration
        if (displayTimerRef.current) {
          clearTimeout(displayTimerRef.current);
        }
        displayTimerRef.current = setTimeout(() => {
          setIsHintVisible(false);
        }, DISPLAY_DURATION_MS);
      }
    }, 5000); // Check every 5 seconds

    return () => {
      if (inactivityCheckRef.current) {
        clearInterval(inactivityCheckRef.current);
      }
    };
  }, [foundPath, shouldShow, isCompleted, isGameActive, isHintVisible]);

  // Track user's word submissions to detect mixed-direction success
  const trackUserPath = useCallback(
    (cells: GridPosition[]) => {
      // Update activity time on any path submission
      lastActivityTimeRef.current = Date.now();

      // Hide hint when user is active
      if (isHintVisible) {
        setIsHintVisible(false);
        if (displayTimerRef.current) {
          clearTimeout(displayTimerRef.current);
          displayTimerRef.current = null;
        }
      }

      // Skip if tutorial already completed or not active
      if (!shouldShow || isCompleted) return;

      // Check if user made a word with combined directions
      if (cells.length >= 3 && hasDirectionChange(cells)) {
        // User made a mixed-direction word - tutorial complete!
        markGuidanceShown('firstPlayTutorialCompleted');
        setIsCompleted(true);
        setFoundPath(null);
        setIsHintVisible(false);
        setShouldShow(false);
      }
    },
    [shouldShow, isCompleted, isHintVisible]
  );

  // Clean up all timers on unmount
  useEffect(() => {
    return () => {
      if (initialDelayTimerRef.current) clearTimeout(initialDelayTimerRef.current);
      if (displayTimerRef.current) clearTimeout(displayTimerRef.current);
      if (inactivityCheckRef.current) clearInterval(inactivityCheckRef.current);
    };
  }, []);

  return {
    // Only return the path if hint is visible
    tutorialPath: shouldShow && !isCompleted && isHintVisible ? foundPath : null,
    tutorialWord,
    trackUserPath,
    isActive: shouldShow && !isCompleted && foundPath !== null,
    isCompleted,
  };
}

export default useFirstPlayTutorial;
