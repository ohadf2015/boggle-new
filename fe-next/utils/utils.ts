import { hebrewLetters, swedishLetters, japaneseLetters, kanjiCompounds, DIFFICULTIES, DEFAULT_DIFFICULTY, AVATAR_COLORS, AVATAR_EMOJIS } from "./consts";
import type { Language, LetterGrid, GridPosition, Avatar } from "@/types";

// Utilities for LexiClash game

/**
 * Generate a random 4-digit room code
 */
export function generateRoomCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Generate a random avatar with emoji and color
 */
export function generateRandomAvatar(): Avatar {
  return {
    color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    emoji: AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)]
  };
}

/**
 * Normalize Hebrew letters - convert final forms to regular forms
 */
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

// Valid Hebrew letters (aleph to tav, including final forms)
const validHebrewLettersSet = new Set([
  'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י',
  'כ', 'ך', 'ל', 'מ', 'ם', 'נ', 'ן', 'ס', 'ע', 'פ',
  'ף', 'צ', 'ץ', 'ק', 'ר', 'ש', 'ת'
]);

/**
 * Check if a character is a valid Hebrew letter (no punctuation like gershayim ״ or geresh ׳)
 */
export function isValidHebrewLetter(char: string): boolean {
  return validHebrewLettersSet.has(char);
}

/**
 * Filter a Hebrew word to only include valid letters (removes punctuation marks)
 */
export function filterHebrewWord(word: string): string {
  return word.split('').filter(isValidHebrewLetter).join('');
}

/**
 * Normalize an entire Hebrew word
 */
export function normalizeHebrewWord(word: string): string {
  if (typeof word !== 'string') return '';
  return word.split('').map(normalizeHebrewLetter).join('');
}

/**
 * Convert regular Hebrew letters to final forms when at end of word
 */
