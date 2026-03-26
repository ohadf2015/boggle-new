import { vi, type Mock, } from 'vitest';
// @ts-nocheck
/**
 * Tests for POST /api/validate-word
 * Core gameplay API — every game mode depends on this.
 */

// Set env vars so getSupabase() returns a mock client
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// Polyfill Response.json for jsdom (lacks full fetch API)
if (typeof globalThis.Response === 'undefined' || !globalThis.Response.json) {
  class MockResponse {
    _body: unknown;
    status: number;
    constructor(body?: string, init?: { status?: number }) {
      this._body = body ? JSON.parse(body) : {};
      this.status = init?.status || 200;
    }
    async json() { return this._body; }
    static json(data: unknown, init?: { status?: number }) {
      return new MockResponse(JSON.stringify(data), init);
    }
  }
  globalThis.Response = MockResponse as unknown as typeof Response;
}

// Mock rate limiter
vi.mock('@/lib/apiRateLimit', () => ({
  checkApiRateLimit: vi.fn().mockReturnValue({ success: true }),
  rateLimitResponse: vi.fn().mockReturnValue({
    json: async () => ({ error: 'Rate limited' }),
    status: 429,
  }),
}));

// Mock Supabase
const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({
              limit: () => ({
                maybeSingle: mockMaybeSingle,
              }),
            }),
          }),
        }),
      }),
    }),
  }),
}));

// Mock sentry
vi.mock('@/utils/sentry', () => ({
  captureApiError: vi.fn(),
}));

// Mock english words — include a known word
vi.mock('an-array-of-english-words', () => ['hello', 'world', 'cat', 'dog', 'test']);

// Mock spanish words
vi.mock('an-array-of-spanish-words', () => ['hola', 'mundo', 'gato']);

// Mock fs for lazy-loaded dictionaries
vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(false),
  readFileSync: vi.fn().mockReturnValue(''),
}));

// Mock word normalization
vi.mock('@/shared/utils/wordNormalization', () => ({
  normalizeHebrewWord: (w: string) => w,
  normalizeSpanishWord: (w: string) => w.toLowerCase(),
}));

import { POST } from '../route';
import { checkApiRateLimit, rateLimitResponse } from '@/lib/apiRateLimit';

function makeRequest(body: Record<string, unknown>) {
  return {
    json: async () => body,
    headers: {
      get: (name: string) => {
        if (name === 'x-forwarded-for') return '127.0.0.1';
        return null;
      },
    },
  } as unknown as Parameters<typeof POST>[0];
}

function makeBadJsonRequest() {
  return {
    json: async () => { throw new Error('Invalid JSON'); },
    headers: {
      get: () => '127.0.0.1',
    },
  } as unknown as Parameters<typeof POST>[0];
}

