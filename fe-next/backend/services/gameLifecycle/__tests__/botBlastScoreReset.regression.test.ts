/**
 * Regression: blast bot frozen at 0 on a REPEAT round.
 *
 * Bots are reused across rounds. Before the fix, only the classic word-pool prep
 * re-zeroed bot.score; the blast driver never did. So after a round where a bot
 * climbed past its cap, the SAME bot object carried that stale-high score into the
 * next round — while game.playerScores had been reset to 0 — and shouldBotScore
 * rejected every word, freezing the live leaderboard at 0.
 *
 * This test drives the REAL botManager + REAL shouldBotScore across two rounds
 * (only getLeaderboard is mocked, to pin the best-human baseline) and proves:
 *   round 1 end  → bot capped (would freeze next round)
 *   reset        → resetBotsForNewRound zeroes bot.score
 *   round 2      → bot scores again
 */

import { vi, describe, it, expect, beforeEach, afterEach, type MockInstance } from 'vitest';

// Pin the best-human baseline; everything else about gameStateManager is unused here.
vi.mock('../../../modules/gameStateManager', () => ({
  getLeaderboard: vi.fn(),
  getLeaderboardThrottled: vi.fn(),
  addPlayerWord: vi.fn(),
  updatePlayerScore: vi.fn(),
  trackBotWord: vi.fn(),
  getGame: vi.fn(),
  recordFirstFinder: vi.fn(),
}));
vi.mock('../../../utils/socketHelpers', () => ({
  broadcastToRoom: vi.fn(),
  volatileBroadcastToRoom: vi.fn(),
  getGameRoom: vi.fn((code: string) => `room:${code}`),
}));
vi.mock('../../../utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock('../botWordHunt', () => ({ startBotsForWordHunt: vi.fn() }));

import { shouldBotScore, clearBotScoringStart, clearBotVariance } from '../botGame';
import { addBot, resetBotsForNewRound, getBotByUsername, cleanupGameBots } from '../../../modules/botManager';
import { getLeaderboard } from '../../../modules/gameStateManager';

const GAME = 'GBLASTRESET';

describe('blast bot score reset across rounds (regression)', () => {
  let randomSpy: MockInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5); // variance = 1.0
    clearBotScoringStart(GAME);
    clearBotVariance(GAME);
    cleanupGameBots(GAME);
    // A human scored 100 → medium cap = max(100*0.95, floor 150) = 150.
    (getLeaderboard as unknown as MockInstance).mockReturnValue([
      { username: 'Alice', score: 100, isBot: false },
    ]);
  });

  afterEach(() => {
    randomSpy.mockRestore();
    clearBotScoringStart(GAME);
    cleanupGameBots(GAME);
  });

  it('unfreezes a reused bot: capped after round 1, scores again after reset', () => {
    const bot = addBot(GAME, 'medium', {}, 'en');

    // Round 1: bot climbed well past its 150 cap.
    bot.score = 300;
    // shouldBotScore is called with the live bot.score (as the blast driver does).
    expect(shouldBotScore(GAME, bot.username, bot.score, 10, 'medium')).toBe(false); // frozen

    // WITHOUT the fix the bot keeps score 300 into round 2 → still frozen.
    expect(shouldBotScore(GAME, bot.username, bot.score, 10, 'medium')).toBe(false);

    // The fix: round reset zeroes the reused bot's score.
    resetBotsForNewRound(GAME);
    expect(getBotByUsername(GAME, bot.username)!.score).toBe(0);

    // Round 2: bot is allowed to score again.
    const fresh = getBotByUsername(GAME, bot.username)!;
    expect(shouldBotScore(GAME, fresh.username, fresh.score, 10, 'medium')).toBe(true); // unfrozen
  });
});
