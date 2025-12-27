/**
 * Game Utilities for Backend
 * CommonJS version of frontend utils for use in backend handlers
 */

import type { Language, LetterGrid, DifficultyLevel, Avatar } from '@/shared/types';

// Import shared constants
import {
  AVATAR_COLORS,
  AVATAR_EMOJIS,
  DIFFICULTIES,
  DEFAULT_DIFFICULTY,
  generateRandomAvatar
} from './consts';

// ==========================================
// Type Definitions
// ==========================================

interface Direction {
  dr: number;
  dc: number;
}

interface Cell {
  r: number;
  c: number;
  char: string;
  key: string;
}

// ==========================================
// Letter Constants (language-specific)
// ==========================================

export const hebrewLetters: string[] = [
  "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י",
  "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ", "ק", "ר", "ש", "ת"
];

export const swedishLetters: string[] = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ'.split('');

// Spanish letters - standard Latin alphabet plus Ñ and accented vowels
const spanishBaseLetters: string[] = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('');
export const spanishAccentedLetters: string[] = ['Á', 'É', 'Í', 'Ó', 'Ú', 'Ü'];
export const spanishLetters: string[] = [...spanishBaseLetters, ...spanishAccentedLetters];

// Weighted letter pool for Spanish board generation
// Regular vowels appear 3x more often than accented vowels for better playability
export const spanishLetterPool: string[] = [
  ...spanishBaseLetters,
  ...spanishBaseLetters.filter(l => 'AEIOU'.includes(l)),
  ...spanishBaseLetters.filter(l => 'AEIOU'.includes(l)),
  ...spanishAccentedLetters
];

export const japaneseLetters: string[] = [
  "日", "本", "人", "年", "月", "火", "水", "木", "金", "土",
  "一", "二", "三", "四", "五", "六", "七", "八", "九", "十",
  "大", "小", "中", "上", "下", "左", "右", "前", "後", "内",
  "外", "多", "少", "高", "低", "長", "短", "新", "古", "明",
  "暗", "強", "弱", "重", "軽", "早", "遅", "近", "遠", "広",
  "狭", "深", "浅", "太", "細", "厚", "薄", "硬", "柔", "良",
  "悪", "美", "醜", "正", "誤", "真", "偽", "善", "安", "危",
  "生", "死", "男", "女", "父", "母", "子", "兄", "弟", "姉",
  "妹", "友", "敵", "王", "国", "天", "地", "山", "川", "海",
  "空", "雲", "雨", "雪", "風", "花", "草", "石", "音", "色",
  "光", "力", "心", "手", "足", "目", "耳", "口", "頭", "体"
];

export const kanjiCompounds: string[] = [
  "日本", "本人", "本日", "日中", "人口", "人生", "人物",
  "年月", "年金", "月日", "月光", "火山", "火力", "水中",
  "水道", "木目", "金色", "土地", "一人", "一本", "一日",
  "大人", "大国", "大小", "大学", "小人", "中国", "中心",
  "上下", "上手", "下手", "左右", "前後", "内外", "高山",
  "長男", "新人", "古本", "明日", "強力", "生物", "男女",
  "父母", "兄弟", "友人", "王国", "天地", "山川", "海空"
];

// Valid Hebrew letters set for filtering
const validHebrewLettersSet = new Set<string>([
  'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י',
  'כ', 'ך', 'ל', 'מ', 'ם', 'נ', 'ן', 'ס', 'ע', 'פ',
  'ף', 'צ', 'ץ', 'ק', 'ר', 'ש', 'ת'
]);

// Valid Spanish letters set for filtering (includes accented vowels)
export const validSpanishLettersSet = new Set<string>([
  'A', 'Á', 'B', 'C', 'D', 'E', 'É', 'F', 'G', 'H', 'I', 'Í',
  'J', 'K', 'L', 'M', 'N', 'Ñ', 'O', 'Ó', 'P', 'Q', 'R', 'S',
  'T', 'U', 'Ú', 'Ü', 'V', 'W', 'X', 'Y', 'Z',
  'a', 'á', 'b', 'c', 'd', 'e', 'é', 'f', 'g', 'h', 'i', 'í',
  'j', 'k', 'l', 'm', 'n', 'ñ', 'o', 'ó', 'p', 'q', 'r', 's',
  't', 'u', 'ú', 'ü', 'v', 'w', 'x', 'y', 'z'
]);

// ==========================================
// Utility Functions
// ==========================================

/**
 * Generate a random 4-digit room code
 */
export function generateRoomCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Filter a Hebrew word to only include valid letters
 */
export function filterHebrewWord(word: string): string {
  return word.split('').filter(char => validHebrewLettersSet.has(char)).join('');
}

/**
 * Normalize letter for board display based on language
 */
export function normalizeLetterForBoard(letter: string, language: Language): string {
  if (language === 'en' || language === 'sv' || language === 'es') {
    return letter.toUpperCase();
  }
  return letter;
}

// ==========================================
// Grid Generation
// ==========================================

