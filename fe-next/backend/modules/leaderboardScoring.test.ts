/**
 * Tests for the leaderboard scoring policy — the single source of truth for
 * which modes award competitive (total_score) points and how heavily.
 *
 * Requirements under test:
 *  - Feature-gated modes (word-tower, shiritori) award ZERO leaderboard points.
 *  - Daily and multiplayer/casual play are weighted EQUALLY (1x): the leaderboard
 *    is the sum of raw earned points, so multiplayer counts as much per point as
 *    daily (daily still ranks high via its larger raw scores, not a multiplier).
 *  - XP is a separate track and is NOT governed by these functions.
 */
import { describe, it, expect } from 'vitest';
import {
  isGatedMode,
  isDailyMode,
  awardsLeaderboardPoints,
  leaderboardPointsForGame,
  DAILY_LEADERBOARD_WEIGHT,
  CASUAL_LEADERBOARD_WEIGHT,
} from './leaderboardScoring';

describe('leaderboardScoring policy', () => {
  describe('isGatedMode', () => {
    it('treats weight-0 modes (word-tower, shiritori) as gated', () => {
      expect(isGatedMode('word-tower')).toBe(true);
      expect(isGatedMode('shiritori')).toBe(true);
    });

    it('treats public rotation modes as not gated', () => {
      expect(isGatedMode('classic')).toBe(false);
      expect(isGatedMode('blast')).toBe(false);
      expect(isGatedMode('word-hunt')).toBe(false);
      expect(isGatedMode('wheel-rush')).toBe(false);
    });

    it('treats unknown / single-player mode strings as not gated', () => {
      expect(isGatedMode('daily-challenge')).toBe(false);
      expect(isGatedMode('solo-bots')).toBe(false);
      expect(isGatedMode(undefined)).toBe(false);
      expect(isGatedMode(null)).toBe(false);
    });
  });

  describe('isDailyMode', () => {
    it('recognizes daily mode aliases', () => {
      expect(isDailyMode('daily')).toBe(true);
      expect(isDailyMode('daily-challenge')).toBe(true);
    });
    it('rejects non-daily modes', () => {
      expect(isDailyMode('classic')).toBe(false);
      expect(isDailyMode('word-hunt')).toBe(false);
      expect(isDailyMode(null)).toBe(false);
    });
  });

  describe('awardsLeaderboardPoints', () => {
    it('is the inverse of isGatedMode', () => {
      expect(awardsLeaderboardPoints('word-tower')).toBe(false);
      expect(awardsLeaderboardPoints('classic')).toBe(true);
      expect(awardsLeaderboardPoints('daily-challenge')).toBe(true);
    });
  });

  describe('leaderboardPointsForGame', () => {
    it('awards ZERO for gated modes regardless of score', () => {
      expect(leaderboardPointsForGame('word-tower', 1000)).toBe(0);
      expect(leaderboardPointsForGame('shiritori', 500)).toBe(0);
    });

    it('weights daily and multiplayer equally — equal raw score yields equal points', () => {
      const daily = leaderboardPointsForGame('daily-challenge', 100);
      const casual = leaderboardPointsForGame('classic', 100);
      expect(daily).toBe(Math.round(100 * DAILY_LEADERBOARD_WEIGHT));
      expect(casual).toBe(Math.round(100 * CASUAL_LEADERBOARD_WEIGHT));
      // No multiplier favoritism: a multiplayer point is worth a daily point.
      expect(daily).toBe(casual);
      expect(casual).toBe(100);
    });

    it('applies the casual weight to all non-daily public modes', () => {
      for (const mode of ['classic', 'blast', 'word-hunt', 'wheel-rush', 'solo-bots']) {
        expect(leaderboardPointsForGame(mode, 80)).toBe(Math.round(80 * CASUAL_LEADERBOARD_WEIGHT));
      }
    });

    it('never returns negative or non-integer points', () => {
      expect(leaderboardPointsForGame('classic', -50)).toBe(0);
      expect(leaderboardPointsForGame('daily', 0)).toBe(0);
      expect(Number.isInteger(leaderboardPointsForGame('classic', 33))).toBe(true);
      expect(Number.isInteger(leaderboardPointsForGame('daily', 77))).toBe(true);
    });

    it('uses neutral (1x) weights so multiplayer counts as much as daily per point', () => {
      expect(DAILY_LEADERBOARD_WEIGHT).toBe(1);
      expect(CASUAL_LEADERBOARD_WEIGHT).toBe(1);
      expect(CASUAL_LEADERBOARD_WEIGHT).toBe(DAILY_LEADERBOARD_WEIGHT);
    });
  });
});
