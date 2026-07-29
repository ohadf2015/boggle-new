import { vi, type Mock } from 'vitest';
// @ts-nocheck
/**
 * Daily Avatar Part Claim Route Tests.
 *
 * Ad-rewarded placement: `avatar_daily_free_part`.
 * 24h cooldown. Grants random unowned premium part (no coin cost).
 * Auth-only. 400 ALL_PARTS_OWNED when collection full. 429 COOLDOWN_ACTIVE otherwise.
 */

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({ data, status: init?.status ?? 200 })),
  },
}));

vi.mock('@/lib/apiRateLimit', () => ({
  checkApiRateLimit: vi.fn().mockReturnValue({ success: true }),
}));

const mockGetUser = vi.fn();
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
}));

const mockFrom = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn().mockReturnValue({
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

vi.mock('@/utils/sentry', () => ({
  captureApiError: vi.fn(),
}));

// Fixed premium catalog: 3 eyes + 2 accessory = 5 total
vi.mock('@/shared/types/customAvatar', () => ({
  getPremiumParts: vi.fn((category: string) => {
    const map: Record<string, string[]> = {
      eyes: ['laser', 'cyber', 'glow'],
      accessory: ['crown', 'halo'],
    };
    return map[category] ?? [];
  }),
  PREMIUM_CATEGORIES: ['eyes', 'accessory'],
}));

import { NextRequest } from 'next/server';
import { POST, GET } from '../route';
import { checkApiRateLimit } from '@/lib/apiRateLimit';

function makeRequest(): NextRequest {
  return {
    json: () => Promise.resolve({}),
    headers: { get: vi.fn().mockReturnValue('127.0.0.1') },
  } as unknown as NextRequest;
}

function setupDbMocks({
  premiumParts = [] as string[],
  lastClaimAt = null as string | null,
  fetchError = null as { message?: string; code?: string } | null,
  updateError = null as { message?: string } | null,
} = {}) {
  const updateFn = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: updateError }),
  });
  mockFrom.mockImplementation((table: string) => {
    if (table === 'profiles') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: fetchError ? null : {
                premium_avatar_parts: premiumParts,
                last_daily_part_claim_at: lastClaimAt,
              },
              error: fetchError,
            }),
          }),
        }),
        update: updateFn,
      };
    }
    return {};
  });
  return { updateFn };
}

describe('POST /api/avatar/claim-daily-part', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
  });

  it('returns 429 on rate limit', async () => {
    (checkApiRateLimit as Mock).mockReturnValueOnce({ success: false });
    const res = await POST(makeRequest());
    expect(res.status).toBe(429);
  });

  it('returns 503 when env vars missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const res = await POST(makeRequest());
    expect(res.status).toBe(503);
  });

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No session' } });
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
  });

  it('returns 404 when profile fetch fails (non-missing error)', async () => {
    setupDbMocks({ fetchError: { code: 'OTHER', message: 'db down' } });
    const res = await POST(makeRequest());
    expect(res.status).toBe(404);
  });

  it('returns 429 when cooldown active (less than 24h since last claim)', async () => {
    const now = new Date('2026-04-22T12:00:00Z');
    vi.setSystemTime(now);
    const recent = new Date(now.getTime() - 10 * 60 * 60 * 1000).toISOString(); // 10h ago
    setupDbMocks({ lastClaimAt: recent });
    const res = await POST(makeRequest());
    expect(res.status).toBe(429);
    expect(res.data.error).toBe('COOLDOWN_ACTIVE');
    expect(res.data.nextClaimAt).toBeDefined();
  });

  it('returns 400 ALL_PARTS_OWNED when user owns every premium part', async () => {
    const allOwned = ['eyes:laser', 'eyes:cyber', 'eyes:glow', 'accessory:crown', 'accessory:halo'];
    setupDbMocks({ premiumParts: allOwned, lastClaimAt: null });
    const res = await POST(makeRequest());
    expect(res.status).toBe(400);
    expect(res.data.error).toBe('ALL_PARTS_OWNED');
  });

  it('grants a random unowned premium part and updates cooldown (first claim)', async () => {
    const { updateFn } = setupDbMocks({ premiumParts: [], lastClaimAt: null });
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.granted).toMatch(/^(eyes|accessory):[a-z]+$/);
    expect(updateFn).toHaveBeenCalledTimes(1);
    const updatePayload = updateFn.mock.calls[0][0];
    expect(updatePayload.premium_avatar_parts).toHaveLength(1);
    expect(updatePayload.last_daily_part_claim_at).toBeDefined();
  });

  it('grants part when cooldown has expired (>=24h since last claim)', async () => {
    const now = new Date('2026-04-22T12:00:00Z');
    vi.setSystemTime(now);
    const stale = new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString();
    setupDbMocks({ premiumParts: ['eyes:laser'], lastClaimAt: stale });
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
  });

  it('never grants an already-owned part', async () => {
    // Own 4 of 5 — only eyes:glow free
    const owned = ['eyes:laser', 'eyes:cyber', 'accessory:crown', 'accessory:halo'];
    setupDbMocks({ premiumParts: owned, lastClaimAt: null });
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(res.data.granted).toBe('eyes:glow');
  });

  describe('GET /api/avatar/claim-daily-part (status)', () => {
    it('returns eligible=true when never claimed and unowned remain', async () => {
      setupDbMocks({ premiumParts: ['eyes:laser'], lastClaimAt: null });
      const res = await GET(makeRequest());
      expect(res.status).toBe(200);
      expect(res.data.cooldownActive).toBe(false);
      expect(res.data.unownedCount).toBe(4);
      expect(res.data.eligible).toBe(true);
      expect(res.data.nextClaimAt).toBeNull();
    });

    it('returns cooldownActive=true when <24h since last claim', async () => {
      const now = new Date('2026-04-22T12:00:00Z');
      vi.setSystemTime(now);
      const recent = new Date(now.getTime() - 10 * 60 * 60 * 1000).toISOString();
      setupDbMocks({ premiumParts: [], lastClaimAt: recent });
      const res = await GET(makeRequest());
      expect(res.status).toBe(200);
      expect(res.data.cooldownActive).toBe(true);
      expect(res.data.eligible).toBe(false);
      expect(res.data.nextClaimAt).toBeDefined();
    });

    it('returns eligible=false when all parts owned', async () => {
      const allOwned = ['eyes:laser', 'eyes:cyber', 'eyes:glow', 'accessory:crown', 'accessory:halo'];
      setupDbMocks({ premiumParts: allOwned, lastClaimAt: null });
      const res = await GET(makeRequest());
      expect(res.status).toBe(200);
      expect(res.data.unownedCount).toBe(0);
      expect(res.data.eligible).toBe(false);
    });

    it('returns 401 when not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No session' } });
      const res = await GET(makeRequest());
      expect(res.status).toBe(401);
    });
  });

  it('returns 500 when parts update fails', async () => {
    setupDbMocks({
      premiumParts: [],
      lastClaimAt: null,
      updateError: { message: 'write failed' },
    });
    const res = await POST(makeRequest());
    expect(res.status).toBe(500);
  });
});
