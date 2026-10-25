import { vi } from 'vitest';
// @ts-nocheck
/**
 * Education Record XP API Tests
 *
 * Verifies that education practice XP is persisted to the profiles table
 * via the increment_player_xp RPC.
 */

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({ data, status: init?.status ?? 200 })),
  },
}));

vi.mock('@/lib/apiRateLimit', () => ({
  checkApiRateLimit: vi.fn().mockReturnValue({ success: true }),
}));

const mockClaimOnce = vi.fn();
vi.mock('@/lib/server/claimOnce', () => ({ claimOnce: (...args) => mockClaimOnce(...args) }));

vi.mock('@/utils/sentry', () => ({
  captureApiError: vi.fn(),
}));

const mockGetUser = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    from: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
    rpc: (...args) => mockRpc(...args),
  }),
}));

import { NextRequest } from 'next/server';
import { POST } from '../route';

function makeRequest(body: unknown): NextRequest {
  return {
    json: () => Promise.resolve(body),
    headers: { get: vi.fn().mockReturnValue('127.0.0.1') },
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({
    data: { user: { id: 'student-456' } },
    error: null,
  });
  mockRpc.mockResolvedValue({
    data: [{ new_total_xp: 200, new_level: 2, xp_granted: 50 }],
    error: null,
  });
  mockClaimOnce.mockResolvedValue('claimed');
});

describe('POST /api/education/record-xp', () => {
  const connections = { xpAmount: 20, lessonId: 'connections-game', activityType: 'connections' };
  const chest = { xpAmount: 25, lessonId: 'academy-daily-chest', activityType: 'daily_challenge' };

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Unauthorized' } });
    const result = await POST(makeRequest(connections));
    expect(result.status).toBe(401);
  });

  it('returns 400 for a non-positive amount', async () => {
    const result = await POST(makeRequest({ ...connections, xpAmount: -5 }));
    expect(result.status).toBe(400);
  });

  it('awards a connections solve and returns the new total', async () => {
    const result = await POST(makeRequest(connections));
    expect(result.status).toBe(200);
    expect(result.data).toMatchObject({ success: true, xpEarned: 20, newTotalXp: 200, newLevel: 2 });
    expect(mockRpc).toHaveBeenCalledWith('increment_player_xp', { p_player_id: 'student-456', p_xp_amount: 20 });
  });

  it('never awards more than the best connections solve is worth (hard + streak = 53)', async () => {
    await POST(makeRequest({ ...connections, xpAmount: 1000 }));
    expect(mockRpc).toHaveBeenCalledWith('increment_player_xp', { p_player_id: 'student-456', p_xp_amount: 53 });
  });

  it('pays the daily chest its fixed 25 whatever the client asks for', async () => {
    await POST(makeRequest({ ...chest, xpAmount: 999 }));
    expect(mockRpc).toHaveBeenCalledWith('increment_player_xp', { p_player_id: 'student-456', p_xp_amount: 25 });
    expect(mockClaimOnce).toHaveBeenCalledWith(expect.stringMatching(/^edu-daily-chest:student-456:\d{4}-\d{2}-\d{2}$/), expect.any(Number));
  });

  it('pays the daily chest once per day', async () => {
    mockClaimOnce.mockResolvedValue('taken');
    const result = await POST(makeRequest(chest));
    expect(result.status).toBe(200);
    expect(result.data).toMatchObject({ success: true, xpEarned: 0, alreadyClaimed: true });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('withholds the chest when the once-only store is down', async () => {
    mockClaimOnce.mockResolvedValue('unavailable');
    const result = await POST(makeRequest(chest));
    expect(result.status).toBe(503);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it.each(['flashcard', 'solo_board', 'lesson_completion', 'duel', 'not_a_real_type'])(
    'rejects %s, whose XP is awarded server-side elsewhere or not at all',
    async (activityType) => {
      const result = await POST(makeRequest({ ...connections, activityType }));
      expect(result.status).toBe(400);
      expect(mockRpc).not.toHaveBeenCalled();
    },
  );

  it('rejects a daily_challenge that is not the chest', async () => {
    const result = await POST(makeRequest({ ...chest, lessonId: 'lesson-123' }));
    expect(result.status).toBe(400);
  });

  it('returns 500 when RPC fails', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } });
    const result = await POST(makeRequest(connections));
    expect(result.status).toBe(500);
  });
});
