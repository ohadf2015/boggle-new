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
  chain.limit = self;
  chain.then = (resolve: unknown, reject: unknown) => Promise.resolve(result).then(resolve as never, reject as never);
  return chain;
}

vi.mock('@/lib/email/send', () => ({ sendEmail: h.sendEmailSpy }));
vi.mock('@/lib/email', () => ({
  getSupabaseAdmin: () => ({
    from: (name: string) => chainFor(name),
  }),
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

describe('/api/cron/teacher-weekly-digest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = CRON_SECRET;
    h.sendEmailSpy.mockResolvedValue({ ok: true });
    h.tables = {
      teacher_access_requests: { data: [], error: null },
      classrooms: { data: [], error: null },
      classroom_memberships: { data: [], error: null },
      practice_sessions: { data: [], error: null },
      subscriptions: { data: [], error: null },
    };
  });

  it('rejects request without Authorization header', async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
  });

  it('sends a Polar-CTA digest for a free teacher with a classroom', async () => {
    h.tables.teacher_access_requests = {
      data: [{ user_id: 't1', email: 'ada@school.edu', full_name: 'Ada', locale: 'en' }],
      error: null,
    };
    h.tables.classrooms = { data: [{ id: 'c1', name: 'Year 7', teacher_id: 't1' }], error: null };
    h.tables.classroom_memberships = {
      data: [{ classroom_id: 'c1', student_id: 's1' }],
      error: null,
    };
    h.tables.practice_sessions = {
      data: [
        {
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
});
