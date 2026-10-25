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
  upsertSpy: vi.fn(async () => ({ error: null })),
  upsertError: null as null | { message: string },
  noAdmin: false,
  tables: {} as Record<string, { data: unknown; error: { message: string } | null }>,
}));

function chainFor(name: string) {
  const result = h.tables[name] ?? { data: [], error: null };
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = self;
  chain.eq = self;
  chain.not = self;
  chain.in = self;
  chain.gte = self;
  chain.lte = self;
  chain.limit = self;
  chain.upsert = (...args: unknown[]) => {
    h.upsertSpy(...args);
    return Promise.resolve({ error: h.upsertError });
  };
  chain.then = (resolve: unknown, reject: unknown) => Promise.resolve(result).then(resolve as never, reject as never);
  return chain;
}

vi.mock('@/lib/email/send', () => ({ sendEmail: h.sendEmailSpy }));
vi.mock('@/lib/email', () => ({
  getSupabaseAdmin: () => (h.noAdmin ? null : { from: (name: string) => chainFor(name) }),
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

const CRON_SECRET = 'test-secret-due';

function makeRequest({ authorization, dry = false }: { authorization?: string; dry?: boolean } = {}) {
  const headers: Record<string, string> = {};
  if (authorization) headers.authorization = authorization;
  return {
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    nextUrl: { searchParams: new URLSearchParams(dry ? 'dry=1' : '') },
  } as any;
}

describe('/api/cron/assignment-due-reminders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = CRON_SECRET;
    h.sendEmailSpy.mockResolvedValue({ ok: true });
    h.upsertError = null;
    h.noAdmin = false;
    h.tables = {
      lesson_assignments: { data: [], error: null },
      classrooms: { data: [], error: null },
      vocabulary_lessons: { data: [], error: null },
      classroom_memberships: { data: [], error: null },
      student_lesson_progress: { data: [], error: null },
      assignment_reminder_sends: { data: [], error: null },
      teacher_access_requests: { data: [], error: null },
      subscriptions: { data: [], error: null },
    };
  });

  it('rejects request without Authorization header', async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
  });

  it('emails a free teacher an overdue nudge that links the progress report', async () => {
    const due = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    h.tables.lesson_assignments = {
      data: [{ id: 'a1', classroom_id: 'c1', lesson_id: 'l1', due_date: due, title: 'Week 3' }],
      error: null,
    };
    h.tables.classrooms = { data: [{ id: 'c1', name: 'Year 7', teacher_id: 't1' }], error: null };
    h.tables.vocabulary_lessons = { data: [{ id: 'l1', name: 'Week 3 nouns' }], error: null };
    h.tables.classroom_memberships = {
      data: [{ classroom_id: 'c1', student_id: 's1' }],
      error: null,
    };
    h.tables.teacher_access_requests = {
      data: [{ user_id: 't1', email: 'ada@school.edu', full_name: 'Ada', locale: 'en' }],
      error: null,
    };

    const res = await POST(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.sent).toBe(1);
    expect(h.sendEmailSpy).toHaveBeenCalledTimes(1);
    const html = h.sendEmailSpy.mock.calls[0][0].html as string;
    expect(html).toContain('/en/teacher/reports?classroomId=c1');
    expect(html).toContain('/en/teacher/upgrade');
    expect(h.upsertSpy).toHaveBeenCalled();
  });

  function seedOverdue() {
    const due = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    h.tables.lesson_assignments = { data: [{ id: 'a1', classroom_id: 'c1', lesson_id: 'l1', due_date: due, title: 'Week 3' }], error: null };
    h.tables.classrooms = { data: [{ id: 'c1', name: 'Year 7', teacher_id: 't1' }], error: null };
    h.tables.classroom_memberships = { data: [{ classroom_id: 'c1', student_id: 's1' }], error: null };
    h.tables.teacher_access_requests = { data: [{ user_id: 't1', email: 'ada@school.edu', full_name: 'Ada', locale: 'en' }], error: null };
  }

  it('Given the subscriptions read fails, Then no reminder goes out with an upgrade pitch to a maybe-Pro teacher', async () => {
    seedOverdue();
    h.tables.subscriptions = { data: null, error: { message: 'timeout' } };
    const res = await POST(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }));
    expect(res.status).toBe(500);
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
  });

  it('Given the send ledger write fails, Then the run fails loudly so tomorrow does not silently re-send', async () => {
    seedOverdue();
    h.upsertError = { message: 'rls' };
    const res = await POST(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }));
    expect(res.status).toBe(500);
  });

  it('Given no service-role client, Then the run fails instead of success:true', async () => {
    h.noAdmin = true;
    expect((await POST(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }))).status).toBe(500);
  });

  it('treats a teacher whose admin grant has expired as free (upgrade link shown)', async () => {
    const due = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    h.tables.lesson_assignments = {
      data: [{ id: 'a1', classroom_id: 'c1', lesson_id: 'l1', due_date: due, title: 'Week 3' }],
      error: null,
    };
    h.tables.classrooms = { data: [{ id: 'c1', name: 'Year 7', teacher_id: 't1' }], error: null };
    h.tables.vocabulary_lessons = { data: [{ id: 'l1', name: 'Week 3 nouns' }], error: null };
    h.tables.classroom_memberships = { data: [{ classroom_id: 'c1', student_id: 's1' }], error: null };
    h.tables.teacher_access_requests = {
      data: [{ user_id: 't1', email: 'ada@school.edu', full_name: 'Ada', locale: 'en' }],
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

  it('dry run sends nothing', async () => {
    const due = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    h.tables.lesson_assignments = {
      data: [{ id: 'a1', classroom_id: 'c1', lesson_id: 'l1', due_date: due, title: 'Week 3' }],
      error: null,
    };
    h.tables.classrooms = { data: [{ id: 'c1', name: 'Year 7', teacher_id: 't1' }], error: null };
    h.tables.classroom_memberships = {
      data: [{ classroom_id: 'c1', student_id: 's1' }],
      error: null,
    };
    h.tables.teacher_access_requests = {
      data: [{ user_id: 't1', email: 'ada@school.edu', full_name: 'Ada', locale: 'en' }],
      error: null,
    };
    const res = await POST(makeRequest({ authorization: `Bearer ${CRON_SECRET}`, dry: true }));
    const body = await res.json();
    expect(body.dry).toBe(true);
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
  });
});
