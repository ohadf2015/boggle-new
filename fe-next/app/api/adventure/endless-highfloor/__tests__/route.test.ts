import { vi } from 'vitest';
// @ts-nocheck
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({ data, status: init?.status ?? 200 })),
  },
}));

const mockCheckApiRateLimit = vi.fn().mockReturnValue({ success: true });
vi.mock('@/lib/apiRateLimit', () => ({
  checkApiRateLimit: (...args: unknown[]) => mockCheckApiRateLimit(...args),
}));

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));

import { NextRequest } from 'next/server';
import { POST } from '../route';

const mockHeaders = { get: vi.fn().mockReturnValue('127.0.0.1') };

function makeRequest(body: unknown): NextRequest {
  return {
    json: () => Promise.resolve(body),
    headers: mockHeaders,
  } as unknown as NextRequest;
}

function makeBadJsonRequest(): NextRequest {
  return {
    json: () => Promise.reject(new Error('Invalid JSON')),
    headers: mockHeaders,
  } as unknown as NextRequest;
}

describe('POST /api/adventure/endless-highfloor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckApiRateLimit.mockReturnValue({ success: true });
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          lt: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { endless_high_floor: 50 },
                error: null,
              }),
            }),
          }),
        }),
      }),
    });
  });

  // ===== AUTH =====
  describe('Authentication', () => {
    it('rejects unauthenticated requests with 401', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No session' } });
      const res = await POST(makeRequest({ floor: 10 }));
      expect(res.status).toBe(401);
    });
  });

  // ===== VALIDATION =====
  describe('Input validation', () => {
    it('rejects non-number floor with 400', async () => {
      const res = await POST(makeRequest({ floor: 'abc' }));
      expect(res.status).toBe(400);
      expect(res.data.error).toContain('Invalid floor');
    });

    it('rejects floor 0 with 400', async () => {
      const res = await POST(makeRequest({ floor: 0 }));
      expect(res.status).toBe(400);
      expect(res.data.error).toContain('Invalid floor');
    });

    it('rejects floor 10000 with 400', async () => {
      const res = await POST(makeRequest({ floor: 10000 }));
      expect(res.status).toBe(400);
      expect(res.data.error).toContain('Invalid floor');
    });

    it('rejects invalid JSON with 400', async () => {
      const res = await POST(makeBadJsonRequest());
      expect(res.status).toBe(400);
      expect(res.data.error).toContain('Invalid JSON');
    });
  });

  // ===== SECURITY: FLOOR SKIP =====
  describe('SECURITY: Sequential floor validation', () => {
    it('rejects floor that skips ahead (current=10, requested=50)', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { endless_high_floor: 10 },
              error: null,
            }),
          }),
        }),
      });

      const res = await POST(makeRequest({ floor: 50 }));
      expect(res.status).toBe(400);
      expect(res.data.error).toContain('sequential');
    });

    it('allows incrementing by 1 (current=10, requested=11)', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { endless_high_floor: 10 },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            lt: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { endless_high_floor: 11 },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const res = await POST(makeRequest({ floor: 11 }));
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
    });

    it('allows floor 1 when no existing record', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { endless_high_floor: null },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            lt: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { endless_high_floor: 1 },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const res = await POST(makeRequest({ floor: 1 }));
      expect(res.status).toBe(200);
    });

    it('allows replaying a lower floor', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { endless_high_floor: 20 },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            lt: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116', message: 'No rows' },
                }),
              }),
            }),
          }),
        }),
      });

      // Floor 5 is below current high (20), so it's a replay — no update but OK
      const res = await POST(makeRequest({ floor: 5 }));
      expect(res.status).toBe(200);
      expect(res.data.updated).toBe(false);
    });
  });

  // ===== HAPPY PATH =====
  describe('Happy path', () => {
    it('saves new record and returns updated: true', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { endless_high_floor: 49 },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            lt: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { endless_high_floor: 50 },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const res = await POST(makeRequest({ floor: 50 }));
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.updated).toBe(true);
      expect(res.data.highFloor).toBe(50);
    });
  });

  // ===== DB ERRORS =====
  describe('Database errors', () => {
    it('returns 500 on DB error', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { endless_high_floor: 9 },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            lt: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'INTERNAL', message: 'DB down' },
                }),
              }),
            }),
          }),
        }),
      });

      const res = await POST(makeRequest({ floor: 10 }));
      expect(res.status).toBe(500);
      expect(res.data.error).toContain('Failed to update');
    });
  });
});
