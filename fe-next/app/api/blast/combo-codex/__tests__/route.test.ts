import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

const mockJson = vi.fn((data: unknown, init?: { status?: number }) => ({
  json: async () => data,
  status: init?.status ?? 200,
}));

vi.mock('next/server', () => ({
  NextRequest: vi.fn(),
  NextResponse: { json: (...args: unknown[]) => (mockJson as (...a: unknown[]) => unknown)(...args) },
}));

vi.mock('@/lib/auth/getAuthedUser', () => ({
  getAuthedUser: vi.fn(),
}));

vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/utils/sentry', () => ({
  captureApiError: vi.fn(),
}));

vi.mock('@/lib/apiRateLimit', () => ({
  checkApiRateLimit: vi.fn(() => ({ success: true })),
}));

import { GET } from '../route';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { createAdminClient } from '@/utils/supabase/admin';

const mockGetAuthedUser = getAuthedUser as any;
const mockCreateAdminClient = createAdminClient as any;

const USER_ID = '11111111-2222-3333-4444-555555555555';

const req = () =>
  ({
    url: 'https://www.lexiclash.live/api/blast/combo-codex',
  } as any);

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/blast/combo-codex', () => {
  it('returns 401 when not authenticated (getAuthedUser yields null)', async () => {
    mockGetAuthedUser.mockResolvedValueOnce(null);

    const res = await GET(req());
    expect(res.status).toBe(401);
  });

  it('returns 200 with discovered combos when authenticated', async () => {
    mockGetAuthedUser.mockResolvedValueOnce({
      id: USER_ID,
      email: 'test@test.com',
      role: 'authenticated',
    });

    mockCreateAdminClient.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: { discovered_combos: ['combo1', 'combo2'] },
                error: null,
              })
            ),
          })),
        })),
      })),
    });

    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(mockGetAuthedUser).toHaveBeenCalledWith(expect.any(Object));
  });

  it('uses getAuthedUser helper for fast auth on GET (not auth.getUser)', async () => {
    mockGetAuthedUser.mockResolvedValueOnce({
      id: USER_ID,
      email: 'test@test.com',
      role: 'authenticated',
    });

    mockCreateAdminClient.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: { discovered_combos: [] },
                error: null,
              })
            ),
          })),
        })),
      })),
    });

    await GET(req());
    expect(mockGetAuthedUser).toHaveBeenCalledWith(expect.any(Object));
  });
});
