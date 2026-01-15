/**
 * Tests for Achievement Manager
 * Focuses on lifetime achievements that were previously impossible to earn
 */

import { checkLifetimeAchievements, LIFETIME_ACHIEVEMENT_THRESHOLDS, type UserStats } from '../achievementManager';

describe('checkLifetimeAchievements', () => {
  describe('games played achievements', () => {
    it('should award VETERAN at 50 games', () => {
      const stats: UserStats = { gamesPlayed: 50 };
      const newAchievements = checkLifetimeAchievements(stats, []);

      expect(newAchievements).toContainEqual(
        expect.objectContaining({ key: 'VETERAN' })
      );
    });

    it('should award CENTURION at 100 games', () => {
      const stats: UserStats = { gamesPlayed: 100 };
      const newAchievements = checkLifetimeAchievements(stats, []);

      expect(newAchievements).toContainEqual(
        expect.objectContaining({ key: 'CENTURION' })
      );
    });

    it('should not award VETERAN at 49 games', () => {
      const stats: UserStats = { gamesPlayed: 49 };
      const newAchievements = checkLifetimeAchievements(stats, []);

      expect(newAchievements).not.toContainEqual(
        expect.objectContaining({ key: 'VETERAN' })
      );
    });

    it('should award both VETERAN and CENTURION at 100 games if neither exists', () => {
      const stats: UserStats = { gamesPlayed: 100 };
      const newAchievements = checkLifetimeAchievements(stats, []);

      expect(newAchievements).toContainEqual(
        expect.objectContaining({ key: 'VETERAN' })
      );
      expect(newAchievements).toContainEqual(
        expect.objectContaining({ key: 'CENTURION' })
      );
    });
  });

  describe('words found achievements', () => {
    it('should award WORD_COLLECTOR at 1000 words', () => {
      const stats: UserStats = { totalWordsFound: 1000 };
      const newAchievements = checkLifetimeAchievements(stats, []);

      expect(newAchievements).toContainEqual(
        expect.objectContaining({ key: 'WORD_COLLECTOR' })
      );
    });

    it('should award WORD_HOARDER at 5000 words', () => {
      const stats: UserStats = { totalWordsFound: 5000 };
      const newAchievements = checkLifetimeAchievements(stats, []);

      expect(newAchievements).toContainEqual(
        expect.objectContaining({ key: 'WORD_HOARDER' })
      );
    });
  });

  describe('games won achievements', () => {
    it('should award CHAMPION at 25 wins', () => {
      const stats: UserStats = { gamesWon: 25 };
      const newAchievements = checkLifetimeAchievements(stats, []);

      expect(newAchievements).toContainEqual(
        expect.objectContaining({ key: 'CHAMPION' })
      );
    });

    it('should award LEGEND at 100 wins', () => {
      const stats: UserStats = { gamesWon: 100 };
      const newAchievements = checkLifetimeAchievements(stats, []);

      expect(newAchievements).toContainEqual(
        expect.objectContaining({ key: 'LEGEND' })
      );
    });
  });

  describe('total score achievements', () => {
    it('should award POINT_MASTER at 10000 points', () => {
      const stats: UserStats = { totalScore: 10000 };
      const newAchievements = checkLifetimeAchievements(stats, []);

      expect(newAchievements).toContainEqual(
        expect.objectContaining({ key: 'POINT_MASTER' })
      );
    });

    it('should award POINT_KING at 50000 points', () => {
      const stats: UserStats = { totalScore: 50000 };
      const newAchievements = checkLifetimeAchievements(stats, []);

      expect(newAchievements).toContainEqual(
        expect.objectContaining({ key: 'POINT_KING' })
      );
    });
  });

  describe('unique days played achievements', () => {
    it('should award DEDICATION at 7 unique days', () => {
      const stats: UserStats = { uniqueDaysPlayed: 7 };
      const newAchievements = checkLifetimeAchievements(stats, []);

      expect(newAchievements).toContainEqual(
        expect.objectContaining({ key: 'DEDICATION' })
      );
    });

    it('should award LOYAL_PLAYER at 30 unique days', () => {
      const stats: UserStats = { uniqueDaysPlayed: 30 };
      const newAchievements = checkLifetimeAchievements(stats, []);

      expect(newAchievements).toContainEqual(
        expect.objectContaining({ key: 'LOYAL_PLAYER' })
      );
    });

    it('should not award DEDICATION at 6 unique days', () => {
      const stats: UserStats = { uniqueDaysPlayed: 6 };
      const newAchievements = checkLifetimeAchievements(stats, []);

      expect(newAchievements).not.toContainEqual(
        expect.objectContaining({ key: 'DEDICATION' })
      );
    });
  });

  describe('existing achievements handling', () => {
    it('should not re-award achievements that already exist', () => {
      const stats: UserStats = { gamesPlayed: 100 };
      const existingAchievements = ['VETERAN', 'CENTURION'];
      const newAchievements = checkLifetimeAchievements(stats, existingAchievements);

      expect(newAchievements).toHaveLength(0);
    });

    it('should only award achievements not in existing list', () => {
      const stats: UserStats = { gamesPlayed: 100 };
      const existingAchievements = ['VETERAN'];
      const newAchievements = checkLifetimeAchievements(stats, existingAchievements);

      expect(newAchievements).toHaveLength(1);
      expect(newAchievements).toContainEqual(
        expect.objectContaining({ key: 'CENTURION' })
      );
    });
  });

  describe('multiple achievements at once', () => {
    it('should award multiple lifetime achievements when thresholds are met', () => {
      const stats: UserStats = {
        gamesPlayed: 100,
        gamesWon: 25,
        totalWordsFound: 1000,
        totalScore: 10000,
        uniqueDaysPlayed: 7,
      };
      const newAchievements = checkLifetimeAchievements(stats, []);

      // Should get VETERAN, CENTURION, CHAMPION, WORD_COLLECTOR, POINT_MASTER, DEDICATION
      expect(newAchievements.length).toBeGreaterThanOrEqual(6);
      expect(newAchievements).toContainEqual(
        expect.objectContaining({ key: 'VETERAN' })
      );
      expect(newAchievements).toContainEqual(
        expect.objectContaining({ key: 'CENTURION' })
      );
      expect(newAchievements).toContainEqual(
        expect.objectContaining({ key: 'CHAMPION' })
      );
      expect(newAchievements).toContainEqual(
        expect.objectContaining({ key: 'WORD_COLLECTOR' })
      );
      expect(newAchievements).toContainEqual(
        expect.objectContaining({ key: 'POINT_MASTER' })
      );
      expect(newAchievements).toContainEqual(
        expect.objectContaining({ key: 'DEDICATION' })
      );
    });
  });

  describe('achievement icons', () => {
    it('should include correct icons with achievements', () => {
      const stats: UserStats = { gamesPlayed: 50 };
      const newAchievements = checkLifetimeAchievements(stats, []);

      const veteran = newAchievements.find(a => a.key === 'VETERAN');
      expect(veteran?.icon).toBe('🎖️');
    });
  });
});

