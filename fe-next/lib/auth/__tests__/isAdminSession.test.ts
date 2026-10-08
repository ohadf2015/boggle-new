import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isAdminSession } from '../isAdminSession';

/**
 * isAdminSession — server-side admin gate via the cookie session.
 * Fail-closed: any missing session / non-admin / error path returns false.
 */

const mockGetUser = vi.fn();
const mockSingle = vi.fn();

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: () => ({
      select: () => ({
        eq: () => ({ single: mockSingle }),
      }),
    }),
  })),
}));

describe('isAdminSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns false when there is no logged-in user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await isAdminSession()).toBe(false);
  });

  it('returns false when getUser errors', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'no session' } });
    expect(await isAdminSession()).toBe(false);
  });

  it('returns false for a logged-in NON-admin user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mockSingle.mockResolvedValue({ data: { is_admin: false }, error: null });
    expect(await isAdminSession()).toBe(false);
  });

  it('returns false when the profile lookup errors', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mockSingle.mockResolvedValue({ data: null, error: { message: 'boom' } });
    expect(await isAdminSession()).toBe(false);
  });

  it('returns true for a logged-in admin user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mockSingle.mockResolvedValue({ data: { is_admin: true }, error: null });
    expect(await isAdminSession()).toBe(true);
  });

  it('fails closed (false) if the client throws', async () => {
    mockGetUser.mockRejectedValue(new Error('network'));
    expect(await isAdminSession()).toBe(false);
  });
});
