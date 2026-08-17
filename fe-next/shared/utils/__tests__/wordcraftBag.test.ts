import { describe, it, expect } from 'vitest';
import {
  createWordCraftBag,
  createWordCraftBoard,
  ENGLISH_TILE_DISTRIBUTION,
} from '../wordcraftBag';

/**
 * The seeded RNG used to end with `>>> 0`, which casts [0,1) to the integer 0.
 * Fisher-Yates then swapped every tile with index 0, so the bag came out in a
 * fixed order for every seed and three live matches in a row dealt the identical
 * rack (A _ Y X W V U — the tail of the alphabet). These tests fail if that
 * degeneracy ever comes back.
 */

const first7 = (seed: number) =>
  createWordCraftBag(seed)
    .slice(-7)
    .map((t) => t.letter)
    .join('');

describe('createWordCraftBag', () => {
  it('holds the full 100-tile English distribution', () => {
    const bag = createWordCraftBag(1);
    const expectedTotal = Object.values(ENGLISH_TILE_DISTRIBUTION).reduce((a, b) => a + b, 0);
    expect(bag).toHaveLength(expectedTotal);

    const counts = bag.reduce<Record<string, number>>((acc, t) => {
      acc[t.letter] = (acc[t.letter] ?? 0) + 1;
      return acc;
    }, {});
    expect(counts).toEqual(ENGLISH_TILE_DISTRIBUTION);
    expect(bag.filter((t) => t.isBlank)).toHaveLength(ENGLISH_TILE_DISTRIBUTION._);
  });

  it('deals different opening racks for different seeds', () => {
    const racks = new Set([1, 2, 3, 4, 5, 6, 7, 8].map(first7));
    // With a working shuffle these are almost surely all distinct; the broken
    // RNG made every one of them identical.
    expect(racks.size).toBeGreaterThan(4);
  });

  it('is deterministic for a given seed', () => {
    expect(first7(12345)).toBe(first7(12345));
  });

  it('does not deal the bag in construction order', () => {
    // Construction order is A×9, B×2, C×2 … so an unshuffled bag starts with A.
    const bag = createWordCraftBag(99);
    const opening = bag.slice(0, 12).map((t) => t.letter);
    expect(opening.every((l) => l === 'A')).toBe(false);
  });

  it('actually moves tiles around, not just to the front', () => {
    // The broken shuffle only ever swapped with index 0, leaving a signature
    // pattern: the tail stayed in construction order. Assert the last ten tiles
    // are not the last ten of the unshuffled bag.
    const shuffled = createWordCraftBag(7).map((t) => t.letter);
    const unshuffledTail = ['Y', 'Y', 'Z', '_', '_'];
    expect(shuffled.slice(-5)).not.toEqual(unshuffledTail);
  });
});

describe('createWordCraftBoard', () => {
  it('creates a square board of the requested size, all empty', () => {
    const board = createWordCraftBoard(13);
    expect(board).toHaveLength(13);
    expect(board.every((row) => row.length === 13)).toBe(true);
    expect(board.flat().every((cell) => cell === null)).toBe(true);
  });
});
