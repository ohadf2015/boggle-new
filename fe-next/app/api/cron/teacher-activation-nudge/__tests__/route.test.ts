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
  noAdmin: false,
  markFails: false,
  telegram: vi.fn(async () => true),
}));
import { postgrestDouble } from '@/lib/education/__tests__/helpers/postgrestDouble';

vi.mock('@/lib/email/send', () => ({ sendEmail: h.sendEmailSpy }));
vi.mock('@/lib/email', async (importOriginal) => ({
  ...(await importOriginal()),
  getSupabaseAdmin: () => {
    if (h.noAdmin) return null;
    const db = postgrestDouble(h.tables);
    return {
      from: (t: string) => {
        const q = db.from(t);
        if (t === 'teacher_access_requests' && h.markFails) q.update = () => ({ in: async () => ({ error: { message: 'rls' } }) });
        return q;
      },
    };
  },
}));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));
vi.mock('@/lib/telegram', () => ({ sendTelegramMessage: h.telegram, escapeTelegramMarkdownV2: (s: string) => s }));
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
  status: 'approved',
  user_id: 'u1',
  email: 'ada@school.edu',
  full_name: 'Ada',
  locale: 'en',
  reviewed_at: daysAgo(3.2),
  activation_nudges_sent: ['d1'],
  ...over,
});

const TOKEN = 'b'.repeat(64);
const profile = (over = {}) => ({
  id: 'u1',
  is_test_account: false,
  daily_email_subscribed: null,
  email_unsubscribe_token: TOKEN,
  ...over,
});

