import { vi, type Mock, } from 'vitest';
// @ts-nocheck
/**
 * Adventure Quest Progress API Route Tests
 *
 * Covers auth, validation, merging logic, word album, DB errors, rate limiting.
 */

// Mock next/server
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({ data, status: init?.status ?? 200 })),
  },
}));

// Mock rate limiter — always allow (overridden in rate-limit test)
const mockCheckApiRateLimit = vi.fn().mockReturnValue({ success: true });
vi.mock('@/lib/apiRateLimit', () => ({
  checkApiRateLimit: (...args: unknown[]) => mockCheckApiRateLimit(...args),
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

import { NextRequest } from 'next/server';
import { POST } from '../route';

// ---------- Helpers ----------

const mockHeaders = { get: vi.fn().mockReturnValue('127.0.0.1') };

function makeRequest(body: unknown): NextRequest {
  return {
    json: () => Promise.resolve(body),
    headers: mockHeaders,
  } as unknown as NextRequest;
}

function setupDbMocks({
  existingProgress = {} as Record<string, number>,
  selectError = null as { code?: string; message?: string } | null,
  updateError = null as { code?: string; message?: string } | null,
} = {}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'player_progression') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: selectError
                ? null
                : { chapter_quest_progress: existingProgress },
              error: selectError,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: updateError ? null : { user_id: 'user-1' },
            error: updateError,
          }),
        }),
      };
    }
    return {};
  });
}

// ---------- Tests ----------

describe('POST /api/adventure/quest-progress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
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
      const res = await POST(makeRequest({ chapterQuestProgress: { q1: 1 } }));
      expect(res.status).toBe(401);
      expect(res.data.error).toBe('Unauthorized');
    });
  });

  // ===== VALIDATION =====
  describe('Validation', () => {
    it('returns 400 for missing chapterQuestProgress', async () => {
      const res = await POST(makeRequest({}));
      expect(res.status).toBe(400);
      expect(res.data.error).toBe('Invalid quest progress data');
    });

    it('returns 400 for negative values in progress', async () => {
      const res = await POST(makeRequest({ chapterQuestProgress: { q1: -5 } }));
      expect(res.status).toBe(400);
      expect(res.data.error).toBe('Invalid quest progress values');
    });
  });

  // ===== HAPPY PATH =====
  describe('Happy path', () => {
    it('returns 200 and merges progress (keeps highest values)', async () => {
      setupDbMocks({
        existingProgress: { q1: 3, q2: 5 },
      });

      const res = await POST(makeRequest({
        chapterQuestProgress: { q1: 7, q2: 2, q3: 1 },
      }));

      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);

      // Verify the update was called with merged data
      const updateCall = mockFrom.mock.results[1].value.update;
      const payload = updateCall.mock.calls[0][0];
      expect(payload.chapter_quest_progress).toEqual({ q1: 7, q2: 5, q3: 1 });
    });

    it('ignores wordAlbum (words only accepted via /api/adventure/complete)', async () => {
      setupDbMocks({
        existingAlbum: ['HELLO', 'WORLD'],
      });

      const res = await POST(makeRequest({
        chapterQuestProgress: { q1: 1 },
        wordAlbum: ['world', 'test', 'New'],
      }));

      expect(res.status).toBe(200);

      const updateCall = mockFrom.mock.results[1].value.update;
      const payload = updateCall.mock.calls[0][0];
      // word_album should NOT be in the update payload
      expect(payload.word_album).toBeUndefined();
    });
  });

  // ===== DB ERRORS =====
  describe('Database errors', () => {
    it('returns 500 when update fails', async () => {
      setupDbMocks({
        updateError: { code: 'INTERNAL', message: 'write failed' },
      });

      const res = await POST(makeRequest({ chapterQuestProgress: { q1: 1 } }));
      expect(res.status).toBe(500);
      expect(res.data.error).toBe('Failed to save quest progress');
    });
  });

  // ===== RATE LIMITING =====
  describe('Rate limiting', () => {
    it('returns 429 when rate limited', async () => {
      mockCheckApiRateLimit.mockReturnValue({ success: false });
      const res = await POST(makeRequest({ chapterQuestProgress: { q1: 1 } }));
      expect(res.status).toBe(429);
      expect(res.data.error).toBe('Too many requests');
    });
  });
});
