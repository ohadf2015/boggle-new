// ─── Blast Word Seeder ────────────────────────────────────────────────
// Pre-places known words into the grid so the board is fun from the start.
// Words are placed horizontally, vertically, and diagonally at random
// positions. Remaining cells are filled with weighted random letters.

import type { Language } from '@/shared/types/game';
import { generateBlastLetter, createSeededRandom } from '@/components/blast/utils/blastLetterGenerator';

/**
 * Hebrew final-form → regular-form mapping.
 * Blast tiles are individual letters, so final forms (sofit) should not appear.
 */
const HEBREW_FINAL_TO_REGULAR: Record<string, string> = {
  'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ',
};

/** Replace Hebrew final-form letters with their regular equivalents. */
function normalizeFinalLetters(word: string): string {
  return word.replace(/[ךםןףץ]/g, (ch) => HEBREW_FINAL_TO_REGULAR[ch] || ch);
}

// Common short words per language (3-5 letters, high frequency)
const SEED_WORDS: Record<string, string[]> = {
  en: [
    'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HER',
    'WAS', 'ONE', 'OUR', 'OUT', 'DAY', 'HAD', 'HAS', 'HIS', 'HOW', 'MAN',
    'NEW', 'NOW', 'OLD', 'SEE', 'WAY', 'MAY', 'SAY', 'SHE', 'TWO', 'USE',
    'BOY', 'DID', 'ITS', 'LET', 'SAT', 'TOP', 'RED', 'RUN', 'SET', 'TEN',
    'SOME', 'THEN', 'THEM', 'BEEN', 'HAVE', 'SAID', 'EACH', 'TELL', 'DOES',
    'GOOD', 'GIVE', 'MOST', 'FIND', 'HERE', 'KNOW', 'TAKE', 'WANT', 'LONG',
    'MAKE', 'LIKE', 'LOOK', 'MANY', 'COME', 'MADE', 'LIVE', 'BACK', 'MUCH',
    'OVER', 'HAND', 'HIGH', 'LAST', 'KEEP', 'TURN', 'MOVE', 'PLAY', 'GAME',
    'STAR', 'FIRE', 'WORD', 'FAST', 'STOP', 'HELP', 'LAND', 'RAIN', 'SAND',
  ],
  he: [
    'גם', 'כל', 'של', 'זה', 'את', 'לא', 'מה', 'יש', 'אם', 'רק',
    'עוד', 'אני', 'היא', 'הוא', 'כמו', 'אחד', 'שלי', 'טוב', 'חדש',
    'גדול', 'קטן', 'יום', 'בית', 'שלום', 'אור', 'דבר', 'ילד', 'חיים',
  ],
  sv: [
    'OCH', 'DET', 'ATT', 'SOM', 'MED', 'HAR', 'MEN', 'DEN', 'FÖR', 'SKA',
    'VAR', 'HAN', 'HON', 'VID', 'DIG', 'MIG', 'NÄR', 'HUR', 'DAG', 'NYA',
    'ALLA', 'INTE', 'ÖVER', 'GICK', 'HADE', 'SINA', 'EFTER', 'STOR',
  ],
  ja: [
    'あい', 'いえ', 'うえ', 'かい', 'きた', 'くに', 'けん', 'こい',
    'さき', 'しか', 'すき', 'たち', 'ちか', 'つき', 'てん', 'とき',
    'なか', 'にし', 'はな', 'ひと', 'ほし', 'まち', 'みち', 'やま',
  ],
  es: [
    'QUE', 'LOS', 'DEL', 'LAS', 'CON', 'UNA', 'POR', 'SON', 'MAS', 'SER',
    'ERA', 'HAY', 'DOS', 'MUY', 'DIA', 'SOL', 'MAR', 'VER', 'DAR', 'LUZ',
    'COMO', 'PERO', 'BIEN', 'VIDA', 'SOLO', 'OTRO', 'CASA', 'AGUA', 'AMOR',
  ],
};

type Direction = [number, number]; // [dRow, dCol]
const DIRECTIONS: Direction[] = [
  [0, 1],   // horizontal →
  [1, 0],   // vertical ↓
  [1, 1],   // diagonal ↘
  [1, -1],  // diagonal ↙
  [0, -1],  // horizontal ←
  [-1, 0],  // vertical ↑
];

/**
 * Try to place a word on the grid. Returns true if successful.
 * Only places if all cells are either empty or already have the matching letter.
 */
function tryPlaceWord(
  grid: string[][],
  occupied: Set<string>,
  word: string,
  startRow: number,
  startCol: number,
  dir: Direction,
  size: number,
): boolean {
  const letters = word.split('');
  const cells: Array<{ row: number; col: number; letter: string }> = [];

  for (let i = 0; i < letters.length; i++) {
    const r = startRow + dir[0] * i;
    const c = startCol + dir[1] * i;
    if (r < 0 || r >= size || c < 0 || c >= size) return false;
    const existing = grid[r][c];
    if (existing && existing !== letters[i]) return false; // conflict
    cells.push({ row: r, col: c, letter: letters[i] });
  }

  // Place it
  for (const { row, col, letter } of cells) {
    grid[row][col] = letter;
    occupied.add(`${row}-${col}`);
  }
  return true;
}

/**
 * Generate a letter grid with pre-seeded words for better playability.
 * Attempts to place 4-8 words, then fills remaining cells randomly.
 */
export function generateSeededLetterGrid(
  size: number,
  language: Language,
  seed: number,
): string[][] {
  const rng = createSeededRandom(seed);
  const grid: string[][] = Array.from({ length: size }, () => Array(size).fill(''));
  const occupied = new Set<string>();

  const langKey = language as string;
  const words = [...(SEED_WORDS[langKey] || SEED_WORDS.en)];

  // Shuffle words using seeded RNG
  for (let i = words.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [words[i], words[j]] = [words[j], words[i]];
  }

  // Try to place 4-8 words
  const targetWords = 4 + Math.floor(rng() * 5);
  let placed = 0;

  for (const rawWord of words) {
    if (placed >= targetWords) break;
    // Normalize Hebrew final letters so sofit forms don't appear on tiles
    const word = langKey === 'he' ? normalizeFinalLetters(rawWord) : rawWord;
    if (word.length > size) continue; // word too long for grid

    // Try random positions and directions
    const shuffledDirs = [...DIRECTIONS].sort(() => rng() - 0.5);
    let success = false;

    for (let attempt = 0; attempt < 15 && !success; attempt++) {
      const startRow = Math.floor(rng() * size);
      const startCol = Math.floor(rng() * size);
      for (const dir of shuffledDirs) {
        if (tryPlaceWord(grid, occupied, word, startRow, startCol, dir, size)) {
          placed++;
          success = true;
          break;
        }
      }
    }
  }

  // Fill remaining empty cells with weighted random letters
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!grid[r][c]) {
        grid[r][c] = generateBlastLetter(language, 1.0, rng);
      }
    }
  }

  return grid;
}
