import { describe, it, expect } from 'vitest';
import { calculateGameXp } from '@/backend/modules/xpManager';
import { guestXpEstimate, xpFromResponse } from '../resultsXp';

describe('xpFromResponse', () => {
  it('reads the record-game shape', () => {
    expect(xpFromResponse({ xpEarned: 30, newTotalXp: 1200 })).toEqual({ gained: 30, total: 1200 });
  });

  it('reads the blast shape with its totalXp', () => {
    expect(xpFromResponse({ xpAwarded: 12, totalXp: 300 })).toEqual({ gained: 12, total: 300 });
  });

  it('keeps a missing total as null', () => {
    expect(xpFromResponse({ xpAwarded: 12 })).toEqual({ gained: 12, total: null });
  });

  it('returns null when the response carried no XP', () => {
    expect(xpFromResponse({ success: true })).toBeNull();
    expect(xpFromResponse(null)).toBeNull();
    expect(xpFromResponse({ xpEarned: 'x' })).toBeNull();
  });
});

describe('guestXpEstimate', () => {
  it('matches the solo XP formula for the same score', () => {
    expect(guestXpEstimate(240, 1)).toEqual({ gained: calculateGameXp({ score: 240, achievementCount: 1, playerCount: 1 }).totalXp });
  });
});
