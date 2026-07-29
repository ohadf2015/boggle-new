import { describe, it, expect } from 'vitest';
import { buildGrid } from '../grid';
import type { GridLayout } from '../types';

// 3x3 fully-open layout. Letters are placeholders (not real words) — we test geometry only.
//   A B C
//   D E F
//   G H I
const open3x3 = (rtl: boolean): GridLayout => ({
  rtl,
  solution: [
    ['a', 'b', 'c'],
    ['d', 'e', 'f'],
    ['g', 'h', 'i'],
  ],
});

describe('buildGrid — LTR (English)', () => {
  it('numbers across/down starts in row-major, left-to-right reading order', () => {
    const { cells } = buildGrid(open3x3(false));
    const numAt = (r: number, c: number) =>
      cells.find((x) => x.row === r && x.col === c)!.number;

    // (0,0) starts both across+down -> #1; (0,1),(0,2) start down -> #2,#3
    expect(numAt(0, 0)).toBe(1);
    expect(numAt(0, 1)).toBe(2);
    expect(numAt(0, 2)).toBe(3);
    // (1,0),(2,0) start across -> #4,#5; interior cells unnumbered
    expect(numAt(1, 0)).toBe(4);
    expect(numAt(2, 0)).toBe(5);
    expect(numAt(1, 1)).toBeNull();
    expect(numAt(2, 2)).toBeNull();
  });

  it('extracts across slots starting at the leftmost cell, reading rightward', () => {
    const { slots } = buildGrid(open3x3(false));
    const a1 = slots.find((s) => s.id === 'A1')!;
    expect(a1.dir).toBe('across');
    expect(a1.row).toBe(0);
    expect(a1.col).toBe(0);
    expect(a1.length).toBe(3);
    expect(a1.cells.map((c) => c.col)).toEqual([0, 1, 2]);
    expect(a1.answer).toBe('abc');
  });

  it('extracts down slots top-to-bottom', () => {
    const { slots } = buildGrid(open3x3(false));
    const d1 = slots.find((s) => s.id === 'D1')!;
    expect(d1.dir).toBe('down');
    expect(d1.cells.map((c) => c.row)).toEqual([0, 1, 2]);
    expect(d1.answer).toBe('adg');
  });
});

describe('buildGrid — RTL is display-only (geometry stays logical)', () => {
  // The rtl flag does NOT change geometry. Answers stay in authored reading order so clue-keys
  // match; the renderer mirrors columns via CSS so col 0 appears on the right (across reads
  // right-to-left visually). Geometry for rtl must therefore equal the LTR geometry.
  it('produces identical numbering and slots regardless of the rtl flag', () => {
    const ltr = buildGrid(open3x3(false));
    const rtl = buildGrid(open3x3(true));
    expect(rtl.cells).toEqual(ltr.cells);
    expect(rtl.slots).toEqual(ltr.slots);
  });

  it('keeps across answers in authored array order (e.g. row "a b c" -> "abc")', () => {
    const { slots } = buildGrid(open3x3(true));
    const a1 = slots.find((s) => s.id === 'A1')!;
    expect(a1.col).toBe(0);
    expect(a1.cells.map((c) => c.col)).toEqual([0, 1, 2]);
    expect(a1.answer).toBe('abc');
  });
});

describe('buildGrid — blocks and short runs', () => {
  // A single isolated cell is not a word; runs must be length >= 2.
  //   X . X      (X = block, . = letter)  -> middle column is a down-only of length 1? no
  it('ignores length-1 runs (isolated cells start no slot)', () => {
    const layout: GridLayout = {
      rtl: false,
      solution: [
        ['a', null, 'b'],
        ['c', null, 'd'],
        ['e', null, 'f'],
      ],
    };
    const { slots } = buildGrid(layout);
    // No across words (every across run is length 1). Two down words of length 3.
    expect(slots.filter((s) => s.dir === 'across')).toHaveLength(0);
    expect(slots.filter((s) => s.dir === 'down')).toHaveLength(2);
  });
});
