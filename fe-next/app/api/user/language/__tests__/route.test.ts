// @ts-nocheck
import { vi } from 'vitest';

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({ data, status: init?.status ?? 200 })),
  },
}));

const mockGetUser = vi.fn();
const mockUpdateEq = vi.fn();
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }));
const mockFrom = vi.fn(() => ({ update: mockUpdate }));

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

import { POST } from '../route';

function makeRequest(body: unknown) {
  return {
    json: () => Promise.resolve(body),
  } as unknown as Request;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'uid-1' } }, error: null });
  mockUpdateEq.mockResolvedValue({ error: null });
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

  it('updates profiles.language for authenticated user', async () => {
    const res = await POST(makeRequest({ language: 'he' }));
    expect(res.status).toBe(200);
    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ language: 'he' }));
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'uid-1');
  });

  it('accepts all 5 supported locales', async () => {
    for (const lang of ['he', 'en', 'sv', 'ja', 'es']) {
      vi.clearAllMocks();
      mockGetUser.mockResolvedValue({ data: { user: { id: 'uid-1' } }, error: null });
      mockUpdateEq.mockResolvedValue({ error: null });
      const res = await POST(makeRequest({ language: lang }));
      expect(res.status).toBe(200);
    }
  });

  it('returns 500 when supabase update fails', async () => {
    mockUpdateEq.mockResolvedValue({ error: { message: 'db down' } });
    const res = await POST(makeRequest({ language: 'en' }));
    expect(res.status).toBe(500);
  });
});
