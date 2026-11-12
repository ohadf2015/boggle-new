import { describe, it, expect } from 'vitest';
import { createSeededRng } from '../rng';

describe('createSeededRng', () => {
  it('repeats the same sequence for the same seed', () => {
    const a = createSeededRng(42);
    const b = createSeededRng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('stays inside [0, 1)', () => {
    const rng = createSeededRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
