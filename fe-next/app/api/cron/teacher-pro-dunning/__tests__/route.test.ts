import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const h = vi.hoisted(() => ({
  subs: [] as unknown[],
  events: [] as unknown[],
  access: [] as unknown[],
  sendEmail: vi.fn(async () => ({ ok: true })),
  logSubscriptionEvent: vi.fn(async () => undefined),
  capture: vi.fn(),
  log: vi.fn(),
}));

function chain(result: { data: unknown; error: null }) {
  const api = {
    select: () => api,
    eq: () => api,
    in: () => api,
    then: (resolve: (v: typeof result) => void, reject?: (e: unknown) => void) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return api;
}

vi.mock('@/lib/email', () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === 'subscriptions') return chain({ data: h.subs, error: null });
      if (table === 'subscription_events') return chain({ data: h.events, error: null });
      if (table === 'teacher_access_requests') return chain({ data: h.access, error: null });
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));
vi.mock('@/lib/email/send', () => ({ sendEmail: (...args: unknown[]) => h.sendEmail(...args) }));
vi.mock('@/lib/subscriptions', () => ({ logSubscriptionEvent: (...args: unknown[]) => h.logSubscriptionEvent(...args) }));
vi.mock('@/lib/education/proFunnelServer', () => ({
  buildDunningEmailSentEvent: (userId: string, day: number) => ({ event: 'dunning_email_sent', distinctId: userId, properties: { day } }),
  captureProFunnelServerEvent: (...args: unknown[]) => h.capture(...args),
}));
vi.mock('@/backend/redis/locking', () => ({
  withCronLock: async (_name: string, _ttl: number, fn: () => Promise<unknown>) => ({ status: 'ran', result: await fn() }),
}));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));
vi.mock('@/utils/logger', () => ({ default: { log: (...a: unknown[]) => h.log(...a), warn: vi.fn(), error: vi.fn() } }));

import { GET, POST } from '../route';

const DAY = 24 * 60 * 60 * 1000;
const USER = '11111111-1111-4111-8111-111111111111';

function req(path: string, secret = 'cron-test-secret') {
  return new NextRequest(`https://www.lexiclash.live${path}`, { headers: { 'x-cron-secret': secret } });
}

describe('teacher-pro-dunning cron', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'cron-test-secret';
    h.subs = [];
    h.events = [];
    h.access = [];
    h.sendEmail.mockResolvedValue({ ok: true });
  });

  it('rejects a request without the cron secret', async () => {
    const res = await GET(req('/api/cron/teacher-pro-dunning?hook=1', ''));
    expect(res.status).toBe(401);
    expect(h.sendEmail).not.toHaveBeenCalled();
  });

  it('?hook=1 logs the day-1 enqueue once 24h have passed and sends nothing', async () => {
    h.subs = [{
      user_id: USER,
      source: 'polar',
      provider_event_at: new Date(Date.now() - DAY - 60_000).toISOString(),
      current_period_end: new Date(Date.now() + 20 * DAY).toISOString(),
      lemon_squeezy_subscription_id: 'sub_123',
    }];
    h.access = [{ user_id: USER, email: 'teacher@school.org', full_name: 'Dana Cohen', locale: 'en', created_at: '2026-09-01T00:00:00Z' }];

    const res = await GET(req('/api/cron/teacher-pro-dunning?hook=1'));
    const body = await res.json();
    expect(body.dry).toBe(true);
    expect(body.enqueued).toEqual([{ day: 1, subscriptionId: 'sub_123', userId: USER }]);
    expect(h.log).toHaveBeenCalledWith(`[Dunning] enqueued day-1 email subscription=sub_123 user=${USER}`);
    expect(h.sendEmail).not.toHaveBeenCalled();
  });

  it('?hook=1 logs the day-5 enqueue for a 9-day past_due teacher and sends nothing', async () => {
    h.subs = [{
      user_id: USER,
      source: 'polar',
      provider_event_at: new Date(Date.now() - 9 * DAY).toISOString(),
      current_period_end: new Date(Date.now() + 21 * DAY).toISOString(),
      lemon_squeezy_subscription_id: 'sub_123',
    }];
    h.access = [{ user_id: USER, email: 'teacher@school.org', full_name: 'Dana Cohen', locale: 'he', created_at: '2026-09-01T00:00:00Z' }];

    const res = await GET(req('/api/cron/teacher-pro-dunning?hook=1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.dry).toBe(true);
    expect(body.enqueued).toEqual([{ day: 5, subscriptionId: 'sub_123', userId: USER }]);
    expect(body.sent).toBe(0);
    expect(h.log).toHaveBeenCalledWith(`[Dunning] enqueued day-5 email subscription=sub_123 user=${USER}`);
    expect(h.sendEmail).not.toHaveBeenCalled();
    expect(h.capture).not.toHaveBeenCalled();
  });

  it('a live run sends the day-5 escalation with the recover link and emits dunning_email_sent', async () => {
    h.subs = [{
      user_id: USER,
      source: 'polar',
      provider_event_at: new Date(Date.now() - 9 * DAY).toISOString(),
      current_period_end: null,
      lemon_squeezy_subscription_id: 'sub_123',
    }];
    h.access = [{ user_id: USER, email: 'teacher@school.org', full_name: 'Dana Cohen', locale: 'en', created_at: '2026-09-01T00:00:00Z' }];

    const res = await POST(req('/api/cron/teacher-pro-dunning'));
    const body = await res.json();
    expect(body.sent).toBe(1);
    expect(body.enqueued).toEqual([{ day: 5, subscriptionId: 'sub_123', userId: USER }]);
    const sent = h.sendEmail.mock.calls[0][0] as { to: string; html: string; subject: string };
    expect(sent.to).toBe('teacher@school.org');
    expect(sent.subject).toContain('still unpaid');
    expect(sent.html).toContain('/api/subscription/recover?t=');
    expect(sent.html).not.toContain('/teacher/upgrade');
    expect(h.logSubscriptionEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'teacher_dunning_email_day_5',
      subscriptionId: 'sub_123',
    }));
    expect(h.capture).toHaveBeenCalledWith(expect.objectContaining({
      event: 'dunning_email_sent',
      properties: { day: 5 },
    }));
  });

  it('does not enqueue a day that was already sent', async () => {
    h.subs = [{
      user_id: USER,
      source: 'polar',
      provider_event_at: new Date(Date.now() - 2 * DAY).toISOString(),
      current_period_end: null,
      lemon_squeezy_subscription_id: 'sub_123',
    }];
    h.events = [{ subscription_id: 'sub_123', user_id: USER, event_type: 'teacher_dunning_email_day_1' }];
    h.access = [{ user_id: USER, email: 'teacher@school.org', full_name: 'Dana', locale: 'en', created_at: '2026-09-01T00:00:00Z' }];

    const res = await POST(req('/api/cron/teacher-pro-dunning?dry=1'));
    const body = await res.json();
    expect(body.enqueued).toEqual([]);
    expect(h.log).not.toHaveBeenCalled();
    expect(h.sendEmail).not.toHaveBeenCalled();
  });
});
