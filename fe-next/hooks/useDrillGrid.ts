'use client';

import { useState, useCallback, useEffect } from 'react';
import type { LetterGrid, Language } from '@/types';
import {
  hebrewLetters,
  swedishLetters,
  spanishLetters,
  japaneseLetters,
  kanjiCompounds,
} from '@/utils/consts';
import { normalizeHebrewWord } from '@/shared/utils/wordNormalization';

// Letter frequency weights by language
const LETTER_WEIGHTS: Record<Language, Record<string, number>> = {
  en: {
    'A': 8.2, 'B': 1.5, 'C': 2.8, 'D': 4.3, 'E': 12.7, 'F': 2.2,
    'G': 2.0, 'H': 6.1, 'I': 7.0, 'J': 0.15, 'K': 0.77, 'L': 4.0,
    'M': 2.4, 'N': 6.7, 'O': 7.5, 'P': 1.9, 'Q': 0.1, 'R': 6.0,
    'S': 6.3, 'T': 9.1, 'U': 2.8, 'V': 1.0, 'W': 2.4, 'X': 0.15,
    'Y': 2.0, 'Z': 0.07,
  },
  he: {
    'א': 5.0, 'ב': 4.0, 'ג': 2.0, 'ד': 4.5, 'ה': 8.5, 'ו': 10.5,
    'ז': 1.5, 'ח': 3.0, 'ט': 1.0, 'י': 11.0, 'כ': 4.0, 'ל': 6.5,
    'מ': 7.5, 'נ': 5.0, 'ס': 1.5, 'ע': 3.5, 'פ': 2.0, 'צ': 1.5,
    'ק': 2.0, 'ר': 7.0, 'ש': 5.0, 'ת': 5.0,
  },
  sv: {
    'A': 9.3, 'B': 1.3, 'C': 1.3, 'D': 4.5, 'E': 10.1, 'F': 2.0,
    'G': 3.3, 'H': 2.1, 'I': 5.1, 'J': 0.7, 'K': 3.2, 'L': 5.2,
    'M': 3.5, 'N': 8.8, 'O': 4.1, 'P': 1.7, 'Q': 0.02, 'R': 8.3,
    'S': 6.3, 'T': 8.7, 'U': 1.8, 'V': 2.4, 'W': 0.03, 'X': 0.1,
    'Y': 0.6, 'Z': 0.02, 'Å': 1.3, 'Ä': 1.8, 'Ö': 1.3,
  },
  ja: {}, // Japanese uses different character system - handled separately
  es: {
    'A': 12.5, 'B': 1.4, 'C': 4.7, 'D': 5.9, 'E': 13.7, 'F': 0.7,
    'G': 1.0, 'H': 0.7, 'I': 6.2, 'J': 0.4, 'K': 0.02, 'L': 5.0,
    'M': 3.2, 'N': 6.7, 'Ñ': 0.3, 'O': 8.7, 'P': 2.5, 'Q': 0.9,
    'R': 6.9, 'S': 8.0, 'T': 4.6, 'U': 3.9, 'V': 0.9, 'W': 0.01,
    'X': 0.2, 'Y': 0.9, 'Z': 0.5,
  },
  fr: {
    'A': 7.6, 'B': 0.9, 'C': 3.3, 'D': 3.7, 'E': 14.7, 'F': 1.1,
    'G': 0.9, 'H': 0.7, 'I': 7.5, 'J': 0.5, 'K': 0.05, 'L': 5.5,
    'M': 3.0, 'N': 7.1, 'O': 5.4, 'P': 3.0, 'Q': 1.4, 'R': 6.6,
    'S': 7.9, 'T': 7.2, 'U': 6.3, 'V': 1.6, 'W': 0.1, 'X': 0.4,
    'Y': 0.3, 'Z': 0.1,
  },
  de: {
    'A': 6.5, 'B': 1.9, 'C': 3.1, 'D': 5.1, 'E': 17.4, 'F': 1.7,
    'G': 3.0, 'H': 4.8, 'I': 7.6, 'J': 0.3, 'K': 1.4, 'L': 3.4,
    'M': 2.5, 'N': 9.8, 'O': 2.5, 'P': 0.8, 'Q': 0.02, 'R': 7.0,
    'S': 7.3, 'T': 6.2, 'U': 4.4, 'V': 0.7, 'W': 1.9, 'X': 0.03,
    'Y': 0.04, 'Z': 1.1,
  },
  ru: {
    'О': 11.0, 'Е': 8.0, 'А': 8.0, 'И': 7.0, 'Н': 7.0, 'Т': 6.0,
    'С': 5.0, 'Р': 5.0, 'В': 5.0, 'Л': 4.0, 'К': 3.0, 'М': 3.0,
    'Д': 3.0, 'П': 3.0, 'У': 3.0, 'Я': 2.0, 'Ы': 2.0, 'Ь': 2.0,
    'Г': 2.0, 'З': 2.0, 'Б': 2.0, 'Ч': 1.0, 'Й': 1.0, 'Х': 1.0,
    'Ж': 1.0, 'Ш': 1.0, 'Ю': 1.0, 'Ц': 1.0, 'Щ': 1.0, 'Э': 1.0,
    'Ф': 1.0,
  },
};

