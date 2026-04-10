/**
 * Bot Score Cap Tests
 *
 * Verifies percentage-based score capping: bots target a % of best human score
 * per difficulty level, with initial ceilings before any human scores.
 */

import { vi, type Mock, type MockInstance } from 'vitest';
import {
  getBestHumanScore,
  shouldBotScore,
  markBotScoringStart,
  clearBotScoringStart,
} from '../botGame';

// Mock gameStateManager
vi.mock('../../../modules/gameStateManager', () => ({
  getLeaderboard: vi.fn(),
  addPlayerWord: vi.fn(),
  updatePlayerScore: vi.fn(),
  trackBotWord: vi.fn(),
  getGame: vi.fn(),
  recordFirstFinder: vi.fn(),
}));

// Mock botManager
vi.mock('../../../modules/botManager', () => ({
  getGameBots: vi.fn(() => []),
  startBot: vi.fn(),
  isBot: vi.fn(),
}));

// Mock socketHelpers
vi.mock('../../../utils/socketHelpers', () => ({
  broadcastToRoom: vi.fn(),
  volatileBroadcastToRoom: vi.fn(),
  getGameRoom: vi.fn((code: string) => `room:${code}`),
}));

// Mock logger
vi.mock('../../../utils/logger', () => ({ default: {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
} }));

// Mock botWordHunt
vi.mock('../botWordHunt', () => ({
  startBotsForWordHunt: vi.fn(),
}));

// Mock blastModeManager
vi.mock('../../../modules/blastModeManager', () => ({
  calculateBlastTileBonus: vi.fn(),
  getTilesOnPath: vi.fn(),
  recordBlastMove: vi.fn(),
}));

// Mock wordHuntManager
vi.mock('../../../modules/wordHuntManager', () => ({
  restoreLife: vi.fn(),
  getLifeBonus: vi.fn(),
}));

