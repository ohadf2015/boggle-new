import { describe, it, expect } from 'vitest';
import { celebrationTier } from '../celebrationTier';

describe('celebrationTier', () => {
  it('tier 0 for a weak round', () => {
    expect(celebrationTier({ scorePct: 40, isPersonalBest: false, beatRival: false, percentileToday: 30 })).toBe(0);
  });
  it('tier 1 for a decent round (>=50%)', () => {
    expect(celebrationTier({ scorePct: 60, isPersonalBest: false, beatRival: false, percentileToday: 50 })).toBe(1);
  });
  it('tier 2 for personal best', () => {
    expect(celebrationTier({ scorePct: 60, isPersonalBest: true, beatRival: false, percentileToday: 50 })).toBe(2);
  });
  it('tier 3 for beating the rival', () => {
    expect(celebrationTier({ scorePct: 60, isPersonalBest: true, beatRival: true, percentileToday: 50 })).toBe(3);
  });
  it('tier 4 for top-10% today', () => {
    expect(celebrationTier({ scorePct: 60, isPersonalBest: true, beatRival: true, percentileToday: 91 })).toBe(4);
  });
  it('top-10% wins even without personal best', () => {
    expect(celebrationTier({ scorePct: 95, isPersonalBest: false, beatRival: false, percentileToday: 99 })).toBe(4);
  });
});
