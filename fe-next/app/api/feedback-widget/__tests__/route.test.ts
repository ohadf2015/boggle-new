import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';

/**
 * Tests for POST /api/feedback-widget — same-origin proxy that forwards the
 * floating feedback widget's submissions to the feedback-devtools ingest API.
 * The SDK token must stay server-side and autoProcess must stay off.
 *
 * Upstream fetch is intercepted via MSW (see vitest.setup.ts).
 */

// next/server
vi.mock('next/server', () => ({
  NextRequest: vi.fn(),
  NextResponse: {
    json: vi.fn((data: Record<string, unknown>, init?: { status?: number }) => ({
      json: async () => data,
      status: init?.status || 200,
      headers: new Map(),
    })),
  },
}));

// Rate limiter — allow by default
const mockCheckRateLimit = vi.fn();
vi.mock('@/lib/apiRateLimit', () => ({
  checkApiRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  rateLimitResponse: () => ({ json: async () => ({ error: 'rate limited' }), status: 429 }),
  addRateLimitHeaders: (res: unknown) => res,
}));

vi.mock('@/utils/logger', () => ({
  default: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));

import { POST } from '../route';

const UPSTREAM_URL = 'https://feedback-server.test/api/v1/feedback';

interface CapturedRequest {
  headers: Headers;
  body: Record<string, unknown>;
}

function captureUpstream(
  respond: () => HttpResponse = () => HttpResponse.json({ id: 'fb-123' }),
): { requests: CapturedRequest[] } {
  const requests: CapturedRequest[] = [];
  server.use(
    http.post(UPSTREAM_URL, async ({ request }) => {
      requests.push({
        headers: request.headers,
        body: (await request.json()) as Record<string, unknown>,
      });
      return respond();
    }),
  );
  return { requests };
}

beforeAll(() => {
  process.env.FEEDBACK_SDK_TOKEN = 'fdt_test_token';
  process.env.FEEDBACK_API_URL = 'https://feedback-server.test';
});

function makeRequest(body: Record<string, unknown>, contentLength?: number) {
  return {
    json: async () => body,
    headers: {
      get: (n: string) =>
        n === 'content-length' && contentLength !== undefined ? String(contentLength) : null,
    },
  } as unknown as Parameters<typeof POST>[0];
}

const validBody = {
  changeType: 'fix_bug',
  whatToChange: 'The letter wheel froze after the last round ended',
  authorEmail: 'player@example.com',
  pageContext: {
    url: 'https://www.lexiclash.live/he/multiplayer',
    title: 'LexiClash',
    userAgent: 'Mozilla/5.0 (iPhone)',
    locale: 'he',
    viewport: { width: 390, height: 844 },
  },
};

describe('POST /api/feedback-widget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockReturnValue({ success: true, remaining: 4, resetTime: Date.now() });
  });

  it('forwards a valid submission with the SDK token header and autoProcess off', async () => {
    const { requests } = captureUpstream();
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    expect(requests).toHaveLength(1);

    expect(requests[0].headers.get('x-sdk-token')).toBe('fdt_test_token');
    expect(requests[0].body.changeType).toBe('fix_bug');
    expect(requests[0].body.whatToChange).toBe(validBody.whatToChange);
    expect(requests[0].body.autoProcess).toBe(false);
    const ctx = requests[0].body.pageContext as Record<string, unknown>;
    expect(ctx.url).toBe(validBody.pageContext.url);
    expect(ctx.locale).toBe('he');
  });

  it('falls back to whatToChange when expectedBehavior is missing', async () => {
    const { requests } = captureUpstream();
    await POST(makeRequest(validBody));
    expect(requests[0].body.expectedBehavior).toBe(validBody.whatToChange);
  });

  it('rejects an empty message with 400 and forwards nothing', async () => {
    const { requests } = captureUpstream();
    const res = await POST(makeRequest({ ...validBody, whatToChange: '   ' }));
    expect(res.status).toBe(400);
    expect(requests).toHaveLength(0);
  });

  it('rejects a missing pageContext.url with 400', async () => {
    const { requests } = captureUpstream();
    const res = await POST(makeRequest({ ...validBody, pageContext: {} }));
    expect(res.status).toBe(400);
    expect(requests).toHaveLength(0);
  });

  it('maps an unknown changeType to "other" instead of rejecting', async () => {
    const { requests } = captureUpstream();
    await POST(makeRequest({ ...validBody, changeType: 'hack_the_planet' }));
    expect(requests[0].body.changeType).toBe('other');
  });

  it('drops an invalid authorEmail instead of failing the submission', async () => {
    const { requests } = captureUpstream();
    await POST(makeRequest({ ...validBody, authorEmail: 'not-an-email' }));
    expect(requests[0].body.authorEmail).toBeUndefined();
  });

  it('rejects oversized bodies with 413 before parsing', async () => {
    const { requests } = captureUpstream();
    const res = await POST(makeRequest(validBody, 2_000_000));
    expect(res.status).toBe(413);
    expect(requests).toHaveLength(0);
  });

  it('drops a non-image screenshotDataUrl', async () => {
    const { requests } = captureUpstream();
    await POST(makeRequest({ ...validBody, screenshotDataUrl: 'data:text/html;base64,PGI+' }));
    expect(requests[0].body.screenshotDataUrl).toBeUndefined();
  });

  it('keeps a valid image screenshotDataUrl', async () => {
    const { requests } = captureUpstream();
    const shot = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
    await POST(makeRequest({ ...validBody, screenshotDataUrl: shot }));
    expect(requests[0].body.screenshotDataUrl).toBe(shot);
  });

  it('returns 503 when the SDK token is not configured', async () => {
    const { requests } = captureUpstream();
    vi.stubEnv('FEEDBACK_SDK_TOKEN', '');
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(503);
    expect(requests).toHaveLength(0);
    vi.unstubAllEnvs();
  });

  it('returns 429 when rate limited', async () => {
    const { requests } = captureUpstream();
    mockCheckRateLimit.mockReturnValue({ success: false, blocked: true, remaining: 0, resetTime: Date.now() });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(429);
    expect(requests).toHaveLength(0);
  });

  it('returns 502 when the upstream ingest rejects the submission', async () => {
    captureUpstream(() => HttpResponse.text('unauthorized', { status: 401 }));
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(502);
  });
});
