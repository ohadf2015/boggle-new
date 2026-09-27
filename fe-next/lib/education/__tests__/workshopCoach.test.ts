import { describe, it, expect } from 'vitest';
import { claimWorkshopGuide, WORKSHOP_GUIDE_KEY } from '../workshopCoach';

function memory(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: () => null,
    get length() { return m.size; },
  };
}

describe('claimWorkshopGuide', () => {
  it('GIVEN a first match THEN the guide shows and the marker is written at show time', () => {
    const s = memory();
    expect(claimWorkshopGuide(s)).toBe(true);
    expect(s.getItem(WORKSHOP_GUIDE_KEY)).not.toBeNull();
  });

  it('GIVEN the guide was shown before (even without a dismiss) THEN it never shows again', () => {
    const s = memory();
    claimWorkshopGuide(s);
    expect(claimWorkshopGuide(s)).toBe(false);
  });

  it('GIVEN storage throws (private mode) THEN the guide shows (safe default) without crashing', () => {
    const broken = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); } } as unknown as Storage;
    expect(claimWorkshopGuide(broken)).toBe(true);
    expect(claimWorkshopGuide(null)).toBe(true);
  });
});
