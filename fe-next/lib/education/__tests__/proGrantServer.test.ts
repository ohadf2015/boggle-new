import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Chainable fake of the service-role client. Every query resolves through
 * `handle(table, op, ctx)` so a test states what the DB holds, not how the
 * query builder is spelled.
 */
type Op = 'select' | 'insert' | 'update' | 'upsert';
interface Ctx { op: Op; payload?: unknown; filters: Record<string, unknown>; }
type Handler = (table: string, ctx: Ctx) => { data?: unknown; error?: { message: string } | null };

/** A user directory `findUserIdByEmail` pages through via `auth.admin.listUsers`. */
type DirectoryUser = { id: string; email: string };

function fakeAdmin(handle: Handler, directory: DirectoryUser[] = []) {
  const calls: Array<{ table: string; ctx: Ctx }> = [];
  const builder = (table: string, ctx: Ctx) => {
    const b: any = {};
    const chain = () => b;
    for (const f of ['select', 'eq', 'neq', 'is', 'gt', 'order', 'limit', 'in', 'or']) {
      b[f] = (...a: unknown[]) => { if (f === 'eq' || f === 'is' || f === 'gt' || f === 'neq') ctx.filters[String(a[0])] = a[1]; return chain(); };
    }
    b.single = () => b; b.maybeSingle = () => b;
    b.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => {
      calls.push({ table, ctx });
      const out = handle(table, ctx);
      return Promise.resolve({ data: out.data ?? null, error: out.error ?? null }).then(res, rej);
    };
    return b;
  };
  const admin = {
    from: (table: string) => ({
      select: () => builder(table, { op: 'select', filters: {} }),
      insert: (payload: unknown) => builder(table, { op: 'insert', payload, filters: {} }),
      update: (payload: unknown) => builder(table, { op: 'update', payload, filters: {} }),
      upsert: (payload: unknown) => builder(table, { op: 'upsert', payload, filters: {} }),
    }),
    auth: {
      admin: {
        // findUserIdByEmail pages through this exactly like the real Admin Auth API.
        listUsers: async ({ page }: { page: number; perPage: number }) => ({
          data: { users: page === 1 ? directory : [] },
          error: null,
        }),
      },
    },
  };
  return { admin, calls };
}

const sendEmail = vi.fn(async () => ({ ok: true, id: 'em1' }));

vi.mock('@/lib/email/send', () => ({ sendEmail: (...a: unknown[]) => sendEmail(...a) }));

import { grantTeacherPro, applyPendingProGrants, revokeProGrant } from '../proGrantServer';

const NOW = Date.UTC(2026, 8, 5, 12);
const DAY = 24 * 60 * 60 * 1000;

beforeEach(() => sendEmail.mockClear());

