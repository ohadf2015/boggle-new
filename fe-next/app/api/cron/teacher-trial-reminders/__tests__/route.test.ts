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

const CRON_SECRET = 'test-secret-trial';
const DAY = 24 * 60 * 60 * 1000;
const inDays = (d: number) => new Date(Date.now() + d * DAY).toISOString();

function makeRequest({ authorization, dry = false }: { authorization?: string; dry?: boolean } = {}) {
  const headers: Record<string, string> = {};
  if (authorization) headers.authorization = authorization;
  return {
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    nextUrl: { searchParams: new URLSearchParams(dry ? 'dry=1' : '') },
  } as any;
}

const authed = (dry = false) => makeRequest({ authorization: `Bearer ${CRON_SECRET}`, dry });

const access = (over = {}) => ({
  id: 'r1',
  user_id: 'u1',
  email: 'ada@school.edu',
  full_name: 'Ada',
  locale: 'en',
  trial_expires_at: inDays(2.5),
  trial_reminders_sent: [],
  ...over,
});

describe('/api/cron/teacher-trial-reminders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = CRON_SECRET;
    h.sendEmailSpy.mockResolvedValue({ ok: true });
    h.updates = [];
    h.tables = {
      teacher_access_requests: { data: [access()], error: null },
      subscriptions: { data: [], error: null },
    };
  });

  it('rejects a request without the cron secret', async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
  });

  it('sends the t-3 upsell to a teacher without Pro', async () => {
    const body = await (await POST(authed())).json();
    expect(body).toMatchObject({ success: true, sent: 1 });
    expect(h.sendEmailSpy.mock.calls[0][0].html).toContain('/en/teacher/upgrade');
    expect(h.updates[0].values).toEqual({ trial_reminders_sent: ['t-3'] });
  });

  it.each([
    ['a paying Polar subscriber', { tier: 'pro', status: 'active', source: 'polar', current_period_end: null }],
    ['a Polar Pro trial', { tier: 'pro', status: 'trialing', source: 'polar', current_period_end: null }],
    ['a live admin grant', { tier: 'pro', status: 'active', source: 'admin_grant', current_period_end: inDays(200) }],
  ])('does not ask %s to pay, and leaves the ledger alone', async (_label, sub) => {
    h.tables.subscriptions = { data: [{ user_id: 'u1', ...sub }], error: null };
    const body = await (await POST(authed())).json();
    expect(body.sent).toBe(0);
    expect(body.skippedPro).toBe(1);
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
    expect(h.updates).toHaveLength(0);
  });

  it('still asks a teacher whose admin grant has lapsed', async () => {
    h.tables.subscriptions = {
      data: [{ user_id: 'u1', tier: 'pro', status: 'active', source: 'admin_grant', current_period_end: inDays(-1) }],
      error: null,
    };
    const body = await (await POST(authed())).json();
    expect(body.sent).toBe(1);
  });

  it('skips the address when Pro sits on a sibling row of the same email', async () => {
    h.tables.teacher_access_requests = {
      data: [access({ id: 'r1', user_id: null }), access({ id: 'r2', user_id: 'u2', email: 'Ada@School.edu' })],
      error: null,
    };
    h.tables.subscriptions = {
      data: [{ user_id: 'u2', tier: 'pro', status: 'active', source: 'polar', current_period_end: null }],
      error: null,
    };
    const body = await (await POST(authed())).json();
    expect(body.sent).toBe(0);
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
  });

  it('sends nothing when the Pro lookup fails', async () => {
    h.tables.subscriptions = { data: null, error: { message: 'boom' } };
    const res = await POST(authed());
    expect(res.status).toBe(500);
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
  });

  it('reports Pro skips on a dry run', async () => {
    h.tables.subscriptions = {
      data: [{ user_id: 'u1', tier: 'pro', status: 'active', source: 'polar', current_period_end: null }],
      error: null,
    };
    const body = await (await POST(authed(true))).json();
    expect(body).toMatchObject({ dry: true, due: 0, skippedPro: 1 });
  });
});
