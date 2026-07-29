import { describe, it, expect } from 'vitest';
import { buildDictIndex, fillGrid } from '../generate.core';
import { buildGrid } from '../grid';
import type { GridLayout } from '../types';

// Deterministic seeded RNG for stable tests.
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function allRunsInDict(
  grid: ReadonlyArray<ReadonlyArray<string | null>>,
  rtl: boolean,
  dict: Set<string>,
): boolean {
  const layout: GridLayout = { rtl, solution: grid };
  const { slots } = buildGrid(layout);
  return slots.every((s) => dict.has(s.answer));
}

describe('buildDictIndex', () => {
  it('indexes words by length', () => {
    const idx = buildDictIndex(['cat', 'are', 'tens', 'dog']);
    expect(idx.byLength.get(3)?.sort()).toEqual(['are', 'cat', 'dog']);
    expect(idx.byLength.get(4)).toEqual(['tens']);
  });
});

describe('fillGrid — open grid CSP', () => {
  // Rich enough for an ASYMMETRIC 3x3 fill (no repeated word across vs down), e.g.
  //   b a d      rows: bad, ore, ate
  //   o r e      cols: boa, art, dee
  //   a t e
  const words3 = [
    'bad', 'ore', 'ate', 'boa', 'art', 'dee',
    'cat', 'are', 'ten', 'dog', 'car', 'rat', 'ear', 'net', 'tar', 'bar',
    'bat', 'toe', 'tee', 'oat', 'ade', 'eat', 'tea', 'rot', 'roe', 'rad',
  ];
  const dict = buildDictIndex(words3);
  const dictSet = new Set(words3);

  const openTemplate = (rtl: boolean) => ({ size: 3, rtl, blocks: [] as [number, number][] });

  it('fills a fully-open 3x3 so every across+down run is a dictionary word (LTR)', () => {
    const grid = fillGrid(openTemplate(false), dict, { rng: seeded(7) });
    expect(grid).not.toBeNull();
    expect(allRunsInDict(grid!, false, dictSet)).toBe(true);
  });

  it('fills a fully-open 3x3 for RTL using the same dictionary', () => {
    const grid = fillGrid(openTemplate(true), dict, { rng: seeded(7) });
    expect(grid).not.toBeNull();
    expect(allRunsInDict(grid!, true, dictSet)).toBe(true);
  });

  it('never returns a grid with an invalid cross-completed run', () => {
    // {abc,def,ghi} can tile rows (abc/def/ghi) but then columns are adg/beh/cfi (not words),
    // and no permutation makes BOTH directions valid. The only correct answer is null. A buggy
    // solver that fills one direction and skips cross-completed slots would emit an invalid grid.
    const words = ['abc', 'def', 'ghi'];
    const dict = buildDictIndex(words);
    const grid = fillGrid(openTemplate(false), dict, { rng: seeded(5), maxSteps: 50000 });
    expect(grid).toBeNull();
  });

  it('returns null when the dictionary cannot satisfy the template', () => {
    const tooShort = buildDictIndex(['ab', 'cd']); // no 3-letter words
    const grid = fillGrid(openTemplate(false), tooShort, { rng: seeded(1), maxSteps: 5000 });
    expect(grid).toBeNull();
  });

  it('respects block cells (leaves them empty, fills the rest validly)', () => {
    // Cross template: center column + center row open, corners blocked -> a plus shape.
    //   # a #
    //   b c d
    //   # e #
    // across runs: only row1 (bcd). down runs: only col1 (ace).
    const dictPlus = buildDictIndex(['bcd', 'ace', 'bad', 'cab']);
    const grid = fillGrid(
      { size: 3, rtl: false, blocks: [[0, 0], [0, 2], [2, 0], [2, 2]] },
      dictPlus,
      { rng: seeded(3) },
    );
    expect(grid).not.toBeNull();
    expect(grid![0][0]).toBeNull();
    expect(grid![1][1]).toBe('c'); // center filled
    expect(allRunsInDict(grid!, false, new Set(['bcd', 'ace', 'bad', 'cab']))).toBe(true);
  });
});
