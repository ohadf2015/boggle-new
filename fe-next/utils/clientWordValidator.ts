/**
 * Client-side word validation utilities for optimistic UI feedback
 *
 * This module provides quick client-side validation before server round-trip.
 * Server remains the source of truth, but we show immediate feedback.
 */

// Hebrew letter normalization - matches backend
const hebrewFinalLetters: Record<string, string> = {
  'ך': 'כ',
  'ם': 'מ',
  'ן': 'נ',
  'ף': 'פ',
  'ץ': 'צ'
};

export function normalizeHebrewWord(word: string): string {
  return word.split('').map(letter => hebrewFinalLetters[letter] || letter).join('');
}

// Spanish accent normalization - matches backend
// Accented vowels are normalized to base vowels for dictionary lookup
// Note: Ñ is kept as-is since it exists in the dictionary as a distinct letter
const spanishAccentMap: Record<string, string> = {
  'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ü': 'u'
};

export function normalizeSpanishLetter(letter: string): string {
  const lower = letter.toLowerCase();
  return spanishAccentMap[lower] || lower;
}

export function normalizeSpanishWord(word: string): string {
  return word.split('').map(c => {
    const lower = c.toLowerCase();
    return spanishAccentMap[lower] || lower;
  }).join('');
}

/**
 * Normalize word based on language (matches backend normalization)
 */
export function normalizeWord(word: string, language: string): string {
  switch (language) {
    case 'he':
      return normalizeHebrewWord(word);
    case 'es':
      return normalizeSpanishWord(word);
    case 'ja':
      return word; // Japanese doesn't need normalization
    case 'en':
    case 'sv':
    default:
      return word.toLowerCase();
  }
}

/**
 * Get the regex pattern for valid characters in a language
 */
export function getLanguageRegex(language: string): RegExp {
  switch (language) {
    case 'he':
      return /^[\u0590-\u05FF]+$/;
    case 'sv':
      return /^[a-zA-ZåäöÅÄÖ]+$/;
    case 'es':
      return /^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]+$/;
    case 'ja':
      return /^[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+$/;
    case 'en':
    default:
      return /^[a-zA-Z]+$/;
  }
}

/**
 * Quick validation result from client-side checks
 */
export interface ClientValidationResult {
  isValid: boolean;
  errorKey?: string; // i18n key for error message
  errorParams?: Record<string, string | number>;
  shouldSubmitToServer: boolean; // Whether to still send to server
}

/**
 * Validate word locally before sending to server
 * Returns validation result and whether to show optimistic success
 */
export function validateWordLocally(
  word: string,
  language: string,
  minWordLength: number,
  foundWords: Array<{ word: string; isValid?: boolean | null }>
): ClientValidationResult {
  // Check minimum length
  if (word.length < minWordLength) {
    return {
      isValid: false,
      errorKey: 'playerView.wordTooShortMin',
      errorParams: { min: minWordLength },
      shouldSubmitToServer: false // Don't waste server trip
    };
  }

  // Check language regex (valid characters)
  const regex = getLanguageRegex(language);
  if (!regex.test(word)) {
    return {
      isValid: false,
      errorKey: 'playerView.onlyLanguageWords',
      shouldSubmitToServer: false // Invalid characters, don't submit
    };
  }

  // Check if word was already found (case-insensitive)
  const normalizedWord = normalizeWord(word, language);
  const alreadyFound = foundWords.some(fw => {
    const existingNormalized = normalizeWord(fw.word, language);
    return existingNormalized === normalizedWord;
  });

  if (alreadyFound) {
    return {
      isValid: false,
      errorKey: 'playerView.wordAlreadyFound',
      shouldSubmitToServer: false // Already have this word
    };
  }

  // Passed all local checks - valid for optimistic feedback
  return {
    isValid: true,
    shouldSubmitToServer: true
  };
}

/**
 * Check if a word can possibly be on the board
 * This is a simple heuristic - actual path validation happens on server
 * Returns true if the word MIGHT be on the board (for optimistic UI)
 */
export function couldBeOnBoard(word: string, letterGrid: string[][] | null, language: string): boolean {
  if (!letterGrid || !word) return true; // Can't validate without grid, assume valid

  const normalizedWord = normalizeWord(word, language);
  const flatGrid = letterGrid.flat().map(l => normalizeWord(l, language));

  // Check if all letters in the word exist in the grid
  // This is a necessary but not sufficient condition
  const letterCounts = new Map<string, number>();
  for (const letter of flatGrid) {
    letterCounts.set(letter, (letterCounts.get(letter) || 0) + 1);
  }

  for (const letter of normalizedWord) {
    const count = letterCounts.get(letter);
    if (!count || count <= 0) {
      return false; // Letter not available in grid
    }
    letterCounts.set(letter, count - 1);
  }

  return true; // All letters available, might be valid path
}

/**
 * Build a map of letter positions on the board for efficient path finding
 */
function makePositionsMap(board: string[][], language: string): Map<string, [number, number][]> {
  const positions = new Map<string, [number, number][]>();
  if (!board || board.length === 0) return positions;

  for (let i = 0; i < board.length; i++) {
    for (let j = 0; j < board[0].length; j++) {
      const ch = normalizeWord(String(board[i][j]), language);
      if (!positions.has(ch)) positions.set(ch, []);
      positions.get(ch)!.push([i, j]);
    }
  }
  return positions;
}

/**
 * DFS search for word path on board with 8-directional adjacency
 */
function searchWord(
  board: string[][],
  word: string,
  row: number,
  col: number,
  index: number,
  visited: Set<string>,
  language: string
): boolean {
  if (index === word.length) return true;

  if (row < 0 || row >= board.length || col < 0 || col >= board[0].length) return false;

  const cellKey = `${row},${col}`;
  if (visited.has(cellKey)) return false;

  const cellNormalized = normalizeWord(board[row][col], language);
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
 * Check if a word exists on the board as a valid path
 * Uses DFS to find adjacent cell path (8-directional)
 * This is the authoritative validation - same logic as backend
 */
export function isWordOnBoard(word: string, letterGrid: string[][] | null, language: string): boolean {
  if (!letterGrid || !word || letterGrid.length === 0) return false;

  // Normalize the word for comparison
  const wordNormalized = normalizeWord(word, language);

  // Find all starting positions (cells with the first letter)
  const posMap = makePositionsMap(letterGrid, language);
  const startPositions = posMap.get(wordNormalized[0]) || [];

  // Try to find the word starting from each position
  for (const [startRow, startCol] of startPositions) {
    if (searchWord(letterGrid, wordNormalized, startRow, startCol, 0, new Set(), language)) {
      return true;
    }
  }

  return false;
}
