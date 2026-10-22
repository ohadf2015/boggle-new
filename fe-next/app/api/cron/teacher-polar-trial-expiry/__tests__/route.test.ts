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
  const result = h.tables[name] ?? { data: [], error: null };
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  for (const m of ['select', 'in', 'eq', 'not', 'gte', 'order', 'limit', 'abortSignal', 'update']) chain[m] = self;
  chain.insert = async (values: unknown) => {
    h.inserts.push({ table: name, values });
    return { data: null, error: null };
  };
  chain.then = (resolve: unknown, reject: unknown) => Promise.resolve(result).then(resolve as never, reject as never);
  return chain;
}

vi.mock('@/lib/email/send', () => ({ sendEmail: h.sendEmailSpy }));
vi.mock('@/lib/email', async (importOriginal) => ({
  ...(await importOriginal()),
  getSupabaseAdmin: () => ({ from: (name: string) => chainFor(name) }),
}));
vi.mock('@/lib/education/proFunnelServer', () => ({
  buildPolarTrialExpirySentEvent: vi.fn(() => ({})),
  captureProFunnelServerEvent: vi.fn(),
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

const CRON_SECRET = 'test-secret-polar-expiry';
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (d: number) => new Date(Date.now() - d * DAY).toISOString();
const TOKEN = 'e'.repeat(64);

function makeRequest({ dry = false } = {}) {
  const headers: Record<string, string> = { authorization: `Bearer ${CRON_SECRET}` };
  return {
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    nextUrl: { searchParams: new URLSearchParams(dry ? 'dry=1' : '') },
  } as any;
}

const sub = (over = {}) => ({
  user_id: 'u1',
  tier: 'free',
  status: 'canceled',
  source: 'polar',
  current_period_end: daysAgo(15),
  ...over,
});

const sentEvent = (bucket: string) => ({
  user_id: 'u1',
  event_type: 'polar_trial_expiry_sent',
  payload: { bucket },
});

describe('/api/cron/teacher-polar-trial-expiry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = CRON_SECRET;
    h.sendEmailSpy.mockResolvedValue({ ok: true });
    h.inserts = [];
    h.tables = {
      subscriptions: { data: [sub()], error: null },
      subscription_events: { data: [sentEvent('t-0'), sentEvent('t+3')], error: null },
      teacher_access_requests: {
        data: [{ user_id: 'u1', email: 'ada@school.edu', full_name: 'Ada', locale: 'en' }],
        error: null,
      },
      profiles: { data: [{ id: 'u1', daily_email_subscribed: null, email_unsubscribe_token: TOKEN }], error: null },
      classrooms: { data: [{ id: 'c1', teacher_id: 'u1' }, { id: 'c2', teacher_id: 'u1' }], error: null },
      practice_sessions: {
        data: [
          { classroom_id: 'c1', completed_at: daysAgo(20), game_code: 'G1' },
          { classroom_id: 'c1', completed_at: daysAgo(20), game_code: 'G1' },
          { classroom_id: 'c2', completed_at: daysAgo(25), game_code: 'G2' },
        ],
        error: null,
      },
    };
  });

  it('sends the t+14 win-back with real class and game counts, and records the bucket', async () => {
    const body = await (await POST(makeRequest())).json();
    expect(body).toMatchObject({ success: true, sent: 1 });
    const mail = h.sendEmailSpy.mock.calls[0][0];
    expect(mail.subject).toBe('Your classes are still here');
    expect(mail.html).toContain('Your 2 classes are still on LexiClash');
    expect(mail.html).toContain('2 live games in the last 30 days');
    expect(h.inserts).toEqual([
      { table: 'subscription_events', values: expect.objectContaining({ event_type: 'polar_trial_expiry_sent', payload: { bucket: 't+14' } }) },
    ]);
  });

  it('does not resend t+14 on the next run', async () => {
    h.tables.subscription_events = { data: [sentEvent('t-0'), sentEvent('t+3'), sentEvent('t+14')], error: null };
    const body = await (await POST(makeRequest())).json();
    expect(body.sent).toBe(0);
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
  });

  it('sends t+30 after t+14 went out', async () => {
    h.tables.subscriptions = { data: [sub({ current_period_end: daysAgo(31) })], error: null };
    h.tables.subscription_events = { data: [sentEvent('t-0'), sentEvent('t+3'), sentEvent('t+14')], error: null };
    await POST(makeRequest());
    expect(h.sendEmailSpy.mock.calls[0][0].subject).toBe('Your classes are still waiting');
    expect(h.inserts[0].values.payload).toEqual({ bucket: 't+30' });
  });

  it('falls back to copy that claims no classes when the class lookup fails', async () => {
    h.tables.classrooms = { data: null, error: { message: 'boom' } };
    const body = await (await POST(makeRequest())).json();
    expect(body.sent).toBe(1);
    const mail = h.sendEmailSpy.mock.calls[0][0];
    expect(mail.html).not.toMatch(/classes are still/);
    expect(mail.html).toContain('ended on');
  });

  it('skips a teacher whose row is still trialing', async () => {
    h.tables.subscriptions = { data: [sub({ tier: 'pro', status: 'trialing' })], error: null };
    const body = await (await POST(makeRequest())).json();
    expect(body.sent).toBe(0);
  });

  it('carries a one-click unsubscribe link', async () => {
    await POST(makeRequest());
    const mail = h.sendEmailSpy.mock.calls[0][0];
    const url = `https://www.lexiclash.live/api/email/unsubscribe?token=${TOKEN}`;
    expect(mail.headers['List-Unsubscribe']).toBe(`<${url}>`);
    expect(mail.html).toContain(url);
  });

  it('skips an unsubscribed teacher and records nothing', async () => {
    h.tables.profiles = { data: [{ id: 'u1', daily_email_subscribed: false, email_unsubscribe_token: TOKEN }], error: null };
    const body = await (await POST(makeRequest())).json();
    expect(body).toMatchObject({ sent: 0, unsubscribed: 1 });
    expect(h.inserts).toHaveLength(0);
  });

  it('sends nothing when the unsubscribe lookup fails', async () => {
    h.tables.profiles = { data: null, error: { message: 'boom' } };
    const res = await POST(makeRequest());
    expect(res.status).toBe(500);
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
  });

  it('plans without sending on a dry run', async () => {
    const body = await (await POST(makeRequest({ dry: true }))).json();
    expect(body).toMatchObject({ dry: true, due: 1 });
    expect(body.plan[0].bucket).toBe('t+14');
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
    expect(h.inserts).toHaveLength(0);
  });
});
