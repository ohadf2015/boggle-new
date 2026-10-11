import type { Language, LetterGrid } from '@/types';

export interface LessonBoard {
  starter: string;
  rows: readonly string[];
}

/**
 * The first round is dealt, not random: the starter word runs straight down the
 * middle and the longest words on the board are ones a beginner knows.
 * Searched offline against public/dicts/<lang>.dict.gz and backend/common_hunt_words*.
 */
export const LESSON_BOARDS: Partial<Record<Language, LessonBoard>> = {
  en: { starter: 'CAT', rows: ['CLOIS', 'PLCNP', 'IMAED', 'OBTRA', 'NSEGT'] },
  es: { starter: 'SOL', rows: ['GRUNB', 'CTSDI', 'PAOCN', 'BALRO', 'ELTEF'] },
  sv: { starter: 'SOL', rows: ['ÖÄKUN', 'HNSRM', 'ITOFR', 'EVLKU', 'LGABT'] },
  he: { starter: 'בית', rows: ['עקחדה', 'מרבלש', 'הניומ', 'ופתחר', 'דקשנפ'] },
  ru: { starter: 'КОТ', rows: ['РЦКБА', 'ОДКЗН', 'АРОСВ', 'БГТЕЧ', 'ГЛЬУЛ'] },
};

export function lessonBoardFor(language: Language, rows: number, cols: number): LetterGrid | null {
  const board = LESSON_BOARDS[language];
  if (!board || board.rows.length !== rows || board.rows.some((r) => [...r].length !== cols)) return null;
  return board.rows.map((r) => [...r]);
}
