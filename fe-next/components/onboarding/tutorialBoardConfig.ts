import type { GridPosition } from './miniGridUtils';

export interface TutorialWord {
  word: string;
  path: GridPosition[];
  length: number;
}

export interface TutorialBoardConfig {
  /** 4x4 letter grid */
  letters: string[][];
  /** Pre-defined obvious words players should find */
  targetWords: TutorialWord[];
  /** All valid words on this board (for validation) */
  validWords: Set<string>;
}

/**
 * Pre-seeded 4x4 tutorial board designed to contain obvious words.
 * Contains several 3-4 letter words and at least one 5+ letter word.
 *
 * Board layout:
 *   C A T S
 *   R O P E
 *   S T A R
 *   D O G S
 *
 * Obvious words: CAT, CATS, ROPE, STAR, DOGS, DOG, TOP, POT, TAR,
 *                STORE, STARS, STOP, OPE, APE, etc.
 * 5+ letter words: STARS, STORE, CROPS
 */
export const tutorialBoards: Record<string, TutorialBoardConfig> = {
  en: {
    letters: [
      ['C', 'A', 'T', 'S'],
      ['R', 'O', 'P', 'E'],
      ['S', 'T', 'A', 'R'],
      ['D', 'O', 'G', 'S'],
    ],
    targetWords: [
      { word: 'CAT', path: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }], length: 3 },
      { word: 'DOG', path: [{ row: 3, col: 0 }, { row: 3, col: 1 }, { row: 3, col: 2 }], length: 3 },
      { word: 'STAR', path: [{ row: 0, col: 3 }, { row: 2, col: 1 }, { row: 2, col: 2 }, { row: 2, col: 3 }], length: 4 },
      { word: 'ROPE', path: [{ row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 3 }], length: 4 },
      { word: 'STARS', path: [{ row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }, { row: 2, col: 3 }, { row: 0, col: 3 }], length: 5 },
      { word: 'TOP', path: [{ row: 0, col: 2 }, { row: 1, col: 1 }, { row: 1, col: 2 }], length: 3 },
      { word: 'DOGS', path: [{ row: 3, col: 0 }, { row: 3, col: 1 }, { row: 3, col: 2 }, { row: 3, col: 3 }], length: 4 },
    ],
    validWords: new Set([
      'CAT', 'CATS', 'DOG', 'DOGS', 'STAR', 'STARS', 'ROPE', 'TOP',
      'POT', 'TAR', 'OPE', 'APE', 'TAP', 'PAT', 'OAT', 'ATE', 'EAR',
      'ARC', 'CAR', 'OAR', 'STOP', 'TOPE', 'PORE', 'TAPS', 'PATS',
      'STORE', 'CROPS', 'ROPES', 'TARS', 'OATS', 'TOPS', 'POTS',
      'GOD', 'GODS', 'GOT', 'TOG', 'TOGS', 'TAG', 'TAGS',
    ]),
  },
  he: {
    letters: [
      ['כ', 'ל', 'ב', 'ת'],
      ['ש', 'מ', 'ח', 'ה'],
      ['ד', 'ו', 'ר', 'ש'],
      ['ב', 'י', 'ת', 'א'],
    ],
    targetWords: [
      { word: 'כלב', path: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }], length: 3 },
      { word: 'בית', path: [{ row: 3, col: 0 }, { row: 3, col: 1 }, { row: 3, col: 2 }], length: 3 },
      { word: 'שמח', path: [{ row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }], length: 3 },
      { word: 'דורש', path: [{ row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }, { row: 2, col: 3 }], length: 4 },
      { word: 'שמחה', path: [{ row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 3 }], length: 4 },
    ],
    validWords: new Set(['כלב', 'בית', 'שמח', 'דורש', 'שמחה', 'דור', 'מח', 'לב', 'בת']),
  },
  es: {
    letters: [
      ['G', 'A', 'T', 'O'],
      ['S', 'O', 'L', 'E'],
      ['R', 'A', 'T', 'A'],
      ['C', 'A', 'S', 'A'],
    ],
    targetWords: [
      { word: 'GATO', path: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }], length: 4 },
      { word: 'SOL', path: [{ row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }], length: 3 },
      { word: 'CASA', path: [{ row: 3, col: 0 }, { row: 3, col: 1 }, { row: 3, col: 2 }, { row: 3, col: 3 }], length: 4 },
      { word: 'RATA', path: [{ row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }, { row: 2, col: 3 }], length: 4 },
      { word: 'GATOS', path: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }, { row: 1, col: 0 }], length: 5 },
    ],
    validWords: new Set(['GATO', 'GATOS', 'SOL', 'SOLE', 'CASA', 'RATA', 'OLE', 'TAL', 'SAL', 'RATA']),
  },
  sv: {
    letters: [
      ['K', 'A', 'T', 'T'],
      ['S', 'O', 'L', 'E'],
      ['R', 'A', 'T', 'A'],
      ['H', 'U', 'S', 'D'],
    ],
    targetWords: [
      { word: 'KATT', path: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }], length: 4 },
      { word: 'SOL', path: [{ row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }], length: 3 },
      { word: 'HUS', path: [{ row: 3, col: 0 }, { row: 3, col: 1 }, { row: 3, col: 2 }], length: 3 },
      { word: 'RATA', path: [{ row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }, { row: 2, col: 3 }], length: 4 },
      { word: 'SOLAR', path: [{ row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 2, col: 1 }, { row: 2, col: 0 }], length: 5 },
    ],
    validWords: new Set(['KATT', 'SOL', 'HUS', 'RATA', 'SOLAR', 'OLE', 'TAL', 'SAL', 'RAT']),
  },
  ja: {
    letters: [
      ['C', 'A', 'T', 'S'],
      ['R', 'O', 'P', 'E'],
      ['S', 'T', 'A', 'R'],
      ['D', 'O', 'G', 'S'],
    ],
    targetWords: [
      { word: 'CAT', path: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }], length: 3 },
      { word: 'DOG', path: [{ row: 3, col: 0 }, { row: 3, col: 1 }, { row: 3, col: 2 }], length: 3 },
      { word: 'STAR', path: [{ row: 0, col: 3 }, { row: 2, col: 1 }, { row: 2, col: 2 }, { row: 2, col: 3 }], length: 4 },
      { word: 'ROPE', path: [{ row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 3 }], length: 4 },
      { word: 'STARS', path: [{ row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }, { row: 2, col: 3 }, { row: 0, col: 3 }], length: 5 },
    ],
    validWords: new Set([
      'CAT', 'CATS', 'DOG', 'DOGS', 'STAR', 'STARS', 'ROPE', 'TOP',
      'POT', 'TAR', 'OPE', 'APE', 'TAP', 'PAT', 'OAT',
    ]),
  },
};

/** Check if a word is valid on the tutorial board */
export function isValidTutorialWord(word: string, language: string): boolean {
  const config = tutorialBoards[language] || tutorialBoards.en;
  return config.validWords.has(word.toUpperCase()) || config.validWords.has(word);
}

/** Get the tutorial board for a language */
export function getTutorialBoard(language: string): TutorialBoardConfig {
  return tutorialBoards[language] || tutorialBoards.en;
}
