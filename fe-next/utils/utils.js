import { hebrewLetters, DIFFICULTIES, DEFAULT_DIFFICULTY } from "./consts";

// Utilities for LexiClash game

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

// Convert regular Hebrew letters to final forms when at end of word
export function applyHebrewFinalLetters(word) {
  if (!word || word.length === 0) return word;

  const regularToFinal = {
    'צ': 'ץ',
    'כ': 'ך',
    'מ': 'ם',
    'נ': 'ן',
    'פ': 'ף'
  };

  // Split word into array of characters
  const chars = word.split('');

  // Replace last character if it has a final form
  const lastChar = chars[chars.length - 1];
  if (regularToFinal[lastChar]) {
    chars[chars.length - 1] = regularToFinal[lastChar];
  }

  return chars.join('');
}

export function generateRandomTable(rows = null, cols = null, language = 'he') {
    // Use default difficulty if no rows/cols specified
    if (rows === null || cols === null) {
      rows = DIFFICULTIES[DEFAULT_DIFFICULTY].rows;
      cols = DIFFICULTIES[DEFAULT_DIFFICULTY].cols;
    }

    const letters = language === 'en' 
      ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' 
      : hebrewLetters;

    const newTable = [];
    for (let i = 0; i < rows; i++) {
      const row = [];
      for (let j = 0; j < cols; j++) {
        const randomLetter = letters[Math.floor(Math.random() * letters.length)];
        row.push(randomLetter);
      }
      newTable.push(row);
    }
    return newTable;
  }

export function embedWordInGrid(rows, cols, word, language = 'he') {
  // 1. Generate a random grid first
  const grid = generateRandomTable(rows, cols, language);
  
  if (!word || word.length === 0) return grid;
  
  // 2. Choose a random starting position and direction
  // Directions: 0=horizontal, 1=vertical, 2=diagonal-down-right, 3=diagonal-up-right
  const wordLen = word.length;
  const maxAttempts = 50;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const direction = Math.floor(Math.random() * 4);
    let startRow, startCol;
    let rowStep = 0, colStep = 0;
    
    // Set steps based on direction
    if (direction === 0) { // Horizontal
      rowStep = 0; colStep = 1;
      startRow = Math.floor(Math.random() * rows);
      startCol = Math.floor(Math.random() * (cols - wordLen + 1));
    } else if (direction === 1) { // Vertical
      rowStep = 1; colStep = 0;
      startRow = Math.floor(Math.random() * (rows - wordLen + 1));
      startCol = Math.floor(Math.random() * cols);
    } else if (direction === 2) { // Diagonal down-right
      rowStep = 1; colStep = 1;
      startRow = Math.floor(Math.random() * (rows - wordLen + 1));
      startCol = Math.floor(Math.random() * (cols - wordLen + 1));
    } else { // Diagonal up-right
      rowStep = -1; colStep = 1;
      startRow = Math.floor(Math.random() * (rows - wordLen + 1)) + (wordLen - 1);
      startCol = Math.floor(Math.random() * (cols - wordLen + 1));
    }
    
    // 3. Place the word
    const path = [];
    for (let i = 0; i < wordLen; i++) {
      const r = startRow + (i * rowStep);
      const c = startCol + (i * colStep);
      grid[r][c] = word[i];
      path.push({ row: r, col: c, letter: word[i] });
    }
    
    return { grid, path };
  }
  
  // Fallback if placement failed
  return { grid, path: [] };
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