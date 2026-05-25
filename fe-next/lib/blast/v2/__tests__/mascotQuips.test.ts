import { describe, it, expect } from 'vitest';
import { pickQuipKey } from '../fx/mascotQuips';

describe('pickQuipKey', () => {
  it('returns null for none/small tiers (no overlay text)', () => {
    expect(pickQuipKey('none', 1, 1)).toBeNull();
    expect(pickQuipKey('small', 2, 1)).toBeNull();
  });

  it('returns a big quip key for big tier', () => {
    const k = pickQuipKey('big', 3, 42);
    expect(k).not.toBeNull();
    expect(k).toMatch(/^blast\.quip\.big\.\d$/);
  });

  it('returns a mega quip key for mega tier', () => {
    const k = pickQuipKey('mega', 5, 42);
    expect(k).not.toBeNull();
    expect(k).toMatch(/^blast\.quip\.mega\.\d$/);
  });

  it('different chainDepths produce some variety inside one level', () => {
    const keys = new Set<string>();
    for (let d = 2; d < 8; d++) {
      const k = pickQuipKey('big', d, 7);
      if (k) keys.add(k);
    }
    expect(keys.size).toBeGreaterThanOrEqual(2);
  });

  it('deterministic for the same (tier, depth, salt)', () => {
    expect(pickQuipKey('mega', 5, 99)).toBe(pickQuipKey('mega', 5, 99));
  });
});
