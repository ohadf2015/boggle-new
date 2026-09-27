// @ts-nocheck
import { vi } from 'vitest';

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({ data, status: init?.status ?? 200 })),
  },
}));

const mockGetUser = vi.fn();
const mockUpdateEq = vi.fn();
const mockUpdate = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    from: (...args) => mockFrom(...args),
  }),
}));

import { POST } from '../route';

const NOW_YEAR = new Date().getUTCFullYear();

function makeRequest(body) {
  return { json: () => Promise.resolve(body) } as unknown as Request;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'uid-1' } }, error: null });
  mockUpdateEq.mockResolvedValue({ error: null });
  mockUpdate.mockImplementation(() => ({ eq: (...a) => mockUpdateEq(...a) }));
  mockFrom.mockImplementation(() => ({ update: (...a) => mockUpdate(...a) }));
});

describe('POST /api/account/age', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'no' } });
    const res = await POST(makeRequest({ birthYear: NOW_YEAR - 30 }));
    expect(res.status).toBe(401);
  });

  it('rejects an out-of-range / garbage birth year', async () => {
    expect((await POST(makeRequest({ birthYear: NOW_YEAR + 5 }))).status).toBe(400);
    expect((await POST(makeRequest({ birthYear: 1700 }))).status).toBe(400);
    expect((await POST(makeRequest({ birthYear: 'nope' }))).status).toBe(400);
    expect((await POST(makeRequest({}))).status).toBe(400);
  });

  it('stores birth_year + age_verified_at and returns the resolved adult tier', async () => {
    const res = await POST(makeRequest({ birthYear: NOW_YEAR - 30 }));
    expect(res.status).toBe(200);
    expect(res.data.tier).toBe('adult');
    expect(res.data.capabilities.publicRoomChat).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ birth_year: NOW_YEAR - 30 }),
    );
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ age_verified_at: expect.any(String) }),
    );
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'uid-1');
  });

  it('returns the restricted child tier for an under-13 birth year', async () => {
    const res = await POST(makeRequest({ birthYear: NOW_YEAR - 9 }));
    expect(res.status).toBe(200);
    expect(res.data.tier).toBe('child');
    expect(res.data.capabilities.publicRoomChat).toBe(false);
    expect(res.data.capabilities.friendMessaging).toBe(false);
  });

  it('returns 500 when the DB update fails', async () => {
    mockUpdateEq.mockResolvedValue({ error: { message: 'db down' } });
    const res = await POST(makeRequest({ birthYear: NOW_YEAR - 30 }));
    expect(res.status).toBe(500);
  });
});
