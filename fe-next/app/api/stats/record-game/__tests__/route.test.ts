import { vi } from 'vitest';
// @ts-nocheck
/**
 * Singleplayer Stats Record Game API Tests
 *
 * Verifies that singleplayer game results are persisted to Supabase
 * and XP is awarded via the increment_player_xp RPC.
 */

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({ data, status: init?.status ?? 200 })),
  },
}));

vi.mock('@/lib/apiRateLimit', () => ({
  checkApiRateLimit: vi.fn().mockReturnValue({ success: true }),
}));

vi.mock('@/utils/sentry', () => ({
  captureApiError: vi.fn(),
}));

const mockGetUser = vi.fn();
const mockUpdate = vi.fn();
const mockRpc = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    from: vi.fn().mockReturnValue({
      select: (...args) => {
        mockSelect(...args);
        return {
          eq: (...eqArgs) => {
            mockEq(...eqArgs);
            return {
              single: () => mockSingle(),
            };
          },
        };
      },
      update: (...args) => {
        mockUpdate(...args);
        return {
          eq: () => ({ error: null }),
        };
      },
    }),
    rpc: (...args) => mockRpc(...args),
  }),
}));

const recordPersonalBest = vi.hoisted(() => vi.fn(async () => []));
vi.mock('@/backend/modules/achievements/grantAchievements', () => ({ recordPersonalBest }));
vi.mock('@/lib/email', () => ({ getSupabaseAdmin: () => ({ rpc: vi.fn() }) }));
const updateQuestProgress = vi.hoisted(() => vi.fn(async () => null));
vi.mock('@/backend/modules/weeklyQuestManager', () => ({ updateQuestProgress }));

import { NextRequest } from 'next/server';
import { POST } from '../route';
import { checkApiRateLimit } from '@/lib/apiRateLimit';

function makeRequest(body: unknown): NextRequest {
  return {
    json: () => Promise.resolve(body),
    headers: { get: vi.fn().mockReturnValue('127.0.0.1') },
  } as unknown as NextRequest;
}

const validBody = {
  score: 200,
  wordCount: 15,
  longestWord: 'TESTING',
  timePlayed: 120,
  achievementCount: 1,
  mode: 'solo-bots',
};

const mockProfile = {
  total_games: 5,
  total_score: 1000,
  total_words: 50,
  total_time_played: 600,
  total_xp: 500,
  current_level: 3,
  player_title: null,
  longest_word: 'HELLO',
  longest_word_length: 5,
  last_game_at: '2026-03-25T00:00:00Z',
  unique_days_played: 3,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({
    data: { user: { id: 'user-123' } },
    error: null,
  });
  mockSingle.mockResolvedValue({
    data: mockProfile,
    error: null,
  });
  mockRpc.mockResolvedValue({
    data: [{ new_total_xp: 650, new_level: 4, xp_granted: 150 }],
    error: null,
  });
});

