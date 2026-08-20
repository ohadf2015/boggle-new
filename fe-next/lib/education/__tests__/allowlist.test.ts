import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * `teacher_access_allowlist` is the path for a teacher who was approved BEFORE they had an
 * account: the admin approve handler writes their email to the allowlist, and this helper
 * redeems it the first time they sign in.
 *
 * It ran on the request-scoped (anon/user) client, which RLS gives zero visibility into:
 * verified live, an authenticated user SELECTing that table sees 0 rows. So the lookup
 * always came back empty and the helper returned `{ consumed: false }` — silently, with no
 * error, indistinguishable from "no allowlist entry for you". 6 allowlist rows existed and
 * 0 had ever been consumed.
 *
 * Same silent-no-op that was fixed in the admin approve handler on 2026-08-12; this sibling
 * path was missed. These tests are the sibling of
 * app/api/admin/teacher-access/__tests__/admin.test.ts:184-220 and assert the same shape:
 * the writes run on the SERVICE-ROLE client, and every one of them checks its affected-row
 * count instead of assuming it landed.
 */

/** Request-scoped client. Nothing should reach it any more — RLS makes it blind here. */
const mockRequestClient = () => ({
  from: vi.fn(() => ({
    select: () => ({ eq: () => ({ is: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
    update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
  })),
});

/**
 * Service-role client. `rows` is what each UPDATE ... RETURNING resolves to, so a test can
 * make a write match zero rows and assert the helper notices.
 */
const mockAdminClient = (opts: {
  allowlistRow?: { email: string } | null;
  promoteRows?: unknown[] | null;
  consumeRows?: unknown[] | null;
} = {}) => {
  const { allowlistRow = { email: 'x@y.com' }, promoteRows = [{ id: 'u-1' }], consumeRows = [{ email: 'x@y.com' }] } = opts;
  const lookupEq = vi.fn(() => ({ is: () => ({ maybeSingle: async () => ({ data: allowlistRow, error: null }) }) }));
  const profilesUpdate = vi.fn(() => ({ eq: vi.fn(() => ({ select: vi.fn(async () => ({ data: promoteRows, error: null })) })) }));
  const allowlistUpdate = vi.fn(() => ({ eq: vi.fn(() => ({ select: vi.fn(async () => ({ data: consumeRows, error: null })) })) }));
  return {
    lookupEq,
    profilesUpdate,
    allowlistUpdate,
    from: vi.fn((table: string) => {
      if (table === 'teacher_access_allowlist') return { select: () => ({ eq: lookupEq }), update: allowlistUpdate };
      if (table === 'profiles') return { update: profilesUpdate };
      return {};
    }),
  };
};

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }));

import { consumeTeacherAllowlist } from '../allowlist';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

describe('consumeTeacherAllowlist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (createClient as any).mockResolvedValue(mockRequestClient());
  });

  it('redeems the allowlist entry: promotes to teacher and stamps consumed_at', async () => {
    const admin = mockAdminClient();
    (createAdminClient as any).mockReturnValue(admin);

    const out = await consumeTeacherAllowlist({ userId: 'u-1', email: 'x@y.com' });

    expect(out.consumed).toBe(true);
    expect(admin.profilesUpdate).toHaveBeenCalledWith({ user_role: 'teacher' });
    expect(admin.allowlistUpdate.mock.calls[0][0]).toMatchObject({ consumed_by_user_id: 'u-1' });
    expect(admin.allowlistUpdate.mock.calls[0][0].consumed_at).toBeTruthy();
  });

  it('runs the lookup on the service-role client, not the RLS-blind request client', async () => {
    const admin = mockAdminClient();
    (createAdminClient as any).mockReturnValue(admin);
    const request = mockRequestClient();
    (createClient as any).mockResolvedValue(request);

    await consumeTeacherAllowlist({ userId: 'u-1', email: 'x@y.com' });

    expect(admin.from).toHaveBeenCalledWith('teacher_access_allowlist');
    expect(request.from).not.toHaveBeenCalled();
  });

  it('looks the email up in lowercase', async () => {
    // Stored rows are normalised to lowercase on write (approve handler + backfill), so a
    // lowercase probe is the whole match. A mixed-case sign-in address must still hit.
    const admin = mockAdminClient();
    (createAdminClient as any).mockReturnValue(admin);

    const out = await consumeTeacherAllowlist({ userId: 'u-1', email: 'MIXED.case@y.COM' });

    expect(out.consumed).toBe(true);
    expect(admin.lookupEq).toHaveBeenCalledWith('email', 'mixed.case@y.com');
  });

  it('reports a real error instead of a silent miss when the service-role key is absent', async () => {
    (createAdminClient as any).mockReturnValue(null);

    const out = await consumeTeacherAllowlist({ userId: 'u-1', email: 'x@y.com' });

    expect(out.consumed).toBe(false);
    expect(out.error).toBeTruthy();
  });

  it('reports an error when the role promotion matched zero rows', async () => {
    (createAdminClient as any).mockReturnValue(mockAdminClient({ promoteRows: [] }));

    const out = await consumeTeacherAllowlist({ userId: 'u-1', email: 'x@y.com' });

    expect(out.consumed).toBe(false);
    expect(out.error).toBeTruthy();
  });

  it('does not claim consumption when stamping consumed_at matched zero rows', async () => {
    // Otherwise the entry stays redeemable forever and the next sign-in re-promotes.
    (createAdminClient as any).mockReturnValue(mockAdminClient({ consumeRows: [] }));

    const out = await consumeTeacherAllowlist({ userId: 'u-1', email: 'x@y.com' });

    expect(out.consumed).toBe(false);
    expect(out.error).toBeTruthy();
  });

  it('is a quiet no-op with no error when the user simply is not allowlisted', async () => {
    const admin = mockAdminClient({ allowlistRow: null });
    (createAdminClient as any).mockReturnValue(admin);

    const out = await consumeTeacherAllowlist({ userId: 'u-1', email: 'nobody@y.com' });

    expect(out).toEqual({ consumed: false });
    expect(admin.profilesUpdate).not.toHaveBeenCalled();
  });
});
