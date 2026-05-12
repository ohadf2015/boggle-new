import { describe, it, expect } from 'vitest';
import { seededPRNG, hashStringToSeed } from '../prng';

describe('seededPRNG', () => {
  it('same seed → same sequence', () => {
    const a = seededPRNG(12345), b = seededPRNG(12345);
    expect(a.intRange(100)).toBe(b.intRange(100));
    expect(a.next()).toBe(b.next());
  });
  it('intRange(n) returns 0..n-1', () => {
    const r = seededPRNG(42);
    for (let i = 0; i < 200; i++) {
      const v = r.intRange(7);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(7);
    }
  });
  it('chance(p) ~p over 10k draws', () => {
    const r = seededPRNG(99);
    let hits = 0;
    for (let i = 0; i < 10_000; i++) if (r.chance(0.3)) hits++;
    expect(hits).toBeGreaterThan(2700);
    expect(hits).toBeLessThan(3300);
  });
  it('pickN distinct', () => {
    const r = seededPRNG(7);
    const picks = r.pickN(['a','b','c','d','e'], 3);
    expect(new Set(picks).size).toBe(3);
  });
});

describe('hashStringToSeed', () => {
  it('deterministic', () => {
    expect(hashStringToSeed('user-1:chest-5')).toBe(hashStringToSeed('user-1:chest-5'));
  });
  it('returns 32-bit positive integer', () => {
    const s = hashStringToSeed('hello');
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(0xFFFFFFFF);
  });
});