describe('POST /api/validate-word', () => {
  const origWarn = console.warn;
  const origError = console.error;

  beforeEach(() => {
    vi.clearAllMocks();
    (checkApiRateLimit as Mock).mockReturnValue({ success: true });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    console.warn = vi.fn();
    console.error = vi.fn();
  });

  afterEach(() => {
    console.warn = origWarn;
    console.error = origError;
  });

  // --- Input validation ---

  it('rejects missing word', async () => {
    const res = await POST(makeRequest({ language: 'en' }));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.isValid).toBe(false);
    expect(json.reason).toBe('Invalid word format');
  });

  it('rejects null word', async () => {
    const res = await POST(makeRequest({ word: null, language: 'en' }));
    expect(res.status).toBe(400);
  });

  it('rejects numeric word', async () => {
    const res = await POST(makeRequest({ word: 123, language: 'en' }));
    expect(res.status).toBe(400);
  });

  it('rejects empty string word', async () => {
    const res = await POST(makeRequest({ word: '', language: 'en' }));
    expect(res.status).toBe(400);
  });

  it('rejects single-character word (too short)', async () => {
    const res = await POST(makeRequest({ word: 'a', language: 'en' }));
    const json = await res.json();
    expect(json.isValid).toBe(false);
    expect(json.reason).toBe('Word must be at least 2 letters');
  });

  it('rejects whitespace-only word', async () => {
    const res = await POST(makeRequest({ word: '   ', language: 'en' }));
    const json = await res.json();
    expect(json.isValid).toBe(false);
  });

  // --- Language validation ---

  it('defaults to English when language omitted', async () => {
    const res = await POST(makeRequest({ word: 'hello' }));
    const json = await res.json();
    expect(json.isValid).toBe(true);
    expect(json.source).toBe('dictionary');
  });

  it('accepts valid language: en', async () => {
    const res = await POST(makeRequest({ word: 'hello', language: 'en' }));
    const json = await res.json();
    expect(json.isValid).toBe(true);
  });

  it('accepts valid language: es', async () => {
    const res = await POST(makeRequest({ word: 'hola', language: 'es' }));
    const json = await res.json();
    expect(json.isValid).toBe(true);
  });

  it('treats unknown language as not-in-dictionary (no enum validation)', async () => {
    // BUG: language is not validated against an enum — unknown langs fall through switch
    const res = await POST(makeRequest({ word: 'hello', language: 'xx' }));
    const json = await res.json();
    // isInDictionary stays false, falls to community check, then returns not found
    expect(json.isValid).toBe(false);
  });

  // --- Happy path ---

  it('validates known English word', async () => {
    const res = await POST(makeRequest({ word: 'cat', language: 'en' }));
    const json = await res.json();
    expect(json.isValid).toBe(true);
    expect(json.source).toBe('dictionary');
  });

  it('validates English word case-insensitively', async () => {
    const res = await POST(makeRequest({ word: 'HELLO', language: 'en' }));
    const json = await res.json();
    expect(json.isValid).toBe(true);
  });

  it('validates English word with leading/trailing whitespace', async () => {
    const res = await POST(makeRequest({ word: '  hello  ', language: 'en' }));
    const json = await res.json();
    expect(json.isValid).toBe(true);
  });

  // --- Invalid word ---

  it('returns isValid=false for unknown word', async () => {
    const res = await POST(makeRequest({ word: 'xyzqwerty', language: 'en' }));
    const json = await res.json();
    expect(json.isValid).toBe(false);
    expect(json.source).toBe('pending');
  });

  // --- Community word validation ---

  it('returns valid when community word found', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { id: 1 }, error: null });
    const res = await POST(makeRequest({ word: 'xyzword', language: 'en' }));
    const json = await res.json();
    expect(json.isValid).toBe(true);
    expect(json.source).toBe('dictionary'); // Intentionally same as dict
  });

  it('handles community check error gracefully', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } });
    const res = await POST(makeRequest({ word: 'xyzword', language: 'en' }));
    const json = await res.json();
    expect(json.isValid).toBe(false);
  });

  // --- Rate limiting ---

  it('returns 429 when rate limited', async () => {
    (checkApiRateLimit as Mock).mockReturnValue({ success: false });
    const res = await POST(makeRequest({ word: 'hello', language: 'en' }));
    expect(res.status).toBe(429);
  });

  // --- Edge cases ---

  it('handles word with numbers', async () => {
    const res = await POST(makeRequest({ word: 'abc123', language: 'en' }));
    const json = await res.json();
    expect(json.isValid).toBe(false);
  });

  it('handles word with special characters', async () => {
    const res = await POST(makeRequest({ word: 'he!!o', language: 'en' }));
    const json = await res.json();
    expect(json.isValid).toBe(false);
  });

  it('handles malformed JSON gracefully', async () => {
    const res = await POST(makeBadJsonRequest());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.isValid).toBe(false);
  });

  // --- Hebrew/Swedish/Japanese lazy loading (fs mocked to return no files) ---

  it('handles Hebrew with no dictionary files', async () => {
    const res = await POST(makeRequest({ word: 'שלום', language: 'he' }));
    const json = await res.json();
    // No dict files loaded, so falls through to community check
    expect(json.isValid).toBe(false);
  });

  it('handles Swedish with no dictionary files', async () => {
    const res = await POST(makeRequest({ word: 'hej', language: 'sv' }));
    const json = await res.json();
    expect(json.isValid).toBe(false);
  });

  it('handles Japanese with no dictionary files', async () => {
    const res = await POST(makeRequest({ word: '漢字', language: 'ja' }));
    const json = await res.json();
    expect(json.isValid).toBe(false);
  });
});
