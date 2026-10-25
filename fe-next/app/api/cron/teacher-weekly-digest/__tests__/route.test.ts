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
}));
import { postgrestDouble } from '@/lib/education/__tests__/helpers/postgrestDouble';

vi.mock('@/lib/email/send', () => ({ sendEmail: h.sendEmailSpy }));
vi.mock('@/lib/email', async (importOriginal) => ({
  ...(await importOriginal()),
  getSupabaseAdmin: () => (h.noAdmin ? null : postgrestDouble(h.tables)),
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

const CRON_SECRET = 'test-secret-weekly';

function makeRequest({ authorization, dry = false }: { authorization?: string; dry?: boolean } = {}) {
  const headers: Record<string, string> = {};
  if (authorization) headers.authorization = authorization;
  return {
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    nextUrl: { searchParams: new URLSearchParams(dry ? 'dry=1' : '') },
  } as any;
}

const TOKEN = 'd'.repeat(64);

function seedTeacherWithClass() {
  h.tables.teacher_access_requests = {
    data: [{ id: 'r1', status: 'approved', user_id: 't1', email: 'ada@school.edu', full_name: 'Ada', locale: 'en' }],
    error: null,
  };
  h.tables.classrooms = { data: [{ id: 'c1', name: 'Year 7', teacher_id: 't1' }], error: null };
}

describe('/api/cron/teacher-weekly-digest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = CRON_SECRET;
    h.sendEmailSpy.mockResolvedValue({ ok: true });
    h.noAdmin = false;
    h.tables = {
      teacher_access_requests: { data: [], error: null },
      classrooms: { data: [], error: null },
      classroom_memberships: { data: [], error: null },
      practice_sessions: { data: [], error: null },
      lesson_assignments: { data: [], error: null },
      student_lesson_progress: { data: [], error: null },
      subscriptions: { data: [], error: null },
      subscription_events: { data: [], error: null },
      profiles: { data: [{ id: 't1', daily_email_subscribed: null, email_unsubscribe_token: TOKEN }], error: null },
    };
  });

  it('rejects request without Authorization header', async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
  });

  it('sends a Polar-CTA digest for a free teacher with a classroom', async () => {
    h.tables.teacher_access_requests = {
      data: [{ id: 'r1', status: 'approved', user_id: 't1', email: 'ada@school.edu', full_name: 'Ada', locale: 'en' }],
      error: null,
    };
    h.tables.classrooms = { data: [{ id: 'c1', name: 'Year 7', teacher_id: 't1' }], error: null };
    h.tables.classroom_memberships = {
      data: [{ id: 'm1', classroom_id: 'c1', student_id: 's1' }],
      error: null,
    };
    h.tables.practice_sessions = {
      data: [
        {
          id: 'ps1',
          classroom_id: 'c1',
          student_id: 's1',
          completed_at: new Date().toISOString(),
          results: { lessonWordsFound: ['a'], lessonWordsMissed: [] },
        },
      ],
      error: null,
    };

    const res = await POST(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.sent).toBe(1);
    expect(h.sendEmailSpy).toHaveBeenCalledTimes(1);
    const html = h.sendEmailSpy.mock.calls[0][0].html as string;
    expect(html).toContain('/en/teacher/upgrade');
  });

  it('treats a teacher whose admin grant has expired as free (Polar CTA shown)', async () => {
    seedTeacherWithClass();
    h.tables.classroom_memberships = { data: [{ classroom_id: 'c1', student_id: 's1' }], error: null };
    h.tables.practice_sessions = {
      data: [{ classroom_id: 'c1', student_id: 's1', completed_at: new Date().toISOString(), results: { lessonWordsFound: ['a'], lessonWordsMissed: [] } }],
      error: null,
    };
    h.tables.subscriptions = {
      data: [{ user_id: 't1', tier: 'pro', status: 'active', source: 'admin_grant', current_period_end: '2020-01-01T00:00:00Z' }],
      error: null,
    };

    await POST(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }));
    const html = h.sendEmailSpy.mock.calls[0][0].html as string;
    expect(html).toContain('/en/teacher/upgrade');
  });

  it('carries a one-click unsubscribe link in headers and footer', async () => {
    seedTeacherWithClass();
    await POST(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }));
    const mail = h.sendEmailSpy.mock.calls[0][0];
    const url = `https://www.lexiclash.live/api/email/unsubscribe?token=${TOKEN}`;
    expect(mail.headers['List-Unsubscribe']).toBe(`<${url}>`);
    expect(mail.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
    expect(mail.html).toContain(url);
  });

  it('skips a teacher who unsubscribed', async () => {
    seedTeacherWithClass();
    h.tables.profiles = { data: [{ id: 't1', daily_email_subscribed: false, email_unsubscribe_token: TOKEN }], error: null };
    const body = await (await POST(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }))).json();
    expect(body.sent).toBe(0);
    expect(body.unsubscribed).toBe(1);
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
  });

  it('sends nothing when the unsubscribe lookup fails', async () => {
    seedTeacherWithClass();
    h.tables.profiles = { data: null, error: { message: 'boom' } };
    const res = await POST(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }));
    expect(res.status).toBe(500);
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
  });

  it('Given the same week was already sent, When the cron is re-triggered, Then nobody is emailed again', async () => {
    seedTeacherWithClass();
    await POST(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }));
    expect(h.sendEmailSpy).toHaveBeenCalledTimes(1);
    const body = await (await POST(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }))).json();
    expect(h.sendEmailSpy).toHaveBeenCalledTimes(1);
    expect(body.alreadySent).toBe(1);
  });

  it('Given a send fails, Then its claim is released so the next run can retry', async () => {
    seedTeacherWithClass();
    h.sendEmailSpy.mockResolvedValueOnce({ ok: false, error: 'resend 500' });
    await POST(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }));
    expect(h.tables.teacher_lifecycle_sends.data).toEqual([]);
    await POST(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }));
    expect(h.sendEmailSpy).toHaveBeenCalledTimes(2);
  });

  it('Given a teacher whose profile is a test account, Then no digest is sent to them', async () => {
    seedTeacherWithClass();
    h.tables.profiles = { data: [{ id: 't1', is_test_account: true, daily_email_subscribed: null, email_unsubscribe_token: TOKEN }], error: null };
    const body = await (await POST(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }))).json();
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
    expect(body.excludedTestAccounts).toBe(1);
  });

  it('Given the subscriptions read fails, Then the run fails instead of pitching Pro teachers an upgrade', async () => {
    seedTeacherWithClass();
    h.tables.subscriptions = { data: null, error: { message: 'timeout' } };
    const res = await POST(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }));
    expect(res.status).toBe(500);
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
  });

  it('Given no service-role client, Then the run fails loudly, not success:true', async () => {
    h.noAdmin = true;
    const res = await POST(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }));
    expect(res.status).toBe(500);
  });

  it('Given 1500 sessions in a busy fortnight, Then none are dropped by a row cap', async () => {
    seedTeacherWithClass();
    h.tables.classroom_memberships = { data: [{ id: 'm1', classroom_id: 'c1', student_id: 's1' }], error: null };
    const at = new Date().toISOString();
    h.tables.practice_sessions = {
      data: Array.from({ length: 1500 }, (_, i) => ({
        id: `ps${String(i).padStart(4, '0')}`, classroom_id: 'c1', student_id: 's1', completed_at: at,
        results: { lessonWordsFound: ['a'], lessonWordsMissed: [] },
      })),
      error: null,
    };
    const { loadWeeklyDigestInputs } = await import('@/lib/education/weeklyDigestData');
    const inputs = await loadWeeklyDigestInputs(postgrestDouble(h.tables) as never, Date.now());
    expect(inputs.sessions).toHaveLength(1500);
  });

  it('Given a completed run, Then the digest heartbeat is written', async () => {
    seedTeacherWithClass();
    await POST(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }));
    expect((h.tables.cron_heartbeats.data as Array<{ job: string }>).map((r) => r.job)).toEqual(['teacher-weekly-digest']);
  });
});
