import { describe, it, expect } from 'vitest';
import {
  generatePreviewBoard,
  isWordOnBoard,
  classifyLessonWords,
  PREVIEW_BOARD_DIMS,
} from './previewBoard';

describe('isWordOnBoard', () => {
  it('finds a word along an 8-neighbour path without reusing a cell', () => {
    // Given a board where CAT runs diagonally
    const grid = [
      ['C', 'X', 'X'],
      ['X', 'A', 'X'],
      ['X', 'X', 'T'],
    ];
    // When / Then
    expect(isWordOnBoard('cat', grid, 'en')).toBe(true);
    expect(isWordOnBoard('act', grid, 'en')).toBe(false);
  });

  it('refuses to reuse the same cell twice', () => {
    // "AA" needs two distinct A cells — there is only one
    const grid = [
      ['A', 'B'],
      ['C', 'D'],
    ];
    expect(isWordOnBoard('aa', grid, 'en')).toBe(false);
    expect(isWordOnBoard('ab', grid, 'en')).toBe(true);
  });

  it('matches Hebrew final letters against their regular form on the board', () => {
    const grid = [
      ['ש', 'ל'],
      ['ו', 'ם'],
    ];
    // שלום ends with final mem; the board stores regular mem (normalised both sides)
    expect(isWordOnBoard('שלום', grid, 'he')).toBe(true);
  });

  it('returns false for an empty word or board', () => {
    expect(isWordOnBoard('', [['A']], 'en')).toBe(false);
    expect(isWordOnBoard('a', [], 'en')).toBe(false);
  });
});

