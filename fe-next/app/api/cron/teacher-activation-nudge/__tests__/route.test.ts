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
  updates: [] as Array<{ table: string; values: unknown; filters: Array<[string, string, unknown]> }>,
}));

function chainFor(name: string) {
  const result = h.tables[name] ?? { data: [], error: null };
  const chain: Record<string, unknown> = {};
  let update: { table: string; values: unknown; filters: Array<[string, string, unknown]> } | null = null;
  const self = () => chain;
  chain.select = self;
  chain.not = self;
  chain.gte = self;
  chain.eq = (col: string, val: unknown) => {
    update?.filters.push(['eq', col, val]);
    return chain;
  };
  chain.in = (col: string, val: unknown) => {
    update?.filters.push(['in', col, val]);
    return chain;
  };
  chain.update = (values: unknown) => {
    update = { table: name, values, filters: [] };
    h.updates.push(update);
    return chain;
  };
  chain.then = (resolve: unknown, reject: unknown) =>
    Promise.resolve(update ? { data: null, error: null } : result).then(resolve as never, reject as never);
  return chain;
}

vi.mock('@/lib/email/send', () => ({ sendEmail: h.sendEmailSpy }));
vi.mock('@/lib/email', () => ({
  getSupabaseAdmin: () => ({ from: (name: string) => chainFor(name) }),
}));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));
vi.mock('@/backend/redis/locking', () => ({
  withCronLock: async (_n: string, _ms: number, fn: () => Promise<unknown>) => ({
    status: 'ran',
    result: await fn(),
  }),
}));
vi.mock('@/utils/logger', () => ({
  default: { log: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

import { POST } from '../route';

const CRON_SECRET = 'test-secret-activation';
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (d: number) => new Date(Date.now() - d * DAY).toISOString();

function makeRequest({ authorization, dry = false }: { authorization?: string; dry?: boolean } = {}) {
  const headers: Record<string, string> = {};
  if (authorization) headers.authorization = authorization;
  return {
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    nextUrl: { searchParams: new URLSearchParams(dry ? 'dry=1' : '') },
  } as any;
}

const authed = () => makeRequest({ authorization: `Bearer ${CRON_SECRET}` });

const access = (over = {}) => ({
  id: 'r1',
  user_id: 'u1',
  email: 'ada@school.edu',
  full_name: 'Ada',
  locale: 'en',
  reviewed_at: daysAgo(3.2),
  activation_nudges_sent: ['d1'],
  ...over,
});

describe('/api/cron/teacher-activation-nudge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = CRON_SECRET;
    h.sendEmailSpy.mockResolvedValue({ ok: true });
    h.updates = [];
    h.tables = {
      teacher_access_requests: { data: [access()], error: null },
      classrooms: { data: [], error: null },
      profiles: { data: [], error: null },
      subscriptions: { data: [], error: null },
    };
  });

  it('rejects a request without the cron secret', async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
  });

  it('sends the day-3 nudge to a classless teacher and records it on the row', async () => {
    const res = await POST(authed());
    const body = await res.json();
    expect(body).toMatchObject({ success: true, sent: 1, failed: 0 });
    expect(h.sendEmailSpy).toHaveBeenCalledTimes(1);
    const mail = h.sendEmailSpy.mock.calls[0][0];
    expect(mail.to).toBe('ada@school.edu');
    expect(mail.replyTo).toBe('ohadf2015@gmail.com');
    expect(mail.html).toContain('/en/teacher/classroom/new');
    expect(mail.html).toContain('Practice first with 3 bots');
    expect(h.updates).toHaveLength(1);
    expect(h.updates[0].values).toEqual({ activation_nudges_sent: ['d1', 'd3'] });
    expect(h.updates[0].filters).toContainEqual(['in', 'id', ['r1']]);
  });

  it('skips a teacher who has a classroom', async () => {
    h.tables.classrooms = { data: [{ teacher_id: 'u1' }], error: null };
    const body = await (await POST(authed())).json();
    expect(body.sent).toBe(0);
    expect(body.excluded.hasClassroom).toBe(1);
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
  });

  it('skips a test account', async () => {
    h.tables.profiles = { data: [{ id: 'u1', is_test_account: true }], error: null };
    const body = await (await POST(authed())).json();
    expect(body.sent).toBe(0);
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
  });

  it('skips a teacher on Pro, including a live admin grant', async () => {
    h.tables.subscriptions = {
      data: [{ user_id: 'u1', tier: 'pro', status: 'active', source: 'admin_grant', current_period_end: daysAgo(-30) }],
      error: null,
    };
    const body = await (await POST(authed())).json();
    expect(body.sent).toBe(0);
    expect(body.excluded.hasPro).toBe(1);
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
  });

  it('sends nothing when an exclusion lookup fails', async () => {
    h.tables.classrooms = { data: null, error: { message: 'boom' } };
    const res = await POST(authed());
    expect(res.status).toBe(500);
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
  });

  it('does not mark the row when the send fails', async () => {
    h.sendEmailSpy.mockResolvedValue({ ok: false, error: 'resend down' });
    const body = await (await POST(authed())).json();
    expect(body).toMatchObject({ sent: 0, failed: 1 });
    expect(h.updates).toHaveLength(0);
  });

  it('plans without sending on a dry run', async () => {
    const body = await (await POST(makeRequest({ authorization: `Bearer ${CRON_SECRET}`, dry: true }))).json();
    expect(body.dry).toBe(true);
    expect(body.excluded).toEqual({ hasClassroom: 0, testAccount: 0, hasPro: 0 });
    expect(body.plan).toEqual([{ email: 'ada@school.edu', locale: 'en', bucket: 'd3', rows: 1 }]);
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
    expect(h.updates).toHaveLength(0);
  });
});
