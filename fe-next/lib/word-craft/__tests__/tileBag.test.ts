import { describe, it, expect } from 'vitest';
import {
  ENGLISH_TILE_VALUES,
  ENGLISH_TILE_DISTRIBUTION,
  TOTAL_TILES,
  RACK_SIZE,
  createBag,
  draw,
  remaining,
  swap,
  isEmpty,
} from '../tileBag';

describe('English tile constants', () => {
  it('rack size is 7', () => {
    expect(RACK_SIZE).toBe(7);
  });

  it('total tiles is 100', () => {
    expect(TOTAL_TILES).toBe(100);
  });

  it('distribution sums to 100', () => {
    const sum = Object.values(ENGLISH_TILE_DISTRIBUTION).reduce((a, b) => a + b, 0);
    expect(sum).toBe(100);
  });

  it('has 12 Es, 9 As, 9 Is, 8 Os, 6 Ns, 6 Rs, 6 Ts (canonical Butts distribution)', () => {
    expect(ENGLISH_TILE_DISTRIBUTION.E).toBe(12);
    expect(ENGLISH_TILE_DISTRIBUTION.A).toBe(9);
    expect(ENGLISH_TILE_DISTRIBUTION.I).toBe(9);
    expect(ENGLISH_TILE_DISTRIBUTION.O).toBe(8);
    expect(ENGLISH_TILE_DISTRIBUTION.N).toBe(6);
    expect(ENGLISH_TILE_DISTRIBUTION.R).toBe(6);
    expect(ENGLISH_TILE_DISTRIBUTION.T).toBe(6);
  });

  it('has exactly 1 Q, 1 J, 1 X, 1 Z, 1 K (rare letters)', () => {
    expect(ENGLISH_TILE_DISTRIBUTION.Q).toBe(1);
    expect(ENGLISH_TILE_DISTRIBUTION.J).toBe(1);
    expect(ENGLISH_TILE_DISTRIBUTION.X).toBe(1);
    expect(ENGLISH_TILE_DISTRIBUTION.Z).toBe(1);
    expect(ENGLISH_TILE_DISTRIBUTION.K).toBe(1);
  });

  it('has exactly 2 blanks', () => {
    expect(ENGLISH_TILE_DISTRIBUTION._).toBe(2);
  });

  it('Q and Z are worth 10 points', () => {
    expect(ENGLISH_TILE_VALUES.Q).toBe(10);
    expect(ENGLISH_TILE_VALUES.Z).toBe(10);
  });

  it('blank is worth 0 points', () => {
    expect(ENGLISH_TILE_VALUES._).toBe(0);
  });

  it('A, E, I, L, N, O, R, S, T, U are worth 1 each', () => {
    for (const l of ['A', 'E', 'I', 'L', 'N', 'O', 'R', 'S', 'T', 'U']) {
      expect(ENGLISH_TILE_VALUES[l]).toBe(1);
    }
  });
});

describe('createBag + draw', () => {
  it('createBag(seed=1) creates a 100-tile bag', () => {
    const bag = createBag({ seed: 1 });
    expect(remaining(bag)).toBe(100);
  });

  it('draw(7) returns 7 tiles and reduces bag to 93', () => {
    const bag = createBag({ seed: 1 });
    const tiles = draw(bag, 7);
    expect(tiles).toHaveLength(7);
    expect(remaining(bag)).toBe(93);
  });

  it('drawn tiles have id, letter, value, isBlank fields', () => {
    const bag = createBag({ seed: 1 });
    const [tile] = draw(bag, 1);
    expect(tile.id).toMatch(/^t-/);
    expect(typeof tile.letter).toBe('string');
    expect(typeof tile.value).toBe('number');
    expect(typeof tile.isBlank).toBe('boolean');
  });

  it('blank tiles have value 0 and isBlank=true', () => {
    const bag = createBag({ seed: 1 });
    const all = draw(bag, 100);
    const blanks = all.filter(t => t.isBlank);
    expect(blanks).toHaveLength(2);
    for (const b of blanks) {
      expect(b.value).toBe(0);
    }
  });

  it('same seed produces same draw order (deterministic)', () => {
    const a = createBag({ seed: 42 });
    const b = createBag({ seed: 42 });
    const drawA = draw(a, 10).map(t => t.letter).join('');
    const drawB = draw(b, 10).map(t => t.letter).join('');
    expect(drawA).toBe(drawB);
  });

  it('different seeds produce different draw orders (likely)', () => {
    const a = createBag({ seed: 1 });
    const b = createBag({ seed: 999 });
    const drawA = draw(a, 20).map(t => t.letter).join('');
    const drawB = draw(b, 20).map(t => t.letter).join('');
    expect(drawA).not.toBe(drawB);
  });

  it('drawing more than remaining returns only what is left', () => {
    const bag = createBag({ seed: 1 });
    draw(bag, 95);
    const last = draw(bag, 10);
    expect(last).toHaveLength(5);
    expect(isEmpty(bag)).toBe(true);
  });

  it('isEmpty reflects bag state', () => {
    const bag = createBag({ seed: 1 });
    expect(isEmpty(bag)).toBe(false);
    draw(bag, 100);
    expect(isEmpty(bag)).toBe(true);
  });
});

describe('swap', () => {
  it('returning 3 tiles to a 90-tile bag keeps bag at 90', () => {
    const bag = createBag({ seed: 7 });
    const original = draw(bag, 10);
    expect(remaining(bag)).toBe(90);
    const returned = original.slice(0, 3);
    const replacements = swap(bag, returned);
    expect(replacements).toHaveLength(3);
    expect(remaining(bag)).toBe(90);
  });

  it('canonical rule: cannot swap if bag has fewer than RACK_SIZE tiles', () => {
    const bag = createBag({ seed: 1 });
    draw(bag, 94); // bag has 6 tiles remaining (< RACK_SIZE)
    const dummyTiles = [
      { id: 't-x', letter: 'A', value: 1, isBlank: false },
    ];
    const result = swap(bag, dummyTiles);
    expect(result).toBeNull();
    expect(remaining(bag)).toBe(6);
  });

  it('swap allowed when bag has exactly RACK_SIZE tiles', () => {
    const bag = createBag({ seed: 1 });
    draw(bag, 93); // bag has 7 tiles remaining (== RACK_SIZE)
    const dummyTiles = [
      { id: 't-y', letter: 'A', value: 1, isBlank: false },
    ];
    const result = swap(bag, dummyTiles);
    expect(result).toHaveLength(1);
    expect(remaining(bag)).toBe(7);
  });
});
