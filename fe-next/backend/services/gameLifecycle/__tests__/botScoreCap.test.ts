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
  clearBotVariance,
} from '../botGame';

// Mock gameStateManager
vi.mock('../../../modules/gameStateManager', () => ({
  getLeaderboard: vi.fn(),
  getLeaderboardThrottled: vi.fn(),
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
  validateBlastWordPath: vi.fn().mockReturnValue(null),
  getTilesOnResolvedPath: vi.fn().mockReturnValue([]),
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

      // Advance 5s (well within 25s grace)
      vi.advanceTimersByTime(5_000);

      expect(shouldBotScore('GAME1', 'TestBot', 200, 50, 'easy')).toBe(true);
      expect(shouldBotScore('GAME1', 'TestBot', 500, 100, 'medium')).toBe(true);
      expect(shouldBotScore('GAME1', 'TestBot', 1000, 200, 'hard')).toBe(true);
    });

    it('when scoring start was never marked: bot scores freely', () => {
      // No markBotScoringStart call — falls into the "no startedAt" branch
      expect(shouldBotScore('GAME1', 'TestBot', 999, 999, 'easy')).toBe(true);
    });

    it('after grace window expires: easy bot capped at post-grace ceiling 400', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      markBotScoringStart('GAME1');
      vi.advanceTimersByTime(30_000); // > 25s grace

      expect(shouldBotScore('GAME1', 'TestBot', 390, 10, 'easy')).toBe(true);
      expect(shouldBotScore('GAME1', 'TestBot', 395, 10, 'easy')).toBe(false);
    });

    it('after grace window expires: medium bot capped at post-grace ceiling 650', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      markBotScoringStart('GAME1');
      vi.advanceTimersByTime(30_000);

      expect(shouldBotScore('GAME1', 'TestBot', 640, 10, 'medium')).toBe(true);
      expect(shouldBotScore('GAME1', 'TestBot', 645, 10, 'medium')).toBe(false);
    });

    it('after grace window expires: hard bot capped at post-grace ceiling 900', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      markBotScoringStart('GAME1');
      vi.advanceTimersByTime(30_000);

      expect(shouldBotScore('GAME1', 'TestBot', 890, 10, 'hard')).toBe(true);
      expect(shouldBotScore('GAME1', 'TestBot', 895, 10, 'hard')).toBe(false);
    });

    it('after grace window expires: unknown difficulty falls back to medium ceiling 650', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      markBotScoringStart('GAME1');
      vi.advanceTimersByTime(30_000);

      expect(shouldBotScore('GAME1', 'TestBot', 640, 10, 'unknown')).toBe(true);
      expect(shouldBotScore('GAME1', 'TestBot', 645, 10, 'unknown')).toBe(false);
    });
  });

  describe('shouldBotScore — percentage-based targeting', () => {
    it('easy bot targets 75% of best human (with variance=1.0)', () => {
      // Human at 300, easy target = 300 * 0.75 * 1.0 = 225
      getLeaderboard.mockReturnValue([
        { username: 'Alice', score: 300, isBot: false },
      ]);

      expect(shouldBotScore('GAME1', 'TestBot', 220, 5, 'easy')).toBe(true);
      expect(shouldBotScore('GAME1', 'TestBot', 220, 10, 'easy')).toBe(false);
    });

    it('medium bot targets 95% of best human (with variance=1.0)', () => {
      // Human at 300, medium target = 300 * 0.95 * 1.0 = 285
      getLeaderboard.mockReturnValue([
        { username: 'Alice', score: 300, isBot: false },
      ]);

      expect(shouldBotScore('GAME1', 'TestBot', 280, 5, 'medium')).toBe(true);
      expect(shouldBotScore('GAME1', 'TestBot', 280, 10, 'medium')).toBe(false);
    });

    it('hard bot targets 115% of best human (with variance=1.0)', () => {
      // Human at 300, hard target = 300 * 1.15 * 1.0 = 345
      getLeaderboard.mockReturnValue([
        { username: 'Alice', score: 300, isBot: false },
      ]);

      expect(shouldBotScore('GAME1', 'TestBot', 340, 5, 'hard')).toBe(true);
      expect(shouldBotScore('GAME1', 'TestBot', 340, 10, 'hard')).toBe(false);
    });

    it('variance affects the target range', () => {
      // Human at 200, medium base = 200 * 0.95 = 190
      getLeaderboard.mockReturnValue([
        { username: 'Alice', score: 200, isBot: false },
      ]);

      // Variance is memoized per (gameCode, botUsername) so use distinct keys
      // across the two Math.random values to observe the variance effect.
      clearBotVariance('GAME_LO');
      clearBotVariance('GAME_HI');

      // Low variance (Math.random = 0 → variance = 0.9): target = 200 * 0.95 * 0.9 = 171
      mathRandomSpy.mockReturnValue(0);
      expect(shouldBotScore('GAME_LO', 'TestBot', 170, 5, 'medium')).toBe(false);

      // High variance (Math.random = 1 → variance = 1.1): target = 200 * 0.95 * 1.1 = 209
      mathRandomSpy.mockReturnValue(1);
      expect(shouldBotScore('GAME_HI', 'TestBot', 205, 3, 'medium')).toBe(true);
    });

    it('memoizes variance per (gameCode, bot) — same key returns stable decision across Math.random swaps', () => {
      // Human at 200, medium base = 200 * 0.95 = 190.
      // First call seeds variance from Math.random=1 → 1.1 → target 209 → accept 205+3.
      // Second call on SAME (game,bot) with Math.random=0 MUST reuse cached 1.1,
      // not recompute 0.9 (which would reject).
      getLeaderboard.mockReturnValue([
        { username: 'Alice', score: 200, isBot: false },
      ]);
      clearBotVariance('GAME_MEMO');

      mathRandomSpy.mockReturnValue(1);
      expect(shouldBotScore('GAME_MEMO', 'BotA', 205, 3, 'medium')).toBe(true);

      // Swap Math.random — cached variance must make this still accept
      mathRandomSpy.mockReturnValue(0);
      expect(shouldBotScore('GAME_MEMO', 'BotA', 205, 3, 'medium')).toBe(true);
    });

    it('clearBotVariance(gameCode) drops only matching entries', () => {
      getLeaderboard.mockReturnValue([
        { username: 'Alice', score: 200, isBot: false },
      ]);
      clearBotVariance('GAME_A');
      clearBotVariance('GAME_B');

      // Seed GAME_A with high variance (1.1 → target 209, accepts 205+3)
      mathRandomSpy.mockReturnValue(1);
      expect(shouldBotScore('GAME_A', 'BotA', 205, 3, 'medium')).toBe(true);
      // Seed GAME_B with high variance too
      expect(shouldBotScore('GAME_B', 'BotB', 205, 3, 'medium')).toBe(true);

      // Clear only GAME_A; GAME_B entry survives
      clearBotVariance('GAME_A');

      // GAME_A reseeds with low variance (0 → 0.9 → target 171 → rejects 205+3)
      mathRandomSpy.mockReturnValue(0);
      expect(shouldBotScore('GAME_A', 'BotA', 205, 3, 'medium')).toBe(false);
      // GAME_B still uses cached high variance → accepts
      expect(shouldBotScore('GAME_B', 'BotB', 205, 3, 'medium')).toBe(true);
    });

    it('scales with human score — bots can reach high scores when human does', () => {
      // Human at 1000, hard target = 1000 * 1.15 * 1.0 = 1150
      getLeaderboard.mockReturnValue([
        { username: 'Alice', score: 1000, isBot: false },
      ]);

      expect(shouldBotScore('GAME1', 'TestBot', 1100, 50, 'hard')).toBe(true);
      expect(shouldBotScore('GAME1', 'TestBot', 1145, 10, 'hard')).toBe(false);
    });

    it('defaults to medium when difficulty is omitted', () => {
      // Human at 100, medium target = 100 * 0.95 * 1.0 = 95, but floor is 150
      getLeaderboard.mockReturnValue([
        { username: 'Alice', score: 100, isBot: false },
      ]);

      // Floor of 150 applies since 95 < 150
      expect(shouldBotScore('GAME1', 'TestBot', 145, 5)).toBe(true);
      expect(shouldBotScore('GAME1', 'TestBot', 145, 10)).toBe(false);
    });
  });
});
