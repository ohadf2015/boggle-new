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
  let inserting = false;
  const self = () => chain;
  chain.select = self;
  chain.eq = self;
  chain.in = self;
  chain.insert = (values: unknown) => {
    inserting = true;
    h.inserts.push({ table: name, values });
    return chain;
  };
  chain.then = (resolve: unknown, reject: unknown) =>
    Promise.resolve(inserting ? { data: null, error: null } : result).then(resolve as never, reject as never);
  return chain;
}

vi.mock('@/lib/email/send', () => ({ sendEmail: h.sendEmailSpy }));
vi.mock('@/lib/email', async (importOriginal) => ({
  ...(await importOriginal()),
  getSupabaseAdmin: () => ({ from: (name: string) => chainFor(name) }),
}));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));
vi.mock('@/lib/education/proFunnelServer', () => ({
  buildPolarTrialDay10SentEvent: vi.fn(() => ({})),
  captureProFunnelServerEvent: vi.fn(),
}));
vi.mock('@/backend/redis/locking', () => ({
  withCronLock: async (_n: string, _ms: number, fn: () => Promise<unknown>) => ({ status: 'ran', result: await fn() }),
}));
vi.mock('@/utils/logger', () => ({
  default: { log: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

import { POST } from '../route';

const CRON_SECRET = 'test-secret-polar';
const HOUR = 60 * 60 * 1000;
const inHours = (n: number) => new Date(Date.now() + n * HOUR).toISOString();

const authed = () =>
  ({
    headers: { get: (n: string) => (n.toLowerCase() === 'authorization' ? `Bearer ${CRON_SECRET}` : null) },
    nextUrl: { searchParams: new URLSearchParams('') },
  }) as any;

const sub = (over = {}) => ({
  user_id: 'u1',
  tier: 'pro',
  status: 'trialing',
  source: 'polar',
  current_period_end: inHours(20),
  cancel_at_period_end: false,
  ...over,
});
const access = { user_id: 'u1', email: 'ada@school.edu', full_name: 'Ada Lovelace', locale: 'en' };

describe('/api/cron/teacher-polar-trial-day10 day-before notice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = CRON_SECRET;
    h.inserts = [];
    h.tables = {
      subscriptions: { data: [sub()], error: null },
      subscription_events: { data: [], error: null },
      teacher_access_requests: { data: [access], error: null },
    };
  });

  it('emails the charge date, $9 and a way to cancel inside the last 36 hours, and records it', async () => {
    const body = await (await POST(authed())).json();
    expect(body).toMatchObject({ sent: 1 });
    const mail = h.sendEmailSpy.mock.calls[0][0];
    expect(mail.to).toBe('ada@school.edu');
    expect(mail.subject).toBe('Your Teacher Pro trial ends tomorrow');
    expect(mail.html).toContain('$9');
    expect(mail.html).toContain('Manage or cancel');
    expect(mail.html).toContain('utm_campaign=polar_trial_day_before');
    expect(h.inserts[0].values).toMatchObject({ event_type: 'polar_trial_day_before_sent', payload: { bucket: 'day-before' } });
  });

  it('does not send it twice', async () => {
    h.tables.subscription_events = { data: [{ user_id: 'u1', event_type: 'polar_trial_day_before_sent' }], error: null };
    const body = await (await POST(authed())).json();
    expect(body).toMatchObject({ sent: 0 });
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
  });

  it('says nothing about a charge to a teacher who already cancelled', async () => {
    h.tables.subscriptions = { data: [sub({ cancel_at_period_end: true })], error: null };
    await POST(authed());
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
    h.tables.subscriptions = { data: [sub({ cancel_at_period_end: true, current_period_end: inHours(72) })], error: null };
    await POST(authed());
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
  });

  it('sends the day-10 email, not the day-before one, 3 days out', async () => {
    h.tables.subscriptions = { data: [sub({ current_period_end: inHours(72) })], error: null };
    await POST(authed());
    expect(h.sendEmailSpy).toHaveBeenCalledTimes(1);
    expect(h.inserts[0].values.event_type).toBe('polar_trial_day10_sent');
  });

  it('sends only the day-before email when day-10 was missed', async () => {
    await POST(authed());
    expect(h.sendEmailSpy).toHaveBeenCalledTimes(1);
    expect(h.inserts.map((i) => i.values.event_type)).toEqual(['polar_trial_day_before_sent']);
  });
});
