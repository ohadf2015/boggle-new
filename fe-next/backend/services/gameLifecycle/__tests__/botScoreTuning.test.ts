/**
 * Bot Score Tuning Tests
 *
 * shouldBotScore accepts an optional per-mode tuning object so short, fast modes
 * (Wheel Rush) can run gentler bots than the default classic calibration without
 * forking the shared scoring gate. Verifies targetMult, floorMult, ceilingMult
 * and graceMs overrides while leaving the default behaviour untouched.
 */

import { vi, type MockInstance } from 'vitest';
import {
  shouldBotScore,
  markBotScoringStart,
  clearBotScoringStart,
  clearBotVariance,
} from '../botGame';

vi.mock('../../../modules/gameStateManager', () => ({
  getLeaderboard: vi.fn(),
  getLeaderboardThrottled: vi.fn(),
  addPlayerWord: vi.fn(),
  updatePlayerScore: vi.fn(),
  trackBotWord: vi.fn(),
  getGame: vi.fn(),
  recordFirstFinder: vi.fn(),
}));
vi.mock('../../../modules/botManager', () => ({
  getGameBots: vi.fn(() => []),
  startBot: vi.fn(),
  isBot: vi.fn(),
}));
vi.mock('../../../utils/socketHelpers', () => ({
  broadcastToRoom: vi.fn(),
  volatileBroadcastToRoom: vi.fn(),
  getGameRoom: vi.fn((code: string) => `room:${code}`),
}));
vi.mock('../../../utils/logger', () => ({ default: {
  info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
} }));
vi.mock('../botWordHunt', () => ({ startBotsForWordHunt: vi.fn() }));
vi.mock('../../../modules/blastModeManager', () => ({
  calculateBlastTileBonus: vi.fn(), getTilesOnPath: vi.fn(), recordBlastMove: vi.fn(),
}));
vi.mock('../../../modules/wordHuntManager', () => ({ restoreLife: vi.fn(), getLifeBonus: vi.fn() }));

import { getLeaderboard } from '../../../modules/gameStateManager';

describe('shouldBotScore — per-mode tuning', () => {
  let mathRandomSpy: MockInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    mathRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5); // variance = 1.0
  });

  afterEach(() => {
    mathRandomSpy.mockRestore();
    vi.useRealTimers();
  });

  it('targetMult lowers the relative score ceiling (gentler bots)', () => {
    // Human at 600, hard base target = 600 * 1.15 = 690 (well above the 250 floor).
    getLeaderboard.mockReturnValue([{ username: 'Alice', score: 600, isBot: false }]);
    clearBotVariance('GAME_T');

    // Without tuning: 680 accepted.
    expect(shouldBotScore('GAME_T', 'Bot', 675, 5, 'hard')).toBe(true);

    clearBotVariance('GAME_T2');
    // With targetMult 0.7: target = 690 * 0.7 = 483 → 490 rejected, 470 accepted.
    expect(shouldBotScore('GAME_T2', 'Bot', 485, 5, 'hard', { targetMult: 0.7 })).toBe(false);
    expect(shouldBotScore('GAME_T2', 'Bot', 465, 5, 'hard', { targetMult: 0.7 })).toBe(true);
  });

  it('floorMult lowers the minimum guaranteed bot score', () => {
    // Human at 100, hard target = 115 but floor (250) dominates by default.
    getLeaderboard.mockReturnValue([{ username: 'Alice', score: 100, isBot: false }]);
    clearBotVariance('GAME_F');

    // Default: floor 250 → bot at 240 still accepted.
    expect(shouldBotScore('GAME_F', 'Bot', 240, 5, 'hard')).toBe(true);

    clearBotVariance('GAME_F2');
    // floorMult 0.4 → floor 100; target 115 dominates → 120 rejected.
    expect(shouldBotScore('GAME_F2', 'Bot', 118, 5, 'hard', { floorMult: 0.4 })).toBe(false);
  });

  it('graceMs shortens the free-scoring window before any human scores', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    getLeaderboard.mockReturnValue([
      { username: 'Alice', score: 0, isBot: false },
      { username: 'Bot', score: 0, isBot: true },
    ]);
    clearBotScoringStart('GAME_G');
    markBotScoringStart('GAME_G');

    vi.advanceTimersByTime(12_000); // 12s

    // Default grace (25s): still inside → free scoring.
    expect(shouldBotScore('GAME_G', 'Bot', 999, 999, 'hard')).toBe(true);
    // With graceMs 8000: window elapsed → post-grace ceiling applies (hard 900).
    expect(shouldBotScore('GAME_G', 'Bot', 999, 999, 'hard', { graceMs: 8_000 })).toBe(false);

    clearBotScoringStart('GAME_G');
  });

  it('omitting tuning preserves default calibration', () => {
    getLeaderboard.mockReturnValue([{ username: 'Alice', score: 300, isBot: false }]);
    clearBotVariance('GAME_D');
    // hard target 345 → 340 accepted, 350 rejected (unchanged behaviour).
    expect(shouldBotScore('GAME_D', 'Bot', 340, 5, 'hard')).toBe(true);
    clearBotVariance('GAME_D2');
    expect(shouldBotScore('GAME_D2', 'Bot', 345, 10, 'hard')).toBe(false);
  });
});
