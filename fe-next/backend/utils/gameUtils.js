/**
 * Game Utilities for Backend
 * CommonJS version of frontend utils for use in backend handlers
 */

// Import shared constants
const {
  AVATAR_COLORS,
  AVATAR_EMOJIS,
  DIFFICULTIES,
  DEFAULT_DIFFICULTY,
  generateRandomAvatar
} = require('./consts');

// ==========================================
// Letter Constants (language-specific)
// ==========================================

const hebrewLetters = [
  "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י",
  "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ", "ק", "ר", "ש", "ת"
];

const swedishLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ'.split('');

const japaneseLetters = [
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

const kanjiCompounds = [
  "日本", "本人", "本日", "日中", "人口", "人生", "人物",
  "年月", "年金", "月日", "月光", "火山", "火力", "水中",
  "水道", "木目", "金色", "土地", "一人", "一本", "一日",
  "大人", "大国", "大小", "大学", "小人", "中国", "中心",
  "上下", "上手", "下手", "左右", "前後", "内外", "高山",
  "長男", "新人", "古本", "明日", "強力", "生物", "男女",
  "父母", "兄弟", "友人", "王国", "天地", "山川", "海空"
];

// Note: DIFFICULTIES and DEFAULT_DIFFICULTY are imported from consts.js

// Valid Hebrew letters set for filtering
const validHebrewLettersSet = new Set([
  'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י',
  'כ', 'ך', 'ל', 'מ', 'ם', 'נ', 'ן', 'ס', 'ע', 'פ',
  'ף', 'צ', 'ץ', 'ק', 'ר', 'ש', 'ת'
]);

// ==========================================
// Utility Functions
// ==========================================

// Note: generateRandomAvatar is imported from consts.js

/**
 * Generate a random 4-digit room code
 * @returns {string}
 */
function generateRoomCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Filter a Hebrew word to only include valid letters
 * @param {string} word
 * @returns {string}
 */
function filterHebrewWord(word) {
  return word.split('').filter(char => validHebrewLettersSet.has(char)).join('');
}

/**
 * Normalize letter for board display based on language
 * @param {string} letter
 * @param {string} language
 * @returns {string}
 */
function normalizeLetterForBoard(letter, language) {
  if (language === 'en' || language === 'sv') {
    return letter.toUpperCase();
  }
  return letter;
}

// ==========================================
// Grid Generation
// ==========================================

/**
 * Generate a random letter grid
 * @param {number|null} rows
 * @param {number|null} cols
 * @param {string} language
 * @param {string[]} wordsToEmbed
 * @returns {string[][]}
 */
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

/**
 * Generate a table with embedded words
 */
function generateTableWithEmbeddedWords(rows, cols, letters, wordsToEmbed, language) {
  const grid = Array(rows).fill(null).map(() => Array(cols).fill(null));
  const usedCells = new Set();

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

  return grid;
}

/**
 * Try to embed a word into the grid
 */
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

/**
 * Place a word in a snake/winding path
 */
function tryPlaceWordSnake(grid, word, startRow, startCol, rows, cols, usedCells, language) {
  const wordLen = word.length;
  const path = [];
  const visited = new Set();

  function dfs(row, col, index) {
    if (index === wordLen) return true;
    if (row < 0 || row >= rows || col < 0 || col >= cols) return false;

    const cellKey = `${row},${col}`;
    if (visited.has(cellKey)) return false;

    const char = normalizeLetterForBoard(word[index], language);
    if (grid[row][col] !== null && grid[row][col] !== char) return false;

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

/**
 * Generate a Japanese board with embedded Kanji compounds
 */
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

/**
 * Try to embed a compound word into the grid
 */
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

// ==========================================
// Exports
// ==========================================

module.exports = {
  // Avatar functions
  generateRandomAvatar,
  AVATAR_COLORS,
  AVATAR_EMOJIS,

  // Room code
  generateRoomCode,

  // Grid generation
  generateRandomTable,
  generateJapaneseTable,

  // Constants
  DIFFICULTIES,
  DEFAULT_DIFFICULTY,
  hebrewLetters,
  swedishLetters,
  japaneseLetters,
  kanjiCompounds,

  // Helpers
  filterHebrewWord,
  normalizeLetterForBoard,
};
