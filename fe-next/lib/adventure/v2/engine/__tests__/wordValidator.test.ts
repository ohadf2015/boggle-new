import { describe, it, expect } from 'vitest';
import { isValidWord, isComposableFromTiles } from '../wordValidator';
import type { Tile } from '../../types';

const T = (letter: string, id = 0): Tile => ({ id, letter, rarity: 'common', letterValue: 1 });

describe('isValidWord', () => {
  it('accepts known words case-insensitively', () => {
    expect(isValidWord('CAT')).toBe(true);
    expect(isValidWord('cat')).toBe(true);
    expect(isValidWord('STORM')).toBe(true);
  });

  it('rejects words shorter than 3 letters', () => {
    expect(isValidWord('CA')).toBe(false);
    expect(isValidWord('A')).toBe(false);
  });

  it('rejects gibberish', () => {
    expect(isValidWord('XQYZBLM')).toBe(false);
  });
});

describe('isComposableFromTiles', () => {
  it('returns true if every word letter has a matching tile', () => {
    const tiles = [T('C', 0), T('A', 1), T('T', 2)];
    expect(isComposableFromTiles('CAT', tiles)).toBe(true);
  });

  it('returns false if a letter is missing', () => {
    const tiles = [T('C', 0), T('A', 1)];
    expect(isComposableFromTiles('CAT', tiles)).toBe(false);
  });

  it('returns false if a duplicate letter is needed but not present twice', () => {
    const tiles = [T('B', 0), T('O', 1), T('K', 2)];
    expect(isComposableFromTiles('BOOK', tiles)).toBe(false);
  });

  it('returns true with duplicates available', () => {
    const tiles = [T('B', 0), T('O', 1), T('O', 2), T('K', 3)];
    expect(isComposableFromTiles('BOOK', tiles)).toBe(true);
  });
});
