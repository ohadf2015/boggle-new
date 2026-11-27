import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const h = vi.hoisted(() => ({
  authorized: true,
  recipients: [] as Record<string, unknown>[],
  ledger: new Set<string>(),
  send: vi.fn(async () => ({ success: true })),
  alerts: [] as string[],
  errors: [] as string[],
}));

vi.mock('@/lib/cronAuth', () => ({ isAuthorizedCronRequest: () => h.authorized }));
vi.mock('@/backend/redis/locking', () => ({
  withCronLock: async (_job: string, _ttl: number, fn: () => Promise<unknown>) => ({ status: 'ran', result: await fn() }),
}));
vi.mock('@/lib/education/lifecycleLedger', () => ({ writeHeartbeat: vi.fn(async () => undefined) }));
vi.mock('@/utils/sentry', () => ({ captureApiError: (e: Error) => h.alerts.push(e.message) }));
vi.mock('@/utils/logger', () => ({
  default: { log: vi.fn(), warn: vi.fn(), error: (...a: unknown[]) => h.errors.push(a.join(' ')) },
}));

function ledgerTable() {
  return {
    select: () => ({
      eq: async (_c: string, campaign: string) => ({
        data: [...h.ledger].filter((k) => k.endsWith(`|${campaign}`)).map((k) => ({ user_id: k.split('|')[0] })),
        error: null,
      }),
    }),
    upsert: (row: { user_id: string; campaign: string }) => ({
      select: async () => {
        const key = `${row.user_id}|${row.campaign}`;
        if (h.ledger.has(key)) return { data: [], error: null };
        h.ledger.add(key);
        return { data: [{ user_id: row.user_id }], error: null };
      },
    }),
    delete: () => {
      const where: Record<string, string> = {};
      const q = {
        eq: (c: string, v: string) => {
          where[c] = v;
          if (where.user_id && where.campaign) h.ledger.delete(`${where.user_id}|${where.campaign}`);
          return q;
        },
        then: (r: (v: unknown) => void) => r({ error: null }),
      };
      return q;
    },
  };
}

vi.mock('@/lib/email', () => ({
  getSupabaseAdmin: () => ({
    from: (t: string) => (t === 'holiday_greeting_sent' ? ledgerTable() : { update: () => ({ eq: async () => ({ error: null }) }) }),
  }),
  generateUnsubscribeToken: () => 'minted',
  isEmailServiceConfigured: () => true,
  withTimeout: <T,>(p: Promise<T>) => p,
}));
vi.mock('@/lib/campaignRecipients', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/campaignRecipients')>()),
  loadCampaignRecipients: async () => ({ ok: true, recipients: h.recipients, registeredEmails: new Set() }),
}));
vi.mock('@/lib/holidayGreetingEmail', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/holidayGreetingEmail')>()),
  sendHolidayGreetingToRecipient: h.send,
}));
vi.mock('@/lib/reengagementEmail', () => ({ COUNTRY_TO_LANGUAGE: { IL: 'he', JP: 'ja' } }));

import { POST } from '../route';

const person = (id: string, extra: Record<string, unknown>) => ({
  id,
  email: `${id}@x.io`,
  display_name: id,
  username: id,
  timezone: null,
  country_code: null,
  language: null,
  email_unsubscribe_token: 'tok',
  ...extra,
});
const run = async () => (await POST(new NextRequest('http://localhost/api/cron/holiday-greeting'))).json();
const at = (iso: string) => vi.setSystemTime(new Date(`${iso}Z`));
const sentTo = () => h.send.mock.calls.map((c) => (c as unknown as [{ email: string; holiday: string }])[0]);