describe('/api/cron/teacher-activation-nudge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = CRON_SECRET;
    h.sendEmailSpy.mockResolvedValue({ ok: true });
    h.noAdmin = false;
    h.tables = {
      teacher_access_requests: { data: [access()], error: null },
      classrooms: { data: [], error: null },
      profiles: { data: [profile()], error: null },
      subscriptions: { data: [], error: null },
      cron_heartbeats: { data: [{ job: 'teacher-weekly-digest', last_run_at: daysAgo(2) }], error: null },
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
    expect(h.tables.teacher_access_requests.data[0].activation_nudges_sent).toEqual(['d1', 'd3']);
    expect(h.tables.teacher_lifecycle_sends.data.map((r) => r.kind)).toEqual(['activation:d3']);
  });

  it('carries a one-click unsubscribe link in the headers and the footer', async () => {
    await POST(authed());
    const mail = h.sendEmailSpy.mock.calls[0][0];
    const url = `https://www.lexiclash.live/api/email/unsubscribe?token=${TOKEN}`;
    expect(mail.headers).toEqual({
      'List-Unsubscribe': `<${url}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    });
    expect(mail.html).toContain(url);
  });

  it('skips a teacher who unsubscribed', async () => {
    h.tables.profiles = { data: [profile({ daily_email_subscribed: false })], error: null };
    const body = await (await POST(authed())).json();
    expect(body.sent).toBe(0);
    expect(body.unsubscribed).toBe(1);
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
  });

  it('skips an email address when any of its accounts unsubscribed', async () => {
    h.tables.teacher_access_requests = {
      data: [access(), access({ id: 'r2', user_id: 'u2' })],
      error: null,
    };
    h.tables.profiles = { data: [profile(), profile({ id: 'u2', daily_email_subscribed: false })], error: null };
    const body = await (await POST(authed())).json();
    expect(body.sent).toBe(0);
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
  });

  it('skips a row with no account, since it has no unsubscribe link', async () => {
    h.tables.teacher_access_requests = { data: [access({ user_id: null })], error: null };
    const body = await (await POST(authed())).json();
    expect(body.sent).toBe(0);
    expect(body.unreachable).toBe(1);
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
  });

  it('skips a teacher who has a classroom', async () => {
    h.tables.classrooms = { data: [{ id: 'c1', teacher_id: 'u1', created_at: new Date().toISOString() }], error: null };
    const body = await (await POST(authed())).json();
    expect(body.sent).toBe(0);
    expect(body.excluded.hasClassroom).toBe(1);
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
  });

  it('skips a test account', async () => {
    h.tables.profiles = { data: [profile({ is_test_account: true })], error: null };
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
    expect(h.tables.teacher_access_requests.data[0].activation_nudges_sent).toEqual(['d1']);
  });

  it('plans without sending on a dry run', async () => {
    const body = await (await POST(makeRequest({ authorization: `Bearer ${CRON_SECRET}`, dry: true }))).json();
    expect(body.dry).toBe(true);
    expect(body.excluded).toEqual({ hasClassroom: 0, testAccount: 0, hasPro: 0 });
    expect(body.plan).toEqual([{ email: 'ada@school.edu', locale: 'en', bucket: 'd3', rows: 1 }]);
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
    expect(h.tables.teacher_access_requests.data[0].activation_nudges_sent).toEqual(['d1']);
  });

  it('Given no service-role client, Then the run fails loudly instead of success:true', async () => {
    h.noAdmin = true;
    expect((await POST(authed())).status).toBe(500);
  });

  it('Given a teacher approved 40 days ago with no class, Then one reactivation email goes out, once', async () => {
    h.tables.teacher_access_requests = { data: [access({ reviewed_at: daysAgo(40), activation_nudges_sent: ['d1', 'd3', 'd7'] })], error: null };
    await POST(authed());
    expect(h.sendEmailSpy).toHaveBeenCalledTimes(1);
    expect(h.sendEmailSpy.mock.calls[0][0].subject).toBe('Your LexiClash teacher access is still open');
    await POST(authed());
    expect(h.sendEmailSpy).toHaveBeenCalledTimes(1);
  });

  it('Given a 2-day-old class nobody joined, Then the share-the-code nudge goes out once and respects the 3-day cap', async () => {
    h.tables.teacher_access_requests = { data: [access({ reviewed_at: daysAgo(6), activation_nudges_sent: ['d1', 'd3'] })], error: null };
    h.tables.classrooms = { data: [{ id: 'c1', teacher_id: 'u1', created_at: daysAgo(2) }], error: null };
    h.tables.classroom_memberships = { data: [{ id: 'm0', classroom_id: 'c1', student_id: 'u1' }], error: null };
    const body = await (await POST(authed())).json();
    expect(body.stages).toMatchObject({ sent: 1 });
    expect(h.sendEmailSpy.mock.calls[0][0].subject).toBe('Your class is ready. Your students just need the code');
    h.tables.classroom_memberships.data.push({ id: 'm1', classroom_id: 'c1', student_id: 's1' });
    const again = await (await POST(authed())).json();
    expect(again.stages.skipped.cooldown).toBe(1);
    expect(h.sendEmailSpy).toHaveBeenCalledTimes(1);
  });

  it('Given marking the row fails after a send, Then the batch stops with a 500 instead of re-sending tomorrow', async () => {
    h.tables.teacher_access_requests = { data: [access(), access({ id: 'r2', user_id: 'u2', email: 'bo@school.edu' })], error: null };
    h.tables.profiles = { data: [profile(), profile({ id: 'u2' })], error: null };
    h.markFails = true;
    const res = await POST(authed());
    h.markFails = false;
    expect(res.status).toBe(500);
    expect(h.sendEmailSpy).toHaveBeenCalledTimes(1);
  });

  it('Given the weekly digest has not run for 9 days, Then the owner is paged', async () => {
    h.tables.cron_heartbeats = { data: [{ job: 'teacher-weekly-digest', last_run_at: daysAgo(9) }], error: null };
    const body = await (await POST(authed())).json();
    expect(body.digestHeartbeat.stale).toBe(true);
    expect(h.telegram).toHaveBeenCalledTimes(1);
  });

  it('Given a fresh digest heartbeat, Then nobody is paged', async () => {
    await POST(authed());
    expect(h.telegram).not.toHaveBeenCalled();
  });
});
