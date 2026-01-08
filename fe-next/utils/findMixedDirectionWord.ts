/**
 * Mixed Direction Word Finder
 *
 * Finds a valid word on the board that uses combined directions
 * (horizontal + vertical, diagonal + horizontal, etc.) for the
 * first-play tutorial feature.
 */

import { findWordPath, PathCell } from './wordPathFinder';
import { hasDirectionChange } from './directionPatternDetector';
import type { LetterGrid, Language } from '@/types';

export interface MixedDirectionWord {
  word: string;
  path: PathCell[];
}

export interface CategorizedWords {
  easy: string[];
  medium: string[];
  hard: string[];
}

/**
 * Find a valid word on the board that uses mixed directions.
 * Prefers words that are 4-5 letters (medium difficulty) as they're
 * easy to follow but still demonstrate direction changes well.
 *
 * @param availableWords - Categorized valid words from the board solver
 * @param grid - The current letter grid
 * @param language - Current game language
 * @returns A word with its path, or null if no mixed-direction word found
 */
export function findMixedDirectionWord(
  availableWords: CategorizedWords | null,
  grid: LetterGrid,
  language: Language
): MixedDirectionWord | null {
  if (!availableWords || !grid || grid.length === 0) return null;

  // Priority order: medium words first (4-5 letters),
  // then longer easy words, then shorter hard words
  // This gives the best demo experience - not too short, not too complex
  const wordsToCheck = [
    ...availableWords.medium,
    ...availableWords.easy.filter(w => w.length >= 4),
    ...availableWords.hard.filter(w => w.length <= 6),
  ];

  // Shuffle to avoid always showing the same tutorial word
  const shuffled = [...wordsToCheck].sort(() => Math.random() - 0.5);

  for (const word of shuffled) {
    const path = findWordPath(word, grid, language);

    // Need at least 3 cells to demonstrate direction change
    if (path && path.length >= 3 && hasDirectionChange(path)) {
      return {
        word: word.toUpperCase(),
        path,
      };
    }
  }

  return null;
}

/**
 * Check if a path demonstrates combined directions.
 * Re-exports hasDirectionChange for convenience.
 */
export { hasDirectionChange } from './directionPatternDetector';
