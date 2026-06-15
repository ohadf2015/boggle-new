/**
 * Test: resetBotsForNewRound — zero per-round bot state between rounds.
 *
 * Bots are created ONCE per room (autoAddBots only adds when none exist) and the
 * in-memory Bot objects are REUSED every round. `resetGameForNewRound` zeroes
 * `game.playerScores`, but the only place that reset `bot.score` was the classic
 * word-pool prep (`prepareBotWords`), which the dedicated blast/wheel-rush drivers
 * never call. So on a repeat blast round a bot carried a stale-high `bot.score`,
 * `shouldBotScore` saw `projected > max(target, floor)` and rejected every word →
 * the bot froze at exactly 0 in the live leaderboard.
 *
 * resetBotsForNewRound is the round-reset mirror of resetScoresForNewRound: it
 * brings every bot's in-memory score/combo back to 0 so the next round starts
 * aligned with the freshly-zeroed playerScores.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { addBot, resetBotsForNewRound, getGameBots, cleanupGameBots } from '../botManager';

const GAME = 'GRESET1';

describe('resetBotsForNewRound', () => {
  beforeEach(() => {
    cleanupGameBots(GAME);
  });

  it('zeroes score and comboLevel for every bot in the game', () => {
    const users: Record<string, unknown> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = addBot(GAME, 'hard', users as any, 'en');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b = addBot(GAME, 'easy', users as any, 'en');

    // Simulate scores accumulated over a prior round.
    a.score = 540;
    a.comboLevel = 6;
    b.score = 120;
    b.comboLevel = 2;

    resetBotsForNewRound(GAME);

    for (const bot of getGameBots(GAME)) {
      expect(bot.score).toBe(0);
      expect(bot.comboLevel).toBe(0);
    }
  });

  it('clears accumulated word tracking so stats do not bleed across rounds', () => {
    const users: Record<string, unknown> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bot = addBot(GAME, 'medium', users as any, 'en');
    bot.wordsFound = ['cat', 'dog'];
    bot.currentWordIndex = 2;

    resetBotsForNewRound(GAME);

    expect(bot.wordsFound).toEqual([]);
    expect(bot.currentWordIndex).toBe(0);
  });

  it('is a safe no-op for a game with no bots', () => {
    expect(() => resetBotsForNewRound('NO_SUCH_GAME')).not.toThrow();
  });
});
