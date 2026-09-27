import { describe, it, expect, vi, beforeEach } from 'vitest';

// Controllable rpc handle shared with the mock factory (hoisted before imports).
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('../../modules/supabaseServer', () => ({
  isSupabaseConfigured: vi.fn(() => true),
  getSupabase: vi.fn(() => ({ rpc })),
}));
vi.mock('../../redisClient', () => ({
  getCachedLeaderboardTop100: vi.fn().mockResolvedValue(null),
  cacheLeaderboardTop100: vi.fn().mockResolvedValue(undefined),
  getCachedUserRank: vi.fn().mockResolvedValue(null),
  cacheUserRank: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../utils/requestCoalescing', () => ({
  coalesce: vi.fn((_k: string, fn: () => Promise<any>) => fn()),
}));
vi.mock('../../db/queries/leaderboardQueries', () => ({
  getTopPlayersByScore: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/lib/seasons', () => ({
  getCurrentSeasonDynamic: () => ({ id: 3, name: 's3', theme: '', startDate: new Date(), endDate: new Date(), rewards: [] }),
  getSeasonRewards: () => ({ coins: 0, badges: [], exclusives: [] }),
}));

import { appRouter } from '../../trpc/root';

const caller = appRouter.createCaller({ req: {} as any, res: {} as any });

describe('leaderboard.getCurrentSeasonRank', () => {
  beforeEach(() => { rpc.mockReset(); });

  it('maps the RPC row to a typed payload when the player is ranked', async () => {
    rpc.mockResolvedValue({
      data: [{ rank_position: 42, total_score: 9100, games_played: 30, season_id: 3, total_players: 1204, tier_id: 'gold' }],
      error: null,
    });
    const res = await caller.leaderboard.getCurrentSeasonRank({ playerId: '11111111-1111-4111-8111-111111111111' });
    expect(rpc).toHaveBeenCalledWith('get_user_current_season_rank', { p_player_id: '11111111-1111-4111-8111-111111111111' });
    expect(res.data).toEqual({
      rankPosition: 42, totalScore: 9100, gamesPlayed: 30, seasonId: 3, totalPlayers: 1204, tierId: 'gold',
    });
  });

  it('returns null when the player has no current-season entry (0 rows)', async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    const res = await caller.leaderboard.getCurrentSeasonRank({ playerId: '00000000-0000-0000-0000-000000000000' });
    expect(res.data).toBeNull();
  });

  it('throws when the RPC errors', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
    await expect(
      caller.leaderboard.getCurrentSeasonRank({ playerId: '22222222-2222-4222-8222-222222222222' }),
    ).rejects.toThrow();
  });
});