interface WordWithPath {
  word: string;
  path: { row: number; col: number }[];
}

/**
 * Get the letter set for a language
 */
function getLettersForLanguage(language: Language): string[] {
  switch (language) {
    case 'he':
      return hebrewLetters;
    case 'sv':
      return swedishLetters;
    case 'es':
      return spanishLetters;
    case 'ja':
      return japaneseLetters;
    case 'fr':
      return 'ABCDEFGHIJKLMNOPQRSTUVWXYZÀÂÉÈÊËÏÎÔÙÛÇ'.split('');
    case 'de':
      return 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜß'.split('');
    case 'ru':
      return 'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'.split('');
    case 'en':
    default:
      return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  }
}

/**
 * Generate a random letter based on frequency weights for a language
 */
function getRandomLetter(language: Language): string {
  const weights = LETTER_WEIGHTS[language];

  // For Japanese, use equal probability for kanji characters
  if (language === 'ja' || Object.keys(weights).length === 0) {
    const letters = getLettersForLanguage(language);
    return letters[Math.floor(Math.random() * letters.length)];
  }

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;

  for (const [letter, weight] of Object.entries(weights)) {
    random -= weight;
    if (random <= 0) return letter;
  }

  // Fallback to first letter in language's character set
  const letters = getLettersForLanguage(language);
  return letters[0];
}

/**
 * Fetch random words from dictionary API
 */
async function fetchRandomWords(
  language: Language,
  count: number = 15,
  minLength: number = 3,
  maxLength: number = 6
): Promise<string[]> {
  try {
    const params = new URLSearchParams({
      language,
      count: count.toString(),
      minLength: minLength.toString(),
      maxLength: maxLength.toString(),
    });
    const response = await fetch(`/api/drills/random-words?${params}`);
    if (!response.ok) {
      let errorDetails = '';
      try {
        const errorData = await response.json();
        errorDetails = errorData.error || '';
      } catch {
        // Response wasn't JSON
      }
      throw new Error(`Failed to fetch random words: ${response.status} ${response.statusText}${errorDetails ? ` - ${errorDetails}` : ''}`);
    }
    const data = await response.json();
    return data.words || [];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error fetching random words:', errorMessage);
    return [];
  }
}

/**
 * Generate a grid with some words placed intentionally
 */
async function generateDrillGrid(
  size: number = 5,
  language: Language = 'en'
): Promise<{ grid: LetterGrid; words: WordWithPath[] }> {
  // For Japanese, use special grid generation with kanji compounds
  if (language === 'ja') {
    return generateJapaneseDrillGrid(size);
  }

  // Initialize empty grid
  const grid: string[][] = Array(size).fill(null).map(() =>
    Array(size).fill('')
  );

  const placedWords: WordWithPath[] = [];

  // Fetch random words from dictionary
  const dictionaryWords = await fetchRandomWords(language, 20, 3, Math.min(6, size));

  // Fallback to empty array if fetch fails
  const wordsToTry = dictionaryWords.length > 0 ? dictionaryWords : [];

  // Try to place words from dictionary
  for (const word of wordsToTry) {
    // Normalize word: uppercase for non-Hebrew, normalize Hebrew final letters
    let normalizedWord = word.toUpperCase();
    if (language === 'he') {
      normalizedWord = normalizeHebrewWord(normalizedWord);
    }
    const result = tryPlaceWord(grid, normalizedWord, size);
    if (result) {
      placedWords.push({
        word: normalizedWord,
        path: result,
      });
      // Stop after placing 10 words
      if (placedWords.length >= 10) break;
    }
  }

  // Fill remaining empty cells with random letters for this language
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (!grid[row][col]) {
        let letter = getRandomLetter(language);
        // Ensure Hebrew letters are normalized (no final letters on grid)
        if (language === 'he') {
          letter = normalizeHebrewWord(letter);
        }
        grid[row][col] = letter;
      }
    }
  }

  // Optimize: Solve the grid to find ALL valid words (including accidentally formed ones)
  // This prevents "Invalid Word" errors for words that are clearly on the board
  try {
    const solveResponse = await fetch('/api/solve-grid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grid, language }),
    });

    if (solveResponse.ok) {
      const solveData = await solveResponse.json();
      if (solveData.success && solveData.words) {
        const { easy = [], medium = [], hard = [] } = solveData.words;
        const allSolvedWords = [...easy, ...medium, ...hard];

        // Add any words that weren't already in our list
        const existingWords = new Set(placedWords.map(p => p.word));

        for (const word of allSolvedWords) {
          const upperWord = word.toUpperCase();
          if (!existingWords.has(upperWord)) {
            // We don't have the path for these, but LightningRound doesn't strictly need it for validation
            // It uses the set of words for validation
            placedWords.push({
              word: upperWord,
              path: [] // Empty path for solved words
            });
            existingWords.add(upperWord);
          }
        }
      }
    }
  } catch (error) {
    console.warn('Failed to solve grid for complete word list:', error);
    // Continue with just the placed words if solver fails
  }

  return { grid, words: placedWords };
}

