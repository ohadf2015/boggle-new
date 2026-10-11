import type { Language, LetterGrid } from '@/types';
import { findWordPath, type PathCell } from '@/utils/wordPathFinder';
import type { LessonHint } from './lessonEngine';

/**
 * A brand-new player's first word should be one they already know, sitting in
 * a straight line, so the first success lands in seconds. Japanese boards are
 * dealt as kanji compounds, so they fall back to a word the solver found.
 * Every word here was checked against public/dicts/<lang>.dict.gz.
 */
export const STARTER_WORDS: Partial<Record<Language, readonly string[]>> = {
  en: ['CAT', 'SUN', 'DOG', 'HAT', 'CUP', 'MAP'],
  es: ['SOL', 'MAR', 'PAN', 'LUZ', 'OSO'],
  sv: ['SOL', 'HUS', 'BIL', 'KATT'],
  he: ['בית', 'ספר', 'שיר', 'אור'],
  ru: ['КОТ', 'ДОМ', 'СОН'],
};

export interface PlantedStarter extends LessonHint {
  grid: LetterGrid;
}

export function plantStarterWord(
  grid: LetterGrid,
  language: Language,
  random: () => number = Math.random,
): PlantedStarter | null {
  const words = STARTER_WORDS[language];
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  if (!words?.length || !rows || !cols) return null;
  const fitting = words.filter((w) => [...w].length <= rows);
  if (!fitting.length) return null;
  const word = fitting[Math.floor(random() * fitting.length) % fitting.length];
  const letters = [...word];
  const col = Math.floor((cols - 1) / 2);
  const top = Math.floor((rows - letters.length) / 2);
  const next = grid.map((row) => row.slice());
  const path: PathCell[] = letters.map((letter, i) => {
    next[top + i][col] = letter;
    return { row: top + i, col, letter };
  });
  return { grid: next, word, path };
}

export function findStarterOnGrid(grid: LetterGrid | null, language: Language): LessonHint | null {
  if (!grid) return null;
  for (const word of STARTER_WORDS[language] ?? []) {
    const path = findWordPath(word, grid, language);
    if (path) return { word, path };
  }
  return null;
}
