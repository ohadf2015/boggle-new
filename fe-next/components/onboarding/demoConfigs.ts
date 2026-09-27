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

/** Locale fallback helper used by every consumer */
export function getDemoConfig(language: string): DemoConfig {
  return demoConfigs[language] || demoConfigs.en;
}

/**
 * 4×4 welcome-grid demo — used by WelcomeDemoGrid (CrazyGames welcome screen).
 * Word + path traced in a 4-cell sequence to teach: "swipe across letters".
 * Letters drawn from each locale's tutorial vocabulary so non-English players
 * see a real word in their language. Hebrew path is RTL-aware.
 *
 * Coords are [col, row] (matches WelcomeDemoGrid's existing Coord shape).
 */
export interface WelcomeDemoConfig {
  letters: ReadonlyArray<ReadonlyArray<string>>;
  path: ReadonlyArray<readonly [col: number, row: number]>;
  word: string;
}

export const welcomeDemoConfigs: Record<string, WelcomeDemoConfig> = {
  en: {
    letters: [
      ['P', 'L', 'C', 'V'],
      ['B', 'A', 'Y', 'R'],
      ['T', 'M', 'S', 'N'],
      ['E', 'O', 'Y', 'D'],
    ],
    path: [[0, 0], [1, 0], [1, 1], [2, 1]], // P-L-A-Y
    word: 'PLAY',
  },
  es: {
    letters: [
      ['G', 'A', 'C', 'V'],
      ['B', 'T', 'O', 'R'],
      ['T', 'M', 'S', 'N'],
      ['E', 'O', 'Y', 'D'],
    ],
    path: [[0, 0], [1, 0], [1, 1], [2, 1]], // G-A-T-O
    word: 'GATO',
  },
  sv: {
    letters: [
      ['K', 'A', 'C', 'V'],
      ['B', 'T', 'T', 'R'],
      ['T', 'M', 'S', 'N'],
      ['E', 'O', 'Y', 'D'],
    ],
    path: [[0, 0], [1, 0], [1, 1], [2, 1]], // K-A-T-T
    word: 'KATT',
  },
  he: {
    // Hebrew vocab from tutorialBoardConfig.he (vetted, user-authored).
    // Word: שמחה (joy, 4 letters: ש מ ח ה). Path traced right→left so the
    // word reads in natural Hebrew order on a left-to-right SVG grid.
    letters: [
      ['ת', 'ב', 'ל', 'ש'],
      ['ד', 'ר', 'מ', 'א'],
      ['ה', 'ח', 'ת', 'י'],
      ['נ', 'ס', 'ע', 'ו'],
    ],
    // Path: (3,0) ש -> (2,1) מ -> (1,2) ח -> (0,2) ה
    path: [[3, 0], [2, 1], [1, 2], [0, 2]],
    word: 'שמחה',
  },
  ja: {
    // Game uses romaji boards for ja locale (project convention)
    letters: [
      ['P', 'L', 'C', 'V'],
      ['B', 'A', 'Y', 'R'],
      ['T', 'M', 'S', 'N'],
      ['E', 'O', 'Y', 'D'],
    ],
    path: [[0, 0], [1, 0], [1, 1], [2, 1]],
    word: 'PLAY',
  },
};

export function getWelcomeDemoConfig(language: string): WelcomeDemoConfig {
  return welcomeDemoConfigs[language] || welcomeDemoConfigs.en;
}
