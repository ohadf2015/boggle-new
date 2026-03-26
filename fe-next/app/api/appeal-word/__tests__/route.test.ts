import { vi, type Mock, } from 'vitest';
/**
 * Tests for POST /api/appeal-word
 * Player-facing endpoint to appeal rejected words from multiplayer results.
 */

// Mock next/server BEFORE any imports
vi.mock('next/server', () => ({
  NextRequest: vi.fn(),
  NextResponse: {
    json: vi.fn((data: Record<string, unknown>, init?: { status?: number }) => ({
      json: async () => data,
      status: init?.status || 200,
    })),
  },
}));

// Mock Supabase
const mockRpc = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    rpc: mockRpc,
  }),
}));

import { POST } from '../route';

// Set env vars
beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

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

describe('POST /api/appeal-word', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({ error: null });
  });

  it('should record an appeal for a valid word+language', async () => {
    const res = await POST(makeRequest({ word: 'HELLO', language: 'en' }));
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith('record_word_appeal', {
      p_word: 'hello',
      p_language: 'en',
    });
  });

  it('should normalize word to lowercase and trim', async () => {
    const res = await POST(makeRequest({ word: '  WORLD  ', language: 'en' }));
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith('record_word_appeal', {
      p_word: 'world',
      p_language: 'en',
    });
  });

  it('should reject missing word', async () => {
    const res = await POST(makeRequest({ language: 'en' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/word/i);
  });

  it('should reject missing language', async () => {
    const res = await POST(makeRequest({ word: 'hello' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/language/i);
  });

  it('should reject words shorter than 3 characters', async () => {
    const res = await POST(makeRequest({ word: 'ab', language: 'en' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/short/i);
  });

  it('should handle Supabase errors gracefully', async () => {
    mockRpc.mockResolvedValue({ error: { message: 'DB error' } });
    const res = await POST(makeRequest({ word: 'hello', language: 'en' }));
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('should handle missing Supabase config gracefully', async () => {
    const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const res = await POST(makeRequest({ word: 'hello', language: 'en' }));
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockRpc).not.toHaveBeenCalled();

    process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
  });
});
