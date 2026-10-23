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
  inserts: [] as Array<{ table: string; values: any }>,
}));

function chainFor(name: string) {
  let key = name;
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  for (const m of ['select', 'in', 'not', 'gte', 'order', 'limit', 'update']) chain[m] = self;
  chain.eq = (col: string, val: unknown) => {
    if (name === 'subscription_events' && col === 'event_type' && val === 'checkout_started') key = 'checkout_started';
    return chain;
  };
  chain.insert = async (values: unknown) => {
    h.inserts.push({ table: name, values });
    return { data: null, error: null };
  };
  chain.then = (resolve: unknown, reject: unknown) =>
    Promise.resolve(h.tables[key] ?? { data: [], error: null }).then(resolve as never, reject as never);
  return chain;
}

vi.mock('@/lib/email/send', () => ({ sendEmail: h.sendEmailSpy }));
vi.mock('@/lib/email', async (importOriginal) => ({
  ...(await importOriginal()),
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

const CRON_SECRET = 'test-secret-abandoned';
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

describe('/api/cron/teacher-abandoned-checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = CRON_SECRET;
    h.sendEmailSpy.mockResolvedValue({ ok: true });
    h.inserts = [];
    h.tables = {
      checkout_started: {
        data: [{ id: 'ev1', user_id: 'u1', created_at: hoursAgo(3), payload: { mode: 'paid', locale: 'he' } }],
        error: null,
      },
      subscription_events: { data: [], error: null },
      subscriptions: { data: [], error: null },
      teacher_access_requests: {
        data: [{ user_id: 'u1', email: 'ada@school.edu', full_name: 'Ada', locale: 'he' }],
        error: null,
      },
      profiles: {
        data: [{ id: 'u1', is_test_account: false, daily_email_subscribed: null, email_unsubscribe_token: TOKEN }],
        error: null,
      },
    };
  });

  it('rejects a request without the cron secret', async () => {
    const res = await POST(makeRequest({ authorization: '' }));
    expect(res.status).toBe(401);
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
  });

  it('sends one email with a fresh checkout link and an unsubscribe link, then records it', async () => {
    const body = await (await POST(makeRequest())).json();
    expect(body).toMatchObject({ success: true, sent: 1, failed: 0 });
    const mail = h.sendEmailSpy.mock.calls[0][0];
    expect(mail.to).toBe('ada@school.edu');
    expect(mail.html).toContain('/he/teacher/upgrade?utm_source=email&utm_campaign=abandoned_checkout');
    expect(mail.headers['List-Unsubscribe']).toBe(`<https://www.lexiclash.live/api/email/unsubscribe?token=${TOKEN}>`);
    expect(h.inserts).toEqual([
      {
        table: 'subscription_events',
        values: expect.objectContaining({
          user_id: 'u1',
          event_type: 'abandoned_checkout_email_sent',
          payload: { checkout_event_id: 'ev1' },
        }),
      },
    ]);
  });

  it('does not email a teacher who already got one', async () => {
    h.tables.subscription_events = {
      data: [{ user_id: 'u1', event_type: 'abandoned_checkout_email_sent', created_at: hoursAgo(500) }],
      error: null,
    };
    const body = await (await POST(makeRequest())).json();
    expect(body.sent).toBe(0);
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
  });

  it('does not email a teacher whose checkout completed', async () => {
    h.tables.subscription_events = {
      data: [{ user_id: 'u1', event_type: 'order.paid', created_at: hoursAgo(2) }],
      error: null,
    };
    expect((await (await POST(makeRequest())).json()).sent).toBe(0);
  });

  it('does not email a Pro teacher, including a trialing one', async () => {
    h.tables.subscriptions = {
      data: [{ user_id: 'u1', tier: 'pro', status: 'trialing', source: 'polar', current_period_end: null }],
      error: null,
    };
    expect((await (await POST(makeRequest())).json()).sent).toBe(0);
  });

  it('does not email a test account', async () => {
    h.tables.profiles.data[0].is_test_account = true;
    expect((await (await POST(makeRequest())).json()).sent).toBe(0);
  });

  it('does not email someone who is not an approved teacher', async () => {
    h.tables.teacher_access_requests = { data: [], error: null };
    const body = await (await POST(makeRequest())).json();
    expect(body.sent).toBe(0);
    expect(body.notTeacher).toBe(1);
  });

  it('does not email an unsubscribed teacher', async () => {
    h.tables.profiles.data[0].daily_email_subscribed = false;
    const body = await (await POST(makeRequest())).json();
    expect(body).toMatchObject({ sent: 0, unsubscribed: 1 });
  });

  it.each(['checkout_started', 'subscription_events', 'subscriptions', 'teacher_access_requests', 'profiles'])(
    'sends nothing when the %s lookup fails',
    async (table) => {
      h.tables[table] = { data: null, error: { message: 'boom' } };
      const res = await POST(makeRequest());
      expect(res.status).toBe(500);
      expect(h.sendEmailSpy).not.toHaveBeenCalled();
      expect(h.inserts).toHaveLength(0);
    },
  );

  it('does not record a send that failed', async () => {
    h.sendEmailSpy.mockResolvedValue({ ok: false, error: 'resend down' });
    const body = await (await POST(makeRequest())).json();
    expect(body).toMatchObject({ sent: 0, failed: 1 });
    expect(h.inserts).toHaveLength(0);
  });

  it('plans without sending on a dry run', async () => {
    const body = await (await POST(makeRequest({ dry: true }))).json();
    expect(body).toMatchObject({ dry: true, due: 1 });
    expect(body.plan).toEqual([{ user_id: 'u1', email: 'ada@school.edu', locale: 'he', mode: 'paid', started_at: expect.any(String) }]);
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
    expect(h.inserts).toHaveLength(0);
  });
});
