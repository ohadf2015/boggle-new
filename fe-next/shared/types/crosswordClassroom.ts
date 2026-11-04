export const CROSSWORD_CLASSROOM_EVENTS = {
  startRefused: 'crossword:startRefused',
} as const;

export interface CrosswordStartRefused {
  gameCode: string;
  reason: 'tooFewWords';
  usableWords: number;
}
