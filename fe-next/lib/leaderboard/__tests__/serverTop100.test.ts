import { describe, it, expect, vi, beforeEach } from 'vitest';

// The leaderboard page's server component must seed SSR with the same top-100
// the /api/leaderboard route serves: Redis cache first (via the shared client,
// since the Next bundle's own redis module copy is never connected), Supabase
// fallback, and always null — never a throw — so prerender degrades to the
// client-side fetch.

const mocks = vi.hoisted(() => ({
  getSharedRedisClient: vi.fn(),
  redisGet: vi.fn(),
  redisSet: vi.fn(),
  getSupabase: vi.fn(),
  isSupabaseConfigured: vi.fn(() => true),
}));

vi.mock('@/backend/redis/connection', () => ({
  getSharedRedisClient: mocks.getSharedRedisClient,
}));

vi.mock('@/backend/redis/keys', () => ({
  KEYS: { leaderboardTop: () => 'lb:top100' },
}));

vi.mock('@/backend/redis/config', () => ({
  TTL_CONFIG: { LEADERBOARD_TOP: 900 },
  getTTLWithJitter: (ttl: number) => ttl,
}));

vi.mock('@/backend/modules/supabase/client', () => ({
  getSupabase: mocks.getSupabase,
  isSupabaseConfigured: mocks.isSupabaseConfigured,
}));

import { getServerLeaderboardTop100 } from '../serverTop100';

const ROWS = [
  { player_id: 'a', username: 'ada', total_score: 3000 },
  { player_id: 'b', username: 'ben', total_score: 2000 },
];

function supabaseClientReturning(result: { data: unknown; error: unknown }) {
  return {
    from: () => ({
      select: () => ({
        order: () => ({
          limit: async () => result,
        }),
      }),
    }),
  };
}

describe('getServerLeaderboardTop100', () => {
  beforeEach(() => {
    mocks.isSupabaseConfigured.mockReturnValue(true);
    mocks.getSharedRedisClient.mockReturnValue({ get: mocks.redisGet, set: mocks.redisSet });
    mocks.redisGet.mockResolvedValue(null);
    mocks.redisSet.mockResolvedValue('OK');
    mocks.getSupabase.mockReturnValue(supabaseClientReturning({ data: ROWS, error: null }));
  });

  it('returns cached rows without touching Supabase', async () => {
    mocks.redisGet.mockResolvedValue(JSON.stringify(ROWS));

    const result = await getServerLeaderboardTop100();

    expect(result).toEqual(ROWS);
    expect(mocks.getSupabase).not.toHaveBeenCalled();
  });

  it('queries Supabase on a cache miss and writes the result back to Redis', async () => {
    const result = await getServerLeaderboardTop100();

    expect(result).toEqual(ROWS);
    expect(mocks.redisSet).toHaveBeenCalledWith('lb:top100', JSON.stringify(ROWS), 'EX', 900);
  });

  it('falls back to Supabase when the Redis read fails', async () => {
    mocks.redisGet.mockRejectedValue(new Error('redis down'));

    const result = await getServerLeaderboardTop100();

    expect(result).toEqual(ROWS);
  });

  it('returns null when Supabase reports an error', async () => {
    mocks.getSupabase.mockReturnValue(supabaseClientReturning({ data: null, error: { message: 'boom' } }));

    await expect(getServerLeaderboardTop100()).resolves.toBeNull();
  });

  it('returns null without any I/O when Supabase is not configured', async () => {
    mocks.isSupabaseConfigured.mockReturnValue(false);

    await expect(getServerLeaderboardTop100()).resolves.toBeNull();
    expect(mocks.redisGet).not.toHaveBeenCalled();
    expect(mocks.getSupabase).not.toHaveBeenCalled();
  });

  it('returns null when no shared Redis client and no Supabase client exist', async () => {
    mocks.getSharedRedisClient.mockReturnValue(null);
    mocks.getSupabase.mockReturnValue(null);

    await expect(getServerLeaderboardTop100()).resolves.toBeNull();
  });
});