describe('LIFETIME_ACHIEVEMENT_THRESHOLDS', () => {
  it('should have correct thresholds for all lifetime achievements', () => {
    expect(LIFETIME_ACHIEVEMENT_THRESHOLDS.VETERAN).toEqual({
      stat: 'gamesPlayed',
      threshold: 50,
    });
    expect(LIFETIME_ACHIEVEMENT_THRESHOLDS.CENTURION).toEqual({
      stat: 'gamesPlayed',
      threshold: 100,
    });
    expect(LIFETIME_ACHIEVEMENT_THRESHOLDS.WORD_COLLECTOR).toEqual({
      stat: 'totalWordsFound',
      threshold: 1000,
    });
    expect(LIFETIME_ACHIEVEMENT_THRESHOLDS.WORD_HOARDER).toEqual({
      stat: 'totalWordsFound',
      threshold: 5000,
    });
    expect(LIFETIME_ACHIEVEMENT_THRESHOLDS.CHAMPION).toEqual({
      stat: 'gamesWon',
      threshold: 25,
    });
    expect(LIFETIME_ACHIEVEMENT_THRESHOLDS.LEGEND).toEqual({
      stat: 'gamesWon',
      threshold: 100,
    });
    expect(LIFETIME_ACHIEVEMENT_THRESHOLDS.POINT_MASTER).toEqual({
      stat: 'totalScore',
      threshold: 10000,
    });
    expect(LIFETIME_ACHIEVEMENT_THRESHOLDS.POINT_KING).toEqual({
      stat: 'totalScore',
      threshold: 50000,
    });
    expect(LIFETIME_ACHIEVEMENT_THRESHOLDS.DEDICATION).toEqual({
      stat: 'uniqueDaysPlayed',
      threshold: 7,
    });
    expect(LIFETIME_ACHIEVEMENT_THRESHOLDS.LOYAL_PLAYER).toEqual({
      stat: 'uniqueDaysPlayed',
      threshold: 30,
    });
  });
});
