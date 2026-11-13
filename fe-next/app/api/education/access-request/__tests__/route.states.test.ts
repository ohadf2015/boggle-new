import { beforeEach, describe, expect, it, vi } from 'vitest';

type Row = {
  id: string;
  user_id: string;
  email: string;
  status: 'pending' | 'approved' | 'declined';
  trial_expires_at: string | null;
  school_or_org?: string | null;
  created_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
};

const db = vi.hoisted(() => ({
  rows: [] as Row[],
  role: 'student' as string,
  promoteFails: false,
  adminAvailable: true,
  seq: 0,
  rollbackFails: false,
  raceOnInsert: false,
  stealApproval: null as null | 'with_role' | 'without_role',
  profileError: false,
  inserted: [] as Record<string, unknown>[],
}));
const notifyAdmins = vi.hoisted(() => vi.fn(async (_n: { dedupeKey?: string }) => true));
const sendEmail = vi.hoisted(() => vi.fn(async (_a: unknown) => ({ ok: true })));

vi.mock('@/lib/admin/adminNotifications', () => ({ notifyAdmins }));
vi.mock('@/lib/email/send', () => ({ sendEmail }));
vi.mock('@/lib/posthog', () => ({ getPostHogServer: () => ({ capture: vi.fn() }) }));

const USER = { id: 'user-1', email: 'jane@school.edu', email_confirmed_at: '2026-01-01T00:00:00Z', user_metadata: {} };

vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: USER }, error: null }) },
    from: (table: string) => ({
      select: (_cols: string, opts?: { head?: boolean }) => ({
        eq: (_k: string, _v: string) => ({
          maybeSingle: async () =>
            db.profileError
              ? { data: null, error: { message: 'relation "profiles" permission denied for secret_column' } }
              : { data: { display_name: 'Jane', user_role: db.role }, error: null },
          order: () => {
            const res = Promise.resolve({ data: db.rows.map((r) => ({ ...r })), error: null });
            return Object.assign(res, { order: () => res });
          },
          gte: async () => ({ data: [], count: opts?.head ? db.rows.length : 0, error: null }),
        }),
      }),
      insert: (row: Partial<Row>) => {
        const run = async () => {
          db.inserted.push({ ...row });
          if (db.raceOnInsert) {
            db.raceOnInsert = false;
            db.seq += 1;
            db.rows.push({ ...(row as Row), id: `r${db.seq}`, status: 'pending', trial_expires_at: null, created_at: `2026-11-12T10:00:0${db.seq}Z` });
          }
          if (db.rows.some((r) => r.status === 'pending')) return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } };
          db.seq += 1;
          const id = `r${db.seq}`;
          db.rows.push({ ...(row as Row), id, status: 'pending', trial_expires_at: null, created_at: `2026-11-12T10:00:0${db.seq}Z` });
          return { data: { id }, error: null };
        };
        return { select: () => ({ single: run }) };
      },
    }),
  }),
}));

vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () =>
    db.adminAvailable
      ? {
          from: (table: string) => ({
            update: (values: Partial<Row> & { user_role?: string }) => ({
              eq: (k: string, v: string) => {
                if (table === 'profiles') {
                  return {
                    select: async () => {
                      if (db.promoteFails) return { data: null, error: { message: 'boom' } };
                      db.role = values.user_role ?? db.role;
                      return { data: [{ id: v }], error: null };
                    },
                  };
                }
                return {
                  eq: (k2: string, v2: string) => ({
                    select: async () => {
                      if (values.status === 'pending' && db.rollbackFails) return { data: null, error: { message: 'boom' } };
                      if (values.status === 'approved' && db.stealApproval) {
                        db.rows.filter((r) => r.status === 'pending').forEach((r) => Object.assign(r, { status: 'approved' }));
                        if (db.stealApproval === 'with_role') db.role = 'teacher';
                        return { data: [], error: null };
                      }
                      const hit = db.rows.filter((r) => (r as Record<string, unknown>)[k] === v && (r as Record<string, unknown>)[k2] === v2);
                      hit.forEach((r) => Object.assign(r, values));
                      return { data: hit.map((r) => ({ id: r.id })), error: null };
                    },
                  }),
                };
              },
            }),
            select: () => ({
              eq: (_k: string, v: string) => ({
                maybeSingle: async () =>
                  table === 'profiles'
                    ? { data: { user_role: db.role }, error: null }
                    : { data: db.rows.find((r) => r.id === v) ?? null, error: null },
              }),
            }),
          }),
        }
      : null,
}));

import { POST } from '../route';

const press = (body: Record<string, unknown> = {}) =>
  POST(
    new Request('http://test/api/education/access-request', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ locale: 'en', use_case: 'Weekly vocab games with my class', school_or_org: 'Hill School', ...body }),
    })
  );