describe('POST /api/stats/record-game', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No user' } });

    const result = await POST(makeRequest(validBody));
    expect(result.status).toBe(401);
  });

  it('returns 400 for missing required fields', async () => {
    const result = await POST(makeRequest({ score: 100 }));
    expect(result.status).toBe(400);
  });

  it('returns 400 for negative score', async () => {
    const result = await POST(makeRequest({ score: -1, wordCount: 5 }));
    expect(result.status).toBe(400);
  });

  it('awards XP and returns success for valid request', async () => {
    const result = await POST(makeRequest(validBody));
    expect(result.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.xpEarned).toBe(150);
    expect(result.data.newLevel).toBe(4);
    expect(result.data.oldLevel).toBe(3);
    expect(result.data.newTotalXp).toBe(650);
    expect(result.data.leveledUp).toBe(true);
  });

  it('reports no XP and no level-up when the XP grant fails', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'down' } });
    const result = await POST(makeRequest(validBody));
    expect(result.status).toBe(200);
    expect(result.data.xpEarned).toBe(0);
    expect(result.data.newTotalXp).toBe(mockProfile.total_xp);
    expect(result.data.newLevel).toBe(mockProfile.current_level);
    expect(result.data.leveledUp).toBe(false);
  });

  it('given the daily cap cut the grant, when recorded, then the breakdown adds up to the XP granted', async () => {
    mockRpc.mockResolvedValue({ data: [{ new_total_xp: 520, new_level: 3, xp_granted: 20 }], error: null });
    const { data } = await POST(makeRequest(validBody));
    expect(data.xpEarned).toBe(20);
    expect(Object.values(data.xpBreakdown).reduce((a: number, b: number) => a + b, 0)).toBe(20);
  });

  it('given a stale profile level, when the grant stays inside the level, then no level-up is reported', async () => {
    mockSingle.mockResolvedValue({ data: { ...mockProfile, current_level: 1 }, error: null });
    mockRpc.mockResolvedValue({ data: [{ new_total_xp: 520, new_level: 3, xp_granted: 20 }], error: null });
    const { data } = await POST(makeRequest(validBody));
    expect(data.leveledUp).toBe(false);
    expect(data.oldLevel).toBe(3);
  });

  it('given the weekly quest reward crosses a level after the game XP, when recorded, then the response merges both grants', async () => {
    mockRpc.mockResolvedValue({ data: [{ new_total_xp: 520, new_level: 3, xp_granted: 20 }], error: null });
    updateQuestProgress.mockResolvedValueOnce({
      completed: true, questType: 'play_games', xpReward: 500, description: 'Play 3 games',
      xpGrant: { xpEarned: 500, newTotalXp: 1020, oldLevel: 3, newLevel: 5, leveledUp: true },
    });
    const { data } = await POST(makeRequest(validBody));
    expect(data).toMatchObject({ xpEarned: 20, oldLevel: 3, newLevel: 5, newTotalXp: 1020, leveledUp: true });
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ player_title: expect.any(String) }));
  });

  it('calls increment_player_xp RPC with correct params', async () => {
    await POST(makeRequest(validBody));
    expect(mockRpc).toHaveBeenCalledWith('increment_player_xp', {
      p_player_id: 'user-123',
      p_xp_amount: expect.any(Number),
    });
  });

  it('updates profile stats with game data', async () => {
    await POST(makeRequest(validBody));
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        total_games: 6,
        // total_score is leaderboard-weighted since 52a19ced3 (daily-dominant
        // leaderboard): solo-bots is a casual mode → leaderboardPointsForGame
        // applies CASUAL_LEADERBOARD_WEIGHT. As of a5b276806, weights are 1x
        // (was 0.25), so 1000 + round(200*1) = 1200.
        total_score: 1200,
        total_words: 65,
        // Route also sends these additional tracked stats:
        casual_games: 6,
        last_game_at: expect.any(String),
        longest_word: 'TESTING',
        longest_word_length: 7,
        total_time_played: 720,
        unique_days_played: 4,
      })
    );
  });

  it('updates longest word when new word is longer', async () => {
    await POST(makeRequest({ ...validBody, longestWord: 'WONDERFUL' }));
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        longest_word: 'WONDERFUL',
        longest_word_length: 9,
      })
    );
  });

  it('caps score at 10000 to prevent abuse', async () => {
    await POST(makeRequest({ ...validBody, score: 99999 }));
    // XP should be based on capped score (10000), not 99999
    expect(mockRpc).toHaveBeenCalled();
  });

  it('handles rate limiting', async () => {

    checkApiRateLimit.mockReturnValueOnce({ success: false, retryAfter: 30 });

    const result = await POST(makeRequest(validBody));
    expect(result.status).toBe(429);
  });
});

describe('POST /api/stats/record-game — personal records', () => {
  it('a longer longest word than the stored one counts a record', async () => {
    // Given a stored longest word of 5 letters and a 7-letter word this game
    await POST(makeRequest(validBody));
    // Then the record counter runs for the player
    expect(recordPersonalBest).toHaveBeenCalledWith(expect.anything(), 'user-123');
  });

  it('a first-ever longest word is not a record', async () => {
    mockSingle.mockResolvedValue({ data: { ...mockProfile, longest_word: null, longest_word_length: 0 }, error: null });
    await POST(makeRequest(validBody));
    expect(recordPersonalBest).not.toHaveBeenCalled();
  });

  it('counts the record after the lifetime achievements write, so that write cannot erase it', async () => {
    // Given a game that both beats the longest word and earns a lifetime milestone
    mockSingle.mockResolvedValue({ data: { ...mockProfile, total_games: 49, achievement_counts: {} }, error: null });
    const order: string[] = [];
    mockUpdate.mockImplementation((u: Record<string, unknown>) => {
      if (u.achievement_counts) order.push('achievement_counts');
    });
    recordPersonalBest.mockImplementation(async () => {
      order.push('record');
      return [];
    });
    await POST(makeRequest(validBody));
    // Then the record RPC runs last
    expect(order).toEqual(['achievement_counts', 'record']);
  });

  it('a shorter word is not a record', async () => {
    await POST(makeRequest({ ...validBody, longestWord: 'CAT' }));
    expect(recordPersonalBest).not.toHaveBeenCalled();
  });
});
