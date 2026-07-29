import { vi, type Mock, } from 'vitest';
// @ts-nocheck
/**
 * Adventure Attempt API Route Tests
 *
 * Covers auth, validation, happy path, DB errors, rate limiting
 * for both POST and GET endpoints.
 */

// Mock next/server
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({ data, status: init?.status ?? 200 })),
  },
}));

// Mock rate limiter — always allow by default
vi.mock('@/lib/apiRateLimit', () => ({
  checkApiRateLimit: vi.fn().mockReturnValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

// Mock supabase server client (auth + data queries on the same client)
const mockGetUser = vi.fn();
const mockRpc = vi.fn();
const mockFrom = vi.fn();
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

// Mock sentry
vi.mock('@/utils/sentry', () => ({
  captureApiError: vi.fn(),
}));

import { NextRequest } from 'next/server';
import { POST, GET } from '../route';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
const mockCheckApiRateLimit = vi.mocked(checkApiRateLimit);

// ---------- Helpers ----------

const mockHeaders = { get: vi.fn().mockReturnValue('127.0.0.1') };

function makeRequest(body: unknown): NextRequest {
  return {
    json: () => Promise.resolve(body),
    headers: mockHeaders,
  } as unknown as NextRequest;
}

function makeGetRequest(): NextRequest {
  return {
    headers: mockHeaders,
  } as unknown as NextRequest;
}

const validBody = {
  world: 1,
  level: 1,
  words: 5,
  score: 200,
  timeRemaining: 30,
  objectiveProgress: {},
  isCompletion: false,
};

const mockAttemptResponse = {
  world: 1,
  level: 1,
  best_words: 5,
  best_score: 200,
  best_time_remaining: 30,
  objective_progress: {},
  attempt_count: 1,
  consecutive_failures: 0,
  last_attempt_at: '2026-01-01T00:00:00Z',
};

// ---------- POST Tests ----------

describe('POST /api/adventure/attempt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckApiRateLimit.mockReturnValue({ success: true });
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    mockRpc.mockResolvedValue({
      data: mockAttemptResponse,
      error: null,
    });
  });

  // ===== AUTH =====
  describe('Authentication', () => {
    it('rejects unauthenticated requests with 401', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No session' } });
      const res = await POST(makeRequest(validBody));
      expect(res.status).toBe(401);
    });
  });

  // ===== VALIDATION =====
  describe('Input validation', () => {
    it('rejects missing required fields with 400', async () => {
      const res = await POST(makeRequest({ world: 1 }));
      expect(res.status).toBe(400);
      expect(res.data.error).toContain('Missing required fields');
    });

    it('accepts world 0 (endless mode sentinel)', async () => {
      const res = await POST(makeRequest({ ...validBody, world: 0 }));
      expect(res.status).toBe(200);
    });

    it('rejects world out of range (11) with 400', async () => {
      const res = await POST(makeRequest({ ...validBody, world: 11 }));
      expect(res.status).toBe(400);
      expect(res.data.error).toContain('Invalid world');
    });

    it('rejects level > 10 with 400', async () => {
      const res = await POST(makeRequest({ ...validBody, level: 11 }));
      expect(res.status).toBe(400);
      expect(res.data.error).toContain('Invalid level');
    });

    it('rejects level < 1 with 400', async () => {
      const res = await POST(makeRequest({ ...validBody, level: 0 }));
      expect(res.status).toBe(400);
      expect(res.data.error).toContain('Invalid level');
    });

    it('rejects negative score with 400', async () => {
      const res = await POST(makeRequest({ ...validBody, score: -1 }));
      expect(res.status).toBe(400);
      expect(res.data.error).toContain('non-negative');
    });

    it('rejects negative words with 400', async () => {
      const res = await POST(makeRequest({ ...validBody, words: -1 }));
      expect(res.status).toBe(400);
      expect(res.data.error).toContain('non-negative');
    });

    it('rejects negative timeRemaining with 400', async () => {
      const res = await POST(makeRequest({ ...validBody, timeRemaining: -5 }));
      expect(res.status).toBe(400);
      expect(res.data.error).toContain('non-negative');
    });
  });

  // ===== HAPPY PATH =====
  describe('Happy path', () => {
    it('records attempt and returns 200 with transformed data', async () => {
      const res = await POST(makeRequest(validBody));
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.attempt).toEqual({
        world: 1,
        level: 1,
        bestWords: 5,
        bestScore: 200,
        bestTimeRemaining: 30,
        objectiveProgress: {},
        attemptCount: 1,
        consecutiveFailures: 0,
        lastAttemptAt: '2026-01-01T00:00:00Z',
      });
    });

    it('calls rpc with correct parameters', async () => {
      await POST(makeRequest(validBody));
      expect(mockRpc).toHaveBeenCalledWith('record_level_attempt', {
        p_user_id: 'user-1',
        p_world: 1,
        p_level: 1,
        p_words: 5,
        p_score: 200,
        p_time_remaining: 30,
        p_objective_progress: {},
        p_is_completion: false,
      });
    });

    it('defaults isCompletion to false when not provided', async () => {
      const { isCompletion, ...bodyWithoutCompletion } = validBody;
      await POST(makeRequest(bodyWithoutCompletion));
      expect(mockRpc).toHaveBeenCalledWith(
        'record_level_attempt',
        expect.objectContaining({ p_is_completion: false })
      );
    });

    it('treats non-object objectiveProgress as empty object', async () => {
      await POST(makeRequest({ ...validBody, objectiveProgress: 'invalid' }));
      expect(mockRpc).toHaveBeenCalledWith(
        'record_level_attempt',
        expect.objectContaining({ p_objective_progress: {} })
      );
    });
  });

  // ===== DB ERRORS =====
  describe('Database errors', () => {
    it('returns 503 when rpc fails with 42883 (function missing)', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { code: '42883', message: 'function does not exist' },
      });
      const res = await POST(makeRequest(validBody));
      expect(res.status).toBe(503);
      expect(res.data.error).toContain('temporarily unavailable');
    });

    it('returns 503 when rpc fails with 42P01 (table missing)', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { code: '42P01', message: 'relation does not exist' },
      });
      const res = await POST(makeRequest(validBody));
      expect(res.status).toBe(503);
      expect(res.data.error).toContain('temporarily unavailable');
    });

    it('returns 500 when rpc fails with generic error', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { code: 'INTERNAL', message: 'something broke' },
      });
      const res = await POST(makeRequest(validBody));
      expect(res.status).toBe(500);
      expect(res.data.error).toBe('Failed to record attempt');
    });
  });

  // ===== RATE LIMITING =====
  describe('Rate limiting', () => {
    it('returns 429 when rate limited', async () => {
      mockCheckApiRateLimit.mockReturnValue({ success: false });
      const res = await POST(makeRequest(validBody));
      expect(res.status).toBe(429);
      expect(res.data.error).toContain('Too many requests');
    });
  });
});

