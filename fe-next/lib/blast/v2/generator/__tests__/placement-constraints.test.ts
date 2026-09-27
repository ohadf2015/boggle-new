import { describe, it, expect } from 'vitest';
import { placeWords } from '../placement';
import { seededPRNG } from '../../prng';

describe('placeWords with placement constraints', () => {
  it('firstWordRowZero=true places the first (longest) word horizontally on row 0', () => {
    // Try a few seeds; the constraint must hold across them.
    for (let seed = 1; seed <= 20; seed++) {
      const prng = seededPRNG(seed);
      const result = placeWords(
        ['CAT', 'DOG', 'PIG'],
        { cols: 4, maxHeight: 3, firstWordRowZero: true },
        prng,
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        // Longest word is the first placement (length 3 — all same, so the
        // first in the sorted array). Whatever lands first must be H on r=0.
        const first = result.placements[0]!;
        expect(first.axis).toBe('H');
        expect(first.cells.every((c) => c.row === 0)).toBe(true);
      }
    }
  });

  it('firstWordRowZero=false allows non-zero rows for the first word', () => {
    let sawNonZero = false;
    for (let seed = 1; seed <= 50 && !sawNonZero; seed++) {
      const prng = seededPRNG(seed);
      const result = placeWords(
        ['CAT', 'DOG', 'PIG'],
        { cols: 4, maxHeight: 4, firstWordRowZero: false },
        prng,
      );
      if (result.ok && result.placements[0]!.cells.some((c) => c.row !== 0)) {
        sawNonZero = true;
      }
    }
    expect(sawNonZero).toBe(true);
  });

  it('requireVerticalWord=true guarantees at least one V placement', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const prng = seededPRNG(seed);
      const result = placeWords(
        ['CAT', 'DOG', 'BIRD'],
        { cols: 5, maxHeight: 5, requireVerticalWord: true },
        prng,
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        const hasVertical = result.placements.some((p) => p.axis === 'V');
        expect(hasVertical).toBe(true);
      }
    }
  });

  it('returns ok:false if requireVerticalWord cannot be satisfied (no room)', () => {
    // 1 column tall enough for vertical: only 1 column → no room for V if first word also vertical conflicts.
    // Use cols=1 maxHeight=2 with 3-letter words → vertical impossible.
    const prng = seededPRNG(1);
    const result = placeWords(
      ['CAT'],
      { cols: 1, maxHeight: 2, requireVerticalWord: true },
      prng,
    );
    expect(result.ok).toBe(false);
  });
});
