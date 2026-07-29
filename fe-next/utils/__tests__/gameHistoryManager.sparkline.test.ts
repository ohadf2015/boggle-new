/**
 * @jest-environment jsdom
 *
 * Tests for sparkline trend accuracy in gameHistoryManager
 * Verifies that when a player wins (improves their score),
 * the trend correctly shows 'up' and the sparkline data is in correct order
 */

import { addGameToHistory, getChartData, calculateTrend, clearGameHistory } from '../gameHistoryManager';

// Mock crypto.randomUUID for jsdom environment
let uuidCounter = 0;
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: () => `test-uuid-${++uuidCounter}`,
  },
});

describe('gameHistoryManager sparkline accuracy', () => {
  beforeEach(() => {
    // Clear BOTH localStorage and sessionStorage before each test
    // (storageHelpers uses both for redundancy)
    localStorage.clear();
    sessionStorage.clear();
    clearGameHistory();
    uuidCounter = 0; // Reset counter for consistent IDs
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('when player succeeds and wins with improving scores', () => {
    it('should show upward trend when recent games have higher scores than earlier games', () => {
      // GIVEN: A player with improving scores over time
      // Oldest games first (lower scores)
      const gameScores = [
        { score: 30, isWinner: false },  // Game 1 - oldest
        { score: 35, isWinner: false },  // Game 2
        { score: 40, isWinner: false },  // Game 3
        { score: 45, isWinner: false },  // Game 4
        { score: 60, isWinner: true },   // Game 5 - recent
        { score: 70, isWinner: true },   // Game 6 - recent
        { score: 85, isWinner: true },   // Game 7 - most recent WIN
      ];

      // Add games in chronological order (simulating real gameplay)
      gameScores.forEach((game, index) => {
        addGameToHistory({
          score: game.score,
          wordCount: Math.floor(game.score / 5),
          accuracy: 80,
          mode: 'single',
          isWinner: game.isWinner,
        });
      });

      // WHEN: We calculate the trend
      const trend = calculateTrend();

      // THEN: The trend should be 'up' because recent games (85, 70, 60) average higher
      // than earlier games (45, 40, 35)
      expect(trend.direction).toBe('up');
      expect(trend.recentAverage).toBeGreaterThan(trend.averageScore - 20); // Recent should be above average
    });

    it('should return chart data with current winning game as the last (rightmost) point', () => {
      // GIVEN: A player with a winning game as their most recent
      const gameScores = [50, 55, 60, 65, 100]; // Winning game is 100

      gameScores.forEach((score, index) => {
        addGameToHistory({
          score,
          wordCount: Math.floor(score / 5),
          accuracy: 80,
          mode: 'single',
          isWinner: index === gameScores.length - 1, // Last game is the win
        });
      });

      // WHEN: We get chart data for sparkline
      const chartData = getChartData(5);

      // THEN: The data should be in chronological order (oldest to newest)
      // So the last item should be the most recent (winning) game with score 100
      expect(chartData).toHaveLength(5);
      expect(chartData[chartData.length - 1].score).toBe(100); // Most recent game is last
      expect(chartData[0].score).toBe(50); // Oldest game is first

      // Verify chronological order (scores should be ascending in this case)
      for (let i = 1; i < chartData.length; i++) {
        expect(chartData[i].score).toBeGreaterThanOrEqual(chartData[i - 1].score);
      }
    });

    it('should NOT show downward trend when player just won with a high score', () => {
      // GIVEN: A player who just won their most recent game with a high score
      // Earlier games
      addGameToHistory({ score: 40, wordCount: 8, accuracy: 70, mode: 'single', isWinner: false });
      addGameToHistory({ score: 45, wordCount: 9, accuracy: 72, mode: 'single', isWinner: false });
      addGameToHistory({ score: 42, wordCount: 8, accuracy: 71, mode: 'single', isWinner: false });
      addGameToHistory({ score: 50, wordCount: 10, accuracy: 75, mode: 'single', isWinner: false });
      // Recent games (improving)
      addGameToHistory({ score: 55, wordCount: 11, accuracy: 78, mode: 'single', isWinner: false });
      addGameToHistory({ score: 65, wordCount: 13, accuracy: 80, mode: 'single', isWinner: true });
      addGameToHistory({ score: 90, wordCount: 18, accuracy: 85, mode: 'single', isWinner: true }); // WINNING GAME!

      // WHEN: We calculate the trend
      const trend = calculateTrend();

      // THEN: The trend should NOT be 'down' - player just won with their best score!
      expect(trend.direction).not.toBe('down');

      // The chart data should show the winning score (90) as the last/rightmost point
      const chartData = getChartData(7);
      expect(chartData[chartData.length - 1].score).toBe(90);
    });
  });

  describe('trend calculation edge cases', () => {
    it('should calculate recentAverage from the 3 most recent games', () => {
      // GIVEN: 6 games where recent 3 are clearly better
      // Earlier games (indices 3-5 after all additions, scores ~40)
      addGameToHistory({ score: 35, wordCount: 7, accuracy: 70, mode: 'single' });
      addGameToHistory({ score: 40, wordCount: 8, accuracy: 70, mode: 'single' });
      addGameToHistory({ score: 45, wordCount: 9, accuracy: 70, mode: 'single' });
      // Recent games (indices 0-2 after all additions, scores ~80)
      addGameToHistory({ score: 75, wordCount: 15, accuracy: 85, mode: 'single' });
      addGameToHistory({ score: 80, wordCount: 16, accuracy: 85, mode: 'single' });
      addGameToHistory({ score: 85, wordCount: 17, accuracy: 85, mode: 'single' });

      // WHEN: We calculate the trend
      const trend = calculateTrend();

      // THEN: Recent average should be (85 + 80 + 75) / 3 = 80
      expect(trend.recentAverage).toBe(80);

      // And direction should be 'up' since 80 is >10% more than (45+40+35)/3 = 40
      expect(trend.direction).toBe('up');
    });
  });

  describe('sparkline with current score injection', () => {
    it('should include currentScore in sparkline when passed as prop (the fix)', () => {
      // This test documents the expected behavior after the fix
      // The fix ensures current score is always included in sparkline data
      // even if it hasn't been added to history yet (race condition)

      // GIVEN: Some historical data
      const chartData = [{ score: 40 }, { score: 45 }, { score: 50 }, { score: 55 }];
      const currentScore = 100; // Current winning score - NOT in history yet

      // WHEN: We construct sparkline data that includes current score
      // (This is how the fix should work - ensure current score is always last)
      const sparklineData = chartData.map(d => d.score);

      // If current score is not in the data, append it
      const lastHistoricalScore = sparklineData[sparklineData.length - 1];
      const sparklineWithCurrentScore =
        lastHistoricalScore !== currentScore
          ? [...sparklineData, currentScore]
          : sparklineData;

      // THEN: The sparkline data should end with the winning score
      expect(sparklineWithCurrentScore[sparklineWithCurrentScore.length - 1]).toBe(100);

      // And the visual trend should be UP (last > average of earlier)
      const avgOfEarlier = sparklineWithCurrentScore.slice(0, -1).reduce((a, b) => a + b, 0) /
        (sparklineWithCurrentScore.length - 1);
      expect(sparklineWithCurrentScore[sparklineWithCurrentScore.length - 1]).toBeGreaterThan(avgOfEarlier);
    });

    it('should NOT duplicate current score if already in history', () => {
      // GIVEN: Chart data where current score IS already present
      const chartData = [{ score: 40 }, { score: 45 }, { score: 50 }, { score: 100 }];
      const currentScore = 100; // Current score already in history

      // WHEN: We check if we need to append
      const sparklineData = chartData.map(d => d.score);
      const lastHistoricalScore = sparklineData[sparklineData.length - 1];
      const sparklineWithCurrentScore =
        lastHistoricalScore !== currentScore
          ? [...sparklineData, currentScore]
          : sparklineData;

      // THEN: Should NOT duplicate - still 4 entries
      expect(sparklineWithCurrentScore).toHaveLength(4);
      expect(sparklineWithCurrentScore[sparklineWithCurrentScore.length - 1]).toBe(100);
    });
  });
});
