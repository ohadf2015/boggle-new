import { describe, it, expect } from 'vitest';
import { solveBoard, sortedDict, pickHints, pickTargets, dealLevel, displayTarget } from '../deal';
import { getPlayLevel } from '../levels';
import { makeRng } from '../rng';

const grid = [
  ['c', 'a', 't', 's'],
  ['o', 'r', 'e', 'x'],
  ['d', 'o', 'g', 'x'],
  ['x', 'x', 'x', 'x'],
];
const words = ['cat', 'cats', 'car', 'care', 'cart', 'dog', 'act', 'tea', 'rat', 'rate', 'crate', 'zebra'];
const dict = sortedDict(words);

describe('solveBoard', () => {
  it('given a board and dictionary, when solved, then it returns every on-board word (lowercase) and nothing off-board', () => {
    const found = solveBoard(grid, dict, { minLength: 3 });
    expect(found).toEqual(expect.arrayContaining(['cat', 'cats', 'car', 'care', 'dog', 'rat', 'rate', 'crate']));
    expect(found).not.toContain('zebra');
  });

  it('given uppercase board letters, when solved, then words are still found lowercase', () => {
    expect(solveBoard(grid.map((r) => r.map((c) => c.toUpperCase())), dict, { minLength: 3 })).toContain('cats');
  });
});

describe('pickHints', () => {
  it('given many words, when picked, then at most 12, shortest-first, and a mix of lengths', () => {
    const pool = ['aaa', 'bbb', 'ccc', 'dddd', 'eeee', 'fffff', 'gggggg', 'hhh', 'iii', 'jjj', 'kkk', 'lll', 'mmm', 'nnnn'];
    const hints = pickHints(pool, 12);
    expect(hints.length).toBe(12);
    expect(hints[0].length).toBe(3);
    expect(new Set(hints.map((h) => h.length)).size).toBeGreaterThanOrEqual(3);
    expect(hints.slice(0, 4).map((h) => h.length)).toEqual([3, 4, 5, 6]);
  });
});

describe('pickTargets', () => {
  it('given words, when picking targets, then only 4-6 letter words are chosen, distinct', () => {
    const t = pickTargets(['cat', 'cats', 'care', 'crate', 'crates', 'cratered'], 3, makeRng('x'));
    expect(t).toHaveLength(3);
    expect(t.every((w) => w.length >= 4 && w.length <= 6)).toBe(true);
    expect(new Set(t).size).toBe(3);
  });
});

describe('dealLevel', () => {
  const isWord = (w: string) => words.includes(w);

  it('given a hunt level, when dealt, then it returns huntCount+1 real on-board targets and hints', () => {
    const lvl = getPlayLevel(1, 2);
    const deal = dealLevel({
      lvl, language: 'en', isWord, rand: makeRng('s'),
      generate: () => grid, solve: (g) => solveBoard(g, dict, { minLength: 3 }),
    });
    expect(deal.targets).toHaveLength(lvl.huntCount! + 1);
    expect(deal.hints.length).toBeGreaterThan(0);
    expect(deal.hints.length).toBeLessThanOrEqual(12);
  });

  it('given a hunt that can never find enough targets, when dealt, then it throws instead of dealing an unwinnable level', () => {
    const lvl = getPlayLevel(1, 2);
    expect(() => dealLevel({
      lvl, language: 'en', isWord, rand: makeRng('s'),
      generate: () => grid, solve: () => ['cat'],
    })).toThrow(/hunt/);
  });

  it('given teacher target words, when dealt, then the generator receives them and they become the targets', () => {
    const lvl = getPlayLevel(1, 2);
    let received: string[] | undefined;
    const deal = dealLevel({
      lvl, language: 'en', isWord, rand: makeRng('s'), targetWords: ['crate', 'cats', 'dog'],
      generate: (tw) => { received = tw; return grid; }, solve: (g) => solveBoard(g, dict, { minLength: 3 }),
    });
    expect(received).toEqual(['crate', 'cats', 'dog']);
    expect(deal.targets).toEqual(['crate', 'cats', 'dog']);
  });

  it('given a classic level, when dealt, then there are no targets', () => {
    const deal = dealLevel({
      lvl: getPlayLevel(1, 1), language: 'en', isWord, rand: makeRng('s'),
      generate: () => grid, solve: (g) => solveBoard(g, dict, { minLength: 3 }),
    });
    expect(deal.targets).toBeUndefined();
    expect(deal.hints.every((h) => isWord(h))).toBe(true);
  });
});

