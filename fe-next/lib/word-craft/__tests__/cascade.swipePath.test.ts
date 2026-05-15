import { describe, it, expect } from 'vitest';
import { createBag } from '../tileBag';
import { createGrid, cellAt } from '../cascade/boardGrid';
import { validatePath } from '../cascade/swipePath';

const seed = (s: number) => createBag({ seed: s, locale: 'en' });

describe('cascade/swipePath.validatePath', () => {
  const grid = (rows = 7, cols = 7) => createGrid(rows, cols, seed(123));

  it('rejects empty path', () => {
    const g = grid();
    const res = validatePath(g, []);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe('TOO_SHORT');
  });

  it('rejects path shorter than minLength', () => {
    const g = grid();
    const a = cellAt(g, 0, 0)!.id;
    const b = cellAt(g, 0, 1)!.id;
    const res = validatePath(g, [a, b]); // length 2, min 3
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe('TOO_SHORT');
  });

  it('accepts a contiguous horizontal path of length 3', () => {
    const g = grid();
    const ids = [cellAt(g, 0, 0)!.id, cellAt(g, 0, 1)!.id, cellAt(g, 0, 2)!.id];
    const res = validatePath(g, ids);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.word.length).toBe(3);
      expect(res.path).toEqual(ids);
    }
  });

  it('accepts a contiguous vertical path', () => {
    const g = grid();
    const ids = [cellAt(g, 0, 0)!.id, cellAt(g, 1, 0)!.id, cellAt(g, 2, 0)!.id];
    expect(validatePath(g, ids).ok).toBe(true);
  });

  it('accepts a corner-turn path (L-shape)', () => {
    const g = grid();
    const ids = [
      cellAt(g, 0, 0)!.id,
      cellAt(g, 0, 1)!.id,
      cellAt(g, 1, 1)!.id,
      cellAt(g, 2, 1)!.id,
    ];
    expect(validatePath(g, ids).ok).toBe(true);
  });

  it('rejects non-contiguous (jumped) path', () => {
    const g = grid();
    const ids = [cellAt(g, 0, 0)!.id, cellAt(g, 0, 2)!.id, cellAt(g, 0, 3)!.id];
    const res = validatePath(g, ids);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe('NOT_CONTIGUOUS');
  });

  it('rejects path with reused cell', () => {
    const g = grid();
    const a = cellAt(g, 0, 0)!.id;
    const b = cellAt(g, 0, 1)!.id;
    const res = validatePath(g, [a, b, a]);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe('REUSED_CELL');
  });

  it('rejects diagonal step when diagonal=false', () => {
    const g = grid();
    const ids = [cellAt(g, 0, 0)!.id, cellAt(g, 1, 1)!.id, cellAt(g, 2, 2)!.id];
    const res = validatePath(g, ids);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe('NOT_CONTIGUOUS');
  });

  it('accepts diagonal path when diagonal=true', () => {
    const g = grid();
    const ids = [cellAt(g, 0, 0)!.id, cellAt(g, 1, 1)!.id, cellAt(g, 2, 2)!.id];
    expect(validatePath(g, ids, { diagonal: true }).ok).toBe(true);
  });

  it('rejects path with unknown cell id', () => {
    const g = grid();
    const res = validatePath(g, [cellAt(g, 0, 0)!.id, 'bogus', cellAt(g, 0, 1)!.id]);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe('UNKNOWN_CELL');
  });

  it('returns letters joined in path order', () => {
    const g = grid();
    const cells = [cellAt(g, 0, 0)!, cellAt(g, 0, 1)!, cellAt(g, 0, 2)!];
    const ids = cells.map((c) => c.id);
    const res = validatePath(g, ids);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.word).toBe(cells.map((c) => c.letter).join(''));
  });

  it('honors custom minLength option', () => {
    const g = grid();
    const ids = [cellAt(g, 0, 0)!.id, cellAt(g, 0, 1)!.id, cellAt(g, 0, 2)!.id];
    const res = validatePath(g, ids, { minLength: 5 });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe('TOO_SHORT');
  });
});
