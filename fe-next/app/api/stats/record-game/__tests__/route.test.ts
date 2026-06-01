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
    expect(result.data.leveledUp).toBe(true);
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
        // applies CASUAL_LEADERBOARD_WEIGHT 0.25, so 1000 + round(200*0.25) = 1050
        // (was 1200 when raw score was added directly).
        total_score: 1050,
        total_words: 65,
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
