import type { Language, LetterGrid } from '@/types';
import { getLetterFeedback, type LetterFeedback } from '@/utils/wordHuntFeedback';
import { normalizeHebrewWord } from '@/shared/utils/wordNormalization';
import type { HuntCell } from '../hunt/huntStage';

/**
 * The first-play lesson board. Unlike the real puzzle, everything is staged:
 * a short "clue" word the player traces first (free, heals, reveals letters),
 * then the hidden word itself, which sits on the same board.
 */
export interface HuntLesson {
  grid: LetterGrid;
  /** Short word traced in step 1. Shows all three clue colours against the hidden word. */
  clueWord: string;
  cluePath: HuntCell[];
  /** The hidden word, traceable on the board, traced in step 3. */
  target: string;
  targetPath: HuntCell[];
  clueFeedback: LetterFeedback[];
  language: Language;
}

export const HOWTO_LOCALES = ['en', 'es', 'sv', 'he', 'ja', 'ru'] as const;

interface LessonSource {
  letters: string[][];
  clueWord: string;
  cluePath: Array<[number, number]>;
  target: string;
  targetPath: Array<[number, number]>;
}

// Each clue word lights green, yellow and gray against its hidden word, and both words trace on the board.
const EN: LessonSource = {
  letters: [
    ['S', 'T', 'O'],
    ['E', 'A', 'R'],
    ['N', 'P', 'D'],
  ],
  clueWord: 'SET',
  cluePath: [[0, 0], [1, 0], [0, 1]],
  target: 'STAR',
  targetPath: [[0, 0], [0, 1], [1, 1], [1, 2]],
};

const LESSONS: Record<string, LessonSource> = {
  en: EN,
  // Japanese boards are played in romaji, like the English one.
  ja: EN,
  es: {
    letters: [
      ['R', 'O', 'L'],
      ['E', 'S', 'A'],
      ['N', 'T', 'I'],
    ],
    clueWord: 'SOL',
    cluePath: [[1, 1], [0, 1], [0, 2]],
    target: 'ROSA',
    targetPath: [[0, 0], [0, 1], [1, 1], [1, 2]],
  },
  sv: {
    letters: [
      ['S', 'T', 'A'],
      ['K', 'O', 'L'],
      ['E', 'M', 'R'],
    ],
    clueWord: 'SOM',
    cluePath: [[0, 0], [1, 1], [2, 1]],
    target: 'STOL',
    targetPath: [[0, 0], [0, 1], [1, 1], [1, 2]],
  },
  // Hebrew reads right to left: both paths start in the right-hand column. Tiles use regular letter forms.
  he: {
    letters: [
      ['ר', 'ל', 'ש'],
      ['מ', 'ו', 'ק'],
      ['ת', 'ב', 'א'],
    ],
    clueWord: 'שוק',
    cluePath: [[0, 2], [1, 1], [1, 2]],
    target: 'שלום',
    targetPath: [[0, 2], [0, 1], [1, 1], [1, 0]],
  },
  ru: {
    letters: [
      ['Н', 'О', 'Т'],
      ['Е', 'Р', 'А'],
      ['Л', 'И', 'С'],
    ],
    clueWord: 'РОТ',
    cluePath: [[1, 1], [0, 1], [0, 2]],
    target: 'НОРА',
    targetPath: [[0, 0], [0, 1], [1, 1], [1, 2]],
  },
};

const toCells = (path: Array<[number, number]>): HuntCell[] => path.map(([row, col]) => ({ row, col }));

export function getHuntLesson(language: string): HuntLesson {
  const lang = (LESSONS[language] ? language : 'en') as Language;
  const src = LESSONS[lang];
  return {
    grid: src.letters as unknown as LetterGrid,
    clueWord: src.clueWord,
    cluePath: toCells(src.cluePath),
    target: src.target,
    targetPath: toCells(src.targetPath),
    clueFeedback: getLetterFeedback(src.clueWord, src.target, lang),
    language: lang,
  };
}

/** A traced word matches a lesson word when they spell the same (Hebrew final forms fold to regular ones). */
export function spellsLessonWord(traced: string, expected: string, language: Language): boolean {
  const fold = (w: string) => (language === 'he' ? normalizeHebrewWord(w) : w.toUpperCase());
  return fold(traced) === fold(expected);
}

/** Green letters land in place in the hidden word. */
export function lessonGreens(lesson: HuntLesson): Map<number, string> {
  return new Map(lesson.clueFeedback.filter((f) => f.feedback === 'green').map((f) => [f.position, f.letter]));
}

/** Yellow letters are known to be in the hidden word, just not where they were. */
export function lessonPresent(lesson: HuntLesson): string[] {
  return lesson.clueFeedback.filter((f) => f.feedback === 'yellow').map((f) => f.letter);
}

/** Every letter of the hidden word, in place, for the solved state. */
export function lessonSolved(lesson: HuntLesson): Map<number, string> {
  return new Map([...lesson.target].map((letter, i) => [i, letter]));
}
