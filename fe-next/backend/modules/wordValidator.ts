/**
 * Word Validation Utilities
 * Handles word validation on the Boggle grid with language-specific normalization
 */

import type { Language, LetterGrid, GridPosition } from '@/shared/types/game';
import {
  normalizeHebrewLetter as _normalizeHebrewLetter,
  normalizeHebrewWord as _normalizeHebrewWord,
  normalizeSpanishLetter as _normalizeSpanishLetter,
  normalizeSpanishWord as _normalizeSpanishWord,
  normalizeLetter,
  normalizeWord,
} from '@/shared/utils/wordNormalization';

// Type for position map
type PositionsMap = Map<string, [number, number][]>;

// Re-export shared normalization functions for backwards compatibility
export const normalizeHebrewLetter = _normalizeHebrewLetter;
export const normalizeHebrewWord = _normalizeHebrewWord;
export const normalizeSpanishLetter = _normalizeSpanishLetter;
export const normalizeSpanishWord = _normalizeSpanishWord;

/**
 * Language-aware letter normalization (wrapper for backwards compatibility)
 */
export function normalizeLetterForLanguage(letter: string, language: Language | string): string {
  return normalizeLetter(letter, language as Language);
}

/**
 * Language-aware word normalization (wrapper for backwards compatibility)
 */
export function normalizeWordForLanguage(word: string, language: Language | string): string {
  return normalizeWord(word, language as Language);
}

/**
 * Helper function to search for word using DFS with all 8 adjacent directions
 */
function searchWord(
  board: LetterGrid,
  word: string,
  row: number,
  col: number,
  index: number,
  visited: Set<string>,
  language: Language | string = 'he'
): boolean {
  if (index === word.length) return true;

  if (row < 0 || row >= board.length || col < 0 || col >= board[0].length) return false;

  const cellKey = `${row},${col}`;
  if (visited.has(cellKey)) return false;

  const cellNormalized = normalizeLetterForLanguage(board[row][col], language);
  if (cellNormalized !== word[index]) return false;

  visited.add(cellKey);

  // All 8 adjacent directions: horizontal, vertical, and diagonal
  const allDirections: [number, number][] = [
    [-1, -1], [-1, 0], [-1, 1],  // up-left, up, up-right
    [0, -1],           [0, 1],   // left, right
    [1, -1],  [1, 0],  [1, 1]    // down-left, down, down-right
  ];

  for (const [dx, dy] of allDirections) {
    if (searchWord(board, word, row + dx, col + dy, index + 1, visited, language)) {
      visited.delete(cellKey);
      return true;
    }
  }

  visited.delete(cellKey);
  return false;
}

/**
 * Helper function to search for word and return the path
 */
function searchWordPath(
  board: LetterGrid,
  word: string,
  row: number,
  col: number,
  index: number,
  visited: Set<string>,
  path: GridPosition[],
  language: Language | string = 'he'
): GridPosition[] | null {
  if (index === word.length) return [...path];

  if (row < 0 || row >= board.length || col < 0 || col >= board[0].length) return null;

  const cellKey = `${row},${col}`;
  if (visited.has(cellKey)) return null;

  const cellNormalized = normalizeLetterForLanguage(board[row][col], language);
  if (cellNormalized !== word[index]) return null;

  visited.add(cellKey);
  path.push({ row, col });

  const allDirections: [number, number][] = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];

  for (const [dx, dy] of allDirections) {
    const result = searchWordPath(board, word, row + dx, col + dy, index + 1, visited, path, language);
    if (result) {
      visited.delete(cellKey);
      return result;
    }
  }

  visited.delete(cellKey);
  path.pop();
  return null;
}

/**
 * Get the path of cells used to form a word on the board
 */
export function getWordPath(
  word: string,
  board: LetterGrid,
  positions?: PositionsMap,
  language: Language | string = 'he'
): GridPosition[] | null {
  if (!word || !board || board.length === 0) return null;

  const wordNormalized = normalizeWordForLanguage(word, language);
  const posMap = positions || makePositionsMap(board, language);
  const startPositions = posMap.get(wordNormalized[0]) || [];

  for (const [startRow, startCol] of startPositions) {
    const path = searchWordPath(board, wordNormalized, startRow, startCol, 0, new Set(), [], language);
    if (path) return path;
  }

  return null;
}

/**
 * Word validation: Create positions map for efficient lookup
 */
export function makePositionsMap(board: LetterGrid, language: Language | string = 'he'): PositionsMap {
  const positions: PositionsMap = new Map();
  if (!board || board.length === 0) return positions;
  for (let i = 0; i < board.length; i++) {
    for (let j = 0; j < board[0].length; j++) {
      const ch = normalizeLetterForLanguage(board[i][j], language);
      if (!positions.has(ch)) positions.set(ch, []);
      positions.get(ch)!.push([i, j]);
    }
  }
  return positions;
}

/**
 * Check if a word exists on the board as a valid path
 */
export function isWordOnBoard(
  word: string,
  board: LetterGrid,
  positions?: PositionsMap,
  language: Language | string = 'he'
): boolean {
  if (!word || !board || board.length === 0) return false;

  // Normalize word for comparison using language-specific normalization
  const wordNormalized = normalizeWordForLanguage(word, language);

  // Find all starting positions (cells with the first letter)
  const posMap = positions || makePositionsMap(board, language);
  const startPositions = posMap.get(wordNormalized[0]) || [];

  // Try to find the word starting from each position
  for (const [startRow, startCol] of startPositions) {
    if (searchWord(board, wordNormalized, startRow, startCol, 0, new Set(), language)) {
      return true;
    }
  }

  return false;
}

// Alias for backwards compatibility with socketHandlers.js
export const validateWordOnBoard = isWordOnBoard;

