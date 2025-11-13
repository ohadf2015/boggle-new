import { hebrewLetters, DIFFICULTIES, DEFAULT_DIFFICULTY } from "./consts";

// Normalize Hebrew letters - convert final forms to regular forms
export function normalizeHebrewLetter(letter) {
  const finalToRegular = {
    'ץ': 'צ',
    'ך': 'כ',
    'ם': 'מ',
    'ן': 'נ',
    'ף': 'פ'
  };
  return finalToRegular[letter] || letter;
}

// Normalize an entire Hebrew word
export function normalizeHebrewWord(word) {
  return word.split('').map(normalizeHebrewLetter).join('');
}

export function generateRandomTable(rows = null, cols = null) {
    // Use default difficulty if no rows/cols specified
    if (rows === null || cols === null) {
      rows = DIFFICULTIES[DEFAULT_DIFFICULTY].rows;
      cols = DIFFICULTIES[DEFAULT_DIFFICULTY].cols;
    }

    const newTable = [];
    for (let i = 0; i < rows; i++) {
      const row = [];
      for (let j = 0; j < cols; j++) {
        const randomLetter = hebrewLetters[Math.floor(Math.random() * hebrewLetters.length)];
        row.push(randomLetter);
      }
      newTable.push(row);
    }
    return newTable;
  }

// Check if a word exists on the board as a valid path
export function isWordOnBoard(word, board) {
  if (!word || !board || board.length === 0) return false;

  const rows = board.length;
  const cols = board[0].length;
  // Normalize and lowercase the word for comparison
  const wordNormalized = normalizeHebrewWord(word.toLowerCase());

  // Find all starting positions (cells with the first letter)
  const startPositions = [];
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const cellNormalized = normalizeHebrewLetter(board[i][j].toLowerCase());
      if (cellNormalized === wordNormalized[0]) {
        startPositions.push([i, j]);
      }
    }
  }

  // Try to find the word starting from each position
  for (const [startRow, startCol] of startPositions) {
    if (searchWord(board, wordNormalized, startRow, startCol, 0, new Set())) {
      return true;
    }
  }

  return false;
}

// Helper function to search for word using DFS
function searchWord(board, word, row, col, index, visited) {
  // Base case: found the entire word
  if (index === word.length) {
    return true;
  }

  // Check bounds
  if (row < 0 || row >= board.length || col < 0 || col >= board[0].length) {
    return false;
  }

  // Check if already visited this cell
  const cellKey = `${row},${col}`;
  if (visited.has(cellKey)) {
    return false;
  }

  // Check if current cell matches current letter (with normalization)
  const cellNormalized = normalizeHebrewLetter(board[row][col].toLowerCase());
  if (cellNormalized !== word[index]) {
    return false;
  }

  // Mark as visited
  visited.add(cellKey);

  // Search in all 8 directions (horizontal, vertical, diagonal)
  const directions = [
    [-1, -1], [-1, 0], [-1, 1],  // top-left, top, top-right
    [0, -1],           [0, 1],   // left, right
    [1, -1],  [1, 0],  [1, 1]    // bottom-left, bottom, bottom-right
  ];

  for (const [dx, dy] of directions) {
    if (searchWord(board, word, row + dx, col + dy, index + 1, new Set(visited))) {
      return true;
    }
  }

  // Backtrack: unmark as visited (not needed since we pass new Set, but good practice)
  visited.delete(cellKey);

  return false;
}