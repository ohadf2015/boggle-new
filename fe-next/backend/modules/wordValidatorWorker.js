/**
 * Word Validation Worker Thread
 * Offloads CPU-intensive word validation to a separate thread
 * to prevent blocking the main event loop
 */

const { parentPort, workerData } = require('worker_threads');

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

// Helper function to search for word using DFS with all 8 adjacent directions
function searchWord(board, word, row, col, index, visited) {
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
function searchWordPath(board, word, row, col, index, visited, path) {
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

// Build positions map for the board
function makePositionsMap(board) {
  const positions = new Map();
  if (!board || board.length === 0) return positions;
  for (let i = 0; i < board.length; i++) {
    for (let j = 0; j < board[0].length; j++) {
      const ch = normalizeHebrewLetter(String(board[i][j]).toLowerCase());
      if (!positions.has(ch)) positions.set(ch, []);
      positions.get(ch).push([i, j]);
    }
  }
  return positions;
}

// Check if a word exists on the board
function isWordOnBoard(word, board, positionsMap) {
  if (!word || !board || board.length === 0) return false;

  const wordNormalized = normalizeHebrewWord(word.toLowerCase());
  const posMap = positionsMap || makePositionsMap(board);
  const startPositions = posMap.get(wordNormalized[0]) || [];

  for (const [startRow, startCol] of startPositions) {
    if (searchWord(board, wordNormalized, startRow, startCol, 0, new Set())) {
      return true;
    }
  }

  return false;
}

// Get the path of cells used to form a word on the board
function getWordPath(word, board, positionsMap) {
  if (!word || !board || board.length === 0) return null;

  const wordNormalized = normalizeHebrewWord(word.toLowerCase());
  const posMap = positionsMap || makePositionsMap(board);
  const startPositions = posMap.get(wordNormalized[0]) || [];

  for (const [startRow, startCol] of startPositions) {
    const path = searchWordPath(board, wordNormalized, startRow, startCol, 0, new Set(), []);
    if (path) return path;
  }

  return null;
}

// Handle messages from main thread
if (parentPort) {
  parentPort.on('message', (data) => {
    const { id, action, word, board, positions } = data;

    try {
      let result;
      const positionsMap = positions ? new Map(positions) : makePositionsMap(board);

      switch (action) {
        case 'isWordOnBoard':
          result = isWordOnBoard(word, board, positionsMap);
          break;
        case 'getWordPath':
          result = getWordPath(word, board, positionsMap);
          break;
        case 'makePositionsMap':
          result = Array.from(makePositionsMap(board).entries());
          break;
        default:
          result = null;
      }

      parentPort.postMessage({ id, success: true, result });
    } catch (error) {
      parentPort.postMessage({ id, success: false, error: error.message });
    }
  });
}

// Export for testing
module.exports = {
  isWordOnBoard,
  getWordPath,
  makePositionsMap,
  normalizeHebrewLetter,
  normalizeHebrewWord
};