export function applyHebrewFinalLetters(word: string): string {
  if (typeof word !== 'string' || word.length === 0) return word;

  const regularToFinal: Record<string, string> = {
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

export function generateRandomTable(
  rows: number | null = null,
  cols: number | null = null,
  language: Language = 'he',
  wordsToEmbed: string[] = []
): LetterGrid {
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
function generateTableWithEmbeddedWords(
  rows: number,
  cols: number,
  letters: string | string[],
  wordsToEmbed: string[],
  language: Language
): LetterGrid {
  // Initialize grid with null values
  const grid = Array(rows).fill(null).map(() => Array(cols).fill(null));
  const usedCells = new Set<string>();

  // Calculate how many words to embed based on board size
  // Aim for roughly 1 word per 3-4 cells for denser coverage
  // This ensures players have plenty of valid words to find
  const totalCells = rows * cols;
  const targetWords = Math.min(wordsToEmbed.length, Math.max(4, Math.floor(totalCells / 3)));

  // Filter words to only include valid letters for the language
  // For Hebrew, this removes punctuation marks like gershayim (״) and geresh (׳)
  const cleanedWords = language === 'he'
    ? wordsToEmbed.map(filterHebrewWord).filter(w => w.length >= 2)
    : wordsToEmbed;

  // Sort words by length (longer first) for better placement
  const sortedWords = [...cleanedWords].sort((a, b) => b.length - a.length);

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

// Try to embed a word into the grid in any direction (including combinations)
function tryEmbedWord(
  grid: (string | null)[][],
  word: string,
  rows: number,
  cols: number,
  usedCells: Set<string>,
  language: Language
): boolean {
  const wordLen = word.length;

  // All 8 directions for straight paths
  const directions = [
    { dr: 0, dc: 1 },   // horizontal right
    { dr: 0, dc: -1 },  // horizontal left
    { dr: 1, dc: 0 },   // vertical down
    { dr: -1, dc: 0 },  // vertical up
    { dr: 1, dc: 1 },   // diagonal down-right
    { dr: 1, dc: -1 },  // diagonal down-left
    { dr: -1, dc: -1 }, // diagonal up-left
    { dr: -1, dc: 1 },  // diagonal up-right
  ];

  // Shuffle directions for randomness
  const shuffledDirs = [...directions].sort(() => Math.random() - 0.5);

  // Try random starting positions with straight paths first
  const maxAttempts = 100;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const startRow = Math.floor(Math.random() * rows);
    const startCol = Math.floor(Math.random() * cols);

    // Try straight path in each direction
    for (const dir of shuffledDirs) {
      const result = tryPlaceWordStraight(grid, word, startRow, startCol, dir, rows, cols, usedCells, language);
      if (result) return true;
    }

    // Try snake/winding path (combination of directions)
    const snakeResult = tryPlaceWordSnake(grid, word, startRow, startCol, rows, cols, usedCells, language);
    if (snakeResult) return true;
  }

  return false;
}

// Try to place a word in a straight line
function tryPlaceWordStraight(
  grid: (string | null)[][],
  word: string,
  startRow: number,
  startCol: number,
  dir: { dr: number; dc: number },
  rows: number,
  cols: number,
  usedCells: Set<string>,
  language: Language
): boolean {
  const wordLen = word.length;
  const endRow = startRow + (wordLen - 1) * dir.dr;
  const endCol = startCol + (wordLen - 1) * dir.dc;

  // Check bounds
  if (endRow < 0 || endRow >= rows || endCol < 0 || endCol >= cols) {
    return false;
  }

  // Check if all cells are available
  const cellsToUse = [];
  for (let i = 0; i < wordLen; i++) {
    const r = startRow + i * dir.dr;
    const c = startCol + i * dir.dc;
    const cellKey = `${r},${c}`;
    const char = normalizeLetterForBoard(word[i], language);

    // Check if cell conflicts (has a different letter)
    if (grid[r][c] !== null && grid[r][c] !== char) {
      return false;
    }

    cellsToUse.push({ r, c, char, key: cellKey });
  }

  // Place the word
  for (const cell of cellsToUse) {
    grid[cell.r][cell.c] = cell.char;
    usedCells.add(cell.key);
  }
  return true;
}

// Try to place a word in a snake/winding path (combination of directions)
function tryPlaceWordSnake(
  grid: (string | null)[][],
  word: string,
  startRow: number,
  startCol: number,
  rows: number,
  cols: number,
  usedCells: Set<string>,
  language: Language
): boolean {
  const wordLen = word.length;

  // Use DFS to find a valid winding path
  const path: Array<{ r: number; c: number; char: string; key: string }> = [];
  const visited = new Set<string>();

  function dfs(row: number, col: number, index: number): boolean {
    // Success - placed entire word
    if (index === wordLen) {
      return true;
    }

    // Check bounds
    if (row < 0 || row >= rows || col < 0 || col >= cols) {
      return false;
    }

    const cellKey = `${row},${col}`;

    // Already in current path
    if (visited.has(cellKey)) {
      return false;
    }

    const char = normalizeLetterForBoard(word[index], language);

    // Cell has conflicting letter
    if (grid[row][col] !== null && grid[row][col] !== char) {
      return false;
    }

    // Try placing this letter
    visited.add(cellKey);
    path.push({ r: row, c: col, char, key: cellKey });

    // All 8 adjacent directions
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];

    // Shuffle for randomness
    const shuffled = [...directions].sort(() => Math.random() - 0.5);

    for (const [dr, dc] of shuffled) {
      if (dfs(row + dr, col + dc, index + 1)) {
        return true;
      }
    }

    // Backtrack
    visited.delete(cellKey);
    path.pop();
    return false;
  }

  // Start DFS from the given position
  if (dfs(startRow, startCol, 0)) {
    // Success - place all letters
    for (const cell of path) {
      grid[cell.r][cell.c] = cell.char;
      usedCells.add(cell.key);
    }
    return true;
  }

  return false;
}

// Normalize letter for board display based on language
function normalizeLetterForBoard(letter: string, language: Language): string {
  if (language === 'en' || language === 'sv') {
    return letter.toUpperCase();
  }
  return letter; // Hebrew stays as-is
}

// Generate a Japanese board with embedded Kanji compounds
function generateJapaneseTable(rows: number, cols: number): LetterGrid {
  // Initialize grid with null values
  const grid = Array(rows).fill(null).map(() => Array(cols).fill(null));

  // Calculate how many compounds to embed based on board size
  // Aim for roughly 1 compound per 4-6 cells to ensure good coverage
  const totalCells = rows * cols;
  const targetCompounds = Math.floor(totalCells / 5);

  // Shuffle compounds and pick ones to embed
  const shuffledCompounds = [...kanjiCompounds].sort(() => Math.random() - 0.5);

  // Filter to 2-character compounds for easier embedding (more reliable)
  const twoCharCompounds = shuffledCompounds.filter(w => w.length === 2);
  const threeCharCompounds = shuffledCompounds.filter(w => w.length === 3);

  let embeddedCount = 0;
  const usedCells = new Set<string>();

  // First, try to embed some 3-character compounds
  for (const compound of threeCharCompounds) {
    if (embeddedCount >= Math.floor(targetCompounds * 0.2)) break; // 20% three-char compounds

    if (tryEmbedCompound(grid, compound, rows, cols, usedCells)) {
      embeddedCount++;
    }
  }

  // Then embed 2-character compounds
  for (const compound of twoCharCompounds) {
    if (embeddedCount >= targetCompounds) break;

    if (tryEmbedCompound(grid, compound, rows, cols, usedCells)) {
      embeddedCount++;
    }
  }

  // Fill remaining empty cells with random Kanji
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (grid[i][j] === null) {
        grid[i][j] = japaneseLetters[Math.floor(Math.random() * japaneseLetters.length)];
      }
    }
  }

  return grid;
}

