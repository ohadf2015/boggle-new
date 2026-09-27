import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mockGetUser }, from: mockFrom }),
}));

import { GET } from '../route';

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
});

describe('GET /api/boosts/status', () => {
  it('401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'x' } });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns remaining + cap + resetAt', async () => {
    const today = new Date().toISOString().slice(0, 10);
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { daily_boost_count: 2, last_boost_reset_date: today },
            error: null,
          }),
        }),
      }),
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.capPerDay).toBe(5);
    expect(body.remaining).toBe(3);
    expect(body.resetAt).toMatch(/T00:00:00/);
  });

  it('returns 5 remaining when last_boost_reset_date < today (defensive read)', async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { daily_boost_count: 5, last_boost_reset_date: '2020-01-01' },
            error: null,
          }),
        }),
      }),
    });
    const res = await GET();
    const body = await res.json();
    expect(body.remaining).toBe(5);
  });

  it('404 when profile not found', async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
        }),
      }),
    });
    const res = await GET();
    expect(res.status).toBe(404);
  });
});
