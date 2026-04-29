// @ts-nocheck
import { vi } from 'vitest';

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({ data, status: init?.status ?? 200 })),
  },
}));

const mockGetUser = vi.fn();

// Builder mocks: .update().eq() is awaitable AND exposes .is() for the
// conditional auto-sync path. Each helper resets per test to track call order.
const mockIs = vi.fn();
const mockUpdateEq = vi.fn();
const mockUpdate = vi.fn();
const mockFrom = vi.fn();

function buildResult(error) {
  // PromiseLike that's also chainable via .is() for filter stacking.
  return {
    is: (...args) => {
      mockIs(...args);
      return Promise.resolve({ error });
    },
    then: (resolve, reject) => Promise.resolve({ error }).then(resolve, reject),
  };
}

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    from: (...args) => mockFrom(...args),
  }),
}));

import { POST } from '../route';

function makeRequest(body) {
  return { json: () => Promise.resolve(body) } as unknown as Request;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'uid-1' } }, error: null });
  // Default success — no error returned by the chain.
  mockUpdateEq.mockImplementation(() => buildResult(null));
  mockUpdate.mockImplementation(() => ({ eq: (...args) => mockUpdateEq(...args) }));
  mockFrom.mockImplementation(() => ({ update: (...args) => mockUpdate(...args) }));
});

describe('POST /api/user/language', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'no' } });
    const res = await POST(makeRequest({ language: 'he' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid locale', async () => {
    const res = await POST(makeRequest({ language: 'xx' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing language', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('explicit:true overwrites unconditionally (no .is filter)', async () => {
    const res = await POST(makeRequest({ language: 'he', explicit: true }));
    expect(res.status).toBe(200);
    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ language: 'he' }));
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'uid-1');
    // Guard: explicit path must NOT add the NULL-only filter.
    expect(mockIs).not.toHaveBeenCalled();
  });

  it('explicit:false adds .is("language", null) so existing values are preserved', async () => {
    const res = await POST(makeRequest({ language: 'en', explicit: false }));
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ language: 'en' }));
    expect(mockIs).toHaveBeenCalledWith('language', null);
  });

  it('omitted explicit flag defaults to non-explicit (auto-sync semantics)', async () => {
    const res = await POST(makeRequest({ language: 'en' }));
    expect(res.status).toBe(200);
    expect(mockIs).toHaveBeenCalledWith('language', null);
  });

  it('accepts all 5 supported locales (explicit=true path)', async () => {
    for (const lang of ['he', 'en', 'sv', 'ja', 'es']) {
      vi.clearAllMocks();
      mockGetUser.mockResolvedValue({ data: { user: { id: 'uid-1' } }, error: null });
      mockUpdateEq.mockImplementation(() => buildResult(null));
      mockUpdate.mockImplementation(() => ({ eq: (...a) => mockUpdateEq(...a) }));
      mockFrom.mockImplementation(() => ({ update: (...a) => mockUpdate(...a) }));
      const res = await POST(makeRequest({ language: lang, explicit: true }));
      expect(res.status).toBe(200);
    }
  });

  it('returns 500 when supabase update fails (explicit path)', async () => {
    mockUpdateEq.mockImplementation(() => buildResult({ message: 'db down' }));
    const res = await POST(makeRequest({ language: 'en', explicit: true }));
    expect(res.status).toBe(500);
  });

  it('returns 500 when supabase update fails (auto-sync path)', async () => {
    // Force the .is() terminus to surface an error.
    mockUpdateEq.mockImplementation(() => ({
      is: (...args) => {
        mockIs(...args);
        return Promise.resolve({ error: { message: 'db down' } });
      },
      then: (r) => r({ error: null }),
    }));
    const res = await POST(makeRequest({ language: 'en' }));
    expect(res.status).toBe(500);
  });
});
