// @ts-nocheck
/**
 * Weekly Challenge API Route Tests
 *
 * Covers GET (leaderboard) and POST (score submission) with
 * auth, validation, happy path, upsert GREATEST logic, DB errors.
 */

// Mock next/server
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({ data, status: init?.status ?? 200 })),
  },
}));

// Mock rate limiter — always allow
jest.mock('@/lib/apiRateLimit', () => ({
  checkApiRateLimit: jest.fn().mockReturnValue({ success: true }),
}));

// Mock supabase server client (auth + data queries on the same client)
const mockGetUser = jest.fn();
const mockFrom = jest.fn();
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

// Mock sentry
jest.mock('@/utils/sentry', () => ({
  captureApiError: jest.fn(),
}));

// Mock weekly challenge config
jest.mock('@/lib/adventure/weeklyChallenge', () => ({
  getCurrentWeekId: jest.fn().mockReturnValue('2026-W13'),
}));

import { NextRequest } from 'next/server';
import { GET, POST } from '../route';

// ---------- Helpers ----------

const mockHeaders = { get: jest.fn().mockReturnValue('127.0.0.1') };

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
    jest.clearAllMocks();
  });

  it('returns weekly challenge leaderboard with weekId', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'weekly_challenge_scores') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
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
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
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
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
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
    jest.clearAllMocks();
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
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                lt: jest.fn().mockReturnValue({
                  select: jest.fn().mockReturnValue({
                    maybeSingle: jest.fn().mockResolvedValue({
                      data: (updateSucceeds && !updateError) ? { score: 1200 } : null,
                      error: updateError,
                    }),
                  }),
                }),
              }),
            }),
          }),
          // For the INSERT fallback path
          insert: jest.fn().mockResolvedValue({
            error: insertError ?? (existingScore ? { code: '23505', message: 'duplicate' } : null),
          }),
          // For re-reading current best after conflict
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: existingScore ?? { score: 1200 },
                  error: null,
                }),
              }),
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
