// @ts-nocheck
import { vi } from 'vitest';

const mockJson = vi.fn((data: unknown, init?: { status?: number }) => ({
  json: async () => data,
  status: init?.status ?? 200,
}));

vi.mock('next/server', () => ({
  NextRequest: vi.fn(),
  NextResponse: { json: (...args: unknown[]) => mockJson(...args) },
}));

const h = vi.hoisted(() => ({
  sendEmailSpy: vi.fn(async () => ({ ok: true })),
  tables: {} as Record<string, { data: unknown; error: { message: string } | null }>,
  claimed: new Set<string>(),
  released: [] as string[],
  heartbeats: [] as string[],
}));

function rows(name: string) {
  const table = h.tables[name] ?? { data: [], error: null };
  if (table.error) return { data: null, error: table.error };
  return { data: table.data ?? [], error: null };
}

function chainFor(name: string) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  for (const method of ['select', 'in', 'eq', 'gte', 'not', 'order', 'limit', 'contains', 'delete']) chain[method] = self;
  chain.range = async () => rows(name);
  chain.then = (resolve: unknown, reject: unknown) => Promise.resolve(rows(name)).then(resolve as never, reject as never);
  chain.upsert = (values: { user_id?: string; kind?: string; period_key?: string; job?: string }) => {
    if (name === 'cron_heartbeats' && values.job) h.heartbeats.push(values.job);
    const key = `${values.user_id}|${values.kind}|${values.period_key}`;
    const fresh = name === 'teacher_lifecycle_sends' && values.user_id && !h.claimed.has(key);
    if (fresh) h.claimed.add(key);
    const result = name === 'teacher_lifecycle_sends'
      ? { data: fresh ? [{ user_id: values.user_id }] : [], error: null }
      : { data: [values], error: null };
    return {
      select: async () => result,
      then: (resolve: unknown, reject: unknown) => Promise.resolve(result).then(resolve as never, reject as never),
    };
  };
  chain.delete = () => {
    const del = {
      eq: () => del,
      then: (resolve: unknown, reject: unknown) => {
        h.released.push(name);
        return Promise.resolve({ error: null }).then(resolve as never, reject as never);
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
  withCronLock: async (_name: string, _ms: number, fn: () => Promise<unknown>) => ({
    status: 'ran',
    result: await fn(),
  }),
}));
vi.mock('@/utils/logger', () => ({
  default: { log: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

import { POST } from '../route';

const CRON_SECRET = 'test-secret-day2';
const HOUR = 60 * 60 * 1000;
const hoursAgo = (n: number) => new Date(Date.now() - n * HOUR).toISOString();
const TOKEN = 'f'.repeat(64);

function makeRequest({ authorization = `Bearer ${CRON_SECRET}`, dry = false } = {}) {
  const headers: Record<string, string> = authorization ? { authorization } : {};
  return {
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    nextUrl: { searchParams: new URLSearchParams(dry ? 'dry=1' : '') },
  } as any;
}

function dueFixtures() {
  return {
    classrooms: {
      data: [{ id: 'c1', teacher_id: 'u1', created_at: hoursAgo(50) }],
      error: null,
    },
    teacher_access_requests: {
      data: [{ id: 'a1', user_id: 'u1', email: 'ada@school.edu', full_name: 'Ada', locale: 'en', status: 'approved' }],
      error: null,
    },
    profiles: {
      data: [{
        id: 'u1',
        is_test_account: false,
        user_role: 'teacher',
        daily_email_subscribed: null,
        email_unsubscribe_token: TOKEN,
      }],
      error: null,
    },
    subscriptions: { data: [], error: null },
    subscription_events: { data: [], error: null },
    classroom_memberships: {
      data: [
        { id: 'm1', classroom_id: 'c1', student_id: 's1' },
        { id: 'm2', classroom_id: 'c1', student_id: 'u1' },
      ],
      error: null,
    },
    practice_sessions: {
      data: [
        { id: 'p1', classroom_id: 'c1', student_id: 's1', completed_at: hoursAgo(1) },
        { id: 'p2', classroom_id: 'c1', student_id: 's1', completed_at: hoursAgo(2) },
      ],
      error: null,
    },
    teacher_lifecycle_sends: { data: [], error: null },
    cron_heartbeats: { data: [], error: null },
  };
}

describe('/api/cron/teacher-day2-value', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = CRON_SECRET;
    h.sendEmailSpy.mockResolvedValue({ ok: true });
    h.claimed = new Set();
    h.released = [];
    h.heartbeats = [];
    h.tables = dueFixtures();
  });

  it('rejects a request without the cron secret', async () => {
    const res = await POST(makeRequest({ authorization: '' }));
    expect(res.status).toBe(401);
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
  });

  it('sends one email with the class counts and claims the ledger before a retry can', async () => {
    const res = await POST(makeRequest());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.sent).toBe(1);
    expect(body.failed).toBe(0);
    expect(h.sendEmailSpy).toHaveBeenCalledTimes(1);
    const sent = h.sendEmailSpy.mock.calls[0][0];
    expect(sent.to).toBe('ada@school.edu');
    expect(sent.html).toContain('1 students joined, 2 games played');
    expect(sent.html).toContain('/en/teacher/reports');
    expect(sent.html).toContain('/en/teacher/upgrade');
    expect(sent.headers['List-Unsubscribe']).toContain('/api/email/unsubscribe');
    expect(h.claimed.has('u1|day2_value|once')).toBe(true);
    expect(h.heartbeats).toEqual(['teacher-day2-value']);
  });

  it('does not send or claim on a dry run', async () => {
    const res = await POST(makeRequest({ dry: true }));
    const body = await res.json();
    expect(body.dry).toBe(true);
    expect(body.due).toBe(1);
    expect(body.plan[0].students_joined).toBe(1);
    expect(body.plan[0].games_played).toBe(2);
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
    expect(h.claimed.size).toBe(0);
  });

  it('skips a teacher who is already Teacher Pro', async () => {
    h.tables.subscriptions = {
      data: [{
        id: 'sub1',
        user_id: 'u1',
        tier: 'pro',
        status: 'active',
        source: 'polar',
        current_period_end: new Date(Date.now() + 7 * 24 * HOUR).toISOString(),
      }],
      error: null,
    };
    const res = await POST(makeRequest());
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.pro).toBe(1);
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
  });

  it('skips a teacher whose trial already converted', async () => {
    h.tables.subscription_events = {
      data: [{ id: 'e1', user_id: 'u1', event_type: 'subscription.active' }],
      error: null,
    };
    const body = await (await POST(makeRequest())).json();
    expect(body.sent).toBe(0);
    expect(body.converted).toBe(1);
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
  });

  it('does not send a second time when the ledger already holds the marker', async () => {
    h.tables.teacher_lifecycle_sends = {
      data: [{ user_id: 'u1', kind: 'day2_value', period_key: 'once', sent_at: hoursAgo(1) }],
      error: null,
    };
    const body = await (await POST(makeRequest())).json();
    expect(body.sent).toBe(0);
    expect(body.alreadySent).toBe(1);
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
  });

  it('releases the claim when the provider rejects the send', async () => {
    h.sendEmailSpy.mockResolvedValue({ ok: false, error: 'resend down' });
    const body = await (await POST(makeRequest())).json();
    expect(body.sent).toBe(0);
    expect(body.failed).toBe(1);
    expect(h.released).toContain('teacher_lifecycle_sends');
  });

  it('sends nothing and returns 500 when a lookup fails', async () => {
    h.tables.classrooms = { data: null, error: { message: 'boom' } };
    const res = await POST(makeRequest());
    expect(res.status).toBe(500);
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
  });
});
