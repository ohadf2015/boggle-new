/**
 * Utilities for LexiClash game
 * CommonJS version for backend compatibility
 */

const { hebrewLetters, swedishLetters, japaneseLetters, kanjiCompounds, DIFFICULTIES, DEFAULT_DIFFICULTY, AVATAR_COLORS, AVATAR_EMOJIS } = require('./consts');

/**
 * Generate a random 4-digit room code
 */
function generateRoomCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Generate a random avatar with emoji and color
 */
function generateRandomAvatar() {
  return {
    color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    emoji: AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)]
  };
}

/**
 * Normalize Hebrew letters - convert final forms to regular forms
 */
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

/**
 * Normalize an entire Hebrew word
 */
function normalizeHebrewWord(word) {
  if (typeof word !== 'string') return '';
  return word.split('').map(normalizeHebrewLetter).join('');
}

/**
 * Convert regular Hebrew letters to final forms when at end of word
 */
function applyHebrewFinalLetters(word) {
  if (typeof word !== 'string' || word.length === 0) return word;

  const regularToFinal = {
    'צ': 'ץ',
    'כ': 'ך',
    'מ': 'ם',
    'נ': 'ן',
    'פ': 'ף'
  };

  const chars = word.split('');
  const lastChar = chars[chars.length - 1];
  if (regularToFinal[lastChar]) {
    chars[chars.length - 1] = regularToFinal[lastChar];
  }

  return chars.join('');
}

function generateRandomTable(rows = null, cols = null, language = 'he', wordsToEmbed = []) {
  // Use default difficulty if no rows/cols specified
  if (rows === null || cols === null) {
    rows = DIFFICULTIES[DEFAULT_DIFFICULTY].rows;
    cols = DIFFICULTIES[DEFAULT_DIFFICULTY].cols;
  }

  let letters;
  if (language === 'en') {
    letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  } else if (language === 'sv') {
    letters = swedishLetters;
  } else if (language === 'ja') {
    // For Japanese, generate a board with embedded Kanji compounds
    return generateJapaneseTable(rows, cols);
  } else {
    letters = hebrewLetters;
  }

  // If we have words to embed, use enhanced generation
  if (wordsToEmbed && wordsToEmbed.length > 0) {
    return generateTableWithEmbeddedWords(rows, cols, letters, wordsToEmbed, language);
  }

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

// Generate a table with long dictionary words embedded for enhanced gameplay
function generateTableWithEmbeddedWords(rows, cols, letters, wordsToEmbed, language) {
  // Initialize grid with null values
  const grid = Array(rows).fill(null).map(() => Array(cols).fill(null));
  const usedCells = new Set();

  // Calculate how many words to embed based on board size
  const totalCells = rows * cols;
  const targetWords = Math.min(wordsToEmbed.length, Math.max(2, Math.floor(totalCells / 8)));

  // Sort words by length (longer first) for better placement
  const sortedWords = [...wordsToEmbed].sort((a, b) => b.length - a.length);

  let embeddedCount = 0;

  // Try to embed each word
  for (const word of sortedWords) {
    if (embeddedCount >= targetWords) break;

    // Skip words that are too long to fit
    if (word.length > Math.max(rows, cols)) continue;

    if (tryEmbedWord(grid, word, rows, cols, usedCells, language)) {
      embeddedCount++;
    }
  }

  // Fill remaining empty cells with random letters
  const lettersArray = typeof letters === 'string' ? letters.split('') : letters;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (grid[i][j] === null) {
        grid[i][j] = lettersArray[Math.floor(Math.random() * lettersArray.length)];
      }
    }
  }

  return grid;
}

// Try to embed a word into the grid in any direction
function tryEmbedWord(grid, word, rows, cols, usedCells, language) {
  const wordLen = word.length;

  const directions = [
    { dr: 0, dc: 1 },
    { dr: 0, dc: -1 },
    { dr: 1, dc: 0 },
    { dr: -1, dc: 0 },
    { dr: 1, dc: 1 },
    { dr: 1, dc: -1 },
    { dr: -1, dc: -1 },
    { dr: -1, dc: 1 },
  ];

  const shuffledDirs = [...directions].sort(() => Math.random() - 0.5);

  const maxAttempts = 100;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const startRow = Math.floor(Math.random() * rows);
    const startCol = Math.floor(Math.random() * cols);

    for (const dir of shuffledDirs) {
      const result = tryPlaceWordStraight(grid, word, startRow, startCol, dir, rows, cols, usedCells, language);
      if (result) return true;
    }

    const snakeResult = tryPlaceWordSnake(grid, word, startRow, startCol, rows, cols, usedCells, language);
    if (snakeResult) return true;
  }

  return false;
}

