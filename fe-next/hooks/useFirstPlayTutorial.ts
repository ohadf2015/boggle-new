'use client';

/**
 * useFirstPlayTutorial Hook
 *
 * Simplified: shows a word path overlay briefly on very first play,
 * then never again. No blocking, no re-shows, no inactivity tracking.
 * Players learn by doing; the path is just a quick visual hint.
 */

import { useState, useEffect, useCallback } from 'react';
import type { LetterGrid, Language, GridPosition } from '@/types';
import type { PathCell } from '@/utils/wordPathFinder';
import {
  findMixedDirectionWord,
  type CategorizedWords,
} from '@/utils/findMixedDirectionWord';
import {
  shouldShowGuidance,
  markGuidanceShown,
} from '@/utils/contextualGuidanceStorage';

/** How long to display the hint before auto-hiding */
const DISPLAY_DURATION_MS = 3000;

export interface UseFirstPlayTutorialProps {
  grid: LetterGrid | null;
  availableWords: CategorizedWords | null;
  language: Language;
  isGameActive: boolean;
}

export interface UseFirstPlayTutorialReturn {
  tutorialPath: PathCell[] | null;
  tutorialWord: string;
  trackUserPath: (cells: GridPosition[]) => void;
  isActive: boolean;
  isCompleted: boolean;
}

export function useFirstPlayTutorial({
  grid,
  availableWords,
  language,
  isGameActive,
}: UseFirstPlayTutorialProps): UseFirstPlayTutorialReturn {
  const [foundPath, setFoundPath] = useState<PathCell[] | null>(null);
  const [tutorialWord, setTutorialWord] = useState<string>('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);

  // Check if tutorial should show (not completed before)
  useEffect(() => {
    setShouldShow(shouldShowGuidance('firstPlayTutorialCompleted'));
  }, []);

  // Find a word path when game becomes active
  useEffect(() => {
    if (!shouldShow || !isGameActive || !grid || !availableWords) return;

    const mixedWord = findMixedDirectionWord(availableWords, grid, language);
    if (mixedWord) {
      setFoundPath(mixedWord.path);
      setTutorialWord(mixedWord.word);
    }
  }, [shouldShow, isGameActive, availableWords, grid, language]);

  // Show path briefly, then auto-hide and mark complete
  useEffect(() => {
    if (!foundPath || !shouldShow || isCompleted) return;

    const timer = setTimeout(() => {
      setFoundPath(null);
      setIsCompleted(true);
      markGuidanceShown('firstPlayTutorialCompleted');
      setShouldShow(false);
    }, DISPLAY_DURATION_MS);

    return () => clearTimeout(timer);
  }, [foundPath, shouldShow, isCompleted]);

  const trackUserPath = useCallback(
    (_cells: GridPosition[]) => {
      // No-op in simplified version — players learn by doing.
    },
    [],
  );

  return {
    tutorialPath: shouldShow && !isCompleted ? foundPath : null,
    tutorialWord,
    trackUserPath,
    isActive: shouldShow && !isCompleted && foundPath !== null,
    isCompleted,
  };
}

export default useFirstPlayTutorial;