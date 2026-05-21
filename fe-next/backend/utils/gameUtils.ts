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

// Import word normalization for board verification
import { normalizeWord } from '@/shared/utils/wordNormalization';

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

/**
 * Hiragana frequency weights for Japanese board generation.
 *
 * Japanese boards are HIRAGANA, not kanji: hiragana is a phonetic syllabary, so
 * words are sequences of adjacent kana you can trace (ねこ = ne+ko) — exactly the
 * Boggle primitive. A kanji grid cannot work (logographs aren't an alphabet you
 * rearrange). Includes voiced (dakuten が-row), semi-voiced (handakuten ぱ-row),
 * small kana (ゃゅょっ) and the long-vowel mark (ー) so common words like がっこう /
 * きゅうりょう / ちょうり are spellable. Weights approximate corpus frequency.
 * See docs/2026-05-21-japanese-multiplayer-gameplay-audit.md.
 */
export const japaneseHiraganaFrequency: Record<string, number> = {
  // vowels
  'あ': 8, 'い': 9, 'う': 8, 'え': 5, 'お': 6,
  // k-row
  'か': 7, 'き': 5, 'く': 5, 'け': 4, 'こ': 6,
  // s-row
  'さ': 4, 'し': 7, 'す': 5, 'せ': 4, 'そ': 3,
  // t-row
  'た': 6, 'ち': 4, 'つ': 5, 'て': 6, 'と': 6,
  // n-row
  'な': 5, 'に': 6, 'ぬ': 1, 'ね': 2, 'の': 7,
  // h-row
  'は': 4, 'ひ': 2, 'ふ': 2, 'へ': 2, 'ほ': 2,
  // m-row
  'ま': 4, 'み': 3, 'む': 2, 'め': 2, 'も': 3,
  // y-row
  'や': 2, 'ゆ': 2, 'よ': 3,
  // r-row
  'ら': 4, 'り': 5, 'る': 5, 'れ': 3, 'ろ': 2,
  // w-row + syllabic n
  'わ': 2, 'を': 1, 'ん': 7,
  // dakuten (voiced)
  'が': 3, 'ぎ': 1, 'ぐ': 1, 'げ': 1, 'ご': 2,
  'ざ': 1, 'じ': 3, 'ず': 1, 'ぜ': 1, 'ぞ': 1,
  'だ': 2, 'ぢ': 1, 'づ': 1, 'で': 3, 'ど': 2,
  'ば': 1, 'び': 1, 'ぶ': 1, 'べ': 1, 'ぼ': 1,
  // handakuten (semi-voiced) — rare
  'ぱ': 1, 'ぴ': 1, 'ぷ': 1, 'ぺ': 1, 'ぽ': 1,
  // small kana (modifiers) + long-vowel mark
  'ゃ': 2, 'ゅ': 2, 'ょ': 2, 'っ': 3, 'ー': 2,
};

// Flattened weighted draw pool — each kana repeated by its frequency weight.
const JAPANESE_HIRAGANA_POOL: string[] = Object.entries(japaneseHiraganaFrequency)
  .flatMap(([kana, weight]) => Array<string>(weight).fill(kana));

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
 * For Hebrew, converts final letters to regular letters
 */
export function normalizeLetterForBoard(letter: string, language: Language): string {
  if (language === 'en' || language === 'sv' || language === 'es') {
    return letter.toUpperCase();
  }
  if (language === 'he') {
    return normalizeWord(letter, 'he');
  }
  return letter;
}

// ==========================================
// Word Validation for Board Verification
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

  const allDirections: [number, number][] = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
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
 */
function isWordOnBoard(word: string, letterGrid: LetterGrid, language: Language): boolean {
  if (!letterGrid || !word || letterGrid.length === 0) return false;

  const wordNormalized = normalizeWord(word, language);
  const posMap = makePositionsMap(letterGrid, language);
  const startPositions = posMap.get(wordNormalized[0]) || [];

  for (const [startRow, startCol] of startPositions) {
    if (searchWordOnBoard(letterGrid, wordNormalized, startRow, startCol, 0, new Set(), language)) {
      return true;
    }
  }

  return false;
}

// Maximum number of board generation attempts
const MAX_BOARD_GENERATION_ATTEMPTS = 5;

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
 * Generate a table with embedded words and verify they exist on board
 */
function generateTableWithEmbeddedWords(
  rows: number,
  cols: number,
  letters: string | string[],
  wordsToEmbed: string[],
  language: Language
): LetterGrid {
  // For Hebrew, normalize final letters to regular letters before embedding
  const cleanedWords = language === 'he'
    ? wordsToEmbed.map(w => normalizeWord(w, 'he')).filter(w => w.length >= 2)
    : wordsToEmbed;

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
      return result.grid;
    }
  }

  // Fallback: generate a verified board
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

  // Fill remaining empty cells
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

    const gridCopy = grid.map(row => [...row]);
    const usedCellsCopy = new Set(usedCells);

    if (tryEmbedWord(gridCopy, word, rows, cols, usedCellsCopy, language)) {
      const testGrid: LetterGrid = gridCopy.map(row =>
        row.map(cell => cell ?? lettersArray[Math.floor(Math.random() * lettersArray.length)])
      );

      if (isWordOnBoard(word, testGrid, language)) {
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
 * Generate a Japanese board as a frequency-weighted HIRAGANA grid.
 *
 * Mirrors the random-fill model used for en/sv/es (a Boggle board is random; the
 * dictionary supplies findability). Replaces the previous kanji grid, which could
 * only surface ~3 pre-planted compounds per board — not a word game. Validation
 * against the hiragana dictionary makes traced kana words discoverable.
 */
export function generateJapaneseTable(rows: number, cols: number): LetterGrid {
  const grid: LetterGrid = [];
  for (let i = 0; i < rows; i++) {
    const row: string[] = [];
    for (let j = 0; j < cols; j++) {
      row.push(JAPANESE_HIRAGANA_POOL[Math.floor(Math.random() * JAPANESE_HIRAGANA_POOL.length)]);
    }
    grid.push(row);
  }
  return grid;
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
