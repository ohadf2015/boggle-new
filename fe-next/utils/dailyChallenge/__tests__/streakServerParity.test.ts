import { describe, it, expect, vi, beforeEach } from 'vitest';

const updateDailyStreak = vi.fn(() => ({ currentStreak: 5, longestStreak: 5, lastPlayedDate: 'x', totalDailiesCompleted: 5 }));
const getDailyStreak = vi.fn(() => ({ currentStreak: 4, longestStreak: 4, lastPlayedDate: 'y', totalDailiesCompleted: 4 }));
vi.mock('../streaks', () => ({ updateDailyStreak: () => updateDailyStreak(), getDailyStreak: () => getDailyStreak() }));

import { saveWordHuntResult } from '../storage';
import { countsTowardWheelStreak } from '../wordWheelRun';
import type { WordHuntResult } from '../types';

const hunt = (over: Partial<WordHuntResult> = {}) => ({
  puzzleNumber: 1, puzzleDate: '2026-11-05', language: 'en', solved: true, attemptsUsed: 3,
  ...over,
}) as WordHuntResult;

beforeEach(() => { localStorage.clear(); updateDailyStreak.mockClear(); });

describe('local streak counts what the server counts', () => {
  it('a solved Hunt advances the streak', () => {
    expect(saveWordHuntResult(hunt()).currentStreak).toBe(5);
    expect(updateDailyStreak).toHaveBeenCalledTimes(1);
  });

  it('a lost Hunt does not advance it, and returns the current streak', () => {
    expect(saveWordHuntResult(hunt({ solved: false })).currentStreak).toBe(4);
    expect(updateDailyStreak).not.toHaveBeenCalled();
  });

  it('a catch-up Hunt does not advance it', () => {
    saveWordHuntResult(hunt({ isCatchup: true }));
    expect(updateDailyStreak).not.toHaveBeenCalled();
  });

  it('Wheel counts only with at least one word and not on catch-up', () => {
    expect(countsTowardWheelStreak({ wordCount: 2, isCatchup: false })).toBe(true);
    expect(countsTowardWheelStreak({ wordCount: 0, isCatchup: false })).toBe(false);
    expect(countsTowardWheelStreak({ wordCount: 3, isCatchup: true })).toBe(false);
  });
});
