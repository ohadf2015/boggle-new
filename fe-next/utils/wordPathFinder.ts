/**
 * Word Path Finder
 *
 * Finds the exact cell path for a word on the grid.
 * Used for the word reveal feature to highlight the path on the grid.
 */

import { normalizeWord } from '@/utils/clientWordValidator';
import type { Language, LetterGrid } from '@/types';

export interface PathCell {
  row: number;
  col: number;
  letter: string;
}

/**
 * Find the path of cells that form a word on the grid
 * Returns the array of cells in order, or null if word not found
 */
export function findWordPath(
  word: string,
  grid: LetterGrid,
  language: Language
): PathCell[] | null {
  if (!grid || !word || grid.length === 0) return null;

  const wordNormalized = normalizeWord(word, language);
  const rows = grid.length;
  const cols = grid[0]?.length || 0;

  // All 8 adjacent directions
  const directions: [number, number][] = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];

  // Find all starting positions (cells with the first letter)
  const startPositions: [number, number][] = [];
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const cellNormalized = normalizeWord(grid[i][j], language);
      if (cellNormalized === wordNormalized[0]) {
        startPositions.push([i, j]);
      }
    }
  }

  // DFS to find the path
  function searchPath(
    row: number,
    col: number,
    index: number,
    visited: Set<string>,
    path: PathCell[]
  ): PathCell[] | null {
    if (index === wordNormalized.length) {
      return path;
    }

    if (row < 0 || row >= rows || col < 0 || col >= cols) {
      return null;
    }

    const cellKey = `${row},${col}`;
    if (visited.has(cellKey)) {
      return null;
    }

    const cellNormalized = normalizeWord(grid[row][col], language);
    if (cellNormalized !== wordNormalized[index]) {
      return null;
    }

    visited.add(cellKey);
    path.push({ row, col, letter: grid[row][col] });

    if (index === wordNormalized.length - 1) {
      return path;
    }

    for (const [dx, dy] of directions) {
      const result = searchPath(
        row + dx,
        col + dy,
        index + 1,
        visited,
        [...path]
      );
      if (result) {
        return result;
      }
    }

    visited.delete(cellKey);
    path.pop();
    return null;
  }

  // Try each starting position
  for (const [startRow, startCol] of startPositions) {
    const result = searchPath(startRow, startCol, 0, new Set(), []);
    if (result) {
      return result;
    }
  }

  return null;
}

/**
 * Select a random unfound 5+ letter word from available words
 * and find its path on the grid
 */
export function selectRandomRevealWord(
  availableWords: { easy: string[]; medium: string[]; hard: string[] },
  foundWordsList: string[],
  grid: LetterGrid,
  language: Language
): { word: string; path: PathCell[] } | null {
  // Combine all words and filter to 5+ letters only
  const allWords = [
    ...availableWords.hard,   // Prioritize harder/longer words
    ...availableWords.medium,
    ...availableWords.easy,
  ].filter(word => word.length >= 5);

  // Create set of found words (normalized) for quick lookup
  const foundWordsSet = new Set(
    foundWordsList.map(w => normalizeWord(w, language))
  );

  // Filter to unfound words
  const unfoundWords = allWords.filter(
    word => !foundWordsSet.has(normalizeWord(word, language))
  );

  if (unfoundWords.length === 0) {
    return null; // No words left to reveal
  }

  // Shuffle and try to find a word with a valid path
  const shuffled = [...unfoundWords].sort(() => Math.random() - 0.5);

  for (const word of shuffled) {
    const path = findWordPath(word, grid, language);
    if (path) {
      return { word: word.toUpperCase(), path };
    }
  }

  return null;
}

/**
 * Get count of remaining revealable words (5+ letters, unfound)
 */
export function getRevealableWordCount(
  availableWords: { easy: string[]; medium: string[]; hard: string[] } | null,
  foundWordsList: string[],
  language: Language
): number {
  if (!availableWords) return 0;

  const allWords = [
    ...availableWords.easy,
    ...availableWords.medium,
    ...availableWords.hard,
  ].filter(word => word.length >= 5);

  const foundWordsSet = new Set(
    foundWordsList.map(w => normalizeWord(w, language))
  );

  return allWords.filter(
    word => !foundWordsSet.has(normalizeWord(word, language))
  ).length;
}
