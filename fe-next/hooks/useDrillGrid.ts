'use client';

import { useState, useCallback, useEffect } from 'react';
import type { LetterGrid } from '@/types';

// Simple word list for drills (common 3-6 letter words)
const DRILL_WORDS = [
  'cat', 'dog', 'run', 'sun', 'hat', 'bat', 'rat', 'mat', 'sat', 'pat',
  'ball', 'call', 'fall', 'tall', 'wall', 'mall', 'hall', 'bell', 'cell', 'tell',
  'game', 'same', 'name', 'came', 'fame', 'tame', 'lame', 'dame', 'make', 'take',
  'word', 'bird', 'herd', 'nerd', 'work', 'fork', 'cork', 'pork', 'born', 'corn',
  'play', 'stay', 'clay', 'gray', 'pray', 'sway', 'away', 'okay', 'plan', 'scan',
  'brain', 'train', 'drain', 'grain', 'plain', 'chain', 'claim', 'trail', 'snail', 'frail',
];

// Letter frequencies for generating grids
const LETTER_WEIGHTS: Record<string, number> = {
  'A': 8.2, 'B': 1.5, 'C': 2.8, 'D': 4.3, 'E': 12.7, 'F': 2.2,
  'G': 2.0, 'H': 6.1, 'I': 7.0, 'J': 0.15, 'K': 0.77, 'L': 4.0,
  'M': 2.4, 'N': 6.7, 'O': 7.5, 'P': 1.9, 'Q': 0.1, 'R': 6.0,
  'S': 6.3, 'T': 9.1, 'U': 2.8, 'V': 1.0, 'W': 2.4, 'X': 0.15,
  'Y': 2.0, 'Z': 0.07,
};

interface WordWithPath {
  word: string;
  path: { row: number; col: number }[];
}

/**
 * Generate a random letter based on frequency weights
 */
function getRandomLetter(): string {
  const totalWeight = Object.values(LETTER_WEIGHTS).reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;

  for (const [letter, weight] of Object.entries(LETTER_WEIGHTS)) {
    random -= weight;
    if (random <= 0) return letter;
  }

  return 'E'; // Fallback
}

/**
 * Generate a grid with some words placed intentionally
 */
function generateDrillGrid(size: number = 5): { grid: LetterGrid; words: WordWithPath[] } {
  // Initialize empty grid
  const grid: string[][] = Array(size).fill(null).map(() =>
    Array(size).fill('')
  );

  const placedWords: WordWithPath[] = [];

  // Try to place some words
  const shuffledWords = [...DRILL_WORDS].sort(() => Math.random() - 0.5);
  const wordsToPlace = shuffledWords.slice(0, 10); // Try to place up to 10 words

  for (const word of wordsToPlace) {
    const result = tryPlaceWord(grid, word.toUpperCase(), size);
    if (result) {
      placedWords.push({
        word: word.toUpperCase(),
        path: result,
      });
    }
  }

  // Fill remaining empty cells with random letters
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (!grid[row][col]) {
        grid[row][col] = getRandomLetter();
      }
    }
  }

  return { grid, words: placedWords };
}

/**
 * Try to place a word in the grid
 * Returns path if successful, null if failed
 */
function tryPlaceWord(
  grid: string[][],
  word: string,
  size: number
): { row: number; col: number }[] | null {
  // Direction vectors (8 directions including diagonals)
  const directions = [
    [0, 1], [1, 0], [0, -1], [-1, 0],     // horizontal/vertical
    [1, 1], [1, -1], [-1, 1], [-1, -1],   // diagonals
  ];

  // Try random starting positions and directions
  const attempts = 50;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const startRow = Math.floor(Math.random() * size);
    const startCol = Math.floor(Math.random() * size);
    const [dRow, dCol] = directions[Math.floor(Math.random() * directions.length)];

    const path = tryPlaceWordFromPosition(grid, word, startRow, startCol, dRow, dCol, size);
    if (path) {
      // Actually place the word
      for (let i = 0; i < word.length; i++) {
        const row = startRow + i * dRow;
        const col = startCol + i * dCol;
        grid[row][col] = word[i];
      }
      return path;
    }
  }

  return null;
}

/**
 * Check if word can be placed at position in direction
 */
function tryPlaceWordFromPosition(
  grid: string[][],
  word: string,
  startRow: number,
  startCol: number,
  dRow: number,
  dCol: number,
  size: number
): { row: number; col: number }[] | null {
  const path: { row: number; col: number }[] = [];

  for (let i = 0; i < word.length; i++) {
    const row = startRow + i * dRow;
    const col = startCol + i * dCol;

    // Check bounds
    if (row < 0 || row >= size || col < 0 || col >= size) {
      return null;
    }

    // Check if cell is empty or has the same letter
    const existing = grid[row][col];
    if (existing && existing !== word[i]) {
      return null;
    }

    path.push({ row, col });
  }

  return path;
}

interface UseDrillGridReturn {
  grid: LetterGrid;
  availableWords: WordWithPath[];
  regenerate: () => void;
  isLoading: boolean;
}

/**
 * Hook for generating and managing drill grids
 */
export function useDrillGrid(gridSize: number = 5): UseDrillGridReturn {
  const [grid, setGrid] = useState<LetterGrid>([]);
  const [availableWords, setAvailableWords] = useState<WordWithPath[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const regenerate = useCallback(() => {
    setIsLoading(true);
    const { grid: newGrid, words } = generateDrillGrid(gridSize);
    setGrid(newGrid);
    setAvailableWords(words);
    setIsLoading(false);
  }, [gridSize]);

  // Generate initial grid
  useEffect(() => {
    regenerate();
  }, [regenerate]);

  return {
    grid,
    availableWords,
    regenerate,
    isLoading,
  };
}

export default useDrillGrid;
