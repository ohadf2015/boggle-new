// Mock supabaseServer before importing the router
jest.mock('../../modules/supabaseServer', () => ({
  isSupabaseConfigured: jest.fn(() => true),
  getSupabase: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => ({
          limit: jest.fn().mockResolvedValue({ data: [], error: null }),
        })),
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
        })),
        gte: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })),
      })),
    })),
  })),
}));

jest.mock('../../redisClient', () => ({
  getCachedLeaderboardTop100: jest.fn().mockResolvedValue(null),
  cacheLeaderboardTop100: jest.fn().mockResolvedValue(undefined),
  getCachedUserRank: jest.fn().mockResolvedValue(null),
  cacheUserRank: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../utils/requestCoalescing', () => ({
  coalesce: jest.fn((_key: string, fn: () => Promise<any>) => fn()),
}));

jest.mock('../../db/queries/leaderboardQueries', () => ({
  getTopPlayersByScore: jest.fn().mockResolvedValue([]),
}));

import { appRouter } from '../../trpc/root';

describe('tRPC leaderboard router', () => {
  const caller = appRouter.createCaller({ req: {} as any, res: {} as any });

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
});