describe('common-word preference', () => {
  // `rate`, `crate`, `cart` are "obscure" here; the common list is the everyday words.
  const common = ['cat', 'cats', 'car', 'care', 'dog', 'tea'];
  const isWord = (w: string) => words.includes(w);

  it('given a common list, when hints are dealt, then every common on-board word comes before any uncommon one', () => {
    const deal = dealLevel({
      lvl: getPlayLevel(1, 1), language: 'en', isWord, rand: makeRng('s'), common,
      generate: () => grid, solve: (g) => solveBoard(g, dict, { minLength: 3 }),
    });
    const firstUncommon = deal.hints.findIndex((h) => !common.includes(h));
    const lastCommon = deal.hints.map((h) => common.includes(h)).lastIndexOf(true);
    expect(lastCommon).toBeGreaterThanOrEqual(0);
    if (firstUncommon !== -1) expect(firstUncommon).toBeGreaterThan(lastCommon);
    expect(deal.hints.slice(0, 3).every((h) => common.includes(h))).toBe(true);
  });

  it('given enough common on-board words, when a hunt is dealt, then every target is a common word', () => {
    const lvl = getPlayLevel(1, 2);
    const deal = dealLevel({
      lvl, language: 'en', isWord, rand: makeRng('s'), common: [...common, 'cart'],
      generate: () => grid, solve: (g) => solveBoard(g, dict, { minLength: 3 }),
    });
    expect(deal.targets).toHaveLength(lvl.huntCount! + 1);
    expect(deal.targets!.every((w) => [...common, 'cart'].includes(w))).toBe(true);
  });

  it('given a thin common list that never reaches the board, when a hunt is dealt, then it falls back to real words instead of failing', () => {
    const lvl = getPlayLevel(1, 2);
    const deal = dealLevel({
      lvl, language: 'ru', isWord, rand: makeRng('s'), common: ['zzzz'],
      generate: () => grid, solve: (g) => solveBoard(g, dict, { minLength: 3 }),
    });
    expect(deal.targets).toHaveLength(lvl.huntCount! + 1);
    expect(deal.targets!.every(isWord)).toBe(true);
  });

  it('given a common list, when a hunt is dealt, then the generator is first asked to embed common 4-6 letter words', () => {
    const lvl = getPlayLevel(1, 2);
    const calls: Array<string[] | undefined> = [];
    dealLevel({
      lvl, language: 'en', isWord, rand: makeRng('s'), common: [...common, 'cart', 'crate', 'abcdefghij'],
      generate: (tw) => { calls.push(tw); return grid; }, solve: (g) => solveBoard(g, dict, { minLength: 3 }),
    });
    expect(calls[0]?.length).toBeGreaterThan(0);
    expect(calls[0]!.every((w) => w.length >= 4 && w.length <= 6)).toBe(true);
  });

  it('given a common list with final Hebrew forms, when compared to board words, then they still match', () => {
    const heGrid = [['ש', 'ל', 'ו', 'מ'], ['א', 'ב', 'ג', 'ד'], ['ה', 'ז', 'ח', 'ט'], ['י', 'כ', 'נ', 'ס']];
    const heWords = ['שלומ', 'שלו'];
    const deal = dealLevel({
      lvl: getPlayLevel(1, 1), language: 'he', isWord: (w) => heWords.includes(w), rand: makeRng('s'),
      common: ['שלום'], generate: () => heGrid, solve: (g) => solveBoard(g, sortedDict(heWords), { minLength: 3 }),
    });
    expect(deal.hints[0]).toBe('שלומ');
  });
});

describe('displayTarget', () => {
  it('given a Hebrew target in board form, when displayed, then the last letter takes its final form', () => {
    expect(displayTarget('שלומ', 'he')).toBe('שלום');
    expect(displayTarget('ארצ', 'he')).toBe('ארץ');
  });

  it('given a non-Hebrew target, when displayed, then it is unchanged', () => {
    expect(displayTarget('cat', 'en')).toBe('cat');
  });
});