function tryPlaceWordStraight(grid, word, startRow, startCol, dir, rows, cols, usedCells, language) {
  const wordLen = word.length;
  const endRow = startRow + (wordLen - 1) * dir.dr;
  const endCol = startCol + (wordLen - 1) * dir.dc;

  if (endRow < 0 || endRow >= rows || endCol < 0 || endCol >= cols) {
    return false;
  }

  const cellsToUse = [];
  for (let i = 0; i < wordLen; i++) {
    const r = startRow + i * dir.dr;
    const c = startCol + i * dir.dc;
    const cellKey = `${r},${c}`;
    const char = normalizeLetterForBoard(word[i], language);

    if (grid[r][c] !== null && grid[r][c] !== char) {
      return false;
    }

    cellsToUse.push({ r, c, char, key: cellKey });
  }

  for (const cell of cellsToUse) {
    grid[cell.r][cell.c] = cell.char;
    usedCells.add(cell.key);
  }
  return true;
}

function tryPlaceWordSnake(grid, word, startRow, startCol, rows, cols, usedCells, language) {
  const wordLen = word.length;
  const path = [];
  const visited = new Set();

  function dfs(row, col, index) {
    if (index === wordLen) {
      return true;
    }

    if (row < 0 || row >= rows || col < 0 || col >= cols) {
      return false;
    }

    const cellKey = `${row},${col}`;

    if (visited.has(cellKey)) {
      return false;
    }

    const char = normalizeLetterForBoard(word[index], language);

    if (grid[row][col] !== null && grid[row][col] !== char) {
      return false;
    }

    visited.add(cellKey);
    path.push({ r: row, c: col, char, key: cellKey });

    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];

    const shuffled = [...directions].sort(() => Math.random() - 0.5);

    for (const [dr, dc] of shuffled) {
      if (dfs(row + dr, col + dc, index + 1)) {
        return true;
      }
    }

    visited.delete(cellKey);
    path.pop();
    return false;
  }

  if (dfs(startRow, startCol, 0)) {
    for (const cell of path) {
      grid[cell.r][cell.c] = cell.char;
      usedCells.add(cell.key);
    }
    return true;
  }

  return false;
}

function normalizeLetterForBoard(letter, language) {
  if (language === 'en' || language === 'sv') {
    return letter.toUpperCase();
  }
  return letter;
}

function generateJapaneseTable(rows, cols) {
  const grid = Array(rows).fill(null).map(() => Array(cols).fill(null));
  const totalCells = rows * cols;
  const targetCompounds = Math.floor(totalCells / 5);

  const shuffledCompounds = [...kanjiCompounds].sort(() => Math.random() - 0.5);
  const twoCharCompounds = shuffledCompounds.filter(w => w.length === 2);
  const threeCharCompounds = shuffledCompounds.filter(w => w.length === 3);

  let embeddedCount = 0;
  const usedCells = new Set();

  for (const compound of threeCharCompounds) {
    if (embeddedCount >= Math.floor(targetCompounds * 0.2)) break;
    if (tryEmbedCompound(grid, compound, rows, cols, usedCells)) {
      embeddedCount++;
    }
  }

  for (const compound of twoCharCompounds) {
    if (embeddedCount >= targetCompounds) break;
    if (tryEmbedCompound(grid, compound, rows, cols, usedCells)) {
      embeddedCount++;
    }
  }

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (grid[i][j] === null) {
        grid[i][j] = japaneseLetters[Math.floor(Math.random() * japaneseLetters.length)];
      }
    }
  }

  return grid;
}