describe('grantTeacherPro', () => {
  it('refuses an address that is not an email', async () => {
    const { admin } = fakeAdmin(() => ({}), []);
    const r = await grantTeacherPro({ email: 'nope', grantedBy: 'admin1', nowMs: NOW }, { admin: admin as never });
    expect(r).toEqual({ ok: false, error: 'invalid_email' });
  });

  it('writes the grant, upgrades the subscription row, promotes the profile and emails the teacher', async () => {
    const { admin, calls } = fakeAdmin((table, ctx) => {
      if (table === 'subscriptions' && ctx.op === 'select') return { data: null };
      if (table === 'teacher_pro_grants' && ctx.op === 'insert') return { data: { id: 'g1' } };
      if (table === 'subscriptions' && ctx.op === 'upsert') return { data: [{ user_id: 'u1' }] };
      if (table === 'profiles' && ctx.op === 'update') return { data: [{ id: 'u1' }] };
      if (table === 'teacher_access_requests') return { data: { full_name: 'Tori Plant', locale: 'en' } };
      if (table === 'teacher_pro_grants' && ctx.op === 'update') return { data: [{ id: 'g1' }] };
      return {};
    }, [{ id: 'u1', email: 'tori.plant@belcourt.k12.nd.us' }]);

    const r = await grantTeacherPro(
      { email: 'Tori.Plant@Belcourt.k12.nd.us', grantedBy: 'admin1', note: 'Sorry about Thursday.', nowMs: NOW },
      { admin: admin as never },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.status).toBe('active');
    expect(r.userId).toBe('u1');
    expect(r.expiresAt).toBe(new Date(NOW + 365 * DAY).toISOString());
    expect(r.emailSent).toBe(true);

    const grantInsert = calls.find((c) => c.table === 'teacher_pro_grants' && c.ctx.op === 'insert')!;
    expect(grantInsert.ctx.payload).toMatchObject({
      email: 'tori.plant@belcourt.k12.nd.us', user_id: 'u1', granted_by: 'admin1', days: 365,
      note: 'Sorry about Thursday.', expires_at: r.expiresAt,
    });
    expect((grantInsert.ctx.payload as any).applied_at).toBeTruthy();

    const subUpsert = calls.find((c) => c.table === 'subscriptions' && c.ctx.op === 'upsert')!;
    expect(subUpsert.ctx.payload).toMatchObject({
      user_id: 'u1', tier: 'pro', status: 'active', source: 'admin_grant', grant_id: 'g1',
      current_period_end: r.expiresAt, cancel_at_period_end: false,
      lemon_squeezy_subscription_id: null,
    });

    const promote = calls.find((c) => c.table === 'profiles' && c.ctx.op === 'update')!;
    expect(promote.ctx.payload).toEqual({ user_role: 'teacher' });
    expect(promote.ctx.filters.id).toBe('u1');

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const mail = (sendEmail.mock.calls[0] as any)[0];
    expect(mail.to).toBe('tori.plant@belcourt.k12.nd.us');
    expect(mail.html).toContain('Tori Plant');
    expect(mail.html).toContain('Sorry about Thursday.');
  });

  it('never overwrites a paying teacher — a live provider subscription is refused', async () => {
    const { admin, calls } = fakeAdmin((table, ctx) => {
      if (table === 'subscriptions' && ctx.op === 'select') {
        return { data: { tier: 'pro', status: 'active', source: 'polar', current_period_end: null } };
      }
      return {};
    }, [{ id: 'u1', email: 't@x.org' }]);
    const r = await grantTeacherPro({ email: 't@x.org', grantedBy: 'a', nowMs: NOW }, { admin: admin as never });
    expect(r).toEqual({ ok: false, error: 'already_paid' });
    expect(calls.some((c) => c.table === 'teacher_pro_grants')).toBe(false);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('with no account yet, stores a pending grant and still sends the email', async () => {
    const { admin, calls } = fakeAdmin((table, ctx) => {
      if (table === 'teacher_pro_grants' && ctx.op === 'insert') return { data: { id: 'g2' } };
      if (table === 'teacher_pro_grants' && ctx.op === 'update') return { data: [{ id: 'g2' }] };
      if (table === 'teacher_access_requests') return { data: null };
      return {};
    }, []);
    const r = await grantTeacherPro({ email: 'new@school.org', grantedBy: 'a', fullName: 'Sam', locale: 'es', nowMs: NOW }, { admin: admin as never });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.status).toBe('pending_signup');
    expect(r.userId).toBeNull();
    expect(calls.some((c) => c.table === 'subscriptions')).toBe(false);
    const grantInsert = calls.find((c) => c.table === 'teacher_pro_grants' && c.ctx.op === 'insert')!;
    expect((grantInsert.ctx.payload as any).applied_at).toBeNull();
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect((sendEmail.mock.calls[0] as any)[0].html).toContain('Sam');
  });

  it('a failed subscription write is reported, not swallowed', async () => {
    const { admin } = fakeAdmin((table, ctx) => {
      if (table === 'subscriptions' && ctx.op === 'select') return { data: null };
      if (table === 'teacher_pro_grants' && ctx.op === 'insert') return { data: { id: 'g1' } };
      if (table === 'subscriptions' && ctx.op === 'upsert') return { error: { message: 'rls denied' } };
      return {};
    }, [{ id: 'u1', email: 't@x.org' }]);
    const r = await grantTeacherPro({ email: 't@x.org', grantedBy: 'a', nowMs: NOW }, { admin: admin as never });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/rls denied/);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('a database missing the teacher_pro_grants migration fails with a diagnosable hint, not a bare Postgres error', async () => {
    const { admin } = fakeAdmin((table, ctx) => {
      if (table === 'subscriptions' && ctx.op === 'select') return { data: null };
      if (table === 'teacher_pro_grants' && ctx.op === 'insert') {
        return { error: { code: '42P01', message: 'relation "public.teacher_pro_grants" does not exist' } };
      }
      return {};
    }, [{ id: 'u1', email: 't@x.org' }]);
    const r = await grantTeacherPro({ email: 't@x.org', grantedBy: 'a', nowMs: NOW }, { admin: admin as never });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/migration pending/);
    expect(r.error).toMatch(/teacher_pro_grants/);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

describe('applyPendingProGrants', () => {
  it('claims the pending grant for a fresh sign-in and upgrades them', async () => {
    const pending = { id: 'g2', email: 'new@school.org', user_id: null, applied_at: null, revoked_at: null,
      expires_at: new Date(NOW + 300 * DAY).toISOString() };
    const { admin, calls } = fakeAdmin((table, ctx) => {
      if (table === 'teacher_pro_grants' && ctx.op === 'select') return { data: [pending] };
      if (table === 'subscriptions' && ctx.op === 'select') return { data: null };
      if (table === 'subscriptions' && ctx.op === 'upsert') return { data: [{ user_id: 'u9' }] };
      if (table === 'profiles') return { data: [{ id: 'u9' }] };
      if (table === 'teacher_pro_grants' && ctx.op === 'update') return { data: [{ id: 'g2' }] };
      return {};
    }, []);
    const r = await applyPendingProGrants({ userId: 'u9', email: 'New@School.org', nowMs: NOW }, { admin: admin as never });
    expect(r).toEqual({ applied: true, grantId: 'g2', expiresAt: pending.expires_at });
    const stamp = calls.find((c) => c.table === 'teacher_pro_grants' && c.ctx.op === 'update')!;
    expect(stamp.ctx.payload).toMatchObject({ user_id: 'u9' });
    expect((stamp.ctx.payload as any).applied_at).toBeTruthy();
  });

  it('is a quiet no-op when nothing is pending', async () => {
    const { admin, calls } = fakeAdmin((table) => (table === 'teacher_pro_grants' ? { data: [] } : {}), () => null);
    const r = await applyPendingProGrants({ userId: 'u9', email: 'x@y.org', nowMs: NOW }, { admin: admin as never });
    expect(r).toEqual({ applied: false });
    expect(calls.some((c) => c.table === 'subscriptions')).toBe(false);
  });
});

describe('revokeProGrant', () => {
  it('stamps revoked_at and drops the granted subscription back to free', async () => {
    const { admin, calls } = fakeAdmin((table, ctx) => {
      if (table === 'teacher_pro_grants' && ctx.op === 'select') {
        return { data: { id: 'g1', user_id: 'u1', revoked_at: null } };
      }
      if (table === 'teacher_pro_grants' && ctx.op === 'update') return { data: [{ id: 'g1' }] };
      if (table === 'subscriptions' && ctx.op === 'update') return { data: [{ user_id: 'u1' }] };
      return {};
    }, []);
    const r = await revokeProGrant({ grantId: 'g1', revokedBy: 'a', nowMs: NOW }, { admin: admin as never });
    expect(r).toEqual({ ok: true });
    const sub = calls.find((c) => c.table === 'subscriptions' && c.ctx.op === 'update')!;
    expect(sub.ctx.payload).toMatchObject({ tier: 'free', status: 'active' });
    expect(sub.ctx.filters.user_id).toBe('u1');
    // Only the grant's own row — never a paid subscription that replaced it.
    expect(sub.ctx.filters.grant_id).toBe('g1');
  });
});
