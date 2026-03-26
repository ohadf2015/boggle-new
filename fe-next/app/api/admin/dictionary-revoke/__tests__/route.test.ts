import { vi, type Mock, } from 'vitest';
/**
 * Tests for POST /api/admin/dictionary-revoke
 * Admin endpoint to remove words from the dictionary
 */

// Mock Next.js server runtime BEFORE any imports
vi.mock('next/server', () => {
  const actualJson = (data: unknown, init?: { status?: number }) => {
    const status = init?.status || 200;
    return {
      status,
      json: async () => data,
    };
  };
  return {
    NextRequest: vi.fn().mockImplementation((url: string, init: Record<string, unknown>) => ({
      url,
      method: init?.method || 'GET',
      json: async () => JSON.parse(init?.body as string),
    })),
    NextResponse: { json: actualJson },
  };
});

// Mock admin auth
const mockVerifyAdminAuth = vi.fn();
vi.mock('@/lib/auth/adminAuth', () => ({
  verifyAdminAuth: (...args: unknown[]) => mockVerifyAdminAuth(...args),
}));

// Mock Supabase admin
const mockUpdate = vi.fn();
const mockUpsert = vi.fn();
const mockInsert = vi.fn();
const mockEq = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/admin/server', () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      mockFrom(table);
      return {
        update: (data: unknown) => {
          mockUpdate(data);
          return {
            eq: (_col: string, _val: unknown) => {
              mockEq(_col, _val);
              return {
                eq: (_col2: string, _val2: unknown) => {
                  mockEq(_col2, _val2);
                  return Promise.resolve({ error: null });
                },
              };
            },
          };
        },
        upsert: (data: unknown, opts: unknown) => {
          mockUpsert(data, opts);
          return Promise.resolve({ error: null });
        },
        insert: (data: unknown) => {
          mockInsert(data);
          return Promise.resolve({ error: null });
        },
      };
    },
  }),
}));

// Mock dictionary
const mockRemoveApprovedWord = vi.fn();
vi.mock('@/backend/dictionary', () => ({
  removeApprovedWord: (...args: unknown[]) => mockRemoveApprovedWord(...args),
}));

// Mock community word manager
const mockRemoveFromCommunityCache = vi.fn();
vi.mock('@/backend/modules/communityWordManager', () => ({
  removeFromCommunityCache: (...args: unknown[]) => mockRemoveFromCommunityCache(...args),
}));

// Mock milog cache invalidation
const mockInvalidateMilogCache = vi.fn();
vi.mock('@/backend/services/milogWordVerifier', () => ({
  invalidateMilogCache: (...args: unknown[]) => mockInvalidateMilogCache(...args),
}));

// Mock Sentry
vi.mock('@/utils/sentry', () => ({
  captureApiError: vi.fn(),
}));

describe('POST /api/admin/dictionary-revoke', () => {
  let POST: (req: unknown) => Promise<{ status: number; json: () => Promise<Record<string, unknown>> }>;

  beforeAll(async () => {
    const mod = await import('../route');
    POST = mod.POST as typeof POST;
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Default: admin auth succeeds
    mockVerifyAdminAuth.mockResolvedValue({
      success: true,
      user: { id: 'admin-1', email: 'admin@test.com' },
    });

    mockRemoveApprovedWord.mockResolvedValue(true);
    mockRemoveFromCommunityCache.mockReturnValue(undefined);
    mockInvalidateMilogCache.mockResolvedValue(undefined);
  });

  function createRequest(body: Record<string, unknown>) {
    const { NextRequest } = require('next/server');
    return new NextRequest('http://localhost:3000/api/admin/dictionary-revoke', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  it('should require admin authentication', async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce({
      success: false,
      response: { status: 401, json: async () => ({ error: 'Unauthorized' }) },
    });

    const req = createRequest({ word: 'מילה', language: 'he' });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it('should validate required word field', async () => {
    const req = createRequest({ word: '', language: 'he' });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('should validate language field', async () => {
    const req = createRequest({ word: 'test', language: 'invalid' });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it('should remove word from dictionary and community cache', async () => {
    const req = createRequest({ word: 'מילה', language: 'he' });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockRemoveApprovedWord).toHaveBeenCalledWith('מילה', 'he');
    expect(mockRemoveFromCommunityCache).toHaveBeenCalledWith('מילה', 'he');
  });

  it('should un-promote word in database', async () => {
    const req = createRequest({ word: 'מילה', language: 'he' });
    await POST(req);

    expect(mockFrom).toHaveBeenCalledWith('invalid_word_submissions');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        approved_at: null,
        auto_promoted_at: null,
      })
    );
  });

  it('should invalidate Redis milog cache', async () => {
    const req = createRequest({ word: 'מילה', language: 'he' });
    await POST(req);

    expect(mockInvalidateMilogCache).toHaveBeenCalledWith('מילה');
  });

  it('should optionally add to blacklist', async () => {
    const req = createRequest({
      word: 'מילה',
      language: 'he',
      addToBlacklist: true,
      reason: 'Not a real word',
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockFrom).toHaveBeenCalledWith('bot_word_blacklist');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        word: 'מילה',
        language: 'he',
        reason: 'Not a real word',
      })
    );
  });

  it('should return success response with details', async () => {
    const req = createRequest({ word: 'מילה', language: 'he' });
    const res = await POST(req);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.word).toBe('מילה');
    expect(body.language).toBe('he');
  });
});
