/**
 * Adventure Achievements API Route Tests
 */

import { vi } from 'vitest';
// @ts-nocheck
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({ data, status: init?.status ?? 200, json: async () => data })),
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

import { GET, POST } from '../route';

function makeRequest(body?: unknown) {
  return {
    headers: { get: vi.fn().mockReturnValue('127.0.0.1') },
    json: async () => body,
  };
}

describe('GET /api/adventure/achievements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckApiRateLimit.mockReturnValue({ success: true });
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it('returns achievement counts for authenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    const mockCounts = { BOSS_SLAYER: 3, FIRST_WORD: 1 };
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data: { adventure_achievement_counts: mockCounts },
              error: null,
            }),
        }),
      }),
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    expect(res.data.counts).toEqual(mockCounts);
  });

  it('returns empty object when no achievements stored', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data: { adventure_achievement_counts: null },
              error: null,
            }),
        }),
      }),
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    expect(res.data.counts).toEqual({});
  });
});

describe('POST /api/adventure/achievements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckApiRateLimit.mockReturnValue({ success: true });
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await POST(makeRequest({ counts: { BOSS_SLAYER: 1 } }));
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid body', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    const res = await POST(makeRequest({ invalid: 'data' }));
    expect(res.status).toBe(400);
  });

  it('saves achievement counts for authenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ upsert: upsertMock });

    const counts = { BOSS_SLAYER: 2, FIRST_WORD: 1 };
    const res = await POST(makeRequest({ counts }));

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        adventure_achievement_counts: counts,
      }),
      expect.any(Object)
    );
  });

  it('returns 500 on DB error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    mockFrom.mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: { message: 'DB error' } }),
    });

    const res = await POST(makeRequest({ counts: { BOSS_SLAYER: 1 } }));
    expect(res.status).toBe(500);
  });
});