import { getLeaderboard } from '../../../modules/gameStateManager';
describe('Bot Score Cap', () => {
  let mathRandomSpy: MockInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    // Fix variance at 1.0 (middle) for deterministic tests
    mathRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    mathRandomSpy.mockRestore();
  });

  describe('getBestHumanScore', () => {
    it('returns 0 when no humans have scored', () => {
      getLeaderboard.mockReturnValue([
        { username: 'Bot1', score: 50, isBot: true },
      ]);

      expect(getBestHumanScore('GAME1')).toBe(0);
    });

    it('returns best human score ignoring bots', () => {
      getLeaderboard.mockReturnValue([
        { username: 'Bot1', score: 100, isBot: true },
        { username: 'Alice', score: 45, isBot: false },
        { username: 'Bob', score: 30, isBot: false },
      ]);

      expect(getBestHumanScore('GAME1')).toBe(45);
    });

    it('returns 0 when leaderboard is empty', () => {
      getLeaderboard.mockReturnValue([]);

      expect(getBestHumanScore('GAME1')).toBe(0);
    });
  });

  describe('shouldBotScore — no human scored yet (grace window + post-grace ceilings)', () => {
    beforeEach(() => {
      getLeaderboard.mockReturnValue([
        { username: 'Alice', score: 0, isBot: false },
        { username: 'TestBot', score: 0, isBot: true },
      ]);
      clearBotScoringStart('GAME1');
    });

    afterEach(() => {
      clearBotScoringStart('GAME1');
      vi.useRealTimers();
    });

    it('inside the grace window: bot scores freely regardless of difficulty', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      markBotScoringStart('GAME1');

      // Advance 5s (well within 15s grace)
      vi.advanceTimersByTime(5_000);

      expect(shouldBotScore('GAME1', 'TestBot', 200, 50, 'easy')).toBe(true);
      expect(shouldBotScore('GAME1', 'TestBot', 500, 100, 'medium')).toBe(true);
      expect(shouldBotScore('GAME1', 'TestBot', 1000, 200, 'hard')).toBe(true);
    });

    it('when scoring start was never marked: bot scores freely', () => {
      // No markBotScoringStart call — falls into the "no startedAt" branch
      expect(shouldBotScore('GAME1', 'TestBot', 999, 999, 'easy')).toBe(true);
    });

    it('after grace window expires: easy bot capped at post-grace ceiling 250', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      markBotScoringStart('GAME1');
      vi.advanceTimersByTime(20_000); // > 15s grace

      expect(shouldBotScore('GAME1', 'TestBot', 240, 10, 'easy')).toBe(true);
      expect(shouldBotScore('GAME1', 'TestBot', 245, 10, 'easy')).toBe(false);
    });

    it('after grace window expires: medium bot capped at post-grace ceiling 400', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      markBotScoringStart('GAME1');
      vi.advanceTimersByTime(20_000);

      expect(shouldBotScore('GAME1', 'TestBot', 390, 10, 'medium')).toBe(true);
      expect(shouldBotScore('GAME1', 'TestBot', 395, 10, 'medium')).toBe(false);
    });

    it('after grace window expires: hard bot capped at post-grace ceiling 600', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      markBotScoringStart('GAME1');
      vi.advanceTimersByTime(20_000);

      expect(shouldBotScore('GAME1', 'TestBot', 590, 10, 'hard')).toBe(true);
      expect(shouldBotScore('GAME1', 'TestBot', 595, 10, 'hard')).toBe(false);
    });

    it('after grace window expires: unknown difficulty falls back to medium ceiling 400', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      markBotScoringStart('GAME1');
      vi.advanceTimersByTime(20_000);

      expect(shouldBotScore('GAME1', 'TestBot', 390, 10, 'unknown')).toBe(true);
      expect(shouldBotScore('GAME1', 'TestBot', 395, 10, 'unknown')).toBe(false);
    });
  });

  describe('shouldBotScore — percentage-based targeting', () => {
    it('easy bot targets 55% of best human (with variance=1.0)', () => {
      // Human at 300, easy target = 300 * 0.55 * 1.0 = 165
      getLeaderboard.mockReturnValue([
        { username: 'Alice', score: 300, isBot: false },
      ]);

      expect(shouldBotScore('GAME1', 'TestBot', 160, 5, 'easy')).toBe(true);
      expect(shouldBotScore('GAME1', 'TestBot', 160, 10, 'easy')).toBe(false);
    });

    it('medium bot targets 80% of best human (with variance=1.0)', () => {
      // Human at 300, medium target = 300 * 0.80 * 1.0 = 240
      getLeaderboard.mockReturnValue([
        { username: 'Alice', score: 300, isBot: false },
      ]);

      expect(shouldBotScore('GAME1', 'TestBot', 230, 10, 'medium')).toBe(true);
      expect(shouldBotScore('GAME1', 'TestBot', 235, 10, 'medium')).toBe(false);
    });

    it('hard bot targets 95% of best human (with variance=1.0)', () => {
      // Human at 300, hard target = 300 * 0.95 * 1.0 = 285
      getLeaderboard.mockReturnValue([
        { username: 'Alice', score: 300, isBot: false },
      ]);

      expect(shouldBotScore('GAME1', 'TestBot', 280, 5, 'hard')).toBe(true);
      expect(shouldBotScore('GAME1', 'TestBot', 280, 10, 'hard')).toBe(false);
    });

    it('variance affects the target range', () => {
      // Human at 200, medium base = 200 * 0.80 = 160
      getLeaderboard.mockReturnValue([
        { username: 'Alice', score: 200, isBot: false },
      ]);

      // Low variance (Math.random = 0 → variance = 0.9): target = 200 * 0.80 * 0.9 = 144
      mathRandomSpy.mockReturnValue(0);
      expect(shouldBotScore('GAME1', 'TestBot', 140, 5, 'medium')).toBe(false);

      // High variance (Math.random = 1 → variance = 1.1): target = 200 * 0.80 * 1.1 = 176
      mathRandomSpy.mockReturnValue(1);
      expect(shouldBotScore('GAME1', 'TestBot', 170, 5, 'medium')).toBe(true);
    });

    it('scales with human score — bots can reach high scores when human does', () => {
      // Human at 1000, hard target = 1000 * 0.95 * 1.0 = 950
      getLeaderboard.mockReturnValue([
        { username: 'Alice', score: 1000, isBot: false },
      ]);

      expect(shouldBotScore('GAME1', 'TestBot', 900, 50, 'hard')).toBe(true);
      expect(shouldBotScore('GAME1', 'TestBot', 945, 10, 'hard')).toBe(false);
    });

    it('defaults to medium when difficulty is omitted', () => {
      // Human at 100, medium target = 100 * 0.80 * 1.0 = 80
      getLeaderboard.mockReturnValue([
        { username: 'Alice', score: 100, isBot: false },
      ]);

      expect(shouldBotScore('GAME1', 'TestBot', 75, 5)).toBe(true);
      expect(shouldBotScore('GAME1', 'TestBot', 75, 10)).toBe(false);
    });
  });
});
