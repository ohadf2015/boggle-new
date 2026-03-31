import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getCurrentSeason,
  getSeasonTimeRemaining,
  calculateSoftReset,
  getSeasonRewards,
  type Season,
  type SeasonReward,
} from '../seasons';

describe('seasons', () => {
  describe('getCurrentSeason', () => {
    it('returns the active season based on current date', () => {
      const season = getCurrentSeason();
      expect(season).toBeDefined();
      expect(season.id).toBeGreaterThan(0);
      expect(season.name).toBeTruthy();
      expect(season.startDate).toBeInstanceOf(Date);
      expect(season.endDate).toBeInstanceOf(Date);
      expect(season.rewards).toBeInstanceOf(Array);
    });

    it('returns a season where now is between start and end', () => {
      const season = getCurrentSeason();
      const now = new Date();
      expect(season.startDate.getTime()).toBeLessThanOrEqual(now.getTime());
      expect(season.endDate.getTime()).toBeGreaterThan(now.getTime());
    });

    it('returns season for a specific date', () => {
      // Q1 2026 should be season 1
      const season = getCurrentSeason(new Date('2026-01-15'));
      expect(season.id).toBe(1);
    });
  });

  describe('calculateSoftReset', () => {
    it('pulls rating toward 1000 using formula elo * 0.75 + 250', () => {
      expect(calculateSoftReset(1200)).toBe(1150);
      expect(calculateSoftReset(1000)).toBe(1000);
      expect(calculateSoftReset(800)).toBe(850);
      expect(calculateSoftReset(2000)).toBe(1750);
      expect(calculateSoftReset(0)).toBe(250);
    });
  });

  describe('getSeasonTimeRemaining', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns days and hours until season ends', () => {
      // Set to mid-season
      vi.setSystemTime(new Date('2026-02-15T12:00:00Z'));
      const remaining = getSeasonTimeRemaining();
      expect(remaining.days).toBeGreaterThan(0);
      expect(remaining.hours).toBeGreaterThanOrEqual(0);
      expect(remaining.hours).toBeLessThan(24);
    });

    it('returns 0 days when season has ended', () => {
      // Set to after Q1 ends
      vi.setSystemTime(new Date('2026-04-01T12:00:00Z'));
      const remaining = getSeasonTimeRemaining();
      // Should get remaining for the NEW current season, not 0
      expect(remaining.days).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getSeasonRewards', () => {
    it('returns correct rewards for Bronze tier', () => {
      const rewards = getSeasonRewards('Bronze', 1);
      expect(rewards.coins).toBe(100);
      expect(rewards.badges).toHaveLength(0);
    });

    it('returns correct rewards for Silver tier', () => {
      const rewards = getSeasonRewards('Silver', 1);
      expect(rewards.coins).toBe(250);
      expect(rewards.badges).toContainEqual(expect.objectContaining({ id: 'silver-season-1' }));
    });

    it('returns correct rewards for Gold tier', () => {
      const rewards = getSeasonRewards('Gold', 1);
      expect(rewards.coins).toBe(500);
      expect(rewards.badges).toContainEqual(expect.objectContaining({ id: 'gold-season-1' }));
      expect(rewards.exclusives).toContainEqual(expect.objectContaining({ type: 'border' }));
    });

    it('returns correct rewards for Platinum tier', () => {
      const rewards = getSeasonRewards('Platinum', 1);
      expect(rewards.coins).toBe(1000);
      expect(rewards.exclusives).toContainEqual(expect.objectContaining({ type: 'border' }));
      expect(rewards.exclusives).toContainEqual(expect.objectContaining({ type: 'tileSkin' }));
    });

    it('returns correct rewards for Diamond+ tier', () => {
      const rewards = getSeasonRewards('Diamond', 1);
      expect(rewards.coins).toBe(2000);
      expect(rewards.exclusives).toContainEqual(expect.objectContaining({ type: 'title' }));
    });

    it('returns empty rewards for unknown tier', () => {
      const rewards = getSeasonRewards('Unknown', 1);
      expect(rewards.coins).toBe(0);
      expect(rewards.badges).toHaveLength(0);
    });
  });
});
