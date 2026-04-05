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

import { vi, type Mock, type MockInstance } from 'vitest';
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
