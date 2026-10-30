import { describe, it, expect, beforeEach, vi } from 'vitest';

const { recordHeadToHead } = vi.hoisted(() => ({ recordHeadToHead: vi.fn() }));

vi.mock('../headToHead', () => ({ recordHeadToHead }));
vi.mock('../gameResults', () => ({ recordGameResult: vi.fn(async () => ({ data: {}, error: null })) }));
vi.mock('../playerStats', () => ({
  updatePlayerStats: vi.fn(async () => ({ data: {}, error: null, xpInfo: null, updatedStats: null })),
  ensureProfileExists: vi.fn(async () => true),
}));
vi.mock('../leaderboard', () => ({
  updateLeaderboardEntry: vi.fn(async () => ({ data: {}, error: null })),
  updateRankedProgress: vi.fn(async () => ({ data: {}, error: null })),
}));
vi.mock('../guestTokens', () => ({ updateGuestStats: vi.fn(async () => ({ data: {}, error: null })) }));
vi.mock('../../gameSessionLogger', () => ({ logGameSession: vi.fn(async () => 'sess-1') }));
vi.mock('../../achievementManager', () => ({ checkLifetimeAchievements: vi.fn(() => []) }));
vi.mock('../../../redisClient', () => ({ invalidateUserLeaderboardCaches: vi.fn(async () => {}) }));
vi.mock('../../../utils/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock('../client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../client')>();
  return { ...actual, isSupabaseConfigured: () => true, getSupabase: () => ({}) };
});

import { processGameResults } from '../gameProcessing';
import { claimResultsPersist } from '../../../services/gameLifecycle/resultsPersistOnce';

const authMap = { Alice: { authUserId: 'a' }, Bob: { authUserId: 'b' } };
const scores = [
  { username: 'Alice', score: 80, placement: 1 },
  { username: 'Bob', score: 60, placement: 2 },
];

describe('processGameResults — head-to-head writer', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Given a finished round, Then it hands the scores to the head-to-head writer', async () => {
    recordHeadToHead.mockResolvedValue('written');
    await processGameResults('ROOM', scores as never, { gameMode: 'classic' } as never, authMap as never);
    expect(recordHeadToHead).toHaveBeenCalledTimes(1);
    expect(recordHeadToHead).toHaveBeenCalledWith('ROOM', scores, authMap);
  });

  it('Given the writer never settles, Then results processing still returns', async () => {
    recordHeadToHead.mockReturnValue(new Promise(() => {}));
    const out = await processGameResults('ROOM', scores as never, { gameMode: 'classic' } as never, authMap as never);
    expect(out).toEqual({ xpResults: {}, lifetimeAchievements: {} });
  });

  it('Given the round is persisted twice (fallback repeat), Then the pairs are written once', async () => {
    recordHeadToHead.mockResolvedValue('written');
    const game = { gameSessionId: 7 };
    for (let i = 0; i < 2; i++) {
      if (claimResultsPersist(game)) {
        await processGameResults('ROOM', scores as never, { gameMode: 'classic' } as never, authMap as never);
      }
    }
    expect(recordHeadToHead).toHaveBeenCalledTimes(1);
  });
});
