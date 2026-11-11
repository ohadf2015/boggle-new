// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', () => ({
  NextRequest: vi.fn(),
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({ json: async () => data, status: init?.status ?? 200 }),
  },
}));

type Row = Record<string, unknown>;

const h = vi.hoisted(() => ({
  sendEmailSpy: vi.fn(async () => ({ ok: true })),
  plans: [] as Row[],
  tables: {} as Record<string, Row[]>,
  planError: null as { message: string } | null,
  claimed: new Set<string>(),
  released: [] as string[],
  heartbeats: [] as string[],
  planFilters: [] as Array<[string, string, unknown]>,
}));

function planQuery() {
  const filters: Array<[string, string, unknown]> = [];
  const q = {
    select: () => q,
    is: (col: string, val: unknown) => (filters.push(['is', col, val]), q),
    gte: (col: string, val: unknown) => (filters.push(['gte', col, val]), q),
    lte: (col: string, val: unknown) => (filters.push(['lte', col, val]), q),
    order: () => q,
    limit: () => q,
    then: (resolve, reject) => {
      h.planFilters = filters;
      if (h.planError) return Promise.resolve({ data: null, error: h.planError }).then(resolve, reject);
      const rows = h.plans.filter((p) =>
        filters.every(([op, col, val]) => {
          if (op === 'is') return p[col] === val;
          if (op === 'gte') return String(p[col]) >= String(val);
          return String(p[col]) <= String(val);
        }),
      );
      return Promise.resolve({ data: rows.map((r) => ({ ...r })), error: null }).then(resolve, reject);
    },
    update: (values: Row) => {
      const where: Row = {};
      const u = {
        eq: (col: string, val: unknown) => ((where[col] = val), u),
        then: (resolve, reject) => {
          for (const p of h.plans) if (Object.entries(where).every(([c, v]) => p[c] === v)) Object.assign(p, values);
          return Promise.resolve({ error: null }).then(resolve, reject);
        },
      };
      return u;
    },
  };
  return q;
}

function chainFor(name: string) {
  if (name === 'teacher_lesson_plans') return planQuery();
  const rows = () => ({ data: h.tables[name] ?? [], error: null });
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  for (const m of ['select', 'in', 'eq', 'gte', 'not', 'order', 'limit', 'contains']) chain[m] = self;
  chain.range = async () => rows();
  chain.then = (resolve, reject) => Promise.resolve(rows()).then(resolve, reject);
  chain.upsert = (values: Row) => {
    if (name === 'cron_heartbeats') h.heartbeats.push(values.job as string);
    const key = `${values.user_id}|${values.kind}|${values.period_key}`;
    const fresh = name === 'teacher_lifecycle_sends' && !h.claimed.has(key);
    if (fresh) h.claimed.add(key);
    const result = name === 'teacher_lifecycle_sends' ? { data: fresh ? [{ user_id: values.user_id }] : [], error: null } : { data: [values], error: null };
    return { select: async () => result, then: (resolve, reject) => Promise.resolve(result).then(resolve, reject) };
  };
  chain.delete = () => {
    const where: Row = {};
    const del = {
      eq: (col: string, val: unknown) => ((where[col] = val), del),
      then: (resolve, reject) => {
        h.claimed.delete(`${where.user_id}|${where.kind}|${where.period_key}`);
        h.released.push(String(where.period_key));
        return Promise.resolve({ error: null }).then(resolve, reject);
      },
    };
    return del;
  };
  return chain;
}

vi.mock('@/lib/email/send', () => ({ sendEmail: (...args: unknown[]) => h.sendEmailSpy(...args) }));
vi.mock('@/lib/email', async (importOriginal) => ({
  ...(await importOriginal()),
  getSupabaseAdmin: () => ({ from: (name: string) => chainFor(name) }),
}));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));
vi.mock('@/backend/redis/locking', () => ({
  withCronLock: async (_n: string, _ms: number, fn: () => Promise<unknown>) => ({ status: 'ran', result: await fn() }),
}));
vi.mock('@/utils/logger', () => ({ default: { log: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() } }));

import { POST } from '../route';

const SECRET = 'test-secret-lesson';
const NOW = new Date('2026-11-12T06:20:00.000Z');
const LESSON = '2026-11-12T07:00:00+00:00';
const TOKEN = 'f'.repeat(64);

function makeRequest(authorization = `Bearer ${SECRET}`) {
  const headers: Record<string, string> = authorization ? { authorization } : {};
  return { headers: { get: (n: string) => headers[n.toLowerCase()] ?? null }, nextUrl: { searchParams: new URLSearchParams('') } } as never;
}

function seed() {
  h.plans = [{ id: 'p1', teacher_id: 'u1', classroom_id: 'c1', lesson_at: LESSON, timezone: 'Asia/Jerusalem', locale: 'he', reminded_at: null }];
  h.tables = {
    classrooms: [{ id: 'c1', teacher_id: 'u1', name: '7B', join_code: 'QX7K2M', language: 'en' }],
    teacher_access_requests: [{ id: 'a1', user_id: 'u1', email: 'ada@school.edu', full_name: 'Ada L', locale: 'en', status: 'approved' }],
    profiles: [{ id: 'u1', is_test_account: false, daily_email_subscribed: null, email_unsubscribe_token: TOKEN }],
    teacher_lifecycle_sends: [],
    cron_heartbeats: [],
  };
}

