import { vi, type Mock, } from 'vitest';
// @ts-nocheck
/**
 * Avatar Premium Part Purchase API Route Tests
 *
 * Server-side validated: client sends { category, partId }, server fetches
 * current gold/premium_avatar_parts from DB, validates premium status,
 * deducts gold via sync_coins RPC, then saves parts.
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

// Mock supabase server auth client
const mockGetUser = vi.fn();
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
}));

// Mock supabase service client
const mockFrom = vi.fn();
const mockRpc = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn().mockReturnValue({
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  }),
}));

// Mock sentry
vi.mock('@/utils/sentry', () => ({
  captureApiError: vi.fn(),
}));

// Mock customAvatar premium helpers
vi.mock('@/shared/types/customAvatar', () => ({
  isPremiumPart: vi.fn((category: string, partId: string) => {
    const premiums: Record<string, string[]> = {
      eyes: ['laser', 'cyber'],
      accessory: ['crown', 'halo'],
    };
    return premiums[category]?.includes(partId) ?? false;
  }),
  getPartPrice: vi.fn((_category: string, _partId: string) => 75),
}));

import { NextRequest } from 'next/server';
import { POST } from '../route';
import { checkApiRateLimit } from '@/lib/apiRateLimit';

// ---------- Helpers ----------

function makeRequest(body: unknown): NextRequest {
  return {
    json: () => Promise.resolve(body),
    headers: { get: vi.fn().mockReturnValue('127.0.0.1') },
  } as unknown as NextRequest;
}

function makeInvalidJsonRequest(): NextRequest {
  return {
    json: () => Promise.reject(new Error('Invalid JSON')),
    headers: { get: vi.fn().mockReturnValue('127.0.0.1') },
  } as unknown as NextRequest;
}

function setupDbMocks({
  gold = 500,
  premiumParts = [] as string[],
  fetchError = null as { message?: string } | null,
  rpcError = null as { message?: string } | null,
  rpcInsufficientFunds = false,
  partsUpdateError = null as { message?: string } | null,
} = {}) {
  // Mock profiles.select for initial fetch
  mockFrom.mockImplementation((table: string) => {
    if (table === 'profiles') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: fetchError ? null : { total_coins: gold, premium_avatar_parts: premiumParts },
              error: fetchError,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: partsUpdateError,
          }),
        }),
      };
    }
    return {};
  });

  // Mock sync_coins RPC
  mockRpc.mockImplementation((fnName: string) => {
    if (fnName === 'sync_coins') {
      if (rpcError) {
        return Promise.resolve({ data: null, error: rpcError });
      }
      if (rpcInsufficientFunds) {
        return Promise.resolve({
          data: [{ success: false, new_balance: gold, error_message: 'Insufficient coins' }],
          error: null,
        });
      }
      return Promise.resolve({
        data: [{ success: true, new_balance: gold - 75, error_message: null }],
        error: null,
      });
    }
    return Promise.resolve({ data: null, error: null });
  });
}

// ---------- Tests ----------

describe('POST /api/avatar/purchase-part', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
  });

  // ===== RATE LIMIT =====
  it('returns 429 on rate limit', async () => {
    (checkApiRateLimit as Mock).mockReturnValueOnce({ success: false });
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

  // ===== SYNC_COINS RPC FAILURE =====
  it('returns 500 on sync_coins RPC failure', async () => {
    setupDbMocks({ gold: 200, premiumParts: [], rpcError: { message: 'DB error' } });
    const res = await POST(makeRequest({ category: 'eyes', partId: 'laser' }));
    expect(res.status).toBe(500);
    expect(res.data.error).toBe('Failed to process payment');
  });

  // ===== INSUFFICIENT FUNDS VIA RPC =====
  it('returns 400 when sync_coins reports insufficient funds', async () => {
    setupDbMocks({ gold: 200, premiumParts: [], rpcInsufficientFunds: true });
    const res = await POST(makeRequest({ category: 'eyes', partId: 'laser' }));
    expect(res.status).toBe(400);
    expect(res.data.error).toBe('Insufficient coins');
  });

  // ===== PARTS SAVE FAILURE (triggers refund) =====
  it('returns 500 and refunds when parts save fails', async () => {
    setupDbMocks({ gold: 200, premiumParts: [], partsUpdateError: { message: 'Write failed' } });
    const res = await POST(makeRequest({ category: 'eyes', partId: 'laser' }));
    expect(res.status).toBe(500);
    expect(res.data.error).toBe('Failed to save purchase');
    // Verify refund RPC was called (second rpc call)
    expect(mockRpc).toHaveBeenCalledTimes(2);
    expect(mockRpc.mock.calls[1][0]).toBe('sync_coins');
    expect(mockRpc.mock.calls[1][1].p_amount).toBe(75); // refund amount
  });
});