/**
 * Generate a Japanese drill grid with embedded kanji compounds
 */
async function generateJapaneseDrillGrid(size: number): Promise<{ grid: LetterGrid; words: WordWithPath[] }> {
  const grid: (string | null)[][] = Array(size).fill(null).map(() =>
    Array(size).fill(null)
  );
  const placedWords: WordWithPath[] = [];

  // Fetch random Japanese words from dictionary
  const dictionaryWords = await fetchRandomWords('ja', 15, 2, 4);

  // Fallback to kanji compounds if dictionary fetch fails
  const wordsToPlace = dictionaryWords.length > 0
    ? dictionaryWords.slice(0, 8)
    : kanjiCompounds.slice(0, 8);

  for (const word of wordsToPlace) {
    // Try to place the word adjacently
    let placed = false;
    for (let attempt = 0; attempt < 50 && !placed; attempt++) {
      const startRow = Math.floor(Math.random() * size);
      const startCol = Math.floor(Math.random() * size);

      // Try horizontal placement first
      if (startCol + word.length <= size) {
        let canPlace = true;
        for (let i = 0; i < word.length; i++) {
          if (grid[startRow][startCol + i] !== null && grid[startRow][startCol + i] !== word[i]) {
            canPlace = false;
            break;
          }
        }
        if (canPlace) {
          const path: { row: number; col: number }[] = [];
          for (let i = 0; i < word.length; i++) {
            grid[startRow][startCol + i] = word[i];
            path.push({ row: startRow, col: startCol + i });
          }
          placedWords.push({ word, path });
          placed = true;
        }
      }

      // Try vertical placement
      if (!placed && startRow + word.length <= size) {
        let canPlace = true;
        for (let i = 0; i < word.length; i++) {
          if (grid[startRow + i][startCol] !== null && grid[startRow + i][startCol] !== word[i]) {
            canPlace = false;
            break;
          }
        }
        if (canPlace) {
          const path: { row: number; col: number }[] = [];
          for (let i = 0; i < word.length; i++) {
            grid[startRow + i][startCol] = word[i];
            path.push({ row: startRow + i, col: startCol });
          }
          placedWords.push({ word, path });
          placed = true;
        }
      }
    }
  }

  // Fill remaining cells with random Japanese characters
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (grid[row][col] === null) {
        grid[row][col] = japaneseLetters[Math.floor(Math.random() * japaneseLetters.length)];
      }
    }
  }

  return { grid: grid as LetterGrid, words: placedWords };
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

/** Check that a grid has enough word diversity for pattern-based drills */
function hasSufficientWordDiversity(words: WordWithPath[], maxLength: number = 5): boolean {
  const countByLength: Record<number, number> = {};
  for (const w of words) {
    const len = w.word.length;
    if (len <= maxLength) {
      countByLength[len] = (countByLength[len] || 0) + 1;
    }
  }
  // Need at least 2 different lengths with 3+ words each
  return Object.values(countByLength).filter(c => c >= 3).length >= 2;
}

interface UseDrillGridReturn {
  grid: LetterGrid;
  availableWords: WordWithPath[];
  regenerate: () => void;
  isLoading: boolean;
}

/**
 * Hook for generating and managing drill grids
 * @param gridSize - Size of the grid (default 5x5)
 * @param language - Language for word list and letter frequencies (default 'en')
 */
export function useDrillGrid(gridSize: number = 5, language: Language = 'en'): UseDrillGridReturn {
  const [grid, setGrid] = useState<LetterGrid>([]);
  const [availableWords, setAvailableWords] = useState<WordWithPath[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const regenerate = useCallback(async () => {
    setIsLoading(true);
    const MAX_RETRIES = 3;
    try {
      let newGrid: LetterGrid = [];
      let words: WordWithPath[] = [];
      let attempts = 0;
      do {
        const result = await generateDrillGrid(gridSize, language);
        newGrid = result.grid;
        words = result.words;
        attempts++;
      } while (!hasSufficientWordDiversity(words) && attempts < MAX_RETRIES);
      setGrid(newGrid);
      setAvailableWords(words);
    } catch (error) {
      console.error('Error generating drill grid:', error);
      setGrid(Array(gridSize).fill(null).map(() => Array(gridSize).fill('')));
      setAvailableWords([]);
    } finally {
      setIsLoading(false);
    }
  }, [gridSize, language]);

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
