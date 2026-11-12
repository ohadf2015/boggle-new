import { beforeEach, describe, expect, it, vi } from 'vitest';

type Row = {
  id: string;
  user_id: string;
  email: string;
  status: 'pending' | 'approved' | 'declined';
  trial_expires_at: string | null;
  school_or_org?: string | null;
  created_at: string;
};

const db = vi.hoisted(() => ({
  rows: [] as Row[],
  role: 'student' as string,
  promoteFails: false,
  adminAvailable: true,
  seq: 0,
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
          maybeSingle: async () => ({ data: { display_name: 'Jane', user_role: db.role }, error: null }),
          order: async () => ({ data: [...db.rows].sort((a, b) => b.created_at.localeCompare(a.created_at)), error: null }),
          gte: async () => ({ data: [], count: opts?.head ? db.rows.length : 0, error: null }),
        }),
      }),
      insert: async (row: Partial<Row>) => {
        if (table !== 'teacher_access_requests') return { error: null };
        if (db.rows.some((r) => r.status === 'pending')) return { error: { code: '23505', message: 'duplicate' } };
        db.seq += 1;
        db.rows.push({ ...(row as Row), id: `r${db.seq}`, status: 'pending', trial_expires_at: null, created_at: `2026-11-12T10:00:0${db.seq}Z` });
        return { error: null };
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
                      const hit = db.rows.filter((r) => (r as Record<string, unknown>)[k] === v && (r as Record<string, unknown>)[k2] === v2);
                      hit.forEach((r) => Object.assign(r, values));
                      return { data: hit.map((r) => ({ id: r.id })), error: null };
                    },
                  }),
                };
              },
            }),
            select: () => ({
              eq: () => ({ eq: () => ({ limit: async () => ({ data: db.rows.filter((r) => r.status === 'approved'), error: null }) }) }),
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
    expect(db.rows[0].trial_expires_at).not.toBeNull();
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
});