/**
 * Generate a random letter grid
 */
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

  let letters: string | string[];
  if (language === 'en') {
    letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  } else if (language === 'sv') {
    letters = swedishLetters;
  } else if (language === 'es') {
    letters = spanishLetterPool;
  } else if (language === 'ja') {
    return generateJapaneseTable(rows, cols);
  } else {
    letters = hebrewLetters;
  }

  // If we have words to embed, use enhanced generation
  if (wordsToEmbed && wordsToEmbed.length > 0) {
    return generateTableWithEmbeddedWords(rows, cols, letters, wordsToEmbed, language);
  }

  const newTable: LetterGrid = [];
  for (let i = 0; i < rows; i++) {
    const row: string[] = [];
    for (let j = 0; j < cols; j++) {
      const randomLetter = letters[Math.floor(Math.random() * letters.length)];
      row.push(randomLetter);
    }
    newTable.push(row);
  }
  return newTable;
}

/**
 * Generate a table with embedded words
 */
function generateTableWithEmbeddedWords(
  rows: number,
  cols: number,
  letters: string | string[],
  wordsToEmbed: string[],
  language: Language
): LetterGrid {
  const grid: (string | null)[][] = Array(rows).fill(null).map(() => Array(cols).fill(null));
  const usedCells = new Set<string>();

  const totalCells = rows * cols;
  const targetWords = Math.min(wordsToEmbed.length, Math.max(4, Math.floor(totalCells / 3)));

  const cleanedWords = language === 'he'
    ? wordsToEmbed.map(filterHebrewWord).filter(w => w.length >= 2)
    : wordsToEmbed;

  const sortedWords = [...cleanedWords].sort((a, b) => b.length - a.length);

  let embeddedCount = 0;

  for (const word of sortedWords) {
    if (embeddedCount >= targetWords) break;
    if (word.length > Math.max(rows, cols)) continue;

    if (tryEmbedWord(grid, word, rows, cols, usedCells, language)) {
      embeddedCount++;
    }
  }

  const lettersArray = typeof letters === 'string' ? letters.split('') : letters;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (grid[i][j] === null) {
        grid[i][j] = lettersArray[Math.floor(Math.random() * lettersArray.length)];
      }
    }
  }

  return grid as LetterGrid;
}

/**
 * Try to embed a word into the grid
 */
function tryEmbedWord(
  grid: (string | null)[][],
  word: string,
  rows: number,
  cols: number,
  usedCells: Set<string>,
  language: Language
): boolean {
  const directions: Direction[] = [
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
      if (tryPlaceWordStraight(grid, word, startRow, startCol, dir, rows, cols, usedCells, language)) {
        return true;
      }
    }

    if (tryPlaceWordSnake(grid, word, startRow, startCol, rows, cols, usedCells, language)) {
      return true;
    }
  }

  return false;
}

/**
 * Place a word in a straight line
 */
function tryPlaceWordStraight(
  grid: (string | null)[][],
  word: string,
  startRow: number,
  startCol: number,
  dir: Direction,
  rows: number,
  cols: number,
  usedCells: Set<string>,
  language: Language
): boolean {
  const wordLen = word.length;
  const endRow = startRow + (wordLen - 1) * dir.dr;
  const endCol = startCol + (wordLen - 1) * dir.dc;

  if (endRow < 0 || endRow >= rows || endCol < 0 || endCol >= cols) {
    return false;
  }

  const cellsToUse: Cell[] = [];
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

/**
 * Place a word in a snake/winding path
 */
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
  const path: Cell[] = [];
  const visited = new Set<string>();

  function dfs(row: number, col: number, index: number): boolean {
    if (index === wordLen) return true;
    if (row < 0 || row >= rows || col < 0 || col >= cols) return false;

    const cellKey = `${row},${col}`;
    if (visited.has(cellKey)) return false;

    const char = normalizeLetterForBoard(word[index], language);
    if (grid[row][col] !== null && grid[row][col] !== char) return false;

    visited.add(cellKey);
    path.push({ r: row, c: col, char, key: cellKey });

    const directions: [number, number][] = [
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

/**
 * Generate a Japanese board with embedded Kanji compounds
 */
export function generateJapaneseTable(rows: number, cols: number): LetterGrid {
  const grid: (string | null)[][] = Array(rows).fill(null).map(() => Array(cols).fill(null));
  const totalCells = rows * cols;
  const targetCompounds = Math.floor(totalCells / 5);

  const shuffledCompounds = [...kanjiCompounds].sort(() => Math.random() - 0.5);
  const twoCharCompounds = shuffledCompounds.filter(w => w.length === 2);
  const threeCharCompounds = shuffledCompounds.filter(w => w.length === 3);

  let embeddedCount = 0;
  const usedCells = new Set<string>();

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

  return grid as LetterGrid;
}

/**
 * Try to embed a compound word into the grid
 */
function tryEmbedCompound(
  grid: (string | null)[][],
  compound: string,
  rows: number,
  cols: number,
  usedCells: Set<string>
): boolean {
  const wordLen = compound.length;
  const directions: Direction[] = [
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
      const cellsToUse: Cell[] = [];

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

// ==========================================
// Exports
// ==========================================

export {
  generateRandomAvatar,
  AVATAR_COLORS,
  AVATAR_EMOJIS,
  DIFFICULTIES,
  DEFAULT_DIFFICULTY
};

export type { Avatar, Language, LetterGrid, DifficultyLevel };
