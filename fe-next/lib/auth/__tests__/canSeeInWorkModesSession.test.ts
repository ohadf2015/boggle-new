import { describe, it, expect, vi, beforeEach } from 'vitest';
import { canSeeInWorkModesSession } from '../canSeeInWorkModesSession';

/**
 * canSeeInWorkModesSession — server-component gate for in-work/preview modes.
 * Allows admins OR beta testers. Fail-closed on any missing session / error.
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

describe('canSeeInWorkModesSession', () => {
  beforeEach(() => vi.clearAllMocks());

  it('false when no logged-in user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await canSeeInWorkModesSession()).toBe(false);
  });

  it('false for a plain player (neither admin nor beta)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mockSingle.mockResolvedValue({ data: { is_admin: false, is_beta_tester: false }, error: null });
    expect(await canSeeInWorkModesSession()).toBe(false);
  });

  it('true for an admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mockSingle.mockResolvedValue({ data: { is_admin: true, is_beta_tester: false }, error: null });
    expect(await canSeeInWorkModesSession()).toBe(true);
  });

  it('true for a beta tester (non-admin) — the new path', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mockSingle.mockResolvedValue({ data: { is_admin: false, is_beta_tester: true }, error: null });
    expect(await canSeeInWorkModesSession()).toBe(true);
  });

  it('false when profile lookup errors', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mockSingle.mockResolvedValue({ data: null, error: { message: 'boom' } });
    expect(await canSeeInWorkModesSession()).toBe(false);
  });

  it('fails closed if the client throws', async () => {
    mockGetUser.mockRejectedValue(new Error('network'));
    expect(await canSeeInWorkModesSession()).toBe(false);
  });
});
