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

/** Set up mockFrom to return player_level on select and succeed on update */
function setupMocks(playerLevel = 10) {
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { player_level: playerLevel },
          error: null,
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
  });
}

describe('POST /api/adventure/skill-tree', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckApiRateLimit.mockReturnValue({ success: true });
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    setupMocks(10);
  });

  // ===== AUTH =====
  describe('Authentication', () => {
    it('rejects unauthenticated requests with 401', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No session' } });
      const res = await POST(makeRequest({ skillTree: { sword: 1 }, skillPoints: 5 }));
      expect(res.status).toBe(401);
    });
  });

  // ===== VALIDATION =====
  describe('Input validation', () => {
    it('rejects array skillTree with 400', async () => {
      const res = await POST(makeRequest({ skillTree: [1, 2], skillPoints: 5 }));
      expect(res.status).toBe(400);
      expect(res.data.error).toContain('Invalid skill tree');
    });

    it('rejects null skillTree with 400', async () => {
      const res = await POST(makeRequest({ skillTree: null, skillPoints: 5 }));
      expect(res.status).toBe(400);
      expect(res.data.error).toContain('Invalid skill tree');
    });

    it('rejects negative skillPoints with 400', async () => {
      const res = await POST(makeRequest({ skillTree: { sword: 1 }, skillPoints: -1 }));
      expect(res.status).toBe(400);
      expect(res.data.error).toContain('Invalid skill points');
    });

    it('rejects skillPoints > 1000 with 400', async () => {
      const res = await POST(makeRequest({ skillTree: { sword: 1 }, skillPoints: 1001 }));
      expect(res.status).toBe(400);
      expect(res.data.error).toContain('Invalid skill points');
    });

    it('rejects skill value > 100 with 400', async () => {
      const res = await POST(makeRequest({ skillTree: { sword: 101 }, skillPoints: 5 }));
      expect(res.status).toBe(400);
      expect(res.data.error).toContain('Invalid skill entry');
    });

    it('rejects negative skill value with 400', async () => {
      const res = await POST(makeRequest({ skillTree: { sword: -1 }, skillPoints: 5 }));
      expect(res.status).toBe(400);
      expect(res.data.error).toContain('Invalid skill entry');
    });

    it('rejects too many skills with 400', async () => {
      const bigTree: Record<string, number> = {};
      for (let i = 0; i < 51; i++) bigTree[`skill${i}`] = 1;
      const res = await POST(makeRequest({ skillTree: bigTree, skillPoints: 5 }));
      expect(res.status).toBe(400);
      expect(res.data.error).toContain('Too many skills');
    });
  });

  // ===== SECURITY: SKILL POINT BUDGET =====
  describe('SECURITY: Skill point budget validation', () => {
    it('rejects when allocated + available exceeds player level budget', async () => {
      // Player level 5 → max 4 points (level-1). Tree has 2 skills + 5 available = 7 > 4
      setupMocks(5);
      const res = await POST(makeRequest({ skillTree: { sword: 1, shield: 1 }, skillPoints: 5 }));
      expect(res.status).toBe(400);
      expect(res.data.error).toContain('Skill point budget exceeded');
    });

    it('allows exactly matching budget', async () => {
      // Player level 10 → max 9 points. Tree has 3 skills + 6 available = 9
      setupMocks(10);
      const res = await POST(makeRequest({ skillTree: { sword: 1, shield: 1, axe: 1 }, skillPoints: 6 }));
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
    });

    it('allows empty tree with all points unspent', async () => {
      setupMocks(5);
      const res = await POST(makeRequest({ skillTree: {}, skillPoints: 4 }));
      expect(res.status).toBe(200);
    });

    it('rejects inflated skillPoints for level 1 player', async () => {
      setupMocks(1); // level 1 → 0 max points
      const res = await POST(makeRequest({ skillTree: {}, skillPoints: 999 }));
      expect(res.status).toBe(400);
      expect(res.data.error).toContain('Skill point budget exceeded');
    });
  });

  // ===== HAPPY PATH =====
  describe('Happy path', () => {
    it('saves valid skill tree and returns success', async () => {
      setupMocks(20); // level 20 → 19 max points, 8 allocated + 10 available = 18 ≤ 19
      const res = await POST(makeRequest({ skillTree: { sword: 5, shield: 3 }, skillPoints: 10 }));
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith('player_progression');
    });
  });

  // ===== DB ERRORS =====
  describe('Database errors', () => {
    it('returns 500 when update fails', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { player_level: 10 },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'DB down' } }),
        }),
      });
      const res = await POST(makeRequest({ skillTree: { sword: 1 }, skillPoints: 5 }));
      expect(res.status).toBe(500);
      expect(res.data.error).toContain('Failed to save skill tree');
    });
  });
});
