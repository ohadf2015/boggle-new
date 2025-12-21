// Word validation utilities

// Normalize Hebrew letters - convert final forms to regular forms
function normalizeHebrewLetter(letter) {
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
function normalizeHebrewWord(word) {
  return word.split('').map(normalizeHebrewLetter).join('');
}

// Spanish accent normalization - accented vowels to base vowels
// Note: Ñ is kept as-is since it exists in the dictionary as a distinct letter
const spanishAccentMap = {
  'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ü': 'u'
};

function normalizeSpanishLetter(letter) {
  const lower = letter.toLowerCase();
  return spanishAccentMap[lower] || lower;
}

function normalizeSpanishWord(word) {
  return word.split('').map(c => {
    const lower = c.toLowerCase();
    return spanishAccentMap[lower] || lower;
  }).join('');
}

// Language-aware letter normalization
function normalizeLetterForLanguage(letter, language) {
  const lower = letter.toLowerCase();
  if (language === 'he') return normalizeHebrewLetter(lower);
  if (language === 'es') return normalizeSpanishLetter(lower);
  return lower;
}

// Language-aware word normalization
function normalizeWordForLanguage(word, language) {
  if (language === 'he') return normalizeHebrewWord(word.toLowerCase());
  if (language === 'es') return normalizeSpanishWord(word);
  return word.toLowerCase();
}

// Helper function to search for word using DFS with all 8 adjacent directions
function searchWord(board, word, row, col, index, visited, language = 'he') {
  if (index === word.length) return true;

  if (row < 0 || row >= board.length || col < 0 || col >= board[0].length) return false;

  const cellKey = `${row},${col}`;
  if (visited.has(cellKey)) return false;

  const cellNormalized = normalizeLetterForLanguage(board[row][col], language);
  if (cellNormalized !== word[index]) return false;

  visited.add(cellKey);

  // All 8 adjacent directions: horizontal, vertical, and diagonal
  const allDirections = [
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

// Helper function to search for word and return the path
function searchWordPath(board, word, row, col, index, visited, path, language = 'he') {
  if (index === word.length) return [...path];

  if (row < 0 || row >= board.length || col < 0 || col >= board[0].length) return null;

  const cellKey = `${row},${col}`;
  if (visited.has(cellKey)) return null;

  const cellNormalized = normalizeLetterForLanguage(board[row][col], language);
  if (cellNormalized !== word[index]) return null;

  visited.add(cellKey);
  path.push({ row, col });

  const allDirections = [
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

// Get the path of cells used to form a word on the board
function getWordPath(word, board, positions, language = 'he') {
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

// Word validation: Check if a word exists on the board as a valid path
function makePositionsMap(board, language = 'he') {
  const positions = new Map();
  if (!board || board.length === 0) return positions;
  for (let i = 0; i < board.length; i++) {
    for (let j = 0; j < board[0].length; j++) {
      const ch = normalizeLetterForLanguage(board[i][j], language);
      if (!positions.has(ch)) positions.set(ch, []);
      positions.get(ch).push([i, j]);
    }
  }
  return positions;
}

function isWordOnBoard(word, board, positions, language = 'he') {
  if (!word || !board || board.length === 0) return false;

  const rows = board.length;
  const cols = board[0].length;
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

module.exports = {
  normalizeHebrewLetter,
  normalizeHebrewWord,
  normalizeSpanishLetter,
  normalizeSpanishWord,
  normalizeLetterForLanguage,
  normalizeWordForLanguage,
  isWordOnBoard,
  makePositionsMap,
  getWordPath,
  // Alias for backwards compatibility with socketHandlers.js
  validateWordOnBoard: isWordOnBoard
};