// Try to embed a compound word into the grid
function tryEmbedCompound(
  grid: (string | null)[][],
  compound: string,
  rows: number,
  cols: number,
  usedCells: Set<string>
): boolean {
  const wordLen = compound.length;
  // All 8 directions: horizontal, vertical, and diagonal
  const directions = [
    { dr: 0, dc: 1 },   // horizontal right
    { dr: 0, dc: -1 },  // horizontal left
    { dr: 1, dc: 0 },   // vertical down
    { dr: -1, dc: 0 },  // vertical up
    { dr: 1, dc: 1 },   // diagonal down-right
    { dr: 1, dc: -1 },  // diagonal down-left
    { dr: -1, dc: -1 }, // diagonal up-left
    { dr: -1, dc: 1 },  // diagonal up-right
  ];

  // Shuffle directions for randomness
  const shuffledDirs = directions.sort(() => Math.random() - 0.5);

  // Try random starting positions
  const attempts = 50;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const startRow = Math.floor(Math.random() * rows);
    const startCol = Math.floor(Math.random() * cols);

    for (const dir of shuffledDirs) {
      // Check if word fits in this direction
      const endRow = startRow + (wordLen - 1) * dir.dr;
      const endCol = startCol + (wordLen - 1) * dir.dc;

      if (endRow < 0 || endRow >= rows || endCol < 0 || endCol >= cols) {
        continue;
      }

      // Check if all cells are available (either empty or have matching character)
      let canPlace = true;
      const cellsToUse = [];

      for (let i = 0; i < wordLen; i++) {
        const r = startRow + i * dir.dr;
        const c = startCol + i * dir.dc;
        const cellKey = `${r},${c}`;

        // Check if this cell conflicts
        if (grid[r][c] !== null && grid[r][c] !== compound[i]) {
          canPlace = false;
          break;
        }

        cellsToUse.push({ r, c, char: compound[i], key: cellKey });
      }

      if (canPlace) {
        // Place the word
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

export function embedWordInGrid(
  rows: number,
  cols: number,
  word: string,
  language: Language = 'he'
): { grid: LetterGrid; path: GridPosition[] } {
  // 1. Generate a random grid first
  const grid = generateRandomTable(rows, cols, language);

  if (!word || word.length === 0) return { grid, path: [] };

  // 2. Choose a random starting position and direction
  // Directions: 0=horizontal, 1=vertical, 2=diagonal-down-right, 3=diagonal-up-right
  const wordLen = word.length;

  // If word is too long to fit in any direction, return grid without embedding
  if (wordLen > rows && wordLen > cols) {
    return { grid, path: [] };
  }

  const maxAttempts = 50;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Build list of valid directions based on word length
    const validDirections = [];
    if (wordLen <= cols) validDirections.push(0); // Horizontal
    if (wordLen <= rows) validDirections.push(1); // Vertical
    if (wordLen <= rows && wordLen <= cols) {
      validDirections.push(2); // Diagonal down-right
      validDirections.push(3); // Diagonal up-right
    }

    if (validDirections.length === 0) {
      return { grid, path: [] };
    }

    const direction = validDirections[Math.floor(Math.random() * validDirections.length)];
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
export function isWordOnBoard(word: string, board: LetterGrid): boolean {
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
function searchWord(
  board: LetterGrid,
  word: string,
  row: number,
  col: number,
  index: number,
  visited: Set<string>
): boolean {
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