function tryEmbedCompound(grid, compound, rows, cols, usedCells) {
  const wordLen = compound.length;
  const directions = [
    { dr: 0, dc: 1 },
    { dr: 0, dc: -1 },
    { dr: 1, dc: 0 },
    { dr: -1, dc: 0 },
    { dr: 1, dc: 1 },
    { dr: 1, dc: -1 },
    { dr: -1, dc: -1 },
    { dr: -1, dc: 1 },
  ];

  const shuffledDirs = directions.sort(() => Math.random() - 0.5);
  const attempts = 50;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const startRow = Math.floor(Math.random() * rows);
    const startCol = Math.floor(Math.random() * cols);

    for (const dir of shuffledDirs) {
      const endRow = startRow + (wordLen - 1) * dir.dr;
      const endCol = startCol + (wordLen - 1) * dir.dc;

      if (endRow < 0 || endRow >= rows || endCol < 0 || endCol >= cols) {
        continue;
      }

      let canPlace = true;
      const cellsToUse = [];

      for (let i = 0; i < wordLen; i++) {
        const r = startRow + i * dir.dr;
        const c = startCol + i * dir.dc;
        const cellKey = `${r},${c}`;

        if (grid[r][c] !== null && grid[r][c] !== compound[i]) {
          canPlace = false;
          break;
        }

        cellsToUse.push({ r, c, char: compound[i], key: cellKey });
      }

      if (canPlace) {
        for (const cell of cellsToUse) {
          grid[cell.r][cell.c] = cell.char;
          usedCells.add(cell.key);
        }
        return true;
      }
    }
  }

  return false;
}

function embedWordInGrid(rows, cols, word, language = 'he') {
  const grid = generateRandomTable(rows, cols, language);

  if (!word || word.length === 0) return { grid, path: [] };

  const wordLen = word.length;

  if (wordLen > rows && wordLen > cols) {
    return { grid, path: [] };
  }

  const maxAttempts = 50;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const validDirections = [];
    if (wordLen <= cols) validDirections.push(0);
    if (wordLen <= rows) validDirections.push(1);
    if (wordLen <= rows && wordLen <= cols) {
      validDirections.push(2);
      validDirections.push(3);
    }

    if (validDirections.length === 0) {
      return { grid, path: [] };
    }

    const direction = validDirections[Math.floor(Math.random() * validDirections.length)];
    let startRow, startCol;
    let rowStep = 0, colStep = 0;

    if (direction === 0) {
      rowStep = 0; colStep = 1;
      startRow = Math.floor(Math.random() * rows);
      startCol = Math.floor(Math.random() * (cols - wordLen + 1));
    } else if (direction === 1) {
      rowStep = 1; colStep = 0;
      startRow = Math.floor(Math.random() * (rows - wordLen + 1));
      startCol = Math.floor(Math.random() * cols);
    } else if (direction === 2) {
      rowStep = 1; colStep = 1;
      startRow = Math.floor(Math.random() * (rows - wordLen + 1));
      startCol = Math.floor(Math.random() * (cols - wordLen + 1));
    } else {
      rowStep = -1; colStep = 1;
      startRow = Math.floor(Math.random() * (rows - wordLen + 1)) + (wordLen - 1);
      startCol = Math.floor(Math.random() * (cols - wordLen + 1));
    }

    const path = [];
    for (let i = 0; i < wordLen; i++) {
      const r = startRow + (i * rowStep);
      const c = startCol + (i * colStep);
      grid[r][c] = word[i];
      path.push({ row: r, col: c, letter: word[i] });
    }

    return { grid, path };
  }

  return { grid, path: [] };
}

function isWordOnBoard(word, board) {
  if (!word || !board || board.length === 0) return false;

  const rows = board.length;
  const cols = board[0].length;
  const wordNormalized = normalizeHebrewWord(word.toLowerCase());

  const startPositions = [];
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const cellNormalized = normalizeHebrewLetter(board[i][j].toLowerCase());
      if (cellNormalized === wordNormalized[0]) {
        startPositions.push([i, j]);
      }
    }
  }

  for (const [startRow, startCol] of startPositions) {
    if (searchWord(board, wordNormalized, startRow, startCol, 0, new Set())) {
      return true;
    }
  }

  return false;
}

function searchWord(board, word, row, col, index, visited) {
  if (index === word.length) {
    return true;
  }

  if (row < 0 || row >= board.length || col < 0 || col >= board[0].length) {
    return false;
  }

  const cellKey = `${row},${col}`;
  if (visited.has(cellKey)) {
    return false;
  }

  const cellNormalized = normalizeHebrewLetter(board[row][col].toLowerCase());
  if (cellNormalized !== word[index]) {
    return false;
  }

  visited.add(cellKey);

  const directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];

  for (const [dx, dy] of directions) {
    if (searchWord(board, word, row + dx, col + dy, index + 1, new Set(visited))) {
      return true;
    }
  }

  visited.delete(cellKey);

  return false;
}

module.exports = {
  generateRoomCode,
  generateRandomAvatar,
  normalizeHebrewLetter,
  normalizeHebrewWord,
  applyHebrewFinalLetters,
  generateRandomTable,
  embedWordInGrid,
  isWordOnBoard,
};
