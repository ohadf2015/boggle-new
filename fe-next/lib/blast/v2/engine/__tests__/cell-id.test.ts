import { describe, it, expect } from 'vitest';
import { cellId, parseCell } from '../cell-id';

describe('cell-id helpers', () => {
  it('cellId constructs ID from col and row', () => {
    expect(cellId(2, 4)).toBe('c2r4');
    expect(cellId(0, 0)).toBe('c0r0');
    expect(cellId(10, 15)).toBe('c10r15');
  });

  it('parseCell extracts col and row from ID', () => {
    expect(parseCell('c3r5')).toEqual({ col: 3, row: 5 });
    expect(parseCell('c0r0')).toEqual({ col: 0, row: 0 });
    expect(parseCell('c10r15')).toEqual({ col: 10, row: 15 });
  });

  it('parseCell throws on invalid format', () => {
    expect(() => parseCell('bad')).toThrow();
    expect(() => parseCell('3r5')).toThrow();
    expect(() => parseCell('c3r')).toThrow();
  });
});
