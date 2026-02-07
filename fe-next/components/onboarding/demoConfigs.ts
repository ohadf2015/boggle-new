import type { GridPosition } from './MiniGrid';

export interface DemoConfig {
  letters: string[][];
  path: GridPosition[];
  word: string;
}

/**
 * Language-specific demo configurations for the interactive MiniGrid.
 * Each language has a localized word that makes sense in that language.
 * Shared between WelcomeDemoStep (onboarding) and PreGameTutorial (singleplayer).
 */
export const demoConfigs: Record<string, DemoConfig> = {
  // English: CAT
  en: {
    letters: [
      ['C', 'A', 'P'],
      ['D', 'T', 'O'],
      ['E', 'R', 'S'],
    ],
    path: [
      { row: 0, col: 0 }, // C
      { row: 0, col: 1 }, // A
      { row: 1, col: 1 }, // T
    ],
    word: 'CAT',
  },
  // Spanish: SOL (sun)
  es: {
    letters: [
      ['S', 'O', 'P'],
      ['D', 'L', 'I'],
      ['E', 'R', 'N'],
    ],
    path: [
      { row: 0, col: 0 }, // S
      { row: 0, col: 1 }, // O
      { row: 1, col: 1 }, // L
    ],
    word: 'SOL',
  },
  // Swedish: SOL (sun)
  sv: {
    letters: [
      ['S', 'O', 'P'],
      ['D', 'L', 'I'],
      ['E', 'R', 'N'],
    ],
    path: [
      { row: 0, col: 0 }, // S
      { row: 0, col: 1 }, // O
      { row: 1, col: 1 }, // L
    ],
    word: 'SOL',
  },
  // Hebrew: שמש (sun) - RTL path (col 2 -> 1 -> 1)
  he: {
    letters: [
      ['ל', 'מ', 'ש'],
      ['ו', 'ש', 'ד'],
      ['ס', 'ר', 'ת'],
    ],
    path: [
      { row: 0, col: 2 }, // ש
      { row: 0, col: 1 }, // מ
      { row: 1, col: 1 }, // ש
    ],
    word: 'שמש',
  },
  // Japanese: CAT with English letters (game uses romaji)
  ja: {
    letters: [
      ['C', 'A', 'P'],
      ['D', 'T', 'O'],
      ['E', 'R', 'S'],
    ],
    path: [
      { row: 0, col: 0 }, // C
      { row: 0, col: 1 }, // A
      { row: 1, col: 1 }, // T
    ],
    word: 'CAT',
  },
};
