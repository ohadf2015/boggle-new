/**
 * Tests for seeded PRNG determinism in blast letter generation.
 * Covers createSeededRandom, generateBlastLetter(rng), and rollSpecialType(rng).
 */

import {
  createSeededRandom,
  generateBlastLetter,
  rollSpecialType,
} from '../blastLetterGenerator';

describe('createSeededRandom', () => {
  it('produces identical sequences for the same seed on two separate calls', () => {
    const rng1 = createSeededRandom(42);
    const rng2 = createSeededRandom(42);

    const seq1 = Array.from({ length: 20 }, () => rng1());
    const seq2 = Array.from({ length: 20 }, () => rng2());

    expect(seq1).toEqual(seq2);
  });

  it('produces different sequences for different seeds', () => {
    const rng1 = createSeededRandom(1);
    const rng2 = createSeededRandom(9999);

    const seq1 = Array.from({ length: 10 }, () => rng1());
    const seq2 = Array.from({ length: 10 }, () => rng2());

    expect(seq1).not.toEqual(seq2);
  });

  it('always returns values in the range [0, 1)', () => {
    const rng = createSeededRandom(12345);
    for (let i = 0; i < 1000; i++) {
      const val = rng();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('state advances between calls — each call returns a new value', () => {
    const rng = createSeededRandom(7);
    const a = rng();
    const b = rng();
    // Not guaranteed to differ every call for every seed, but for seed=7 they should
    // (this verifies state mutation rather than returning the same value always)
    expect(typeof a).toBe('number');
    expect(typeof b).toBe('number');
    // The sequence should advance (at least a few consecutive values must differ)
    const seq = Array.from({ length: 5 }, () => rng());
    const allSame = seq.every(v => v === seq[0]);
    expect(allSame).toBe(false);
  });
});

describe('generateBlastLetter with custom rng', () => {
  it('returns a deterministic letter when rng is supplied with same seed', () => {
    const rng1 = createSeededRandom(100);
    const rng2 = createSeededRandom(100);

    const letter1 = generateBlastLetter('en', 1.0, rng1);
    const letter2 = generateBlastLetter('en', 1.0, rng2);

    expect(letter1).toBe(letter2);
  });

  it('produces different letters for different seeds (probabilistically)', () => {
    // Generate 10 letters with each seed and expect at least one difference
    const letters1 = Array.from({ length: 10 }, () => generateBlastLetter('en', 1.0, createSeededRandom(1)));
    const letters2 = Array.from({ length: 10 }, () => generateBlastLetter('en', 1.0, createSeededRandom(9999)));

    // It's astronomically unlikely for two different seeds to produce identical 10-letter sequences
    expect(letters1.join('')).not.toBe(letters2.join(''));
  });

  it('works without rng param (backward compat — uses Math.random)', () => {
    // Should not throw and should return a string
    const letter = generateBlastLetter('en');
    expect(typeof letter).toBe('string');
    expect(letter.length).toBeGreaterThan(0);
  });

  it('works with explicit vowelModifier and no rng (backward compat)', () => {
    const letter = generateBlastLetter('he', 0.5);
    expect(typeof letter).toBe('string');
    expect(letter.length).toBeGreaterThan(0);
  });
});

describe('rollSpecialType with custom rng', () => {
  it('returns deterministic tile type for same seed', () => {
    const rng1 = createSeededRandom(200);
    const rng2 = createSeededRandom(200);

    const type1 = rollSpecialType(0.9, undefined, 0, rng1);
    const type2 = rollSpecialType(0.9, undefined, 0, rng2);

    expect(type1).toBe(type2);
  });

  it('returns deterministic sequence of types for same seed', () => {
    const rng1 = createSeededRandom(300);
    const rng2 = createSeededRandom(300);

    const types1 = Array.from({ length: 5 }, () => rollSpecialType(0.9, undefined, 0, rng1));
    const types2 = Array.from({ length: 5 }, () => rollSpecialType(0.9, undefined, 0, rng2));

    expect(types1).toEqual(types2);
  });

  it('works without rng param (backward compat — uses Math.random)', () => {
    // Should not throw
    const type = rollSpecialType(0.3);
    expect(typeof type).toBe('string');
  });

  it('works with existing 3-param signature (backward compat)', () => {
    // Existing callers: rollSpecialType(chance, dist, modifier)
    const type = rollSpecialType(0.5, undefined, 0.1);
    expect(typeof type).toBe('string');
  });

  it('always returns standard when rng produces value >= effectiveChance', () => {
    // Controlled rng: always returns 0.99
    const alwaysHigh = () => 0.99;
    const type = rollSpecialType(0.5, undefined, 0, alwaysHigh);
    expect(type).toBe('standard');
  });

  it('returns a special type when rng produces low values', () => {
    // Controlled rng: always returns 0.0
    const alwaysLow = () => 0.0;
    const type = rollSpecialType(0.9, undefined, 0, alwaysLow);
    expect(type).not.toBe('standard');
  });
});
