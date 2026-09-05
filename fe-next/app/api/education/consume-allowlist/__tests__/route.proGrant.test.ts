import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'u9', email: 'New@School.org' } } }) } }),
}));
const consumeTeacherAllowlist = vi.fn(async () => ({ consumed: false }));
vi.mock('@/lib/education/allowlist', () => ({ consumeTeacherAllowlist: (...a: unknown[]) => consumeTeacherAllowlist(...a) }));
const applyPendingProGrants = vi.fn();
vi.mock('@/lib/education/proGrantServer', () => ({ applyPendingProGrants: (...a: unknown[]) => applyPendingProGrants(...a) }));

import { POST } from '../route';

/**
 * The sign-in bridge for a Pro grant made before the teacher had an account rides
 * on the same once-per-sign-in call as the access allowlist, so one fetch covers
 * both bridges and neither can be forgotten.
 */
describe('POST /api/education/consume-allowlist — Pro grant bridge', () => {
  beforeEach(() => { applyPendingProGrants.mockReset(); consumeTeacherAllowlist.mockClear(); });

  it('claims a pending Pro grant for the signed-in email', async () => {
    applyPendingProGrants.mockResolvedValue({ applied: true, grantId: 'g2', expiresAt: '2027-01-01T00:00:00Z' });
    const res = await POST();
    expect(res.status).toBe(200);
    expect(applyPendingProGrants).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u9', email: 'New@School.org' }));
    expect(await res.json()).toMatchObject({ ok: true, proGrantApplied: true });
  });

  it('a failed claim is logged and reported, not swallowed', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    applyPendingProGrants.mockResolvedValue({ applied: false, error: 'rls denied' });
    const res = await POST();
    expect(res.status).toBe(500);
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });
});
