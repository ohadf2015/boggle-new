import { vi, type Mock, } from 'vitest';
// @ts-nocheck
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({ data, status: init?.status ?? 200 })),
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

// Mock the dictionary loader
const mockLoadDictionaryWords = vi.fn();
vi.mock('@/app/api/word-solver/dictionaryLoader', () => ({
  loadDictionaryWords: (...args: unknown[]) => mockLoadDictionaryWords(...args),
}));

import { NextRequest } from 'next/server';
import { POST } from '../route';

const mockHeaders = { get: vi.fn().mockReturnValue('127.0.0.1') };

function makeRequest(body: unknown): NextRequest {
  return {
    json: () => Promise.resolve(body),
    headers: mockHeaders,
  } as unknown as NextRequest;
}

function makeBadJsonRequest(): NextRequest {
  return {
    json: () => Promise.reject(new Error('Invalid JSON')),
    headers: mockHeaders,
  } as unknown as NextRequest;
}

describe('POST /api/adventure/solve-grid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckApiRateLimit.mockReturnValue({ success: true });
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    // Return a small dictionary for testing
    mockLoadDictionaryWords.mockResolvedValue(['cat', 'bat', 'tab', 'cab', 'at']);
  });

  // ===== AUTH =====
  describe('Authentication', () => {
    it('rejects unauthenticated requests with 401', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No session' } });
      const res = await POST(makeRequest({ grid: [['a', 'b'], ['c', 'd']] }));
      expect(res.status).toBe(401);
    });
  });

  // ===== VALIDATION =====
  describe('Input validation', () => {
    it('rejects invalid JSON with 400', async () => {
      const res = await POST(makeBadJsonRequest());
      expect(res.status).toBe(400);
      expect(res.data.error).toContain('Invalid JSON');
    });

    it('rejects empty grid with 400', async () => {
      const res = await POST(makeRequest({ grid: [] }));
      expect(res.status).toBe(400);
      expect(res.data.error).toContain('Invalid grid');
    });

    it('rejects non-array grid with 400', async () => {
      const res = await POST(makeRequest({ grid: 'not-an-array' }));
      expect(res.status).toBe(400);
      expect(res.data.error).toContain('Invalid grid');
    });

    it('rejects grid too large 8x8 with 400', async () => {
      const bigGrid = Array(8).fill(null).map(() => Array(8).fill('a'));
      const res = await POST(makeRequest({ grid: bigGrid }));
      expect(res.status).toBe(400);
      expect(res.data.error).toContain('Grid too large');
    });

    it('rejects invalid cell with emoji with 400', async () => {
      const res = await POST(makeRequest({ grid: [['a', '😀'], ['c', 'd']] }));
      expect(res.status).toBe(400);
      expect(res.data.error).toContain('single letter');
    });

    it('rejects invalid cell with number with 400', async () => {
      const res = await POST(makeRequest({ grid: [['a', '1'], ['c', 'd']] }));
      expect(res.status).toBe(400);
      expect(res.data.error).toContain('single letter');
    });

    it('accepts Hebrew letters (non-Latin) without 400', async () => {
      mockLoadDictionaryWords.mockResolvedValue([]);
      const res = await POST(makeRequest({ grid: [['ש', 'ל'], ['ו', 'ם']] }));
      expect(res.status).toBe(200);
    });

    it('accepts Swedish diacritics (å ä ö) without 400', async () => {
      mockLoadDictionaryWords.mockResolvedValue([]);
      const res = await POST(makeRequest({ grid: [['å', 'ä'], ['ö', 'a']] }));
      expect(res.status).toBe(200);
    });
  });

  // ===== RATE LIMITING =====
  describe('Rate limiting', () => {
    it('returns 429 when rate limited', async () => {
      mockCheckApiRateLimit.mockReturnValue({ success: false });
      const res = await POST(makeRequest({ grid: [['a']] }));
      expect(res.status).toBe(429);
      expect(res.data.error).toContain('Too many requests');
    });
  });

  // ===== HAPPY PATH =====
  describe('Happy path', () => {
    it('returns words and count for a valid 3x3 grid', async () => {
      // Dictionary has: cat, bat, tab, cab, at
      // Grid: c a t
      //        b a t
      //        x y z
      mockLoadDictionaryWords.mockResolvedValue(['cat', 'bat', 'tab', 'cab', 'at', 'bat']);
      const grid = [
        ['c', 'a', 't'],
        ['b', 'a', 't'],
        ['x', 'y', 'z'],
      ];
      const res = await POST(makeRequest({ grid }));
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('words');
      expect(res.data).toHaveProperty('count');
      expect(Array.isArray(res.data.words)).toBe(true);
      expect(res.data.count).toBe(res.data.words.length);
    });
  });
});
