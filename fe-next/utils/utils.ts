import { hebrewLetters, swedishLetters, spanishLetters, japaneseLetters, kanjiCompounds, DIFFICULTIES, DEFAULT_DIFFICULTY, AVATAR_COLORS, AVATAR_EMOJIS, AVATAR_IMAGE_IDS } from "./consts";
import type { Language, LetterGrid, GridPosition, Avatar } from "@/types";

// Import and re-export word normalization functions from shared module
import {
  normalizeHebrewLetter,
  normalizeHebrewWord,
  isValidHebrewLetter,
  filterHebrewWord,
  applyHebrewFinalLetters,
  normalizeWord,
} from '@/shared/utils/wordNormalization';

// Re-export for backwards compatibility
export {
  normalizeHebrewLetter,
  normalizeHebrewWord,
  isValidHebrewLetter,
  filterHebrewWord,
  applyHebrewFinalLetters,
  normalizeWord,
};

// ==========================================
// Word Validation Functions for Board Verification
// ==========================================

/**
 * Build a map of letter positions on the board for efficient path finding
 */
function makePositionsMap(board: LetterGrid, language: Language): Map<string, [number, number][]> {
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
function searchWordOnBoard(
  board: LetterGrid,
  word: string,
  row: number,
  col: number,
  index: number,
  visited: Set<string>,
  language: Language
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
    if (searchWordOnBoard(board, word, row + dx, col + dy, index + 1, visited, language)) {
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
 */
export function isWordOnBoard(word: string, letterGrid: LetterGrid, language: Language): boolean {
  if (!letterGrid || !word || letterGrid.length === 0) return false;

  // Normalize the word for comparison
  const wordNormalized = normalizeWord(word, language);

  // Find all starting positions (cells with the first letter)
  const posMap = makePositionsMap(letterGrid, language);
  const startPositions = posMap.get(wordNormalized[0]) || [];

  // Try to find the word starting from each position
  for (const [startRow, startCol] of startPositions) {
    if (searchWordOnBoard(letterGrid, wordNormalized, startRow, startCol, 0, new Set(), language)) {
      return true;
    }
  }

  return false;
}

// Utilities for LexiClash game

/**
 * Generate a random 6-character alphanumeric room code
 * Using 6 characters gives 2.17 billion combinations (36^6)
 * vs 10,000 combinations for 4-digit numeric codes
 */
export function generateRoomCode(): string {
  const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Excludes I, O to avoid confusion
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generate a random room name
 * Used when host doesn't provide a room name
 */
export function generateRandomRoomName(): string {
  const adjectives = [
    'Swift', 'Epic', 'Mighty', 'Clever', 'Brave', 'Quick', 'Sharp', 'Bright',
    'Lucky', 'Happy', 'Turbo', 'Super', 'Ultra', 'Mega', 'Grand', 'Noble',
    'Wild', 'Bold', 'Pure', 'True', 'Royal', 'Prime', 'Elite', 'Wise',
    'Swift', 'Cool', 'Rare', 'Ace', 'Pro', 'Star', 'Top', 'Best'
  ];

  const nouns = [
    'Wizards', 'Knights', 'Dragons', 'Tigers', 'Eagles', 'Lions', 'Wolves', 'Bears',
    'Hawks', 'Foxes', 'Panthers', 'Vipers', 'Ninjas', 'Samurai', 'Warriors', 'Champions',
    'Legends', 'Heroes', 'Masters', 'Titans', 'Giants', 'Rangers', 'Hunters', 'Seekers',
    'Scouts', 'Raiders', 'Pirates', 'Kings', 'Queens', 'Aces', 'Stars', 'Winners'
  ];

  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];

  return `${adjective} ${noun}`;
}

/**
 * Generate a random avatar with character image and legacy emoji/color
 */
export function generateRandomAvatar(): Avatar {
  return {
    color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)] ?? '#FF6B6B',
    emoji: AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)] ?? '🎮',
    avatarImage: AVATAR_IMAGE_IDS[Math.floor(Math.random() * AVATAR_IMAGE_IDS.length)]
  };
}

// Hebrew normalization functions imported from @/shared/utils/wordNormalization

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
    } else if (language === 'es') {
      letters = spanishLetters;
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

    const newTable: string[][] = [];
    for (let i = 0; i < rows; i++) {
      const row: string[] = [];
      for (let j = 0; j < cols; j++) {
        const randomLetter = letters[Math.floor(Math.random() * letters.length)] ?? 'A';
        row.push(randomLetter);
      }
      newTable.push(row);
    }
    return newTable;
  }

// Maximum number of board generation attempts before giving up
const MAX_BOARD_GENERATION_ATTEMPTS = 5;

