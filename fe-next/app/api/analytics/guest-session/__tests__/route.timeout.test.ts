import { vi, describe, it, beforeAll, beforeEach, afterEach, expect } from 'vitest';

vi.mock('next/server', () => ({
  NextRequest: vi.fn(),
  NextResponse: {
    json: vi.fn((data: Record<string, unknown>, init?: { status?: number }) => ({
      json: async () => data,
      status: init?.status || 200,
    })),
  },
}));

vi.mock('@/lib/apiRateLimit', () => ({
  checkApiRateLimit: () => ({ success: true }),
  rateLimitResponse: () => ({ status: 429, json: async () => ({ error: 'rate' }) }),
}));

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}));

const hangForever = () => new Promise<never>(() => { /* never resolves */ });

vi.mock('@/backend/modules/guestTracker', () => ({
  getOrCreateGuestSession: vi.fn(() => hangForever()),
  updateGuestSession: vi.fn(() => hangForever()),
  getGuestSession: vi.fn(() => hangForever()),
  linkGuestSessionToUser: vi.fn(() => hangForever()),
}));

import { POST } from '../route';

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function makePostRequest(body: Record<string, unknown>) {
  return {
    url: 'http://localhost/api/analytics/guest-session',
    json: async () => body,
    headers: { get: () => '127.0.0.1' },
  } as unknown as Parameters<typeof POST>[0];
}

describe('POST /api/analytics/guest-session — wall-clock cap', () => {
  it('returns 504 within 4s when guestTracker hangs (does not block 30s)', async () => {
    const req = makePostRequest({
      action: 'create',
      sessionId: 'sess_aaaaaaaaaaaaaaaa',
    });

    const responsePromise = POST(req);

    // Advance just past the 4s wall-clock cap
    await vi.advanceTimersByTimeAsync(4_001);

    const response = (await responsePromise) as { status: number; json: () => Promise<{ error: string }> };
    expect(response.status).toBe(504);
    const body = await response.json();
    expect(body.error).toMatch(/timeout/i);
  });
});
