import { vi } from 'vitest';
/**
 * POST /api/education/lesson-enrich
 * Teacher-only, rate-limited, zod-validated; asks Vertex for middle-school
 * definitions / synonyms / antonyms / example sentences and returns a map
 * keyed by word. AI plumbing is mocked — the pure parse lives in
 * lib/education/vocabEnrich and has its own tests.
 */

vi.mock('next/server', () => {
  class MockNextRequest {
    private _body: any;
    url: string;
    method: string;
    headers = new Map<string, string>();
    constructor(url: string, init?: { method?: string; body?: string }) {
      this.url = url;
      this.method = init?.method || 'GET';
      this._body = init?.body ? JSON.parse(init.body) : null;
    }
    async json() {
      return this._body;
    }
  }
  return {
    NextRequest: MockNextRequest,
    NextResponse: {
      json: vi.fn((data: any, init?: { status?: number }) => ({ json: async () => data, status: init?.status || 200 })),
    },
  };
});

vi.mock('@/utils/supabase/server');
vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { log: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const mockCheckApiRateLimit = vi.fn().mockReturnValue({ success: true });
vi.mock('@/lib/apiRateLimit', () => ({
  checkApiRateLimit: (...args: unknown[]) => mockCheckApiRateLimit(...args),
  rateLimitResponse: vi.fn(() => ({ status: 429, json: async () => ({ error: 'Too many requests' }) })),
}));

const mockGenerate = vi.fn();
vi.mock('../generate', () => ({
  generateEnrichmentText: (...args: unknown[]) => mockGenerate(...args),
}));

import { NextRequest } from 'next/server';
import { POST } from '../route';
import { createClient } from '@/utils/supabase/server';

const TEACHER = '550e8400-e29b-41d4-a716-446655440002';

function mockSupabase(profile: { user_role?: string; is_admin?: boolean } | null, user: { id: string } | null = { id: TEACHER }) {
  (createClient as any).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: user ? null : new Error('nope') }) },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: profile, error: null }),
    })),
  });
}

const post = (body: unknown) =>
  POST(new NextRequest('http://localhost/api/education/lesson-enrich', { method: 'POST', body: JSON.stringify(body) }));

describe('POST /api/education/lesson-enrich', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckApiRateLimit.mockReturnValue({ success: true });
  });

  it('returns 401 when not signed in', async () => {
    mockSupabase(null, null);
    const res = await post({ words: ['happy'], language: 'en' });
    expect(res.status).toBe(401);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('returns 403 for a student account', async () => {
    mockSupabase({ user_role: 'student' });
    const res = await post({ words: ['happy'], language: 'en' });
    expect(res.status).toBe(403);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('returns 429 when the limiter rejects', async () => {
    mockSupabase({ user_role: 'teacher' });
    mockCheckApiRateLimit.mockReturnValueOnce({ success: false, retryAfter: 30 });
    const res = await post({ words: ['happy'], language: 'en' });
    expect(res.status).toBe(429);
    expect(mockCheckApiRateLimit).toHaveBeenCalledWith(expect.anything(), 'education-lesson-enrich', expect.any(Object));
  });

  it('validates the body: max 60 words, known language', async () => {
    mockSupabase({ user_role: 'teacher' });
    expect((await post({ words: [], language: 'en' })).status).toBe(400);
    expect((await post({ words: Array.from({ length: 61 }, (_, i) => `w${i}`), language: 'en' })).status).toBe(400);
    expect((await post({ words: ['happy'], language: 'klingon' })).status).toBe(400);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('returns the parsed enrichment map for a teacher', async () => {
    mockSupabase({ user_role: 'teacher' });
    mockGenerate.mockResolvedValue(
      JSON.stringify({
        happy: { definition: 'feeling joy', synonyms: ['glad'], antonyms: ['sad'], example: 'The ___ dog barked.' },
        brave: { definition: 'not afraid', synonyms: ['bold'], example: 'The brave knight fought.' },
      })
    );
    const res = await post({ words: [' Happy ', 'brave', 'happy'], language: 'en' });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.enrichment).toEqual({
      Happy: { definition: 'feeling joy', synonyms: ['glad'], antonyms: ['sad'], example: 'The ___ dog barked.' },
      brave: { definition: 'not afraid', synonyms: ['bold'], example: 'The ___ knight fought.' },
    });
    // de-duplicated + trimmed before hitting the model
    expect(mockGenerate).toHaveBeenCalledTimes(1);
    expect(mockGenerate.mock.calls[0][0]).toEqual(['Happy', 'brave']);
    expect(mockGenerate.mock.calls[0][1]).toBe('en');
  });

  it('admins (legacy is_admin) are allowed too', async () => {
    mockSupabase({ is_admin: true });
    mockGenerate.mockResolvedValue('{"happy":{"definition":"joy"}}');
    expect((await post({ words: ['happy'], language: 'en' })).status).toBe(200);
  });

  it('returns 503 when the AI service is unavailable', async () => {
    mockSupabase({ user_role: 'teacher' });
    mockGenerate.mockRejectedValue(new Error('GOOGLE_CREDENTIALS_JSON environment variable is not set'));
    const res = await post({ words: ['happy'], language: 'en' });
    expect(res.status).toBe(503);
  });
});
