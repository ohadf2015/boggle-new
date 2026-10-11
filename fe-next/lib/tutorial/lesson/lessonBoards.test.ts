import { describe, it, expect } from 'vitest';
import { LESSON_BOARDS, lessonBoardFor } from './lessonBoards';
import { STARTER_WORDS, findStarterOnGrid } from './starterWords';
import { findWordPath } from '@/utils/wordPathFinder';
import type { Language } from '@/types';

const languages = Object.keys(LESSON_BOARDS) as Language[];

describe('lesson boards', () => {
  it('covers every locale that has starter words', () => {
    expect(languages.sort()).toEqual((Object.keys(STARTER_WORDS) as Language[]).sort());
  });

  it.each(languages)('%s: a 5x5 board whose starter word is the one the lesson teaches', (language) => {
    const grid = lessonBoardFor(language, 5, 5);
    expect(grid).not.toBeNull();
    expect(grid).toHaveLength(5);
    grid!.forEach((row) => expect(row).toHaveLength(5));
    expect(findStarterOnGrid(grid, language)?.word).toBe(LESSON_BOARDS[language]!.starter);
  });

  it.each(languages)('%s: the starter runs straight down the middle column', (language) => {
    const grid = lessonBoardFor(language, 5, 5)!;
    const path = findWordPath(LESSON_BOARDS[language]!.starter, grid, language)!;
    expect(path.every((c) => c.col === 2)).toBe(true);
    path.slice(1).forEach((c, i) => expect(c.row).toBe(path[i].row + 1));
  });

  it.each(languages)('%s: no other starter word sits on the board to steal the hint', (language) => {
    const grid = lessonBoardFor(language, 5, 5)!;
    const others = (STARTER_WORDS[language] ?? []).filter((w) => w !== LESSON_BOARDS[language]!.starter);
    others.forEach((w) => expect(findWordPath(w, grid, language)).toBeNull());
  });

  it('falls back (null) for board sizes and locales it was not drawn for', () => {
    expect(lessonBoardFor('en', 4, 4)).toBeNull();
    expect(lessonBoardFor('ja', 5, 5)).toBeNull();
  });

  it('hands out a fresh copy, so the game can never mutate the shared board', () => {
    const a = lessonBoardFor('en', 5, 5)!;
    a[0][0] = '?';
    expect(lessonBoardFor('en', 5, 5)![0][0]).not.toBe('?');
  });
});
