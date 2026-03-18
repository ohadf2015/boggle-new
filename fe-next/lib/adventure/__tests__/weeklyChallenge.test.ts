import {
  getCurrentWeekId,
  getTimeUntilReset,
  generateWeeklyGrid,
  getWeeklyChallengeConfig,
} from '../weeklyChallenge';

describe('weeklyChallenge', () => {
  describe('getCurrentWeekId', () => {
    it('returns YYYY-WNN format', () => {
      const weekId = getCurrentWeekId(new Date('2026-03-18T12:00:00Z'));
      expect(weekId).toMatch(/^\d{4}-W\d{2}$/);
    });

    it('returns same week ID for dates within same 7-day period', () => {
      const day1 = getCurrentWeekId(new Date('2026-03-18T00:00:00Z'));
      const day2 = getCurrentWeekId(new Date('2026-03-18T23:59:59Z'));
      // Same day, same week
      expect(day1).toBe(day2);
    });
  });

  describe('getTimeUntilReset', () => {
    it('returns positive milliseconds', () => {
      const ms = getTimeUntilReset(new Date('2026-03-18T12:00:00Z'));
      expect(ms).toBeGreaterThan(0);
    });

    it('returns ~7 days from Monday 00:00 UTC', () => {
      const monday = new Date('2026-03-16T00:00:01Z');
      const ms = getTimeUntilReset(monday);
      // Should be close to 7 days
      expect(ms).toBeGreaterThan(6 * 24 * 60 * 60 * 1000);
      expect(ms).toBeLessThan(7 * 24 * 60 * 60 * 1000);
    });
  });

  describe('generateWeeklyGrid', () => {
    it('returns a 5x5 grid of uppercase letters', () => {
      const grid = generateWeeklyGrid('2026-W11');
      expect(grid).toHaveLength(5);
      for (const row of grid) {
        expect(row).toHaveLength(5);
        for (const letter of row) {
          expect(letter).toMatch(/^[A-Z]$/);
        }
      }
    });

    it('is deterministic — same weekId produces same grid', () => {
      const grid1 = generateWeeklyGrid('2026-W11');
      const grid2 = generateWeeklyGrid('2026-W11');
      expect(grid1).toEqual(grid2);
    });

    it('different weeks produce different grids', () => {
      const grid1 = generateWeeklyGrid('2026-W11');
      const grid2 = generateWeeklyGrid('2026-W12');
      // Extremely unlikely to be identical
      expect(JSON.stringify(grid1)).not.toBe(JSON.stringify(grid2));
    });
  });

  describe('getWeeklyChallengeConfig', () => {
    it('returns complete config', () => {
      const config = getWeeklyChallengeConfig(new Date('2026-03-18'));
      expect(config.weekId).toBeTruthy();
      expect(config.grid).toHaveLength(5);
      expect(config.gridSize).toBe(5);
      expect(config.timerSeconds).toBe(120);
      expect(config.resetMs).toBeGreaterThan(0);
    });
  });
});
