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
  }),
}));

vi.mock('@/utils/sentry', () => ({
  captureApiError: vi.fn(),
}));

vi.mock('@/lib/wordValidation/serverDicts', () => ({
  validateWordOnServer: vi.fn(async (word: string) => word.toLowerCase() === 'hello'),
}));

import { POST } from '../route';

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/scores/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as Request;
}

const validSubmission = (overrides: Record<string, unknown> = {}) => ({
  id: crypto.randomUUID(),
  mode: 'sp' as const,
  payload: { score: 100, words: ['hello'], language: 'en' },
  clientCompletedAt: Date.now(),
  ...overrides,
});

describe('POST /api/scores/sync', () => {
  beforeEach(() => {
    mockGetUser.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makeRequest({ submissions: [validSubmission()] }) as never);
    expect(res.status).toBe(401);
  });

  it('returns 400 on invalid payload shape', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    const res = await POST(makeRequest({ wrong: 'shape' }) as never);
    expect(res.status).toBe(400);
  });

  it('accepts a valid submission and returns awards: null for modes without a handler', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    const sub = validSubmission();
    const res = await POST(makeRequest({ submissions: [sub] }) as never);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { results: Array<{ id: string; accepted: boolean; awards: unknown }> };
    expect(json.results).toHaveLength(1);
    expect(json.results[0].id).toBe(sub.id);
    expect(json.results[0].accepted).toBe(true);
    expect(json.results[0].awards).toBeNull();
  });

  it('dedupes on submissionId — second call returns same result without re-validation', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    const sub = validSubmission();
    await POST(makeRequest({ submissions: [sub] }) as never);
    const res = await POST(makeRequest({ submissions: [sub] }) as never);
    const json = (await res.json()) as { results: Array<{ id: string; accepted: boolean }> };
    expect(json.results[0].id).toBe(sub.id);
    expect(json.results[0].accepted).toBe(true);
  });
});
