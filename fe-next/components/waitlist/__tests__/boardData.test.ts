import { describe, it, expect } from 'vitest';
import { BOARD, TRACE, traceWord, isAdjacentPath } from '../boardData';

describe('letter board', () => {
  it('spells كتاب along the traced path', () => {
    expect(traceWord()).toBe('كتاب');
  });

  it('traces only neighbouring tiles, each used once', () => {
    expect(isAdjacentPath(TRACE)).toBe(true);
    expect(new Set(TRACE.map(([r, c]) => `${r}:${c}`)).size).toBe(TRACE.length);
  });

  it('rejects a path that jumps a tile', () => {
    expect(isAdjacentPath([[0, 0], [0, 2]])).toBe(false);
  });

  it('is a square grid of single isolated letters', () => {
    expect(BOARD.every((row) => row.length === BOARD.length)).toBe(true);
    expect(BOARD.flat().every((ch) => [...ch].length === 1)).toBe(true);
  });
});
