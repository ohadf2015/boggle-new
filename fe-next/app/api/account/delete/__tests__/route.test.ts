/**
 * DELETE /api/account/delete — erasure has to include email-KEYED rows.
 *
 * The route deletes the auth user and relies on FK cascade, which is correct
 * for every table that references `auth.users(id)`. But teacher access rows are
 * keyed by the email STRING, not by a user id, so a cascade never reaches them:
 * after a teacher deleted their account, their address stayed in
 * `teacher_access_requests`.
 *
 * Found for real on 2026-09-21, cleaning up after a teacher who emailed asking
 * for her account AND her email address to be removed: the auth user, profile
 * and identities were gone, and the address was still sitting in
 * `teacher_access_requests`.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const authUser = {
  v: { id: 'user-1', email: 'Teacher@School.org' } as { id: string; email?: string } | null,
};
vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: authUser.v }, error: null }) },
  }),
}));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));

const cap = {
  deletes: [] as Array<{ table: string; col: string; val: unknown }>,
  deletedUserId: null as string | null,
};

vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const qb: Record<string, unknown> = {};
      qb.delete = () => qb;
      qb.eq = (col: string, val: unknown) => {
        cap.deletes.push({ table, col, val });
        return qb;
      };
      (qb as { then: unknown }).then = (resolve: (v: unknown) => void) =>
        resolve({ data: null, error: null });
      return qb;
    },
    auth: {
      admin: {
        deleteUser: async (id: string) => {
          cap.deletedUserId = id;
          return { error: null };
        },
      },
    },
  }),
}));

import { DELETE } from '../route';

beforeEach(() => {
  cap.deletes = [];
  cap.deletedUserId = null;
  authUser.v = { id: 'user-1', email: 'Teacher@School.org' };
});

describe('DELETE /api/account/delete', () => {
  it('rejects an unauthenticated caller', async () => {
    authUser.v = null;
    const res = await DELETE();
    expect(res.status).toBe(401);
  });

  it('deletes the auth user', async () => {
    const res = await DELETE();
    expect(res.status).toBe(200);
    expect(cap.deletedUserId).toBe('user-1');
  });

  it('clears the email-keyed teacher access rows a cascade cannot reach', async () => {
    await DELETE();
    const tables = cap.deletes.map((d) => d.table);
    expect(tables).toContain('teacher_access_requests');
    expect(tables).toContain('teacher_access_allowlist');
  });

  it('matches those rows case-insensitively', async () => {
    // Signup lowercases the address; the request row keeps whatever the teacher
    // typed. An `eq` on the raw string silently matches nothing.
    await DELETE();
    const emailDeletes = cap.deletes.filter((d) => d.table.startsWith('teacher_access_'));
    expect(emailDeletes.length).toBeGreaterThan(0);
    for (const d of emailDeletes) {
      expect(d.val).toBe('teacher@school.org');
    }
  });

  it('still deletes the account when the user has no email on record', async () => {
    authUser.v = { id: 'user-1' };
    const res = await DELETE();
    expect(res.status).toBe(200);
    expect(cap.deletedUserId).toBe('user-1');
  });
});