// ---------- GET Tests ----------

describe('GET /api/adventure/attempt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckApiRateLimit.mockReturnValue({ success: true });
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
  });

  // ===== AUTH =====
  describe('Authentication', () => {
    it('rejects unauthenticated requests with 401', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No session' } });
      const res = await GET(makeGetRequest());
      expect(res.status).toBe(401);
    });
  });

  // ===== HAPPY PATH =====
  describe('Happy path', () => {
    it('returns transformed attempts with 200', async () => {
      const dbAttempts = [
        {
          world: 1,
          level: 1,
          best_words: 5,
          best_score: 200,
          best_time_remaining: 30,
          objective_progress: {},
          attempt_count: 1,
          consecutive_failures: 0,
          first_attempt_at: '2026-01-01T00:00:00Z',
          last_attempt_at: '2026-01-01T00:00:00Z',
        },
        {
          world: 1,
          level: 2,
          best_words: 8,
          best_score: 350,
          best_time_remaining: 15,
          objective_progress: { wordsFound: 3 },
          attempt_count: 3,
          consecutive_failures: 1,
          first_attempt_at: '2026-01-01T00:00:00Z',
          last_attempt_at: '2026-01-02T00:00:00Z',
        },
      ];

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: dbAttempts,
                error: null,
              }),
            }),
          }),
        }),
      });

      const res = await GET(makeGetRequest());
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.attempts).toHaveLength(2);
      expect(res.data.attempts[0]).toEqual({
        world: 1,
        level: 1,
        bestWords: 5,
        bestScore: 200,
        bestTimeRemaining: 30,
        objectiveProgress: {},
        attemptCount: 1,
        consecutiveFailures: 0,
        firstAttemptAt: '2026-01-01T00:00:00Z',
        lastAttemptAt: '2026-01-01T00:00:00Z',
      });
      expect(res.data.attempts[1]).toEqual({
        world: 1,
        level: 2,
        bestWords: 8,
        bestScore: 350,
        bestTimeRemaining: 15,
        objectiveProgress: { wordsFound: 3 },
        attemptCount: 3,
        consecutiveFailures: 1,
        firstAttemptAt: '2026-01-01T00:00:00Z',
        lastAttemptAt: '2026-01-02T00:00:00Z',
      });
    });

    it('returns empty array when no attempts exist', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      });

      const res = await GET(makeGetRequest());
      expect(res.status).toBe(200);
      expect(res.data.attempts).toEqual([]);
    });
  });

  // ===== DB ERRORS =====
  describe('Database errors', () => {
    it('returns 500 when fetch fails', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'INTERNAL', message: 'DB down' },
              }),
            }),
          }),
        }),
      });

      const res = await GET(makeGetRequest());
      expect(res.status).toBe(500);
      expect(res.data.error).toBe('Failed to fetch attempts');
    });
  });
});
