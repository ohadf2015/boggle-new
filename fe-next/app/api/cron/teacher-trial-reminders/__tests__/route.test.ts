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

const TOKEN = 'c'.repeat(64);
const profile = (over = {}) => ({ id: 'u1', daily_email_subscribed: null, email_unsubscribe_token: TOKEN, ...over });

describe('/api/cron/teacher-trial-reminders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = CRON_SECRET;
    h.sendEmailSpy.mockResolvedValue({ ok: true });
    h.updates = [];
    h.tables = {
      teacher_access_requests: { data: [access()], error: null },
      subscriptions: { data: [], error: null },
      profiles: { data: [profile()], error: null },
      // u1 ran a class game, so their trial clock is running (not waiting for the first game).
      classroom_rounds: { data: [{ teacher_id: 'u1', classroom_id: 'c1', game_code: 'G1' }], error: null },
      classrooms: { data: [{ id: 'c1', teacher_id: 'u1' }], error: null },
      classroom_memberships: { data: [{ classroom_id: 'c1', student_id: 's1' }, { classroom_id: 'c1', student_id: 's2' }], error: null },
      game_sessions: {
        data: [
          { room_code: 'G1', score: 318, words_found: [{ word: 'garden' }, { word: 'cat' }] },
          { room_code: 'G1', score: 120, words_found: [{ word: 'dear' }] },
        ],
        error: null,
      },
    };
  });

  it('carries a one-click unsubscribe link with a footer in the teacher language', async () => {
    h.tables.teacher_access_requests = { data: [access({ locale: 'he' })], error: null };
    await POST(authed());
    const mail = h.sendEmailSpy.mock.calls[0][0];
    const url = `https://www.lexiclash.live/api/email/unsubscribe?token=${TOKEN}`;
    expect(mail.headers['List-Unsubscribe']).toBe(`<${url}>`);
    expect(mail.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
    expect(mail.html).toContain(url);
    expect(mail.html).toContain('הסרה מרשימת התפוצה');
  });

  it('skips a teacher who unsubscribed and leaves the ledger alone', async () => {
    h.tables.profiles = { data: [profile({ daily_email_subscribed: false })], error: null };
    const body = await (await POST(authed())).json();
    expect(body).toMatchObject({ sent: 0, unsubscribed: 1 });
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
    expect(h.updates).toHaveLength(0);
  });

  it('sends nothing when the unsubscribe lookup fails', async () => {
    h.tables.profiles = { data: null, error: { message: 'boom' } };
    const res = await POST(authed());
    expect(res.status).toBe(500);
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
  });

  it('sends replies to Ohad and the footer in Swedish for a Swedish teacher', async () => {
    h.tables.teacher_access_requests = { data: [access({ locale: 'sv' })], error: null };
    await POST(authed());
    const mail = h.sendEmailSpy.mock.calls[0][0];
    expect(mail.replyTo).toBe('lexiclash.game@gmail.com');
    expect(mail.html).toContain('Avsluta prenumerationen');
    expect(mail.html).toContain('Svara bara på det här mejlet');
  });

  it('sends the feedback check-in five days in, with no upgrade link', async () => {
    h.tables.teacher_access_requests = {
      data: [access({ reviewed_at: inDays(-6), trial_expires_at: inDays(8) })],
      error: null,
    };
    const body = await (await POST(authed())).json();
    expect(body).toMatchObject({ success: true, sent: 1 });
    const mail = h.sendEmailSpy.mock.calls[0][0];
    expect(mail.subject).toBe('How is LexiClash going with your class?');
    expect(mail.html).not.toContain('/teacher/upgrade');
    expect(h.updates[0].values).toEqual({ trial_reminders_sent: ['feedback'] });
  });

  it('skips the check-in when the trial ends within five days', async () => {
    h.tables.teacher_access_requests = {
      data: [access({ reviewed_at: inDays(-10), trial_expires_at: inDays(4) })],
      error: null,
    };
    const body = await (await POST(authed())).json();
    expect(body).toMatchObject({ sent: 0 });
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
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

  it('t-3 shows the teacher\'s own class results and a one-tap checkout link', async () => {
    await POST(authed());
    const html = h.sendEmailSpy.mock.calls[0][0].html;
    expect(html).toContain('Your class so far');
    expect(html).toContain('class games');
    expect(html).toContain('words found');
    expect(html).toContain('Longest word: GARDEN');
    expect(html).toContain('Top score: 318');
    expect(html).toContain('/en/teacher/upgrade?source=trial_reminder_email');
    expect(html).toContain('Keep Teacher Pro after your free trial');
  });

  it('sends no trial email to a teacher who never ran a class game (waiting for the first one)', async () => {
    h.tables.classroom_rounds = { data: [], error: null };
    const body = await (await POST(authed())).json();
    expect(body).toMatchObject({ sent: 0, skippedWaiting: 1 });
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
    expect(h.updates).toHaveLength(0);
  });

  it('a waiting teacher whose window ended long ago gets no "trial ended" email either', async () => {
    h.tables.classroom_rounds = { data: [], error: null };
    h.tables.teacher_access_requests = { data: [access({ trial_expires_at: inDays(-4), trial_reminders_sent: ['t-3', 't-0'] })], error: null };
    const body = await (await POST(authed())).json();
    expect(body.sent).toBe(0);
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
  });

  it('sends nothing when the class-game history read fails', async () => {
    h.tables.classroom_rounds = { data: null, error: { message: 'boom' } };
    const res = await POST(authed());
    expect(res.status).toBe(500);
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
  });
});
