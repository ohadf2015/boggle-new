/**
 * The server used to roll "mystery rewards" (2x XP, hints, freezes, titles) at
 * game end, on long words and on achievements, write a row to
 * mystery_rewards_log and emit engagement:mysteryReward. Nothing credited the
 * reward and no client listened, so the rolls are gone. Game-end engagement
 * still updates daily challenges and the one-more-game prompt.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { Socket } from 'socket.io';

vi.mock('../../utils/logger', () => {
  const l = { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() };
  return { __esModule: true, default: l, ...l };
});
vi.mock('../../utils/socketHelpers', () => ({ safeEmit: vi.fn() }));
vi.mock('../../utils/rateLimiter', () => ({ checkRateLimit: vi.fn().mockReturnValue(true) }));
vi.mock('../../modules/dailyChallengesManager', () => ({
  getTodaysChallenges: vi.fn(),
  claimChallengeReward: vi.fn(),
  getChallengeStats: vi.fn(),
  updateChallengeProgress: vi.fn().mockResolvedValue({ completed: [], updated: [] }),
}));
const logMysteryReward = vi.fn();
vi.mock('../../modules/engagementManager', () => ({
  recordLogin: vi.fn(),
  getCalendarStatus: vi.fn(),
  claimCalendarReward: vi.fn(),
  checkComebackBonus: vi.fn(),
  claimComebackBonus: vi.fn(),
  calculateNearMisses: vi.fn().mockReturnValue([{ type: 'close_loss', current: 90, target: 100, remaining: 10, message: 'x' }]),
  getOneMoreGamePrompt: vi.fn().mockReturnValue({ title: 'One more?', message: 'go' }),
  rollMysteryReward: vi.fn().mockReturnValue({ triggerType: 'game_completion', type: 'xp_flat', value: 500, weight: 1, display: '500 XP' }),
  logMysteryReward: (...a: unknown[]) => logMysteryReward(...a),
  getEngagementStatus: vi.fn(),
}));
vi.mock('../../modules/dailyMissionsManager', () => ({ getDailyMissions: vi.fn() }));
vi.mock('../../modules/wordOfTheDayManager', () => ({ getWordOfTheDay: vi.fn(), recordWotdAttempt: vi.fn(), getWotdStats: vi.fn() }));

import * as handler from '../engagementHandler';
import * as rewards from '../../modules/engagementRewards';
import { safeEmit } from '../../utils/socketHelpers';

describe('game-end engagement without mystery rewards', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Given a won game, When engagement runs, Then no mystery reward is rolled, logged or emitted', async () => {
    const socket = { id: 's1', emit: vi.fn() } as unknown as Socket;
    await handler.processGameEndEngagement(socket, 'player-1', {
      score: 300, wordCount: 20, longestWord: 'stranger', isWinner: true, placement: 1, playerCount: 3, achievements: [],
    }, 'GAME1');

    const events = (safeEmit as unknown as { mock: { calls: unknown[][] } }).mock.calls.map((c) => c[1]);
    expect(events).not.toContain('engagement:mysteryReward');
    expect(events).not.toContain('engagement:nearMisses');
    expect(events).toContain('engagement:oneMoreGame');
    expect(logMysteryReward).not.toHaveBeenCalled();
  });

  it('Then the long-word / achievement roll entry points and the reward pools no longer exist', () => {
    expect('processLongWordEngagement' in handler).toBe(false);
    expect('processAchievementEngagement' in handler).toBe(false);
    expect('rollMysteryReward' in rewards).toBe(false);
    expect('MYSTERY_REWARD_POOLS' in rewards).toBe(false);
  });
});