describe('generatePreviewBoard', () => {
  it('produces a grid of the requested size with every cell filled', () => {
    const { grid } = generatePreviewBoard({
      rows: 5,
      cols: 5,
      words: ['apple'],
      language: 'en',
      seed: 1,
    });
    expect(grid).toHaveLength(5);
    grid.forEach((row) => {
      expect(row).toHaveLength(5);
      row.forEach((cell) => expect(cell).toMatch(/^[A-Z]$/));
    });
  });

  it('embeds words that fit and every embedded word is traceable on the board', () => {
    const words = ['apple', 'grape', 'lemon', 'kiwi'];
    const result = generatePreviewBoard({ rows: 5, cols: 5, words, language: 'en', seed: 42 });
    expect(result.embedded.length).toBeGreaterThan(0);
    for (const word of result.embedded) {
      expect(isWordOnBoard(word, result.grid, 'en')).toBe(true);
    }
  });

  it('returns a placement path for every embedded word using distinct adjacent cells', () => {
    const result = generatePreviewBoard({
      rows: 5,
      cols: 5,
      words: ['apple'],
      language: 'en',
      seed: 7,
    });
    const placement = result.placements.find((p) => p.word === 'apple');
    expect(placement).toBeDefined();
    const path = placement!.path;
    expect(path).toHaveLength(5);
    const keys = new Set(path.map(([r, c]) => `${r},${c}`));
    expect(keys.size).toBe(5);
    for (let i = 1; i < path.length; i++) {
      expect(Math.abs(path[i][0] - path[i - 1][0])).toBeLessThanOrEqual(1);
      expect(Math.abs(path[i][1] - path[i - 1][1])).toBeLessThanOrEqual(1);
    }
    path.forEach(([r, c], i) => expect(result.grid[r][c]).toBe('APPLE'[i]));
  });

  it('is deterministic for a given seed and changes with a different seed', () => {
    const opts = { rows: 6, cols: 6, words: ['banana', 'cherry', 'mango'], language: 'en' as const };
    const a = generatePreviewBoard({ ...opts, seed: 123 });
    const b = generatePreviewBoard({ ...opts, seed: 123 });
    const c = generatePreviewBoard({ ...opts, seed: 124 });
    expect(a.grid).toEqual(b.grid);
    expect(a.embedded).toEqual(b.embedded);
    expect(c.grid).not.toEqual(a.grid);
  });

  it('reports words that are longer than the board can hold, mirroring the live game rule', () => {
    // The live generator skips any word longer than max(rows, cols).
    const result = generatePreviewBoard({
      rows: 5,
      cols: 5,
      words: ['elephant', 'cat'],
      language: 'en',
      seed: 3,
    });
    expect(result.embedded).toEqual(['cat']);
    expect(result.skipped).toContainEqual({ word: 'elephant', reason: 'tooLongForBoard' });
  });

  it('reports multi-word entries and blanks instead of embedding them', () => {
    const result = generatePreviewBoard({
      rows: 5,
      cols: 5,
      words: ['ice cream', '  ', 'cat'],
      language: 'en',
      seed: 3,
    });
    expect(result.embedded).toEqual(['cat']);
    expect(result.skipped).toContainEqual({ word: 'ice cream', reason: 'multiWord' });
    expect(result.skipped.some((s) => s.reason === 'empty')).toBe(true);
  });

  it('caps the sample at the live game word budget and reports the overflow as notInSample', () => {
    // 5x5 → max(4, floor(25/3)) = 8 words, same as the server.
    const words = Array.from({ length: 12 }, (_, i) => `w${String(i).padStart(2, '0')}`).map(
      (w) => w.replace(/\d/g, (d) => 'abcdefghij'[Number(d)])
    );
    const result = generatePreviewBoard({ rows: 5, cols: 5, words, language: 'en', seed: 9 });
    expect(result.embedded.length).toBeLessThanOrEqual(8);
    const notSampled = result.skipped.filter((s) => s.reason === 'notInSample');
    expect(notSampled.length + result.embedded.length).toBe(12);
  });

  it('fills a Hebrew board with Hebrew letters and keeps embedded words traceable', () => {
    const result = generatePreviewBoard({
      rows: 5,
      cols: 5,
      words: ['שלום', 'ספר'],
      language: 'he',
      seed: 5,
    });
    result.grid.flat().forEach((cell) => expect(cell).toMatch(/^[א-ת]$/));
    expect(result.embedded).toEqual(expect.arrayContaining(['שלום', 'ספר']));
    result.embedded.forEach((w) => expect(isWordOnBoard(w, result.grid, 'he')).toBe(true));
  });

  it('fills a Japanese board with hiragana', () => {
    const result = generatePreviewBoard({
      rows: 5,
      cols: 5,
      words: ['ねこ'],
      language: 'ja',
      seed: 5,
    });
    result.grid.flat().forEach((cell) => expect(cell).toMatch(/^[ぁ-ゖー]$/));
    expect(result.embedded).toEqual(['ねこ']);
  });

  it('falls back to English letters for an unknown language', () => {
    const result = generatePreviewBoard({
      rows: 4,
      cols: 4,
      words: [],
      language: 'xx',
      seed: 1,
    });
    result.grid.flat().forEach((cell) => expect(cell).toMatch(/^[A-Z]$/));
  });
});

describe('classifyLessonWords', () => {
  it('explains why each non-integrable lesson word stays off the board', () => {
    const result = classifyLessonWords([
      { word: 'ice cream', canIntegrate: false },
      { word: 'ab', canIntegrate: false },
      { word: 'extraordinarily', canIntegrate: false },
      { word: 'zzzzq', canIntegrate: false },
      { word: 'apple', canIntegrate: true },
    ]);
    expect(result.integrable).toEqual(['apple']);
    expect(result.skipped).toEqual([
      { word: 'ice cream', reason: 'multiWord' },
      { word: 'ab', reason: 'tooShort' },
      { word: 'extraordinarily', reason: 'tooLong' },
      { word: 'zzzzq', reason: 'notInDictionary' },
    ]);
  });

  it('de-duplicates integrable words case-insensitively', () => {
    const result = classifyLessonWords([
      { word: 'Apple', canIntegrate: true },
      { word: 'apple', canIntegrate: true },
    ]);
    expect(result.integrable).toEqual(['Apple']);
  });
});

describe('PREVIEW_BOARD_DIMS', () => {
  it('matches the live host preset: small 5x5, medium 6x6, large 7x7', () => {
    expect(PREVIEW_BOARD_DIMS).toEqual({
      small: { rows: 5, cols: 5 },
      medium: { rows: 6, cols: 6 },
      large: { rows: 7, cols: 7 },
    });
  });
});
