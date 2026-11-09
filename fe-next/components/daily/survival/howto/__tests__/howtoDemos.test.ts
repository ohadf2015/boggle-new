import { describe, it, expect } from 'vitest';
import type { Language } from '@/types';
import { normalizeHebrewWord } from '@/shared/utils/wordNormalization';
import { getHuntLesson, HOWTO_LOCALES, lessonGreens, spellsLessonWord } from '../howtoDemos';
import type { HuntCell } from '../../hunt/huntStage';

const spell = (grid: string[][], path: HuntCell[]) => path.map(({ row, col }) => grid[row][col]).join('');
const adjacent = (path: HuntCell[]) =>
  path.every((c, i) => i === 0 || (Math.abs(c.row - path[i - 1].row) <= 1 && Math.abs(c.col - path[i - 1].col) <= 1));
const fold = (w: string) => normalizeHebrewWord(w).toUpperCase();

describe('Word Hunt lesson boards', () => {
  it.each(HOWTO_LOCALES)('given %s, both lesson words trace along touching tiles of their own board', (lang) => {
    const lesson = getHuntLesson(lang);
    const grid = lesson.grid as unknown as string[][];
    expect(fold(spell(grid, lesson.cluePath))).toBe(fold(lesson.clueWord));
    expect(fold(spell(grid, lesson.targetPath))).toBe(fold(lesson.target));
    expect(adjacent(lesson.cluePath)).toBe(true);
    expect(adjacent(lesson.targetPath)).toBe(true);
  });

  it.each(HOWTO_LOCALES)('given %s, the clue word is shorter than the hidden word, so it is free', (lang) => {
    const lesson = getHuntLesson(lang);
    expect([...lesson.clueWord].length).toBeGreaterThanOrEqual(3);
    expect([...lesson.clueWord].length).toBeLessThan([...lesson.target].length);
  });

  it.each(HOWTO_LOCALES)('given %s, the clue word lights green, yellow and gray against the hidden word', (lang) => {
    const states = new Set(getHuntLesson(lang).clueFeedback.map((f) => f.feedback));
    expect([...states].sort()).toEqual(['gray', 'green', 'yellow']);
    expect(lessonGreens(getHuntLesson(lang)).size).toBeGreaterThan(0);
  });

  it('given a locale without its own lesson, then it falls back to English', () => {
    expect(getHuntLesson('xx').target).toBe(getHuntLesson('en').target);
  });

  it('given Russian, then the board is Cyrillic', () => {
    expect(getHuntLesson('ru').target).toMatch(/^[А-Я]+$/);
  });

  it('given Hebrew, a traced word with regular letter forms matches the hidden word with a final letter', () => {
    expect(spellsLessonWord('שלומ', 'שלום', 'he' as Language)).toBe(true);
    expect(spellsLessonWord('שלו', 'שלום', 'he' as Language)).toBe(false);
  });
});