const row = (patch: Partial<Row>): Row => ({
  id: 'old',
  user_id: USER.id,
  email: USER.email,
  status: 'pending',
  trial_expires_at: null,
  school_or_org: 'Hill School',
  created_at: '2026-11-01T00:00:00Z',
  ...patch,
});

beforeEach(() => {
  vi.clearAllMocks();
  db.rows = [];
  db.role = 'student';
  db.promoteFails = false;
  db.adminAvailable = true;
  db.seq = 0;
  db.rollbackFails = false;
  db.raceOnInsert = false;
  db.stealApproval = null;
  db.profileError = false;
  db.inserted = [];
});

describe('POST /api/education/access-request: the trial is granted at most once, and only from a fresh or pending request', () => {
  it('Given a declined request, When the user calls the API, Then it refuses with "declined": no row, no role, no trial', async () => {
    db.rows = [row({ status: 'declined' })];
    const res = await press();
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ ok: false, code: 'declined' });
    expect(db.rows).toHaveLength(1);
    expect(db.role).toBe('student');
    expect(db.rows[0].trial_expires_at).toBeNull();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('Given an approved request but no teacher role, Then it does not re-promote or touch the trial; it asks for a human look and tells admins once', async () => {
    db.rows = [row({ status: 'approved', trial_expires_at: '2026-11-15T00:00:00.000Z' })];
    const first = await press();
    await press();
    expect(first.status).toBe(409);
    expect(await first.json()).toMatchObject({ ok: false, code: 'needs_review' });
    expect(db.role).toBe('student');
    expect(db.rows).toHaveLength(1);
    expect(db.rows[0].trial_expires_at).toBe('2026-11-15T00:00:00.000Z');
    expect(sendEmail).not.toHaveBeenCalled();
    const keys = new Set(notifyAdmins.mock.calls.map(([n]) => n.dedupeKey));
    expect(keys).toEqual(new Set(['teacher_access_review:user-1']));
  });

  it('Given a pending request, When pressed, Then that same row is approved: no new row, school kept, role granted', async () => {
    db.rows = [row({ status: 'pending' })];
    const res = await press({ school_or_org: undefined });
    expect(res.status).toBe(200);
    expect(db.rows).toHaveLength(1);
    expect(db.rows[0]).toMatchObject({ id: 'old', status: 'approved', school_or_org: 'Hill School' });
    // No cardless window: the Pro trial starts at the Polar checkout, with a card.
    expect(db.rows[0].trial_expires_at).toBeNull();
    expect(db.role).toBe('teacher');
  });

  it('Given approval keeps failing, When pressed five times, Then exactly one row exists and every admin notice carries one dedupe key', async () => {
    db.adminAvailable = false;
    for (let i = 0; i < 5; i++) expect((await press()).status).toBe(202);
    expect(db.rows).toHaveLength(1);
    const keys = notifyAdmins.mock.calls.map(([n]) => n.dedupeKey);
    expect(keys.every(Boolean)).toBe(true);
    expect(new Set(keys).size).toBe(1);
  });

  it('Given the role update fails after approval, Then the row goes back to pending with its trial kept, so the next press finishes without moving the clock', async () => {
    // A window given before trials needed a card is kept as it was.
    db.rows = [row({ status: 'pending', trial_expires_at: '2026-11-20T00:00:00.000Z' })];
    db.promoteFails = true;
    expect((await press()).status).toBe(202);
    expect(db.rows[0].status).toBe('pending');
    const trial = db.rows[0].trial_expires_at;
    expect(trial).not.toBeNull();

    db.promoteFails = false;
    expect((await press()).status).toBe(200);
    expect(db.rows).toHaveLength(1);
    expect(db.rows[0].trial_expires_at).toBe(trial);
    expect(db.role).toBe('teacher');
  });

  it('Given an older row already carries a trial, When a pending row is approved, Then it reuses that date instead of starting a new clock', async () => {
    db.rows = [row({ id: 'first', status: 'approved', trial_expires_at: '2026-10-01T00:00:00.000Z', created_at: '2026-09-17T00:00:00Z' }), row({ id: 'later', status: 'pending' })];
    expect((await press()).status).toBe(200);
    expect(db.rows.find((r) => r.id === 'later')?.trial_expires_at).toBe('2026-10-01T00:00:00.000Z');
  });

  it('Given an approved teacher, When pressed again, Then the trial does not move', async () => {
    expect((await press()).status).toBe(200);
    const trial = db.rows[0].trial_expires_at;
    expect((await press()).status).toBe(200);
    expect(db.rows).toHaveLength(1);
    expect(db.rows[0].trial_expires_at).toBe(trial);
  });

  it('Given an older declined row and a newer pending one, Then it is still refused as declined', async () => {
    db.rows = [
      row({ id: 'a', status: 'declined', created_at: '2026-10-01T00:00:00Z', reviewed_at: '2026-10-02T00:00:00Z', reviewed_by: 'admin-1' }),
      row({ id: 'b', status: 'pending', created_at: '2026-10-05T00:00:00Z' }),
    ];
    const res = await press();
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: 'declined' });
    expect(db.role).toBe('student');
    expect(db.rows.find((r) => r.id === 'b')?.status).toBe('pending');
  });

  it('Given a decline later overruled by an admin approval, Then the user is judged by that approval (a person looks), not refused', async () => {
    db.rows = [
      row({ id: 'a', status: 'declined', created_at: '2026-10-01T00:00:00Z', reviewed_at: '2026-10-02T00:00:00Z', reviewed_by: 'admin-1' }),
      row({ id: 'b', status: 'approved', created_at: '2026-10-05T00:00:00Z', reviewed_at: '2026-10-06T00:00:00Z', reviewed_by: 'admin-1', trial_expires_at: '2026-10-20T00:00:00.000Z' }),
    ];
    const res = await press();
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: 'needs_review' });
  });

  it('Given two pending rows, Then only the newest is approved and the other is left pending', async () => {
    db.rows = [row({ id: 'old', status: 'pending', created_at: '2026-10-01T00:00:00Z' }), row({ id: 'new', status: 'pending', created_at: '2026-10-03T00:00:00Z' })];
    expect((await press()).status).toBe(200);
    expect(db.rows.filter((r) => r.status === 'approved').map((r) => r.id)).toEqual(['new']);
    expect(db.rows.find((r) => r.id === 'old')?.status).toBe('pending');
  });

  it('Given two rows with the same created_at, Then the choice is stable by id', async () => {
    db.rows = [row({ id: 'r-a', status: 'pending', created_at: '2026-10-01T00:00:00Z' }), row({ id: 'r-b', status: 'pending', created_at: '2026-10-01T00:00:00Z' })];
    expect((await press()).status).toBe(200);
    expect(db.rows.filter((r) => r.status === 'approved').map((r) => r.id)).toEqual(['r-b']);
  });

  it('Given the role update fails and so does the rollback, Then admins are told under the review key and the user gets needs_review', async () => {
    db.promoteFails = true;
    db.rollbackFails = true;
    const res = await press();
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: 'needs_review' });
    expect(notifyAdmins).toHaveBeenCalledWith(expect.objectContaining({ dedupeKey: 'teacher_access_review:user-1' }));
  });

  it('Given a concurrent first press wins the insert, When this press hits the unique index, Then it re-reads and approves that same row', async () => {
    db.raceOnInsert = true;
    const res = await press();
    expect(res.status).toBe(200);
    expect(db.rows).toHaveLength(1);
    expect(db.rows[0].status).toBe('approved');
    expect(db.role).toBe('teacher');
  });

  it.each([
    ['the twin finished and the role is set', 'with_role', 200],
    ['the twin approved but the role is not set (yet)', 'without_role', 202],
  ] as const)('Given another press approved the row first and %s, Then success only when the role is really there', async (_l, steal, status) => {
    db.rows = [row({ status: 'pending' })];
    db.stealApproval = steal;
    const res = await press();
    expect(res.status).toBe(status);
    if (status === 202) expect(await res.json()).toMatchObject({ approvalPending: true });
  });

  it('Given the profile read fails, Then the answer is lookup_failed with no database text', async () => {
    db.profileError = true;
    const res = await press();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ ok: false, error: 'lookup_failed', code: 'lookup_failed' });
    expect(JSON.stringify(body)).not.toMatch(/relation|permission|secret_column/);
  });

  it('Given a body that tries to set status, trial, user or role fields, Then none of them reach the stored row', async () => {
    await press({ status: 'approved', trial_expires_at: '2099-01-01T00:00:00Z', user_id: 'someone-else', user_role: 'admin', reviewed_by: 'x' });
    const stored = db.inserted[0];
    expect(stored.user_id).toBe('user-1');
    for (const key of ['status', 'trial_expires_at', 'user_role', 'reviewed_by']) expect(stored).not.toHaveProperty(key);
    expect(db.rows[0].trial_expires_at).not.toBe('2099-01-01T00:00:00Z');
  });

  it('Given needs_review, Then every press asks for the admin notice under the same per-user dedupe key', async () => {
    db.rows = [row({ status: 'approved', trial_expires_at: '2026-11-15T00:00:00.000Z' })];
    for (let i = 0; i < 3; i++) await press();
    expect(notifyAdmins).toHaveBeenCalledTimes(3);
    for (const [n] of notifyAdmins.mock.calls) expect(n.dedupeKey).toBe('teacher_access_review:user-1');
  });
});
