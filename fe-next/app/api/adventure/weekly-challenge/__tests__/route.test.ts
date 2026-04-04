import { vi, type Mock, } from 'vitest';
// @ts-nocheck
/**
 * Weekly Challenge API Route Tests
 *
 * Covers GET (leaderboard) and POST (score submission) with
 * auth, validation, happy path, upsert GREATEST logic, DB errors.
 */

// Mock next/server
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({ data, status: init?.status ?? 200 })),
  },
}));

// Mock rate limiter — always allow
vi.mock('@/lib/apiRateLimit', () => ({
  checkApiRateLimit: vi.fn().mockReturnValue({ success: true }),
}));

// Mock supabase server client (auth + data queries on the same client)
const mockGetUser = vi.fn();
const mockFrom = vi.fn();
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

// Mock sentry
vi.mock('@/utils/sentry', () => ({
  captureApiError: vi.fn(),
}));

// Mock weekly challenge config
vi.mock('@/lib/adventure/weeklyChallenge', () => ({
  getCurrentWeekId: vi.fn().mockReturnValue('2026-W13'),
}));

import { NextRequest } from 'next/server';
import { GET, POST } from '../route';

// ---------- Helpers ----------

const mockHeaders = { get: vi.fn().mockReturnValue('127.0.0.1') };

function makeGetRequest() {
  return { headers: mockHeaders } as unknown as NextRequest;
}

function makePostRequest(body: unknown): NextRequest {
  return {
    json: () => Promise.resolve(body),
    headers: mockHeaders,
  } as unknown as NextRequest;
}

const validPostBody = {
  score: 1200,
  wordsFound: 15,
  longestWord: 'adventure',
  playerName: 'TestPlayer',
};

const mockLeaderboardRows = [
  {
    user_id: 'u1',
    score: 2000,
    words_found: 20,
    longest_word: 'brilliant',
    player_name: 'Alpha',
    submitted_at: '2026-03-24T10:00:00Z',
  },
  {
    user_id: 'u2',
    score: 1500,
    words_found: 14,
    longest_word: 'crystal',
    player_name: 'Bravo',
    submitted_at: '2026-03-24T11:00:00Z',
  },
];

// ---------- GET Tests ----------

describe('GET /api/adventure/weekly-challenge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns weekly challenge leaderboard with weekId', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'weekly_challenge_scores') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: mockLeaderboardRows,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    expect(res.data.weekId).toBe('2026-W13');
    expect(res.data.leaderboard).toHaveLength(2);

    // Verify rank and field mapping
    expect(res.data.leaderboard[0].rank).toBe(1);
    expect(res.data.leaderboard[0].playerName).toBe('Alpha');
    expect(res.data.leaderboard[0].score).toBe(2000);
    expect(res.data.leaderboard[0].wordsFound).toBe(20);
    expect(res.data.leaderboard[0].longestWord).toBe('brilliant');

    expect(res.data.leaderboard[1].rank).toBe(2);
    expect(res.data.leaderboard[1].playerName).toBe('Bravo');
    expect(res.data.leaderboard[1].score).toBe(1500);
  });

  it('returns valid data structure with empty leaderboard', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'weekly_challenge_scores') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    expect(res.data.weekId).toBe('2026-W13');
    expect(res.data.leaderboard).toEqual([]);
  });

  it('returns 500 on DB fetch error', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'weekly_challenge_scores') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'INTERNAL', message: 'DB down' },
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(500);
    expect(res.data.error).toBe('Failed to fetch leaderboard');
  });
});

// ---------- POST Tests ----------

describe('POST /api/adventure/weekly-challenge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
  });

  /**
   * Setup mocks for the new atomic update-then-insert pattern.
   * - updateResult: what .update().eq().eq().lt().select().maybeSingle() returns
   * - insertError: what .insert() returns
   * - selectAfterResult: what .select().eq().eq().single() returns (re-read)
   */
  function setupPostMocks({
    existingScore = null as { score: number } | null,
    updateError = null as { code?: string; message?: string } | null,
    insertError = null as { code?: string; message?: string } | null,
  } = {}) {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'weekly_challenge_scores') {
        // Determine if the update should "succeed" (new score > existing)
        const updateSucceeds = existingScore !== null && existingScore.score < 1200;
        return {
          // For the conditional UPDATE path
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                lt: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: (updateSucceeds && !updateError) ? { score: 1200 } : null,
                      error: updateError,
                    }),
                  }),
                }),
              }),
            }),
          }),
          // For the INSERT fallback path
          insert: vi.fn().mockResolvedValue({
            error: insertError ?? (existingScore ? { code: '23505', message: 'duplicate' } : null),
          }),
          // For rank counting (count query) and re-reading current best after conflict
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: existingScore ?? { score: 1200 },
                  error: null,
                }),
                gt: vi.fn().mockResolvedValue({ count: 0, error: null }),
              }),
              gt: vi.fn().mockResolvedValue({ count: 0, error: null }),
            }),
          }),
        };
      }
      return {};
    });
  }

  // ===== AUTH =====
  describe('Authentication', () => {
    it('rejects unauthenticated requests with 401', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No session' } });
      const res = await POST(makePostRequest(validPostBody));
      expect(res.status).toBe(401);
      expect(res.data.error).toBe('Unauthorized');
    });
  });

  // ===== VALIDATION =====
  describe('Validation', () => {
    it('rejects missing score with 400', async () => {
      const res = await POST(makePostRequest({ wordsFound: 10 }));
      expect(res.status).toBe(400);
      expect(res.data.error).toBe('Invalid score');
    });

    it('rejects negative score with 400', async () => {
      const res = await POST(makePostRequest({ ...validPostBody, score: -5 }));
      expect(res.status).toBe(400);
      expect(res.data.error).toBe('Invalid score');
    });

    it('rejects score exceeding max with 400', async () => {
      const res = await POST(makePostRequest({ ...validPostBody, score: 100001 }));
      expect(res.status).toBe(400);
      expect(res.data.error).toBe('Invalid score');
    });

    it('rejects invalid wordsFound with 400', async () => {
      const res = await POST(makePostRequest({ ...validPostBody, wordsFound: -1 }));
      expect(res.status).toBe(400);
      expect(res.data.error).toBe('Invalid wordsFound');
    });
  });

  // ===== HAPPY PATH =====
  describe('Happy path', () => {
    it('saves new score successfully (no existing score)', async () => {
      setupPostMocks({ existingScore: null });

      const res = await POST(makePostRequest(validPostBody));
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.updated).toBe(true);
      expect(res.data.rank).toBe(1);
    });

    it('does not downgrade when existing score is higher (GREATEST)', async () => {
      setupPostMocks({ existingScore: { score: 5000 } });

      const res = await POST(makePostRequest({ ...validPostBody, score: 1200 }));
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.updated).toBe(false);
      expect(res.data.currentBest).toBe(5000);
    });

    it('updates when new score is higher than existing', async () => {
      setupPostMocks({ existingScore: { score: 800 } });

      const res = await POST(makePostRequest({ ...validPostBody, score: 1200 }));
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.updated).toBe(true);
      expect(res.data.rank).toBe(1);
    });
  });

  // ===== DB ERRORS =====
  describe('Database errors', () => {
    it('returns 500 on update error', async () => {
      setupPostMocks({
        existingScore: null,
        updateError: { code: 'INTERNAL', message: 'write failed' },
      });

      const res = await POST(makePostRequest(validPostBody));
      expect(res.status).toBe(500);
      expect(res.data.error).toBe('Failed to submit score');
    });
  });
});
