// Test script for word validation algorithm
// Run with: node test-validation.js

// Word validation: Check if a word exists on the board as a valid path
function isWordOnBoard(word, board) {
  if (!word || !board || board.length === 0) return false;

  const rows = board.length;
  const cols = board[0].length;
  const wordLower = word.toLowerCase();

  // Find all starting positions (cells with the first letter)
  const startPositions = [];
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (board[i][j].toLowerCase() === wordLower[0]) {
        startPositions.push([i, j]);
      }
    }
  }

  // Try to find the word starting from each position
  for (const [startRow, startCol] of startPositions) {
    if (searchWord(board, wordLower, startRow, startCol, 0, new Set())) {
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

  // Check if current cell matches current letter
  if (board[row][col].toLowerCase() !== word[index]) {
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

  return false;
}

// Test cases
console.log('Testing word validation algorithm...\n');

const testBoard = [
  ['ק', 'ל', 'ב'],
  ['מ', 'ש', 'ת'],
  ['ר', 'ח', 'ן']
];

console.log('Test Board:');
testBoard.forEach(row => console.log(row.join(' ')));
console.log('');

// Test cases
const tests = [
  { word: 'קלב', expected: true, description: 'horizontal word (right)' },
  { word: 'קמר', expected: true, description: 'vertical word (down)' },
  { word: 'קשח', expected: true, description: 'diagonal word' },
  { word: 'לשר', expected: true, description: 'diagonal path' },
  { word: 'אבג', expected: false, description: 'word not on board' },
  { word: 'קקק', expected: false, description: 'reusing same cell' },
  { word: 'קשן', expected: true, description: 'diagonal path from corner to corner' }, // ק->ש->ן is valid
];

let passed = 0;
let failed = 0;

tests.forEach((test, index) => {
  const result = isWordOnBoard(test.word, testBoard);
  const status = result === test.expected ? '✓ PASS' : '✗ FAIL';

  if (result === test.expected) {
    passed++;
  } else {
    failed++;
  }

  console.log(`Test ${index + 1}: ${status}`);
  console.log(`  Word: "${test.word}" (${test.description})`);
  console.log(`  Expected: ${test.expected}, Got: ${result}`);
  console.log('');
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('✓ All tests passed!');
  process.exit(0);
} else {
  console.log('✗ Some tests failed');
  process.exit(1);
}
