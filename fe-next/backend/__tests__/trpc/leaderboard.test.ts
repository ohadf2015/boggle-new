// Mock supabaseServer before importing the router
vi.mock('../../modules/supabaseServer', () => ({
  isSupabaseConfigured: vi.fn(() => true),
  getSupabase: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
        })),
        gte: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })),
      })),
    })),
  })),
}));

vi.mock('../../redisClient', () => ({
  getCachedLeaderboardTop100: vi.fn().mockResolvedValue(null),
  cacheLeaderboardTop100: vi.fn().mockResolvedValue(undefined),
  getCachedUserRank: vi.fn().mockResolvedValue(null),
  cacheUserRank: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../utils/requestCoalescing', () => ({
  coalesce: vi.fn((_key: string, fn: () => Promise<any>) => fn()),
}));

vi.mock('../../db/queries/leaderboardQueries', () => ({
  getTopPlayersByScore: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/seasons', () => ({
  getCurrentSeasonDynamic: () => ({
    id: 1,
    name: 'Season 1: Test',
    theme: 'Test',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-05-01'),
    rewards: [],
  }),
  getSeasonRewards: () => ({
    coins: 500,
    badges: [{ id: 'gold-season-1', name: 'Gold Season 1' }],
    exclusives: [],
  }),
}));

import { vi } from 'vitest';
import { appRouter } from '../../trpc/root';
import { getTopPlayersByScore } from '../../db/queries/leaderboardQueries';
import { getSupabase } from '../../modules/supabaseServer';

describe('tRPC leaderboard router', () => {
  const caller = appRouter.createCaller({ req: {} as any, res: {} as any });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getTop validates input — rejects invalid period', async () => {
    await expect(
      caller.leaderboard.getTop({ period: 'invalid' as any, limit: 10 })
    ).rejects.toThrow();
  });

  it('getTop validates input — rejects limit out of range', async () => {
    await expect(
      caller.leaderboard.getTop({ period: 'weekly', limit: 200 })
    ).rejects.toThrow();
  });

  it('getTop accepts valid input and returns data', async () => {
    const result = await caller.leaderboard.getTop({ period: 'weekly', limit: 10 });
    expect(result).toBeDefined();
  });

  it('getTop with period=season passes the current seasonId to Drizzle', async () => {
    await caller.leaderboard.getTop({ period: 'season', limit: 10 });
    const calls = (getTopPlayersByScore as any).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const lastCall = calls[calls.length - 1];
    expect(lastCall[0]).toBe(10);
    expect(lastCall[1]).toEqual({ seasonId: 1 });
  });

  it('getTop with explicit seasonId overrides current season', async () => {
    await caller.leaderboard.getTop({ period: 'season', limit: 5, seasonId: 3 });
    const calls = (getTopPlayersByScore as any).mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall[1]).toEqual({ seasonId: 3 });
  });

  it('claimSeasonRewards calls the Postgres RPC and returns rewards on success', async () => {
    const rpcSpy = vi.fn().mockResolvedValue({ data: true, error: null });
    const archiveChain = {
      select: () => archiveChain,
      eq: () => archiveChain,
      maybeSingle: () => Promise.resolve({ data: { peak_tier: 'Gold' }, error: null }),
    };
    (getSupabase as any).mockReturnValue({
      rpc: rpcSpy,
      from: () => archiveChain,
    });

    const result = await caller.leaderboard.claimSeasonRewards({
      seasonId: 1,
      playerId: '11111111-1111-4111-8111-111111111111',
    });

    expect(rpcSpy).toHaveBeenCalledWith('claim_season_rewards', {
      p_player_id: '11111111-1111-4111-8111-111111111111',
      p_season_id: 1,
      p_coins: 500,
      p_badges: ['gold-season-1'],
    });
    expect(result.success).toBe(true);
    expect(result.alreadyClaimed).toBe(false);
    expect(result.rewards.coins).toBe(500);
  });

  it('claimSeasonRewards returns alreadyClaimed when RPC returns FALSE', async () => {
    const rpcSpy = vi.fn().mockResolvedValue({ data: false, error: null });
    const archiveChain = {
      select: () => archiveChain,
      eq: () => archiveChain,
      maybeSingle: () => Promise.resolve({ data: { peak_tier: 'Gold' }, error: null }),
    };
    (getSupabase as any).mockReturnValue({
      rpc: rpcSpy,
      from: () => archiveChain,
    });

    const result = await caller.leaderboard.claimSeasonRewards({
      seasonId: 1,
      playerId: '11111111-1111-4111-8111-111111111111',
    });

    expect(result.success).toBe(false);
    expect(result.alreadyClaimed).toBe(true);
  });
});
