// @ts-nocheck
/**
 * Education Record XP API Tests
 *
 * Verifies that education practice XP is persisted to the profiles table
 * via the increment_player_xp RPC.
 */

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({ data, status: init?.status ?? 200 })),
  },
}));

jest.mock('@/lib/apiRateLimit', () => ({
  checkApiRateLimit: jest.fn().mockReturnValue({ success: true }),
}));

jest.mock('@/utils/sentry', () => ({
  captureApiError: jest.fn(),
}));

const mockGetUser = jest.fn();
const mockRpc = jest.fn();

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    from: jest.fn().mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
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
    headers: { get: jest.fn().mockReturnValue('127.0.0.1') },
  } as unknown as NextRequest;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUser.mockResolvedValue({
    data: { user: { id: 'student-456' } },
    error: null,
  });
  mockRpc.mockResolvedValue({
    data: [{ new_total_xp: 200, new_level: 2, xp_granted: 50 }],
    error: null,
  });
});

describe('POST /api/education/record-xp', () => {
  const validBody = {
    xpAmount: 50,
    lessonId: 'lesson-123',
    activityType: 'flashcard',
  };

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Unauthorized' } });
    const result = await POST(makeRequest(validBody));
    expect(result.status).toBe(401);
  });

  it('returns 400 for invalid xpAmount', async () => {
    const result = await POST(makeRequest({ ...validBody, xpAmount: -5 }));
    expect(result.status).toBe(400);
  });

  it('returns 400 for xpAmount over 1000', async () => {
    const result = await POST(makeRequest({ ...validBody, xpAmount: 2000 }));
    expect(result.status).toBe(400);
  });

  it('returns 400 for missing lessonId', async () => {
    const result = await POST(makeRequest({ xpAmount: 50, activityType: 'flashcard' }));
    expect(result.status).toBe(400);
  });

  it('returns 400 for invalid activityType', async () => {
    const result = await POST(makeRequest({ ...validBody, activityType: 'hacking' }));
    expect(result.status).toBe(400);
  });

  it('calls increment_player_xp RPC and returns success', async () => {
    const result = await POST(makeRequest(validBody));
    expect(result.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.xpEarned).toBe(50);
    expect(result.data.newTotalXp).toBe(200);
    expect(result.data.newLevel).toBe(2);
    expect(mockRpc).toHaveBeenCalledWith('increment_player_xp', {
      p_player_id: 'student-456',
      p_xp_amount: 50,
    });
  });

  it('returns 500 when RPC fails', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } });
    const result = await POST(makeRequest(validBody));
    expect(result.status).toBe(500);
  });

  it('accepts all valid activity types', async () => {
    for (const type of ['flashcard', 'solo_board', 'lesson_completion', 'duel']) {
      mockRpc.mockResolvedValue({
        data: [{ new_total_xp: 100, new_level: 1, xp_granted: 50 }],
        error: null,
      });
      const result = await POST(makeRequest({ ...validBody, activityType: type }));
      expect(result.status).toBe(200);
    }
  });
});