describe('/api/cron/teacher-lesson-reminder', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    process.env.CRON_SECRET = SECRET;
    h.sendEmailSpy.mockReset();
    h.sendEmailSpy.mockResolvedValue({ ok: true });
    h.planError = null;
    h.claimed = new Set();
    h.released = [];
    h.heartbeats = [];
    seed();
  });

  it('Given no cron secret, When called, Then 401 and nothing is read or sent', async () => {
    const res = await POST(makeRequest(''));
    expect(res.status).toBe(401);
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
  });

  it('Given a lesson in 40 minutes, When the cron runs, Then one email goes out and the plan is marked reminded', async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ due: 1, sent: 1, skipped: 0, failed: 0 });
    expect(h.sendEmailSpy).toHaveBeenCalledTimes(1);
    const mail = h.sendEmailSpy.mock.calls[0][0];
    expect(mail.to).toBe('ada@school.edu');
    expect(mail.html).toContain('QX7K2M');
    expect(mail.html).toContain('lang="he"');
    expect(mail.html).toContain('pack=LC-EN-PK-');
    expect(mail.headers['List-Unsubscribe']).toContain(TOKEN);
    expect(h.plans[0].reminded_at).toBe(NOW.toISOString());
    expect(h.claimed.has('u1|lesson_reminder|c1:2026-11-12T07:00:00.000Z')).toBe(true);
    expect(h.heartbeats).toContain('teacher-lesson-reminder');
  });

  it('Given the window, When the cron queries, Then it asks for unreminded lessons from 30 minutes ago to 75 minutes ahead', async () => {
    await POST(makeRequest());
    expect(h.planFilters).toEqual(
      expect.arrayContaining([
        ['is', 'reminded_at', null],
        ['gte', 'lesson_at', '2026-11-12T05:50:00.000Z'],
        ['lte', 'lesson_at', '2026-11-12T07:35:00.000Z'],
      ]),
    );
  });

  it('Given a run already sent it, When the cron runs again, Then nothing more is sent', async () => {
    await POST(makeRequest());
    const res = await POST(makeRequest());
    expect(await res.json()).toMatchObject({ due: 0, sent: 0 });
    expect(h.sendEmailSpy).toHaveBeenCalledTimes(1);
  });

  it('Given the ledger already holds this send but reminded_at was never written, When the cron runs, Then no second email and the plan is marked', async () => {
    h.claimed.add('u1|lesson_reminder|c1:2026-11-12T07:00:00.000Z');
    const res = await POST(makeRequest());
    expect(await res.json()).toMatchObject({ sent: 0, failed: 0 });
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
    expect(h.plans[0].reminded_at).toBe(NOW.toISOString());
  });

  it('Given the provider rejects the send, When the cron runs, Then the claim is released and the plan stays unreminded for the next hour', async () => {
    h.sendEmailSpy.mockResolvedValue({ ok: false, error: 'rate limited' });
    const res = await POST(makeRequest());
    expect(await res.json()).toMatchObject({ due: 1, sent: 0, failed: 1 });
    expect(h.released).toEqual(['c1:2026-11-12T07:00:00.000Z']);
    expect(h.claimed.size).toBe(0);
    expect(h.plans[0].reminded_at).toBeNull();

    h.sendEmailSpy.mockResolvedValue({ ok: true });
    vi.setSystemTime(new Date(NOW.getTime() + 60 * 60_000));
    expect(await (await POST(makeRequest())).json()).toMatchObject({ sent: 1 });
  });

  it('Given the send throws for one plan, When the cron runs, Then its claim is released, it stays unreminded, and the next plan still goes out', async () => {
    h.plans.push({ id: 'p2', teacher_id: 'u2', classroom_id: 'c2', lesson_at: LESSON, timezone: null, locale: 'en', reminded_at: null });
    h.tables.classrooms.push({ id: 'c2', teacher_id: 'u2', name: '8C', join_code: 'ZZ9Y8X', language: 'en' });
    h.tables.teacher_access_requests.push({ id: 'a2', user_id: 'u2', email: 'bo@school.edu', full_name: 'Bo', locale: 'en', status: 'approved' });
    h.tables.profiles.push({ id: 'u2', is_test_account: false, daily_email_subscribed: null, email_unsubscribe_token: TOKEN });
    h.sendEmailSpy.mockRejectedValueOnce(new Error('provider exploded'));

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ due: 2, sent: 1, failed: 1 });
    expect(h.released).toEqual(['c1:2026-11-12T07:00:00.000Z']);
    expect(h.claimed.has('u1|lesson_reminder|c1:2026-11-12T07:00:00.000Z')).toBe(false);
    expect(h.plans[0].reminded_at).toBeNull();
    expect(h.plans[1].reminded_at).toBe(NOW.toISOString());
  });

  it('Given a test account, When the cron runs, Then it is skipped', async () => {
    h.tables.profiles[0].is_test_account = true;
    expect(await (await POST(makeRequest())).json()).toMatchObject({ due: 1, sent: 0, skipped: 1 });
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
  });

  it('Given an unsubscribed teacher, When the cron runs, Then it is skipped', async () => {
    h.tables.profiles[0].daily_email_subscribed = false;
    expect(await (await POST(makeRequest())).json()).toMatchObject({ sent: 0, skipped: 1 });
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
  });

  it('Given a lesson three hours away, When the cron runs, Then it waits', async () => {
    h.plans[0].lesson_at = '2026-11-12T09:20:00+00:00';
    expect(await (await POST(makeRequest())).json()).toMatchObject({ due: 0, sent: 0 });
  });

  it('Given the plan query fails, When the cron runs, Then 500, never an empty success', async () => {
    h.planError = { message: 'db down' };
    const res = await POST(makeRequest());
    expect(res.status).toBe(500);
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
  });
});
