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
const mockSingle = vi.fn();
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
  mockSingle.mockResolvedValue({ data: { birth_year: NOW_YEAR - 9 }, error: null }); // child account
  mockFrom.mockImplementation(() => ({
    update: (...a) => mockUpdate(...a),
    select: () => ({ eq: () => ({ single: mockSingle }) }),
  }));
});

describe('POST /api/account/social-settings', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'no' } });
    const res = await POST(
      makeRequest({ override: { friendMessaging: true }, adultBirthYear: NOW_YEAR - 40 }),
    );
    expect(res.status).toBe(401);
  });

  it('rejects when the adult-action gate fails (declared age is not an adult)', async () => {
    const res = await POST(
      makeRequest({ override: { friendMessaging: true }, adultBirthYear: NOW_YEAR - 10 }),
    );
    expect(res.status).toBe(403);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('rejects a missing / malformed override', async () => {
    expect(
      (await POST(makeRequest({ adultBirthYear: NOW_YEAR - 40 }))).status,
    ).toBe(400);
    expect(
      (await POST(makeRequest({ override: { bogusKey: true }, adultBirthYear: NOW_YEAR - 40 }))).status,
    ).toBe(400);
  });

  it('saves the override when an adult unlocks it and returns resolved caps', async () => {
    const res = await POST(
      makeRequest({
        override: { friendMessaging: true, friendManagement: true },
        adultBirthYear: NOW_YEAR - 40,
      }),
    );
    expect(res.status).toBe(200);
    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        social_features_override: { friendMessaging: true, friendManagement: true },
      }),
    );
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'uid-1');
    // account is a child → caps reflect the raised override
    expect(res.data.capabilities.friendMessaging).toBe(true);
    expect(res.data.capabilities.publicRoomChat).toBe(false);
  });

  it('returns 500 when the DB update fails', async () => {
    mockUpdateEq.mockResolvedValue({ error: { message: 'db down' } });
    const res = await POST(
      makeRequest({ override: { friendMessaging: true }, adultBirthYear: NOW_YEAR - 40 }),
    );
    expect(res.status).toBe(500);
  });
});
