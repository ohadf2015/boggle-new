import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

const mockJson = vi.fn((data: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
  json: async () => data,
  status: init?.status ?? 200,
  headers: init?.headers ? new Map(Object.entries(init.headers)) : new Map(),
  get: (key: string) => (init?.headers ? init.headers[key] : undefined),
}));
vi.mock('next/server', () => ({
  NextRequest: vi.fn(),
  NextResponse: { json: (...args: unknown[]) => (mockJson as (...a: unknown[]) => unknown)(...args) },
}));

vi.mock('@/lib/apiRateLimit', () => ({
  checkApiRateLimit: vi.fn(() => ({ success: true })),
}));

vi.mock('@/lib/auth/getAuthedUser', () => ({
  getAuthedUser: vi.fn(),
}));

vi.mock('@/lib/email', () => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock('@/utils/sentry', () => ({
  captureApiError: vi.fn(),
}));

import { GET } from '../route';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { getSupabaseAdmin } from '@/lib/email';

const mockGetAuthedUser = getAuthedUser as any;
const mockGetSupabaseAdmin = getSupabaseAdmin as any;

const USER_ID = '11111111-2222-3333-4444-555555555555';

const req = () =>
  ({ url: 'https://www.lexiclash.live/api/word-tower/leaderboard' } as any);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAuthedUser.mockResolvedValue({ id: USER_ID, email: 'test@test.com', role: 'authenticated' });
  mockGetSupabaseAdmin.mockReturnValue({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        gt: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      })),
    })),
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/word-tower/leaderboard', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetAuthedUser.mockResolvedValueOnce(null);
    const res = await GET(req());
    expect(res.status).toBe(401);
  });

  it('returns 503 when Supabase admin client unavailable', async () => {
    mockGetSupabaseAdmin.mockReturnValueOnce(null);
    const res = await GET(req());
    expect(res.status).toBe(503);
  });

  it('returns leaderboard with a PRIVATE Cache-Control header on success', async () => {
    const res = await GET(req());
    expect(res.status).toBe(200);
    // Response rows carry per-user `isYou` — header MUST be private (not public),
    // so a shared CDN/proxy can never serve one user's leaderboard to another.
    const cc = res.headers.get?.('Cache-Control') ?? '';
    expect(cc).toBe('private, max-age=30, stale-while-revalidate=60');
    expect(cc).not.toContain('public');
  });

  it('does not set Cache-Control on error responses', async () => {
    mockGetSupabaseAdmin.mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          gt: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({ data: null, error: new Error('DB error') })),
            })),
          })),
        })),
      })),
    });
    const res = await GET(req());
    expect(res.status).toBe(500);
    // Error responses should not have cache headers
    expect(res.headers.get?.('Cache-Control')).toBeUndefined();
  });
});
