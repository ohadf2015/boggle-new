import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

const mockJson = vi.fn((data: unknown, init?: { status?: number }) => ({
  json: async () => data,
  status: init?.status ?? 200,
}));
vi.mock('next/server', () => ({
  NextRequest: vi.fn(),
  NextResponse: { json: (...args: unknown[]) => (mockJson as (...a: unknown[]) => unknown)(...args) },
}));

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/auth/getAuthedUser', () => ({
  getAuthedUser: vi.fn(),
}));

vi.mock('@/utils/sentry', () => ({
  captureApiError: vi.fn(),
}));

vi.mock('@/lib/posthog', () => ({
  getPostHogServer: vi.fn(() => null),
}));

import { GET, POST } from '../route';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

const mockGetAuthedUser = getAuthedUser as any;
const mockCreateClient = createClient as any;
const mockCreateAdminClient = createAdminClient as any;

const USER_ID = '11111111-2222-3333-4444-555555555555';

const req = (body?: unknown) =>
  ({
    url: 'https://www.lexiclash.live/api/coins',
    json: async () => body,
  } as any);

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/coins', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetAuthedUser.mockResolvedValueOnce(null);
    const res = await GET(req());
    expect(res.status).toBe(401);
  });

  it('returns user coin balance when authenticated', async () => {
    mockGetAuthedUser.mockResolvedValueOnce({
      id: USER_ID,
      email: 'test@test.com',
      role: 'authenticated',
    });

    mockCreateClient.mockResolvedValueOnce({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: { total_coins: 1000, lifetime_coins_earned: 5000 },
                error: null,
              })
            ),
          })),
        })),
      })),
    });

    const res = await GET(req());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ coins: 1000, lifetime: 5000 });
  });

  it('uses getAuthedUser helper for fast auth on GET (not auth.getUser)', async () => {
    mockGetAuthedUser.mockResolvedValueOnce({
      id: USER_ID,
      email: 'test@test.com',
      role: 'authenticated',
    });

    mockCreateClient.mockResolvedValueOnce({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: { total_coins: 500, lifetime_coins_earned: 2000 },
                error: null,
              })
            ),
          })),
        })),
      })),
    });

    const res = await GET(req());
    expect(res.status).toBe(200);
    // Verify getAuthedUser was called (fast path)
    expect(mockGetAuthedUser).toHaveBeenCalledWith(expect.any(Object));
  });

  it('returns 500 on database query error', async () => {
    mockGetAuthedUser.mockResolvedValueOnce({
      id: USER_ID,
      email: 'test@test.com',
      role: 'authenticated',
    });

    mockCreateClient.mockResolvedValueOnce({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: null,
                error: new Error('DB error'),
              })
            ),
          })),
        })),
      })),
    });

    const res = await GET(req());
    expect(res.status).toBe(500);
  });
});

describe('POST /api/coins', () => {
  it('returns 401 when not authenticated via auth.getUser', async () => {
    mockCreateClient.mockResolvedValueOnce({
      auth: {
        getUser: vi.fn(() => ({ data: { user: null } })),
      },
    });

    const res = await POST(req({ amount: 100, reason: 'test' }));
    expect(res.status).toBe(401);
  });

  it('POST still uses direct auth.getUser (not getAuthedUser helper)', async () => {
    const mockGetUser = vi.fn(() => ({ data: { user: { id: USER_ID } } }));
    mockCreateClient.mockResolvedValueOnce({ auth: { getUser: mockGetUser } });
    mockCreateAdminClient.mockReturnValueOnce({
      rpc: vi.fn(() => Promise.resolve({ data: [{ success: true, new_balance: 1500, error_message: null }], error: null })),
    });

    const res = await POST(req({ amount: 100, reason: 'test' }));
    expect(res.status).toBe(200);
    expect(mockGetUser).toHaveBeenCalled();
  });

  it.each([
    ['sync_coins', 'test'],
    ['award_ad_coins', 'Watched Ad'],
  ])('credits through the service-role client (%s is not executable by signed-in users)', async (rpcName, reason) => {
    const userRpc = vi.fn();
    const adminRpc = vi.fn(() => Promise.resolve({ data: [{ success: true, new_balance: 1500, error_message: null }], error: null }));
    mockCreateClient.mockResolvedValueOnce({ auth: { getUser: vi.fn(() => ({ data: { user: { id: USER_ID } } })) }, rpc: userRpc });
    mockCreateAdminClient.mockReturnValueOnce({ rpc: adminRpc });

    const res = await POST(req({ amount: 100, reason }));

    expect(res.status).toBe(200);
    expect(userRpc).not.toHaveBeenCalled();
    expect(adminRpc).toHaveBeenCalledWith(rpcName, expect.objectContaining({ p_user_id: USER_ID, p_amount: 100 }));
  });

  it('returns 500 when the service-role client is unavailable', async () => {
    mockCreateClient.mockResolvedValueOnce({ auth: { getUser: vi.fn(() => ({ data: { user: { id: USER_ID } } })) } });
    mockCreateAdminClient.mockReturnValueOnce(null);

    const res = await POST(req({ amount: 100, reason: 'test' }));
    expect(res.status).toBe(500);
  });
});
