import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', () => ({
  NextResponse: Object.assign(
    function NR(this: unknown, body: BodyInit | null, init?: ResponseInit) {
      return new Response(body, init);
    },
    {
      json: (data: unknown, init?: ResponseInit) =>
        new Response(JSON.stringify(data), {
          status: init?.status ?? 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    },
  ),
}));

vi.mock('@/lib/apiRateLimit', () => ({
  checkApiRateLimit: vi.fn().mockReturnValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

const mockGetUser = vi.fn();
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    }),
  }),
}));

vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));
vi.mock('@/lib/wordValidation/serverDicts', () => ({
  validateWordOnServer: vi.fn(async (word: string) => word.toLowerCase() === 'hello'),
}));
vi.mock('@/lib/posthog', () => ({ getPostHogServer: vi.fn(() => null) }));

import { POST } from '../route';

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/scores/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as Request;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function dailySub(mode: string, puzzleDate: string, overrides: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    mode,
    payload: { score: 100, words: ['hello'], language: 'en', puzzleDate },
    clientCompletedAt: Date.now(),
    ...overrides,
  };
}

describe('POST /api/scores/sync — puzzle_expired date guard', () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
  });

  afterEach(() => { vi.clearAllMocks(); });

  const DAILY_MODES = ['wotd', 'daily-survival', 'daily-wordhunt'] as const;

  for (const mode of DAILY_MODES) {
    it(`rejects ${mode} with puzzleDate 3 days ago`, async () => {
      const sub = dailySub(mode, daysAgo(3));
      const res = await POST(makeRequest({ submissions: [sub] }) as never);
      const json = (await res.json()) as { results: Array<{ accepted: boolean; reason?: string }> };
      expect(json.results[0].accepted).toBe(false);
      expect(json.results[0].reason).toBe('puzzle_expired');
    });

    it(`accepts ${mode} with puzzleDate today`, async () => {
      const sub = dailySub(mode, daysAgo(0));
      const res = await POST(makeRequest({ submissions: [sub] }) as never);
      const json = (await res.json()) as { results: Array<{ accepted: boolean }> };
      expect(json.results[0].accepted).toBe(true);
    });

    it(`accepts ${mode} with puzzleDate yesterday`, async () => {
      const sub = dailySub(mode, daysAgo(1));
      const res = await POST(makeRequest({ submissions: [sub] }) as never);
      const json = (await res.json()) as { results: Array<{ accepted: boolean }> };
      expect(json.results[0].accepted).toBe(true);
    });
  }

  it('does not apply date guard to sp mode with old puzzleDate', async () => {
    const sub = {
      id: crypto.randomUUID(),
      mode: 'sp',
      payload: { score: 100, words: ['hello'], language: 'en', puzzleDate: daysAgo(10) },
      clientCompletedAt: Date.now(),
    };
    const res = await POST(makeRequest({ submissions: [sub] }) as never);
    const json = (await res.json()) as { results: Array<{ accepted: boolean; reason?: string }> };
    expect(json.results[0].reason).not.toBe('puzzle_expired');
    expect(json.results[0].accepted).toBe(true);
  });

  it('applies guard even when puzzleDate is missing for daily modes (treats as expired)', async () => {
    const sub = {
      id: crypto.randomUUID(),
      mode: 'daily-wordhunt',
      payload: { score: 100, words: ['hello'], language: 'en' },
      clientCompletedAt: Date.now(),
    };
    const res = await POST(makeRequest({ submissions: [sub] }) as never);
    const json = (await res.json()) as { results: Array<{ accepted: boolean; reason?: string }> };
    expect(json.results[0].accepted).toBe(false);
    expect(json.results[0].reason).toBe('puzzle_expired');
  });
});
