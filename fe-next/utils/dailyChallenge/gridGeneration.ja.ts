import { japaneseLetters, kanjiCompounds } from '../consts';
import type { Language, LetterGrid } from '@/types';
import type { DailyPuzzle } from './types';
import { MIN_SAME_LENGTH_WORDS } from './constants';
import { getPuzzleNumber } from './dateUtils';
import { BONUS_WORD_LISTS, TARGET_WORD_LISTS, getSameLengthWords } from './wordLists';
import { findWordPathInPartialGrid, EIGHT_DIRECTIONS } from './gridPathFinding';

/** Fisher-Yates shuffle in place */
function shuffleFY<T>(arr: T[], random: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/**
 * Generate a seeded Japanese grid with embedded kanji compounds
 */
export function generateSeededJapaneseGrid(
  random: () => number,
  rows: number,
  cols: number
): LetterGrid {
  const grid: (string | null)[][] = Array(rows).fill(null).map(() => Array(cols).fill(null));
  const usedCells = new Set<string>();

  const totalCells = rows * cols;
  const targetCompounds = Math.floor(totalCells / 5);

  const shuffledCompounds = shuffleFY([...kanjiCompounds], random);
  const twoCharCompounds = shuffledCompounds.filter((w) => w.length === 2);
  const threeCharCompounds = shuffledCompounds.filter((w) => w.length === 3);

  let embeddedCount = 0;

  for (const compound of threeCharCompounds) {
    if (embeddedCount >= Math.floor(targetCompounds * 0.2)) break;
    if (tryEmbedCompoundSeeded(grid, compound, rows, cols, usedCells, random)) {
      embeddedCount++;
    }
  }

  for (const compound of twoCharCompounds) {
    if (embeddedCount >= targetCompounds) break;
    if (tryEmbedCompoundSeeded(grid, compound, rows, cols, usedCells, random)) {
      embeddedCount++;
    }
  }

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (grid[i][j] === null) {
        grid[i][j] = japaneseLetters[Math.floor(random() * japaneseLetters.length)];
      }
    }
  }

  return grid as LetterGrid;
}

/**
 * Try to embed a compound using seeded random
 */
function tryEmbedCompoundSeeded(
  grid: (string | null)[][],
  compound: string,
  rows: number,
  cols: number,
  usedCells: Set<string>,
  random: () => number
): boolean {
  const wordLen = compound.length;
  const directions = [
    { dr: 0, dc: 1 }, { dr: 0, dc: -1 }, { dr: 1, dc: 0 }, { dr: -1, dc: 0 },
    { dr: 1, dc: 1 }, { dr: 1, dc: -1 }, { dr: -1, dc: -1 }, { dr: -1, dc: 1 },
  ];

  const shuffledDirs = shuffleFY([...directions], random);

  for (let attempt = 0; attempt < 50; attempt++) {
    const startRow = Math.floor(random() * rows);
    const startCol = Math.floor(random() * cols);

    for (const dir of shuffledDirs) {
      const endRow = startRow + (wordLen - 1) * dir.dr;
      const endCol = startCol + (wordLen - 1) * dir.dc;

      if (endRow < 0 || endRow >= rows || endCol < 0 || endCol >= cols) continue;

      let canPlace = true;
      const cellsToUse: Array<{ r: number; c: number; char: string }> = [];

      for (let i = 0; i < wordLen; i++) {
        const r = startRow + i * dir.dr;
        const c = startCol + i * dir.dc;

        if (grid[r][c] !== null && grid[r][c] !== compound[i]) {
          canPlace = false;
          break;
        }
        cellsToUse.push({ r, c, char: compound[i] });
      }

      if (canPlace) {
        for (const cell of cellsToUse) {
          grid[cell.r][cell.c] = cell.char;
          usedCells.add(`${cell.r},${cell.c}`);
        }
        return true;
      }
    }
  }

  return false;
}

/**
 * Generate Japanese daily puzzle with embedded compound
 */
export function generateJapaneseDailyPuzzle(
  dateString: string,
  language: Language,
  random: () => number,
  rows: number,
  cols: number,
  preSelectedWord?: string
): DailyPuzzle {
  let targetWord: string;

  if (preSelectedWord) {
    targetWord = preSelectedWord;
  } else {
    const japaneseTargets = TARGET_WORD_LISTS['ja'] || [];
    const twoCharWords = japaneseTargets.filter((w) => w.length === 2);
    const shuffled = [...twoCharWords];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    targetWord = shuffled[0] || '日本';
  }

  const sameLengthWords = getSameLengthWords(targetWord, 'ja', random);
  const japaneseBonusWords = BONUS_WORD_LISTS['ja'] || [];
  const otherBonusWords = japaneseBonusWords.filter((w) => w.length !== targetWord.length);

  const shuffledOtherBonus = [...otherBonusWords];
  for (let i = shuffledOtherBonus.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffledOtherBonus[i], shuffledOtherBonus[j]] = [shuffledOtherBonus[j], shuffledOtherBonus[i]];
  }

  const sameLengthToEmbed = sameLengthWords.slice(0, Math.max(MIN_SAME_LENGTH_WORDS, 6));
  const otherBonusToEmbed = shuffledOtherBonus.slice(0, 4);
  const bonusWordsToEmbed = [...sameLengthToEmbed, ...otherBonusToEmbed];

  // Build grid with target word placed adjacently
  const grid: (string | null)[][] = Array(rows).fill(null).map(() => Array(cols).fill(null));
  const usedCells = new Set<string>();

  const startRow = Math.floor(random() * rows);
  const startCol = Math.floor(random() * (cols - 1));
  grid[startRow][startCol] = targetWord[0];
  grid[startRow][startCol + 1] = targetWord[1];
  usedCells.add(`${startRow},${startCol}`);
  usedCells.add(`${startRow},${startCol + 1}`);

  // Embed bonus words
  let embeddedCount = 0;
  let sameLengthEmbedded = 0;
  const targetLength = targetWord.length;

  for (const bonusWord of bonusWordsToEmbed) {
    if (embeddedCount >= 10) break;

    const wordChars = bonusWord.split('');
    const isSameLength = bonusWord.length === targetLength;
    let wordPlaced = false;

    for (let attempt = 0; attempt < 30 && !wordPlaced; attempt++) {
      const bStartRow = Math.floor(random() * rows);
      const bStartCol = Math.floor(random() * cols);
      const path = findWordPathInPartialGrid(
        bonusWord, bStartRow, bStartCol, rows, cols, random, EIGHT_DIRECTIONS, grid, usedCells
      );

      if (path && path.length === wordChars.length) {
        for (let i = 0; i < path.length; i++) {
          grid[path[i].row][path[i].col] = wordChars[i];
          usedCells.add(`${path[i].row},${path[i].col}`);
        }
        wordPlaced = true;
        embeddedCount++;
        if (isSameLength) sameLengthEmbedded++;
      }
    }
  }

  if (sameLengthEmbedded < MIN_SAME_LENGTH_WORDS) {
    console.warn(
      `[Daily Puzzle - Japanese] Only embedded ${sameLengthEmbedded}/${MIN_SAME_LENGTH_WORDS} same-length words for target length ${targetLength}`
    );
  }

  // Fill remaining with random Japanese characters
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (grid[i][j] === null) {
        grid[i][j] = japaneseLetters[Math.floor(random() * japaneseLetters.length)];
      }
    }
  }

  return {
    grid: grid as LetterGrid, targetWord,
    puzzleDate: dateString, language,
    puzzleNumber: getPuzzleNumber(dateString),
  };
}
