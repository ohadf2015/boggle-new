import type { ConnectionPuzzle, PuzzleLocale } from '../types';
import { EN_EASY } from './en-easy';
import { EN_MEDIUM } from './en-medium';
import { EN_HARD } from './en-hard';
import { HE_EASY } from './he-easy';
import { HE_MEDIUM } from './he-medium';
import { HE_HARD } from './he-hard';

const PUZZLES_BY_LOCALE: Record<PuzzleLocale, ConnectionPuzzle[]> = {
  en: [...EN_EASY, ...EN_MEDIUM, ...EN_HARD],
  he: [...HE_EASY, ...HE_MEDIUM, ...HE_HARD],
};

export function getPuzzlesForLocale(locale: string): ConnectionPuzzle[] {
  const key = locale in PUZZLES_BY_LOCALE ? (locale as PuzzleLocale) : 'en';
  return PUZZLES_BY_LOCALE[key];
}

export function getShuffledPuzzles(locale: string, count = 20): ConnectionPuzzle[] {
  const all = getPuzzlesForLocale(locale);
  const shuffled = [...all].sort(() => Math.random() - 0.5);
  // balanced difficulty: roughly 40% easy, 40% medium, 20% hard
  const easy = shuffled.filter(p => p.difficulty === 'easy').slice(0, Math.floor(count * 0.4));
  const medium = shuffled.filter(p => p.difficulty === 'medium').slice(0, Math.floor(count * 0.4));
  const hard = shuffled.filter(p => p.difficulty === 'hard').slice(0, Math.floor(count * 0.2));
  return [...easy, ...medium, ...hard].sort(() => Math.random() - 0.5);
}
