// @ts-nocheck
/**
 * Avatar Premium Part Purchase API Route Tests
 *
 * Server-side validated: client sends { category, partId }, server fetches
 * current gold/premium_avatar_parts from DB, validates premium status, deducts gold.
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

// Mock supabase server auth client
const mockGetUser = jest.fn();
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
}));

// Mock supabase service client
const mockFrom = jest.fn();
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn().mockReturnValue({
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

// Mock sentry
jest.mock('@/utils/sentry', () => ({
  captureApiError: jest.fn(),
}));

// Mock customAvatar premium helpers
jest.mock('@/shared/types/customAvatar', () => ({
  isPremiumPart: jest.fn((category: string, partId: string) => {
    const premiums: Record<string, string[]> = {
      eyes: ['laser', 'cyber'],
      accessory: ['crown', 'halo'],
    };
    return premiums[category]?.includes(partId) ?? false;
  }),
  getPartPrice: jest.fn((_category: string, _partId: string) => 75),
}));

import { NextRequest } from 'next/server';
import { POST } from '../route';
import { checkApiRateLimit } from '@/lib/apiRateLimit';

// ---------- Helpers ----------

function makeRequest(body: unknown): NextRequest {
  return {
    json: () => Promise.resolve(body),
    headers: { get: jest.fn().mockReturnValue('127.0.0.1') },
  } as unknown as NextRequest;
}

function makeInvalidJsonRequest(): NextRequest {
  return {
    json: () => Promise.reject(new Error('Invalid JSON')),
    headers: { get: jest.fn().mockReturnValue('127.0.0.1') },
  } as unknown as NextRequest;
}

function setupDbMocks({
  gold = 500,
  premiumParts = [] as string[],
  fetchError = null as { message?: string } | null,
  updateError = null as { message?: string } | null,
  updateReturnsNull = false,
} = {}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'profiles') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: fetchError ? null : { total_coins: gold, premium_avatar_parts: premiumParts },
              error: fetchError,
            }),
          }),
        }),
        update: jest.fn().mockImplementation((payload: Record<string, unknown>) => ({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: updateError || updateReturnsNull
                    ? null
                    : { total_coins: payload.total_coins, premium_avatar_parts: payload.premium_avatar_parts },
                  error: updateError,
                }),
              }),
            }),
          }),
        })),
      };
    }
    return {};
  });
}

// ---------- Tests ----------

describe('POST /api/avatar/purchase-part', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
  });

  // ===== RATE LIMIT =====
  it('returns 429 on rate limit', async () => {
    (checkApiRateLimit as jest.Mock).mockReturnValueOnce({ success: false });
    const res = await POST(makeRequest({ category: 'eyes', partId: 'laser' }));
    expect(res.status).toBe(429);
  });

  // ===== ENV VARS =====
  it('returns 503 when env vars missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const res = await POST(makeRequest({ category: 'eyes', partId: 'laser' }));
    expect(res.status).toBe(503);
  });

  // ===== AUTH =====
  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No session' } });
    const res = await POST(makeRequest({ category: 'eyes', partId: 'laser' }));
    expect(res.status).toBe(401);
  });

  // ===== INPUT VALIDATION =====
  it('returns 400 on invalid JSON body', async () => {
    const res = await POST(makeInvalidJsonRequest());
    expect(res.status).toBe(400);
    expect(res.data.error).toBe('Invalid JSON body');
  });

  it('returns 400 on invalid category or partId', async () => {
    const res = await POST(makeRequest({ category: 'fake', partId: 'nope' }));
    expect(res.status).toBe(400);
    expect(res.data.error).toBe('Invalid premium part');
  });

  // ===== AFFORDABILITY =====
  it('returns 400 when cannot afford', async () => {
    setupDbMocks({ gold: 10 });
    const res = await POST(makeRequest({ category: 'eyes', partId: 'laser' }));
    expect(res.status).toBe(400);
    expect(res.data.error).toBe('Insufficient gold');
  });

  // ===== ALREADY PURCHASED =====
  it('returns 400 when part already purchased', async () => {
    setupDbMocks({ gold: 500, premiumParts: ['eyes:laser'] });
    const res = await POST(makeRequest({ category: 'eyes', partId: 'laser' }));
    expect(res.status).toBe(400);
    expect(res.data.error).toBe('Part already purchased');
  });

  // ===== HAPPY PATH =====
  it('returns 200 on successful purchase', async () => {
    setupDbMocks({ gold: 200, premiumParts: [] });
    const res = await POST(makeRequest({ category: 'eyes', partId: 'laser' }));
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.gold).toBe(125); // 200 - 75
    expect(res.data.premiumAvatarParts).toEqual(['eyes:laser']);
  });

  // ===== OPTIMISTIC LOCK CONFLICT =====
  it('returns 409 on optimistic lock conflict', async () => {
    setupDbMocks({ gold: 200, premiumParts: [], updateReturnsNull: true });
    const res = await POST(makeRequest({ category: 'eyes', partId: 'laser' }));
    expect(res.status).toBe(409);
    expect(res.data.error).toBe('Purchase conflict, please retry');
  });
});
