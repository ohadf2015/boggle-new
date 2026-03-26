import { vi, type Mock, } from 'vitest';
// @ts-nocheck
/**
 * Tests for /api/cron/select-daily-words
 *
 * SECURITY NOTE: The GET handler uses `authHeader !== \`Bearer \${cronSecret}\``
 * for secret comparison. This is timing-unsafe — an attacker can use timing
 * side-channels to brute-force the secret character by character.
 * Should use crypto.timingSafeEqual() instead.
 */

// Mock next/server before imports
const mockJson = vi.fn((data: any, init?: any) => ({
  json: async () => data,
  status: init?.status ?? 200,
}));

vi.mock('next/server', () => ({
  NextRequest: vi.fn(),
  NextResponse: { json: (...args: any[]) => mockJson(...args) },
}));

vi.mock('@/utils/sentry', () => ({
  captureApiError: vi.fn(),
}));

const mockVerifyAdminAuth = vi.fn();
vi.mock('@/lib/auth/adminAuth', () => ({
  verifyAdminAuth: (...args: any[]) => mockVerifyAdminAuth(...args),
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { GET, POST } from '../route';
import { captureApiError } from '@/utils/sentry';

function makeRequest(method: string, headers: Record<string, string> = {}) {
  return {
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
    method,
  } as any;
}

describe('/api/cron/select-daily-words', () => {
  const CRON_SECRET = 'test-cron-secret-123';
  const SUPABASE_URL = 'https://test.supabase.co';
  const SERVICE_KEY = 'test-service-role-key';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = CRON_SECRET;
    process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_KEY;
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  describe('GET (cron)', () => {
    it('rejects request with missing authorization header', async () => {
      const req = makeRequest('GET');
      const res = await GET(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error).toBe('Unauthorized');
    });

    it('rejects request with wrong secret', async () => {
      const req = makeRequest('GET', { authorization: 'Bearer wrong-secret' });
      const res = await GET(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error).toBe('Unauthorized');
    });

    it('rejects request when CRON_SECRET env var is missing', async () => {
      delete process.env.CRON_SECRET;
      const req = makeRequest('GET', { authorization: 'Bearer anything' });
      const res = await GET(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error).toBe('Unauthorized');
    });

    /**
     * SECURITY: Documents timing-unsafe secret comparison.
     * The route uses !== which leaks timing info. An attacker can determine
     * correct characters by measuring response time differences.
     * Fix: use crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
     */
    it('SECURITY: uses timing-unsafe !== for secret comparison', async () => {
      // This test documents the vulnerability — the comparison is on line 37:
      // `authHeader !== \`Bearer \${cronSecret}\``
      // Both correct and incorrect secrets take the same code path to line 37,
      // but !== is not constant-time.
      const req = makeRequest('GET', { authorization: `Bearer ${CRON_SECRET}` });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ summary: 'ok' }),
      });
      const res = await GET(req);
      expect(res.status).toBe(200);
    });

    it('returns 500 when Supabase config is missing', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      const req = makeRequest('GET', { authorization: `Bearer ${CRON_SECRET}` });
      const res = await GET(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('Missing Supabase configuration');
    });

    it('returns 500 when SUPABASE_SERVICE_ROLE_KEY is missing', async () => {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      const req = makeRequest('GET', { authorization: `Bearer ${CRON_SECRET}` });
      const res = await GET(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('Missing Supabase configuration');
    });

    it('calls edge function and returns result on success', async () => {
      const edgeResult = { summary: '7 days generated', words: ['hello'] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => edgeResult,
      });

      const req = makeRequest('GET', { authorization: `Bearer ${CRON_SECRET}` });
      const res = await GET(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Daily word selection complete');
      expect(body.summary).toBe('7 days generated');

      expect(mockFetch).toHaveBeenCalledWith(
        `${SUPABASE_URL}/functions/v1/daily-word-selector`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SERVICE_KEY}`,
          },
        }
      );
    });

    it('forwards edge function error status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 502,
        text: async () => 'Bad Gateway',
      });

      const req = makeRequest('GET', { authorization: `Bearer ${CRON_SECRET}` });
      const res = await GET(req);
      const body = await res.json();

      expect(res.status).toBe(502);
      expect(body.error).toBe('Edge Function failed');
      expect(body.details).toBe('Bad Gateway');
    });

    it('handles empty response from edge function', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const req = makeRequest('GET', { authorization: `Bearer ${CRON_SECRET}` });
      const res = await GET(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
    });

    it('catches fetch errors and returns 500', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      const req = makeRequest('GET', { authorization: `Bearer ${CRON_SECRET}` });
      const res = await GET(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.success).toBe(false);
      expect(body.message).toBe('Network failure');
      expect(captureApiError).toHaveBeenCalled();
    });

    it('handles non-Error throw in catch block', async () => {
      mockFetch.mockRejectedValueOnce('string error');

      const req = makeRequest('GET', { authorization: `Bearer ${CRON_SECRET}` });
      const res = await GET(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.message).toBe('string error');
    });
  });

  describe('POST (admin manual trigger)', () => {
    it('rejects unauthenticated admin request', async () => {
      const mockResponse = mockJson({ error: 'Unauthorized' }, { status: 401 });
      mockVerifyAdminAuth.mockResolvedValueOnce({
        success: false,
        response: mockResponse,
      });

      const req = makeRequest('POST');
      const res = await POST(req);

      expect(res.status).toBe(401);
    });

    it('returns 500 when Supabase config missing', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      mockVerifyAdminAuth.mockResolvedValueOnce({ success: true } as any);

      const req = makeRequest('POST');
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('Missing Supabase configuration');
    });

    it('calls edge function and returns result with duration', async () => {
      mockVerifyAdminAuth.mockResolvedValueOnce({ success: true } as any);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ summary: 'done' }),
      });

      const req = makeRequest('POST');
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Manual selection complete');
      expect(typeof body.duration).toBe('number');
    });

    it('forwards edge function error', async () => {
      mockVerifyAdminAuth.mockResolvedValueOnce({ success: true } as any);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal error',
      });

      const req = makeRequest('POST');
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('Edge Function failed');
    });

    it('catches errors and reports to Sentry', async () => {
      mockVerifyAdminAuth.mockResolvedValueOnce({ success: true } as any);
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const req = makeRequest('POST');
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('Connection refused');
      expect(captureApiError).toHaveBeenCalledWith(
        expect.any(Error),
        '/api/cron/select-daily-words',
        { method: 'POST', statusCode: 500 }
      );
    });
  });
});
