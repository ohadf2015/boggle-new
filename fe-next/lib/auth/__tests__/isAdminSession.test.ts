import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetUser = vi.fn();
const mockSingle = vi.fn();

vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    from: () => ({
      select: () => ({ eq: () => ({ single: mockSingle }) }),
    }),
  }),
}));

import { isAdminSession } from '../isAdminSession';

describe('isAdminSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is false when there is no signed-in user', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('no session') });
    expect(await isAdminSession()).toBe(false);
  });

  it('is false for a signed-in user whose profile is not an admin', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u1' } }, error: null });
    mockSingle.mockResolvedValueOnce({ data: { is_admin: false }, error: null });
    expect(await isAdminSession()).toBe(false);
  });

  it('fails closed when the profile read errors instead of returning an empty row', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u1' } }, error: null });
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'rls' } });
    expect(await isAdminSession()).toBe(false);
  });

  it('is true only when the signed-in user profile has is_admin', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u1' } }, error: null });
    mockSingle.mockResolvedValueOnce({ data: { is_admin: true }, error: null });
    expect(await isAdminSession()).toBe(true);
  });
});
