/**
 * Player Stats Manager Tests
 *
 * Tests for centralized player statistics management
 */

import {
  getPlayerStats,
  getAllTimeBest,
  getModeStats,
  getModeBest,
  getConfigRecord,
  isNewHighScore,
  isNewAllTimeBest,
  recordGameResult,
  getAggregateStats,
  resetPlayerStats,
  savePlayerStats,
} from '../statsManager';
import { PLAYER_STATS_KEY, type PlayerStats, type RecordGameParams } from '../types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('statsManager', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('getPlayerStats', () => {
    it('should return default stats when no data exists', () => {
      const stats = getPlayerStats();

      expect(stats.allTimeBest).toBeNull();
      expect(stats.totalGames).toBe(0);
      expect(stats.totalHighScoreBeats).toBe(0);
      expect(stats.modes['solo-bots'].best).toBeNull();
      expect(stats.modes['practice'].best).toBeNull();
      expect(stats.modes['challenge'].best).toBeNull();
    });

    it('should load existing stats from localStorage', () => {
      const existingStats: PlayerStats = {
        allTimeBest: {
          score: 150,
          wordCount: 20,
          longestWord: 'testing',
          achievedAt: Date.now(),
          mode: 'solo-bots',
          difficulty: 'MEDIUM',
          durationSeconds: 120,
        },
        modes: {
          'solo-bots': {
            best: null,
            totalGames: 5,
            highScoreBeats: 2,
            configRecords: {},
          },
          'practice': {
            best: null,
            totalGames: 0,
            highScoreBeats: 0,
            configRecords: {},
          },
          'challenge': {
            best: null,
            totalGames: 0,
            highScoreBeats: 0,
            configRecords: {},
          },
        },
        totalGames: 5,
        totalHighScoreBeats: 2,
        version: 1,
      };

      localStorageMock.setItem(PLAYER_STATS_KEY, JSON.stringify(existingStats));

      const stats = getPlayerStats();

      expect(stats.allTimeBest?.score).toBe(150);
      expect(stats.totalGames).toBe(5);
    });

    it('should migrate from legacy highScoreManager format', () => {
      // Setup legacy data
      const legacyData = {
        scores: {
          'MEDIUM_120': {
            score: 200,
            wordCount: 25,
            longestWord: 'challenge',
            achievedAt: 1704067200000,
          },
        },
        allTimeBest: {
          score: 200,
          wordCount: 25,
          longestWord: 'challenge',
          achievedAt: 1704067200000,
        },
        totalGamesPlayed: 10,
        totalHighScoreBeats: 3,
      };

      localStorageMock.setItem('boggle_challenge_high_scores', JSON.stringify(legacyData));

      const stats = getPlayerStats();

      // Should have migrated challenge mode data
      expect(stats.modes.challenge.totalGames).toBe(10);
      expect(stats.modes.challenge.highScoreBeats).toBe(3);
      expect(stats.modes.challenge.configRecords['MEDIUM_120']?.score).toBe(200);
      expect(stats.allTimeBest?.score).toBe(200);
    });
  });

  describe('getAllTimeBest', () => {
    it('should return null when no games played', () => {
      expect(getAllTimeBest()).toBeNull();
    });

    it('should return the all-time best score', () => {
      // Record a game
      recordGameResult({
        mode: 'solo-bots',
        score: 150,
        wordCount: 20,
        longestWord: 'testing',
        difficulty: 'MEDIUM',
        durationSeconds: 120,
      });

      const best = getAllTimeBest();
      expect(best?.score).toBe(150);
      expect(best?.mode).toBe('solo-bots');
    });
  });

  describe('getModeStats', () => {
    it('should return stats for solo-bots mode', () => {
      recordGameResult({
        mode: 'solo-bots',
        score: 100,
        wordCount: 15,
        longestWord: 'test',
        difficulty: 'EASY',
        durationSeconds: 90,
      });

      const stats = getModeStats('solo-bots');
      expect(stats.totalGames).toBe(1);
      expect(stats.best?.score).toBe(100);
    });

    it('should return stats for practice mode', () => {
      recordGameResult({
        mode: 'practice',
        score: 80,
        wordCount: 10,
        longestWord: 'practice',
        difficulty: 'EASY',
        durationSeconds: 0,
      });

      const stats = getModeStats('practice');
      expect(stats.totalGames).toBe(1);
      expect(stats.best?.score).toBe(80);
    });

    it('should return stats for challenge mode', () => {
      recordGameResult({
        mode: 'challenge',
        score: 200,
        wordCount: 30,
        longestWord: 'challenge',
        difficulty: 'HARD',
        durationSeconds: 180,
      });

      const stats = getModeStats('challenge');
      expect(stats.totalGames).toBe(1);
      expect(stats.best?.score).toBe(200);
    });
  });

  describe('getModeBest', () => {
    it('should return the best score for a mode', () => {
      recordGameResult({
        mode: 'solo-bots',
        score: 100,
        wordCount: 10,
        longestWord: 'first',
        difficulty: 'MEDIUM',
        durationSeconds: 120,
      });

      recordGameResult({
        mode: 'solo-bots',
        score: 150,
        wordCount: 15,
        longestWord: 'second',
        difficulty: 'MEDIUM',
        durationSeconds: 120,
      });

      recordGameResult({
        mode: 'solo-bots',
        score: 120,
        wordCount: 12,
        longestWord: 'third',
        difficulty: 'MEDIUM',
        durationSeconds: 120,
      });

      const best = getModeBest('solo-bots');
      expect(best?.score).toBe(150);
      expect(best?.longestWord).toBe('second');
    });
  });

  describe('getConfigRecord', () => {
    it('should return record for specific configuration', () => {
      recordGameResult({
        mode: 'challenge',
        score: 180,
        wordCount: 25,
        longestWord: 'configuration',
        difficulty: 'HARD',
        durationSeconds: 180,
      });

      const record = getConfigRecord('challenge', 'HARD', 180);
      expect(record?.score).toBe(180);
      expect(record?.difficulty).toBe('HARD');
    });

    it('should return null for unplayed configuration', () => {
      const record = getConfigRecord('challenge', 'EASY', 60);
      expect(record).toBeNull();
    });
  });

  describe('isNewHighScore', () => {
    it('should return true for first game in configuration', () => {
      expect(isNewHighScore('solo-bots', 100, 'MEDIUM', 120)).toBe(true);
    });

    it('should return true when score beats current record', () => {
      recordGameResult({
        mode: 'solo-bots',
        score: 100,
        wordCount: 10,
        longestWord: 'test',
        difficulty: 'MEDIUM',
        durationSeconds: 120,
      });

      expect(isNewHighScore('solo-bots', 150, 'MEDIUM', 120)).toBe(true);
    });

    it('should return false when score is lower than current record', () => {
      recordGameResult({
        mode: 'solo-bots',
        score: 150,
        wordCount: 15,
        longestWord: 'test',
        difficulty: 'MEDIUM',
        durationSeconds: 120,
      });

      expect(isNewHighScore('solo-bots', 100, 'MEDIUM', 120)).toBe(false);
    });
  });

  describe('isNewAllTimeBest', () => {
    it('should return true for first game ever', () => {
      expect(isNewAllTimeBest(100)).toBe(true);
    });

    it('should return true when score beats all-time best', () => {
      recordGameResult({
        mode: 'solo-bots',
        score: 100,
        wordCount: 10,
        longestWord: 'test',
        difficulty: 'MEDIUM',
        durationSeconds: 120,
      });

      expect(isNewAllTimeBest(150)).toBe(true);
    });

    it('should return false when score is lower than all-time best', () => {
      recordGameResult({
        mode: 'challenge',
        score: 200,
        wordCount: 25,
        longestWord: 'test',
        difficulty: 'HARD',
        durationSeconds: 180,
      });

      expect(isNewAllTimeBest(150)).toBe(false);
    });
  });

  describe('recordGameResult', () => {
    it('should record first game and set as high score', () => {
      const result = recordGameResult({
        mode: 'solo-bots',
        score: 100,
        wordCount: 10,
        longestWord: 'first',
        difficulty: 'MEDIUM',
        durationSeconds: 120,
      });

      expect(result.isNewHighScore).toBe(true);
      expect(result.isNewAllTimeBest).toBe(true);
      expect(result.previousBest).toBeNull();
    });

    it('should update high score when beaten', () => {
      recordGameResult({
        mode: 'solo-bots',
        score: 100,
        wordCount: 10,
        longestWord: 'first',
        difficulty: 'MEDIUM',
        durationSeconds: 120,
      });

      const result = recordGameResult({
        mode: 'solo-bots',
        score: 150,
        wordCount: 15,
        longestWord: 'second',
        difficulty: 'MEDIUM',
        durationSeconds: 120,
      });

      expect(result.isNewHighScore).toBe(true);
      expect(result.previousBest).toBe(100);
    });

    it('should not update high score when not beaten', () => {
      recordGameResult({
        mode: 'solo-bots',
        score: 150,
        wordCount: 15,
        longestWord: 'first',
        difficulty: 'MEDIUM',
        durationSeconds: 120,
      });

      const result = recordGameResult({
        mode: 'solo-bots',
        score: 100,
        wordCount: 10,
        longestWord: 'second',
        difficulty: 'MEDIUM',
        durationSeconds: 120,
      });

      expect(result.isNewHighScore).toBe(false);
      expect(result.previousBest).toBe(150);
    });

    it('should track games across different modes independently', () => {
      recordGameResult({
        mode: 'solo-bots',
        score: 100,
        wordCount: 10,
        longestWord: 'bots',
        difficulty: 'MEDIUM',
        durationSeconds: 120,
      });

      recordGameResult({
        mode: 'practice',
        score: 80,
        wordCount: 8,
        longestWord: 'practice',
        difficulty: 'EASY',
        durationSeconds: 0,
      });

      recordGameResult({
        mode: 'challenge',
        score: 200,
        wordCount: 25,
        longestWord: 'challenge',
        difficulty: 'HARD',
        durationSeconds: 180,
      });

      expect(getModeStats('solo-bots').totalGames).toBe(1);
      expect(getModeStats('practice').totalGames).toBe(1);
      expect(getModeStats('challenge').totalGames).toBe(1);

      expect(getModeBest('solo-bots')?.score).toBe(100);
      expect(getModeBest('practice')?.score).toBe(80);
      expect(getModeBest('challenge')?.score).toBe(200);

      // All-time best should be from challenge mode
      expect(getAllTimeBest()?.score).toBe(200);
      expect(getAllTimeBest()?.mode).toBe('challenge');
    });

    it('should increment total games and high score beats correctly', () => {
      recordGameResult({
        mode: 'solo-bots',
        score: 100,
        wordCount: 10,
        longestWord: 'test',
        difficulty: 'MEDIUM',
        durationSeconds: 120,
      });

      recordGameResult({
        mode: 'solo-bots',
        score: 150,
        wordCount: 15,
        longestWord: 'test',
        difficulty: 'MEDIUM',
        durationSeconds: 120,
      });

      recordGameResult({
        mode: 'solo-bots',
        score: 120,
        wordCount: 12,
        longestWord: 'test',
        difficulty: 'MEDIUM',
        durationSeconds: 120,
      });

      const stats = getAggregateStats();
      expect(stats.totalGames).toBe(3);
      expect(stats.totalHighScoreBeats).toBe(2); // First game + beat it once
    });
  });

  describe('getAggregateStats', () => {
    it('should return correct aggregate statistics', () => {
      recordGameResult({
        mode: 'solo-bots',
        score: 100,
        wordCount: 10,
        longestWord: 'test',
        difficulty: 'MEDIUM',
        durationSeconds: 120,
      });

      recordGameResult({
        mode: 'challenge',
        score: 200,
        wordCount: 20,
        longestWord: 'test',
        difficulty: 'HARD',
        durationSeconds: 180,
      });

      recordGameResult({
        mode: 'challenge',
        score: 150,
        wordCount: 15,
        longestWord: 'test',
        difficulty: 'EASY',
        durationSeconds: 60,
      });

      const stats = getAggregateStats();
      expect(stats.totalGames).toBe(3);
      expect(stats.uniqueConfigurations).toBe(3);
    });
  });

  describe('resetPlayerStats', () => {
    it('should reset all statistics', () => {
      recordGameResult({
        mode: 'solo-bots',
        score: 100,
        wordCount: 10,
        longestWord: 'test',
        difficulty: 'MEDIUM',
        durationSeconds: 120,
      });

      resetPlayerStats();

      const stats = getPlayerStats();
      expect(stats.allTimeBest).toBeNull();
      expect(stats.totalGames).toBe(0);
      expect(stats.modes['solo-bots'].totalGames).toBe(0);
    });
  });
});
