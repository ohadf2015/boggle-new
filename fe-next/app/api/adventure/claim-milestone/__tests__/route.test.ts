import { vi, type Mock, } from 'vitest';
// @ts-nocheck
/**
 * Word Album Milestone Claim API Route Tests
 *
 * Covers auth, validation, happy path, DB errors, optimistic lock.
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

// Mock word album milestones
vi.mock('@/lib/adventure/wordAlbum', () => ({
  WORD_ALBUM_MILESTONES: [
    { target: 50, gold: 50, xp: 25, badge: 'collector-bronze' },
    { target: 100, gold: 100, xp: 50, badge: 'collector-silver' },
  ],
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
  gold = 200,
  xp = 100,
  wordAlbum = [] as string[],
  claimedMilestones = [] as number[],
  fetchError = null as { code?: string; message?: string } | null,
  updateData = undefined as Record<string, unknown> | undefined,
  updateError = null as { code?: string; message?: string } | null,
} = {}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'player_progression') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: fetchError
                ? null
                : { gold, xp, word_album: wordAlbum, word_album_claimed_milestones: claimedMilestones },
              error: fetchError,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: updateData !== undefined
                      ? updateData
                      : (updateError ? null : { gold: gold + 50, xp: xp + 25 }),
                    error: updateError,
                  }),
                }),
              }),
            }),
          }),
        }),
      };
    }
    return {};
  });
}

// ---------- Tests ----------

describe('POST /api/adventure/claim-milestone', () => {
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
      const res = await POST(makeRequest({ milestoneTarget: 50 }));
      expect(res.status).toBe(401);
      expect(res.data.error).toBe('Unauthorized');
    });
  });

  // ===== VALIDATION =====
  describe('Validation', () => {
    it('returns 400 for invalid milestone target (non-number)', async () => {
      const res = await POST(makeRequest({ milestoneTarget: 'abc' }));
      expect(res.status).toBe(400);
      expect(res.data.error).toBe('Invalid milestone target');
    });

    it('returns 400 for unknown milestone (target not in config)', async () => {
      const res = await POST(makeRequest({ milestoneTarget: 999 }));
      expect(res.status).toBe(400);
      expect(res.data.error).toBe('Unknown milestone');
    });

    it('returns 400 for not enough words', async () => {
      setupDbMocks({
        wordAlbum: new Array(30).fill('WORD'), // 30 < 50
      });

      const res = await POST(makeRequest({ milestoneTarget: 50 }));
      expect(res.status).toBe(400);
      expect(res.data.error).toBe('Not enough words for this milestone');
    });

    it('returns 400 for already claimed milestone', async () => {
      setupDbMocks({
        wordAlbum: new Array(60).fill('WORD'),
        claimedMilestones: [50],
      });

      const res = await POST(makeRequest({ milestoneTarget: 50 }));
      expect(res.status).toBe(400);
      expect(res.data.error).toBe('Milestone already claimed');
    });
  });

  // ===== HAPPY PATH =====
  describe('Happy path', () => {
    it('returns 200 and awards gold + xp for valid claim', async () => {
      setupDbMocks({
        gold: 200,
        xp: 100,
        wordAlbum: new Array(55).fill('WORD'),
        claimedMilestones: [],
      });

      const res = await POST(makeRequest({ milestoneTarget: 50 }));
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.gold).toBe(250); // 200 + 50
      expect(res.data.xp).toBe(125);  // 100 + 25
      expect(res.data.claimedMilestones).toEqual([50]);
      expect(res.data.reward).toEqual({ gold: 50, xp: 25, badge: 'collector-bronze' });
    });
  });

  // ===== DB ERRORS =====
  describe('Database errors', () => {
    it('returns 500 when update fails', async () => {
      setupDbMocks({
        wordAlbum: new Array(55).fill('WORD'),
        claimedMilestones: [],
        updateError: { code: 'INTERNAL', message: 'write failed' },
      });

      const res = await POST(makeRequest({ milestoneTarget: 50 }));
      expect(res.status).toBe(500);
      expect(res.data.error).toBe('Failed to claim milestone');
    });
  });

  // ===== OPTIMISTIC LOCK =====
  describe('Optimistic lock', () => {
    it('returns 409 when updatedRow is null (concurrent modification)', async () => {
      setupDbMocks({
        wordAlbum: new Array(55).fill('WORD'),
        claimedMilestones: [],
        updateData: null, // null = 0 rows matched (gold changed concurrently)
      });

      const res = await POST(makeRequest({ milestoneTarget: 50 }));
      expect(res.status).toBe(409);
      expect(res.data.error).toContain('Concurrent');
    });
  });
});
