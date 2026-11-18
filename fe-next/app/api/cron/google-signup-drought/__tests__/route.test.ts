import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const h = vi.hoisted(() => ({
  users: [] as unknown[],
  gamesStarted: { count: 50 as number | null, error: null as { message: string } | null },
  heartbeat: { data: null as unknown, error: null as { message: string } | null },
  upsert: vi.fn(),
  send: vi.fn(),
  capture: vi.fn(),
  logError: vi.fn(),
}));

vi.mock('@/lib/cronAuth', () => ({ isAuthorizedCronRequest: () => true }));
vi.mock('@/lib/telegram', () => ({
  escapeTelegramMarkdownV2: (text: string) => text,
  sendTelegramMessage: h.send,
}));
vi.mock('@/utils/sentry', () => ({ captureApiError: h.capture }));
vi.mock('@/utils/logger', () => ({ default: { error: h.logError, warn: vi.fn(), log: vi.fn() } }));
vi.mock('@/lib/admin/server', () => ({
  getSupabaseAdmin: () => ({
    auth: { admin: { listUsers: async () => ({ data: { users: h.users }, error: null }) } },
    from: (table: string) => table === 'game_sessions'
      ? { select: () => ({ gte: async () => h.gamesStarted }) }
      : {
          select: () => ({ eq: () => ({ maybeSingle: async () => h.heartbeat }) }),
          upsert: h.upsert,
        },
  }),
}));

import { POST } from '../route';

const call = (query = '') =>
  POST(new NextRequest(`https://x.test/api/cron/google-signup-drought${query}`, { method: 'POST' }));

const posthogClicks = (clicks: number) => vi.fn(async () => ({
  ok: true,
  json: async () => ({ results: [[clicks]] }),
}));

describe('POST /api/cron/google-signup-drought', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-18T16:00:00.000Z'));
    vi.stubEnv('POSTHOG_PERSONAL_API_KEY', 'key');
    vi.stubGlobal('fetch', posthogClicks(40));
    h.users = [];
    h.gamesStarted = { count: 50, error: null };
    h.heartbeat = { data: null, error: null };
    h.upsert.mockReset().mockResolvedValue({ error: null });
    h.send.mockReset().mockResolvedValue(true);
    h.capture.mockReset();
    h.logError.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('sends once and records the UTC day only after Telegram confirms', async () => {
    const res = await call();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      alert: true,
      alertSent: true,
      traffic: { source: 'landing_cta_clicks', count: 40 },
    });
    expect(h.send).toHaveBeenCalledTimes(1);
    expect(h.send.mock.calls[0][0]).toContain('landing CTA clicks=40');
    expect(h.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        job: 'google-signup-drought-alert',
        last_result: { alert_day: '2026-11-18' },
      }),
      expect.anything(),
    );
    expect(h.send.mock.invocationCallOrder[0]).toBeLessThan(h.upsert.mock.invocationCallOrder[0]);
  });

  it('does not send a second alert on the same UTC day', async () => {
    h.heartbeat = { data: { last_result: { alert_day: '2026-11-18' } }, error: null };

    const body = await (await call()).json();

    expect(body).toMatchObject({ success: true, alert: true, alertSent: false, alreadySentToday: true });
    expect(h.send).not.toHaveBeenCalled();
    expect(h.upsert).not.toHaveBeenCalled();
  });

  it('alerts again on a new UTC day', async () => {
    h.heartbeat = { data: { last_result: { alert_day: '2026-11-17' } }, error: null };

    await call();

    expect(h.send).toHaveBeenCalledTimes(1);
  });

  it('does not send when the dedupe record cannot be read', async () => {
    h.heartbeat = { data: null, error: { message: 'db down' } };

    const res = await call();

    expect(res.status).toBe(500);
    expect(h.send).not.toHaveBeenCalled();
  });

  it('reports failure when the sent alert cannot be recorded', async () => {
    h.upsert.mockResolvedValue({ error: { message: 'db down' } });

    const res = await call();

    expect(res.status).toBe(500);
    expect(h.capture).toHaveBeenCalled();
  });

  it('reports failure and records nothing when Telegram does not confirm', async () => {
    h.send.mockResolvedValue(false);

    const res = await call();
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body.success).toBe(false);
    expect(h.logError).toHaveBeenCalled();
    expect(h.capture).toHaveBeenCalled();
    expect(h.upsert).not.toHaveBeenCalled();
  });

  it('names games started as the source when PostHog fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));

    const body = await (await call()).json();

    expect(body.traffic).toEqual({ source: 'games_started', count: 50 });
    expect(h.send.mock.calls[0][0]).toContain('games started=50');
    expect(h.send.mock.calls[0][0]).not.toContain('CTA');
  });

  it('names games started as the source when the PostHog key is missing', async () => {
    vi.stubEnv('POSTHOG_PERSONAL_API_KEY', '');

    const body = await (await call()).json();

    expect(body.traffic).toEqual({ source: 'games_started', count: 50 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('is inconclusive and silent when no traffic source can be read', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('down'); }));
    h.gamesStarted = { count: null, error: { message: 'db down' } };

    const res = await call();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ success: true, alert: false, inconclusive: true, traffic: null });
    expect(h.logError).toHaveBeenCalled();
    expect(h.send).not.toHaveBeenCalled();
  });

  it('is not inconclusive when Google signups arrived, whatever the traffic read', async () => {
    h.users = [{
      created_at: '2026-11-18T15:00:00.000Z',
      app_metadata: { providers: ['google'] },
    }];
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));
    h.gamesStarted = { count: null, error: { message: 'db down' } };

    const body = await (await call()).json();

    expect(body).toMatchObject({ alert: false, inconclusive: false, googleSignups: 1 });
  });

  it('dry run sends and records nothing', async () => {
    const body = await (await call('?dry=1')).json();

    expect(body).toMatchObject({ alert: true, dry: true, alertSent: false });
    expect(h.send).not.toHaveBeenCalled();
    expect(h.upsert).not.toHaveBeenCalled();
  });
});
