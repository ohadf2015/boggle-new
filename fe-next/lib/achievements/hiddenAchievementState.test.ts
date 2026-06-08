/**
 * Test: hidden-achievement dedup state (one-time earn flags, SSR/quota safe).
 */

import { hasEarned, markEarned, getEarnedIds } from './hiddenAchievementState';

describe('hiddenAchievementState', () => {
  beforeEach(() => localStorage.clear());

  it('is not earned until marked', () => {
    expect(hasEarned('board_sweep')).toBe(false);
    markEarned('board_sweep');
    expect(hasEarned('board_sweep')).toBe(true);
  });

  it('markEarned returns true the first time and false thereafter', () => {
    expect(markEarned('palindrome')).toBe(true);
    expect(markEarned('palindrome')).toBe(false);
  });

  it('getEarnedIds returns only earned ids', () => {
    markEarned('speed_demon');
    markEarned('triple_threat');
    expect(getEarnedIds().sort()).toEqual(['speed_demon', 'triple_threat']);
  });

  it('getEarnedIds is empty initially', () => {
    expect(getEarnedIds()).toEqual([]);
  });
});
