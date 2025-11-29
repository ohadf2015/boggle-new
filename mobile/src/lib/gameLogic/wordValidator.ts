// Word validation utilities - ported from fe-next/backend/modules/wordValidator.js

// Normalize Hebrew letters - convert final forms to regular forms
export function normalizeHebrewLetter(letter: string): string {
  const finalToRegular: Record<string, string> = {
    'ץ': 'צ',
    'ך': 'כ',
    'ם': 'מ',
    'ן': 'נ',
    'ף': 'פ'
  };
  return finalToRegular[letter] || letter;
}

// Normalize an entire Hebrew word
export function normalizeHebrewWord(word: string): string {
  return word.split('').map(normalizeHebrewLetter).join('');
}

// Helper function to search for word using DFS with all 8 adjacent directions
function searchWord(
  board: string[][],
  word: string,
  row: number,
  col: number,
  index: number,
  visited: Set<string>
): boolean {
  if (index === word.length) return true;

  if (row < 0 || row >= board.length || col < 0 || col >= board[0].length) return false;

  const cellKey = `${row},${col}`;
  if (visited.has(cellKey)) return false;

  const cellNormalized = normalizeHebrewLetter(board[row][col].toLowerCase());
  if (cellNormalized !== word[index]) return false;

  visited.add(cellKey);

  // All 8 adjacent directions: horizontal, vertical, and diagonal
  const allDirections = [
    [-1, -1], [-1, 0], [-1, 1],  // up-left, up, up-right
    [0, -1],           [0, 1],   // left, right
    [1, -1],  [1, 0],  [1, 1]    // down-left, down, down-right
  ];

  for (const [dx, dy] of allDirections) {
    if (searchWord(board, word, row + dx, col + dy, index + 1, visited)) {
      visited.delete(cellKey);
      return true;
    }
  }

  visited.delete(cellKey);
  return false;
}

// Helper function to search for word and return the path
function searchWordPath(
  board: string[][],
  word: string,
  row: number,
  col: number,
  index: number,
  visited: Set<string>,
  path: Array<{ row: number; col: number }>
): Array<{ row: number; col: number }> | null {
  if (index === word.length) return [...path];

  if (row < 0 || row >= board.length || col < 0 || col >= board[0].length) return null;

  const cellKey = `${row},${col}`;
  if (visited.has(cellKey)) return null;

  const cellNormalized = normalizeHebrewLetter(board[row][col].toLowerCase());
  if (cellNormalized !== word[index]) return null;

  visited.add(cellKey);
  path.push({ row, col });

  const allDirections = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];

  for (const [dx, dy] of allDirections) {
    const result = searchWordPath(board, word, row + dx, col + dy, index + 1, visited, path);
    if (result) {
      visited.delete(cellKey);
      return result;
    }
  }

  visited.delete(cellKey);
  path.pop();
  return null;
}

export type PositionsMap = Map<string, Array<[number, number]>>;

// Word validation: Create a map of letter positions for quick lookup
export function makePositionsMap(board: string[][]): PositionsMap {
  const positions: PositionsMap = new Map();
  if (!board || board.length === 0) return positions;

  for (let i = 0; i < board.length; i++) {
    for (let j = 0; j < board[0].length; j++) {
      const ch = normalizeHebrewLetter(String(board[i][j]).toLowerCase());
      if (!positions.has(ch)) positions.set(ch, []);
      positions.get(ch)!.push([i, j]);
    }
  }
  return positions;
}

// Get the path of cells used to form a word on the board
export function getWordPath(
  word: string,
  board: string[][],
  positions?: PositionsMap
): Array<{ row: number; col: number }> | null {
  if (!word || !board || board.length === 0) return null;

  const wordNormalized = normalizeHebrewWord(word.toLowerCase());
  const posMap = positions || makePositionsMap(board);
  const startPositions = posMap.get(wordNormalized[0]) || [];

  for (const [startRow, startCol] of startPositions) {
    const path = searchWordPath(board, wordNormalized, startRow, startCol, 0, new Set(), []);
    if (path) return path;
  }

  return null;
}

// Check if a word exists on the board as a valid path
export function isWordOnBoard(
  word: string,
  board: string[][],
  positions?: PositionsMap
): boolean {
  if (!word || !board || board.length === 0) return false;

  // Normalize and lowercase the word for comparison
  const wordNormalized = normalizeHebrewWord(word.toLowerCase());

  // Find all starting positions (cells with the first letter)
  const posMap = positions || makePositionsMap(board);
  const startPositions = posMap.get(wordNormalized[0]) || [];

  // Try to find the word starting from each position
  for (const [startRow, startCol] of startPositions) {
    if (searchWord(board, wordNormalized, startRow, startCol, 0, new Set())) {
      return true;
    }
  }

  return false;
}

// Alias for backwards compatibility
export const validateWordOnBoard = isWordOnBoard;
