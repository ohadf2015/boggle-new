import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const h = vi.hoisted(() => ({
  recipients: [] as Record<string, unknown>[],
  send: vi.fn(async () => ({ success: true })),
  tokenUpdates: [] as string[],
}));

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'admin' } }, error: null }) },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { is_admin: true } }) }) }) }),
  })),
}));

vi.mock('@/lib/email', () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      update: (v: { email_unsubscribe_token: string }) => ({
        eq: async (_c: string, id: string) => {
          h.tokenUpdates.push(`${id}:${v.email_unsubscribe_token}`);
          return { error: null };
        },
      }),
    }),
  }),
  isEmailServiceConfigured: () => true,
  generateUnsubscribeToken: () => 'minted',
  getSubscriberRecipients: vi.fn(),
}));

vi.mock('@/lib/campaignRecipients', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/campaignRecipients')>()),
  loadCampaignRecipients: async () => ({ ok: true, recipients: h.recipients, registeredEmails: new Set() }),
}));

vi.mock('@/lib/holidayGreetingEmail', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/holidayGreetingEmail')>()),
  sendHolidayGreetingToRecipient: h.send,
}));

vi.mock('@/lib/reengagementEmail', () => ({
  COUNTRY_TO_LANGUAGE: { IL: 'he', SE: 'sv', JP: 'ja' },
  resolveUserLanguage: vi.fn(),
  getFirstLetterForLanguage: vi.fn(),
  sendReengagementEmail: vi.fn(),
}));
vi.mock('@/lib/gameModeAnnouncementEmail', () => ({}));
vi.mock('@/lib/androidReleaseLaunchEmail', () => ({}));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));
vi.mock('@/backend/utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

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

const post = (body: Record<string, unknown>) =>
  POST(
    new NextRequest('http://localhost/api/admin/send-bulk-email', {
      method: 'POST',
      body: JSON.stringify({ emailType: 'holiday-greeting', ...body }),
    })
  );

describe('holiday-greeting bulk email', () => {
  beforeEach(() => {
    h.send.mockClear();
    h.tokenUpdates = [];
    h.recipients = [
      person('il', { country_code: 'IL', language: 'he' }),
      person('se', { country_code: 'SE', language: 'sv' }),
      person('us', { country_code: 'US', language: 'en' }),
      person('tz', { timezone: 'Asia/Jerusalem', email_unsubscribe_token: null }),
    ];
  });

  it('given dryRun, it returns counts per holiday and language and sends nothing', async () => {
    const json = await (await post({ dryRun: true })).json();
    expect(json.dryRun).toBe(true);
    expect(json.total).toBe(4);
    expect(json.byHoliday).toEqual({ hanukkah: { he: 1, en: 1 }, christmas: { sv: 1, en: 1 } });
    expect(h.send).not.toHaveBeenCalled();
  });

  it('given holiday=christmas, Israeli players are left out', async () => {
    const json = await (await post({ holiday: 'christmas' })).json();
    expect(json.sent).toBe(2);
    const sentTo = h.send.mock.calls.map((c) => (c as unknown as [{ email: string }])[0].email);
    expect(sentTo).toEqual(['se@x.io', 'us@x.io']);
  });

  it('given holiday=hanukkah, Israeli players get the Hanukkah email in their language with an unsubscribe link', async () => {
    const json = await (await post({ holiday: 'hanukkah' })).json();
    expect(json.sent).toBe(2);
    const calls = h.send.mock.calls.map((c) => (c as unknown as [Record<string, string>])[0]);
    expect(calls.every((c) => c.holiday === 'hanukkah')).toBe(true);
    expect(calls.map((c) => c.language)).toEqual(['he', 'en']);
    expect(calls[0].unsubscribeUrl).toMatch(/\/api\/email\/unsubscribe\?token=tok$/);
    expect(calls[1].unsubscribeUrl).toMatch(/token=minted$/);
    expect(h.tokenUpdates).toEqual(['tz:minted']);
  });

  it('rejects an unknown holiday', async () => {
    const res = await post({ holiday: 'easter' });
    expect(res.status).toBe(400);
  });
});
