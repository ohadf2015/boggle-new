/**
 * Tests for hasEverPlayedWordHunt + getPastWordHuntPerformance —
 * power the daily-results "vs your past" comparison and the
 * returning-player intro-carousel skip.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { hasEverPlayedWordHunt, getPastWordHuntPerformance, hasEverPlayedWordWheel } from '../storage';
import { WORD_HUNT_STORAGE_KEY, getWordWheelResultKey } from '../constants';
import type { StoredWordHuntResult } from '../types';

function storeResult(date: string, efficiencyScore: number, language = 'en'): void {
  const stored: StoredWordHuntResult = {
    date,
    puzzleNumber: 1,
    result: {
      puzzleNumber: 1,
      puzzleDate: date,
      language: language as StoredWordHuntResult['result']['language'],
      solved: true,
      attemptsUsed: 3,
      targetWord: 'brave',
      attempts: [],
      wordsDiscovered: [],
      lifeRemaining: 60,
      clueTokensEarned: 0,
      clueTokensSpent: 0,
      hintsUnlocked: 0,
      efficiencyScore,
      streakDays: 1,
      completedAt: `${date}T12:00:00Z`,
    },
    completedAt: `${date}T12:00:00Z`,
    submittedToServer: true,
  };
  localStorage.setItem(`${WORD_HUNT_STORAGE_KEY}_${language}_${date}`, JSON.stringify(stored));
}

describe('hasEverPlayedWordHunt', () => {
  beforeEach(() => localStorage.clear());

  it('returns false when no results are stored', () => {
    expect(hasEverPlayedWordHunt('en')).toBe(false);
  });

  it('returns true once a result exists for that language', () => {
    storeResult('2026-07-01', 500);
    expect(hasEverPlayedWordHunt('en')).toBe(true);
  });

  it('is scoped per language', () => {
    storeResult('2026-07-01', 500, 'en');
    expect(hasEverPlayedWordHunt('he')).toBe(false);
  });
});

describe('getPastWordHuntPerformance', () => {
  beforeEach(() => localStorage.clear());

  it('returns null when there is no prior history', () => {
    expect(getPastWordHuntPerformance('en', '2026-07-15')).toBeNull();
  });

  it('excludes the current puzzle date and computes best/avg from the rest', () => {
    storeResult('2026-07-13', 200);
    storeResult('2026-07-14', 400);
    storeResult('2026-07-15', 999); // today — excluded

    expect(getPastWordHuntPerformance('en', '2026-07-15')).toEqual({
      bestScore: 400,
      avgScore: 300,
      playCount: 2,
    });
  });

  it('is scoped per language', () => {
    storeResult('2026-07-13', 200, 'he');
    expect(getPastWordHuntPerformance('en', '2026-07-15')).toBeNull();
  });
});

describe('hasEverPlayedWordWheel', () => {
  beforeEach(() => localStorage.clear());

  it('returns false when no results are stored', () => {
    expect(hasEverPlayedWordWheel('en')).toBe(false);
  });

  it('returns true once a result exists for that language', () => {
    localStorage.setItem(getWordWheelResultKey('en', '2026-07-01'), JSON.stringify({ date: '2026-07-01' }));
    expect(hasEverPlayedWordWheel('en')).toBe(true);
  });

  it('is scoped per language', () => {
    localStorage.setItem(getWordWheelResultKey('en', '2026-07-01'), JSON.stringify({ date: '2026-07-01' }));
    expect(hasEverPlayedWordWheel('he')).toBe(false);
  });
});