/**
 * Generate a table with long dictionary words embedded for enhanced gameplay
 * This version includes verification that embedded words can actually be found
 */
function generateTableWithEmbeddedWords(
  rows: number,
  cols: number,
  letters: string | string[],
  wordsToEmbed: string[],
  language: Language
): LetterGrid {
  // Filter and prepare words once
  // For Hebrew, normalize final letters to regular letters before embedding
  const cleanedWords = language === 'he'
    ? wordsToEmbed.map(w => normalizeHebrewWord(filterHebrewWord(w))).filter(w => w.length >= 2)
    : wordsToEmbed;

  // Sort words by length (longer first) for better placement
  const sortedWords = [...cleanedWords].sort((a, b) => b.length - a.length);

  const totalCells = rows * cols;
  const targetWords = Math.min(sortedWords.length, Math.max(4, Math.floor(totalCells / 3)));
  const lettersArray = typeof letters === 'string' ? letters.split('') : letters;

  // Try multiple times to generate a valid board
  for (let attempt = 0; attempt < MAX_BOARD_GENERATION_ATTEMPTS; attempt++) {
    const result = attemptGenerateBoard(rows, cols, sortedWords, targetWords, lettersArray, language);

    // Verify that embedded words can actually be found on the board
    const missingWords = result.embeddedWords.filter(word => !isWordOnBoard(word, result.grid, language));

    if (missingWords.length === 0) {
      // All embedded words are findable - success!
      return result.grid;
    }

    // Some words can't be found, try again (only log in dev)
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.warn(`Board generation attempt ${attempt + 1}: ${missingWords.length} words not findable, retrying...`);
    }
  }

  // After all attempts, generate a basic board with just the words that work
  // This is a fallback to ensure we always return a valid board
  return generateVerifiedBoard(rows, cols, sortedWords, lettersArray, language);
}

/**
 * Single attempt to generate a board with embedded words
 */
function attemptGenerateBoard(
  rows: number,
  cols: number,
  sortedWords: string[],
  targetWords: number,
  lettersArray: string[],
  language: Language
): { grid: LetterGrid; embeddedWords: string[] } {
  const grid: (string | null)[][] = Array(rows).fill(null).map(() => Array(cols).fill(null));
  const usedCells = new Set<string>();
  const embeddedWords: string[] = [];

  let embeddedCount = 0;
  for (const word of sortedWords) {
    if (embeddedCount >= targetWords) break;
    if (word.length > Math.max(rows, cols)) continue;

    if (tryEmbedWord(grid, word, rows, cols, usedCells, language)) {
      embeddedWords.push(word);
      embeddedCount++;
    }
  }

  // Fill remaining empty cells with random letters
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (grid[i][j] === null) {
        grid[i][j] = lettersArray[Math.floor(Math.random() * lettersArray.length)];
      }
    }
  }

  return { grid: grid as LetterGrid, embeddedWords };
}

/**
 * Generate a verified board where each word is confirmed to exist after embedding
 */
function generateVerifiedBoard(
  rows: number,
  cols: number,
  sortedWords: string[],
  lettersArray: string[],
  language: Language
): LetterGrid {
  const grid: (string | null)[][] = Array(rows).fill(null).map(() => Array(cols).fill(null));
  const usedCells = new Set<string>();

  for (const word of sortedWords) {
    if (word.length > Math.max(rows, cols)) continue;

    // Try to embed the word
    const gridCopy = grid.map(row => [...row]);
    const usedCellsCopy = new Set(usedCells);

    if (tryEmbedWord(gridCopy, word, rows, cols, usedCellsCopy, language)) {
      // Fill empty cells temporarily to verify
      const testGrid: LetterGrid = gridCopy.map(row =>
        row.map(cell => cell ?? lettersArray[Math.floor(Math.random() * lettersArray.length)])
      );

      // Verify the word can be found
      if (isWordOnBoard(word, testGrid, language)) {
        // Word is valid - apply the embedding to actual grid
        for (let i = 0; i < rows; i++) {
          for (let j = 0; j < cols; j++) {
            if (gridCopy[i][j] !== null) {
              grid[i][j] = gridCopy[i][j];
            }
          }
        }
        usedCellsCopy.forEach(cell => usedCells.add(cell));
      }
    }
  }

  // Fill remaining empty cells
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (grid[i][j] === null) {
        grid[i][j] = lettersArray[Math.floor(Math.random() * lettersArray.length)];
      }
    }
  }

  return grid as LetterGrid;
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
  if (language === 'en' || language === 'sv' || language === 'es') {
    return letter.toUpperCase();
  }
  return letter; // Hebrew and Japanese stay as-is
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

// NOTE: isWordOnBoard and searchWord functions removed - use @/utils/clientWordValidator instead
// The clientWordValidator version supports all languages, not just Hebrew