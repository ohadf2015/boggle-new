import { describe, it, expect } from 'vitest';
import { dropFlavor, DROP_SOUND_KEYS } from '../dropFlavor';

describe('dropFlavor — a bit of random so no two landings feel identical', () => {
  it('is deterministic for a given seed (reproducible for daily integrity)', () => {
    const a = dropFlavor(12345, 'perfect');
    const b = dropFlavor(12345, 'perfect');
    expect(a).toEqual(b);
  });

  it('varies across drops (different seeds → not all identical)', () => {
    const keys = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) keys.add(dropFlavor(seed, 'good').soundKey);
    expect(keys.size).toBeGreaterThan(1);
  });

  it('always returns a known sound key', () => {
    for (let seed = 1; seed <= 60; seed++) {
      for (const q of ['perfect', 'good', 'sloppy', 'miss'] as const) {
        expect(DROP_SOUND_KEYS).toContain(dropFlavor(seed, q).soundKey);
      }
    }
  });

  it('keeps the bounce + sparkle bonus within satisfying bounds', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const f = dropFlavor(seed, 'perfect');
      expect(f.bounceScale).toBeGreaterThanOrEqual(0.8);
      expect(f.bounceScale).toBeLessThanOrEqual(1.3);
      expect(f.sparkleBonus).toBeGreaterThanOrEqual(0);
      expect(f.sparkleBonus).toBeLessThanOrEqual(6);
    }
  });

  it('a clean drop never picks the dull "miss" thud, and a miss never picks the bright crisp land', () => {
    for (let seed = 1; seed <= 60; seed++) {
      expect(dropFlavor(seed, 'perfect').soundKey).not.toBe('landDull');
      expect(dropFlavor(seed, 'miss').soundKey).not.toBe('landCrisp');
    }
  });
});