describe('cron holiday-greeting', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.stubEnv('HOLIDAY_EMAIL_ENABLED', 'true');
    h.authorized = true;
    h.ledger = new Set();
    h.alerts = [];
    h.errors = [];
    h.send.mockClear().mockResolvedValue({ success: true });
    h.recipients = [
      person('il', { country_code: 'IL', timezone: 'Asia/Jerusalem', language: 'he' }),
      person('la', { country_code: 'US', timezone: 'America/Los_Angeles', language: 'en' }),
      person('jp', { country_code: 'JP', timezone: 'Asia/Tokyo', language: 'ja' }),
    ];
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('rejects a request without the cron secret', async () => {
    h.authorized = false;
    const res = await POST(new NextRequest('http://localhost/api/cron/holiday-greeting'));
    expect(res.status).toBe(401);
  });

  it('given the kill switch is off, it sends nothing', async () => {
    vi.stubEnv('HOLIDAY_EMAIL_ENABLED', 'false');
    at('2026-12-04T09:00:00');
    expect(await run()).toMatchObject({ skipped: 'disabled' });
    expect(h.send).not.toHaveBeenCalled();
  });

  it('given the kill switch is off on a campaign day, it raises an alert; on a quiet day it stays silent', async () => {
    vi.stubEnv('HOLIDAY_EMAIL_ENABLED', 'false');
    at('2026-12-10T09:00:00');
    await run();
    expect(h.alerts).toEqual([]);
    at('2026-12-04T09:00:00');
    await run();
    expect(h.alerts.join()).toMatch(/hanukkah-2026.*HOLIDAY_EMAIL_ENABLED/);
  });

  it('given 11:00 in Jerusalem on Dec 4, the subscribed Israeli player gets the Hanukkah email', async () => {
    at('2026-12-04T09:00:00');
    const json = await run();
    expect(sentTo()).toEqual([expect.objectContaining({ email: 'il@x.io', holiday: 'hanukkah', language: 'he' })]);
    expect(json.campaigns['hanukkah-2026'].sent).toBe(1);
  });

  it('given a second run in the same window, it sends nothing again', async () => {
    at('2026-12-04T09:00:00');
    await run();
    at('2026-12-04T09:15:00');
    await run();
    expect(h.send).toHaveBeenCalledTimes(1);
  });

  it('given Christmas day in every time zone, the Israeli player is never due', async () => {
    for (let hour = 0; hour < 24; hour++) {
      at(`2026-12-18T${String(hour).padStart(2, '0')}:00:00`);
      await run();
    }
    at('2026-12-19T00:30:00');
    await run();
    const recipients = sentTo().map((c) => c.email).sort();
    expect(recipients).toEqual(['jp@x.io', 'la@x.io']);
    expect(sentTo().every((c) => c.holiday === 'christmas')).toBe(true);
  });

  it('given Tokyo morning on Dec 18 (Dec 18 02:00 UTC), only the Tokyo player is due', async () => {
    at('2026-12-18T02:00:00');
    await run();
    expect(sentTo().map((c) => c.email)).toEqual(['jp@x.io']);
  });

  it('given Dec 18 20:00 UTC (noon in Los Angeles), only the LA player is due', async () => {
    at('2026-12-18T20:00:00');
    await run();
    expect(sentTo().map((c) => c.email)).toEqual(['la@x.io']);
  });

  it('given a failed send, it releases the claim so a later run retries', async () => {
    at('2026-12-04T09:00:00');
    h.send.mockResolvedValueOnce({ success: false, error: 'boom' } as never);
    await run();
    expect(h.ledger.has('il|hanukkah-2026')).toBe(false);
    await run();
    expect(h.ledger.has('il|hanukkah-2026')).toBe(true);
  });

  it('given an active campaign with nobody to send to, it raises an alert', async () => {
    h.recipients = [person('la', { country_code: 'US', timezone: 'America/Los_Angeles' })];
    at('2026-12-04T09:00:00');
    await run();
    expect(h.alerts.join()).toMatch(/hanukkah-2026.*0 eligible/);
  });

  it('given no campaign day, it does no work', async () => {
    at('2026-12-10T09:00:00');
    expect(await run()).toMatchObject({ skipped: 'no-campaign' });
  });
});
