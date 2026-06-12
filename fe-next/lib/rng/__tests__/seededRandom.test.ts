import { describe, it, expect } from 'vitest';
import { mulberry32, fnv1aHash } from '../seededRandom';

/**
 * Golden-value characterization tests.
 *
 * These lock the EXACT numeric output of the seeded PRNG + hash. Eleven copies of
 * mulberry32 and three copies of the FNV-1a hash were consolidated here; every one
 * seeds a deterministic daily puzzle / loot roll, so a single changed bit would make
 * two players on the same day get different games and break leaderboard integrity.
 *
 * The golden numbers were captured from the pre-consolidation production bodies.
 * If a refactor changes any of them, that is a behavior change — not a test to update.
 */
describe('mulberry32', () => {
  it('produces the canonical sequence for seed 1', () => {
    const rng = mulberry32(1);
    expect(rng()).toBeCloseTo(0.627073940588161, 15);
    expect(rng()).toBeCloseTo(0.002735721180215, 15);
    expect(rng()).toBeCloseTo(0.527447039959952, 15);
  });

  it('handles the 32-bit edge seed 0xFFFFFFFF', () => {
    expect(mulberry32(0xffffffff)()).toBeCloseTo(0.896422614110634, 15);
  });

  it('handles seed 0', () => {
    expect(mulberry32(0)()).toBeCloseTo(0.266429208684713, 15);
  });

  it('returns values in [0, 1)', () => {
    const rng = mulberry32(123456);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('is deterministic — same seed yields the same sequence', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});

describe('fnv1aHash', () => {
  it('hashes a date:locale seed to the canonical value', () => {
    expect(fnv1aHash('2026-06-12:en')).toBe(357423541);
  });

  it('returns the FNV-1a offset basis for the empty string', () => {
    expect(fnv1aHash('')).toBe(2166136261);
  });

  it('hashes "test" to the canonical value', () => {
    expect(fnv1aHash('test')).toBe(2949673445);
  });

  it('returns an unsigned 32-bit integer', () => {
    const h = fnv1aHash('any-string-here');
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
    expect(Number.isInteger(h)).toBe(true);
  });
});

describe('composition (daily-puzzle contract shape)', () => {
  it('mulberry32(fnv1aHash(seed)) reproduces the daily roll', () => {
    expect(mulberry32(fnv1aHash('2026-06-12:en'))()).toBeCloseTo(0.977067060768604, 15);
  });
});
