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

function setStoredBirthYear(year) {
  mockSingle.mockResolvedValue({ data: { birth_year: year }, error: null });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'uid-1' } }, error: null });
  mockUpdateEq.mockResolvedValue({ error: null });
  mockUpdate.mockImplementation(() => ({ eq: (...a) => mockUpdateEq(...a) }));
  setStoredBirthYear(NOW_YEAR - 40); // default: caller is a stored adult
  mockFrom.mockImplementation(() => ({
    update: (...a) => mockUpdate(...a),
    select: () => ({ eq: () => ({ single: mockSingle }) }),
  }));
});

describe('POST /api/account/social-settings', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'no' } });
    const res = await POST(makeRequest({ override: { friendMessaging: true } }));
    expect(res.status).toBe(401);
  });

  it('refuses self-elevation: a stored CHILD cannot unlock adult social features (even with an adult birth year in the body)', async () => {
    setStoredBirthYear(NOW_YEAR - 9); // stored identity is a child
    const res = await POST(
      // attacker also injects a forged adult birth year — must be ignored
      makeRequest({ override: { friendMessaging: true }, adultBirthYear: NOW_YEAR - 40 }),
    );
    expect(res.status).toBe(403);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('rejects a missing / malformed override', async () => {
    expect((await POST(makeRequest({}))).status).toBe(400);
    expect((await POST(makeRequest({ override: { bogusKey: true } }))).status).toBe(400);
  });

  it('saves the override when the stored account is an adult and returns resolved caps', async () => {
    const res = await POST(
      makeRequest({ override: { friendMessaging: true, friendManagement: true } }),
    );
    expect(res.status).toBe(200);
    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        social_features_override: { friendMessaging: true, friendManagement: true },
      }),
    );
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'uid-1');
    expect(res.data.tier).toBe('adult');
    expect(res.data.capabilities.friendMessaging).toBe(true);
  });

  it('returns 500 when the profile read fails (cannot authorize)', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'db down' } });
    const res = await POST(makeRequest({ override: { friendMessaging: true } }));
    expect(res.status).toBe(500);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('returns 500 when the DB update fails', async () => {
    mockUpdateEq.mockResolvedValue({ error: { message: 'db down' } });
    const res = await POST(makeRequest({ override: { friendMessaging: true } }));
    expect(res.status).toBe(500);
  });
});
