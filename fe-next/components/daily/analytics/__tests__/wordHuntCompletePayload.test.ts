/**
 * buildDailyWordHuntCompletePayload — pure shape builder for the
 * `daily_word_hunt_complete` PostHog event. Kept pure so it's trivially
 * testable and reusable from any entry point that finishes a hunt.
 */

import { describe, it, expect } from 'vitest';
import { buildDailyWordHuntCompletePayload } from '../wordHuntCompletePayload';
import type { SurvivalGameResult } from '../../survival/types';

const baseResult: SurvivalGameResult = {
  solved: true,
  attemptsUsed: 2,
  targetWord: 'PLANET',
  attempts: [],
  wordsDiscovered: [
    { word: 'PLANE', timestamp: 100, lifeGained: 5, tokensGained: 1 },
    { word: 'LANE', timestamp: 200, lifeGained: 3, tokensGained: 0 },
    { word: 'NET', timestamp: 300, lifeGained: 2, tokensGained: 0 },
  ],
  lifeRemaining: 42,
  clueTokensEarned: 1,
  clueTokensSpent: 0,
  hintsUnlocked: 0,
  efficiencyScore: 87,
};

describe('buildDailyWordHuntCompletePayload', () => {
  it('produces the full event payload when the target was found', () => {
    const payload = buildDailyWordHuntCompletePayload({
      result: baseResult,
      puzzleNumber: 123,
      language: 'en',
      startedAt: 1_000,
      completedAt: 61_000,
      rescueMethod: null,
    });

    expect(payload).toEqual({
      score: 87,
      puzzleNumber: 123,
      wordCount: 3,
      targetWordFound: true,
      rescueUsed: false,
      rescueMethod: null,
      durationMs: 60_000,
      language: 'en',
    });
  });

  it('reports rescueUsed=true and the ad method when rescued via rewarded ad', () => {
    const payload = buildDailyWordHuntCompletePayload({
      result: { ...baseResult, solved: false },
      puzzleNumber: 9,
      language: 'he',
      startedAt: 0,
      completedAt: 5_000,
      rescueMethod: 'ad',
    });

    expect(payload.rescueUsed).toBe(true);
    expect(payload.rescueMethod).toBe('ad');
    expect(payload.targetWordFound).toBe(false);
    expect(payload.durationMs).toBe(5_000);
    expect(payload.language).toBe('he');
  });

  it('reports coin rescue method distinctly from ad', () => {
    const payload = buildDailyWordHuntCompletePayload({
      result: baseResult,
      puzzleNumber: 1,
      language: 'es',
      startedAt: 10,
      completedAt: 20,
      rescueMethod: 'coin',
    });

    expect(payload.rescueUsed).toBe(true);
    expect(payload.rescueMethod).toBe('coin');
  });

  it('clamps negative duration to 0 to guard against clock skew', () => {
    const payload = buildDailyWordHuntCompletePayload({
      result: baseResult,
      puzzleNumber: 1,
      language: 'en',
      startedAt: 100,
      completedAt: 50,
      rescueMethod: null,
    });

    expect(payload.durationMs).toBe(0);
  });

  it('handles an empty wordsDiscovered array without crashing', () => {
    const payload = buildDailyWordHuntCompletePayload({
      result: { ...baseResult, wordsDiscovered: [] },
      puzzleNumber: 1,
      language: 'sv',
      startedAt: 0,
      completedAt: 1_000,
      rescueMethod: null,
    });

    expect(payload.wordCount).toBe(0);
  });
});
