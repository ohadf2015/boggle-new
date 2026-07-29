import { describe, it, expect } from 'vitest';
import { isUsableDailyPuzzle } from '../puzzlePayload';

describe('isUsableDailyPuzzle', () => {
  const goodGrid = [['C', 'A', 'T'], ['D', 'O', 'G'], ['B', 'I', 'T']];

  it('accepts a populated grid + non-empty target word', () => {
    expect(isUsableDailyPuzzle({ grid: goodGrid, targetWord: 'CAT' })).toBe(true);
  });

  it('rejects a null grid (the production trigger)', () => {
    expect(isUsableDailyPuzzle({ grid: null, targetWord: 'CAT' })).toBe(false);
  });

  it('rejects an empty grid array', () => {
    expect(isUsableDailyPuzzle({ grid: [], targetWord: 'CAT' })).toBe(false);
  });

  it('rejects a grid whose first row is empty', () => {
    expect(isUsableDailyPuzzle({ grid: [[]], targetWord: 'CAT' })).toBe(false);
  });

  it('rejects an empty target word', () => {
    expect(isUsableDailyPuzzle({ grid: goodGrid, targetWord: '' })).toBe(false);
  });

  it('rejects a missing target word', () => {
    expect(isUsableDailyPuzzle({ grid: goodGrid })).toBe(false);
  });

  it('rejects null / undefined / non-object payloads', () => {
    expect(isUsableDailyPuzzle(null)).toBe(false);
    expect(isUsableDailyPuzzle(undefined)).toBe(false);
    expect(isUsableDailyPuzzle('nope')).toBe(false);
  });
});
