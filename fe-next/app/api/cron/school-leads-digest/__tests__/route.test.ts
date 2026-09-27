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
  selectError: null as null | { message: string },
  rows: [] as unknown[],
}));

vi.mock('@/lib/email/send', () => ({ sendEmail: h.sendEmailSpy }));
vi.mock('@/lib/email', () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        gte: () => ({
          lte: () => ({
            order: async () => ({ data: h.rows, error: h.selectError }),
          }),
        }),
      }),
    }),
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
import { SCHOOL_LEAD_NOTIFY_TO } from '@/lib/education/schoolLeadNotify';

const CRON_SECRET = 'test-secret-digest';

function makeRequest({ authorization, dry = false }: { authorization?: string; dry?: boolean } = {}) {
  const headers: Record<string, string> = {};
  if (authorization) headers.authorization = authorization;
  return {
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    nextUrl: { searchParams: new URLSearchParams(dry ? 'dry=1' : '') },
  } as any;
}

describe('/api/cron/school-leads-digest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = CRON_SECRET;
    h.selectError = null;
    h.rows = [];
    h.sendEmailSpy.mockResolvedValue({ ok: true });
  });

  it('rejects request without Authorization header', async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
  });

  it('emails a 0-lead digest for an empty week', async () => {
    const res = await POST(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.count).toBe(0);
    expect(body.sent).toBe(true);
    expect(h.sendEmailSpy).toHaveBeenCalledTimes(1);
    const args = h.sendEmailSpy.mock.calls[0][0];
    expect(args.to).toBe(SCHOOL_LEAD_NOTIFY_TO);
    expect(args.subject).toBe('School leads this week: 0');
    expect(args.html).toContain('No school leads this week');
  });

  it('lists leads captured that week in the digest', async () => {
    h.rows = [{
      full_name: 'Dana Levi',
      email: 'principal@lincoln-high.edu',
      school_or_district: 'Lincoln High School',
      role: 'school_admin',
      locale: 'en',
      created_at: '2026-09-10T12:00:00.000Z',
      source: 'classroom-plan',
    }];
    const res = await POST(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBe(1);
    expect(body.sent).toBe(true);
    const html = h.sendEmailSpy.mock.calls[0][0].html;
    expect(html).toContain('Dana Levi');
    expect(html).toContain('principal@lincoln-high.edu');
    expect(html).toContain('Lincoln High School');
    expect(html).toContain('school_admin');
    expect(html).toContain('en');
    expect(html).toContain('2026-09-10T12:00:00.000Z');
  });

  it('dry=1 lists leads and sends nothing', async () => {
    h.rows = [{
      full_name: 'Dana Levi',
      email: 'principal@lincoln-high.edu',
      school_or_district: 'Lincoln High School',
      role: 'school_admin',
      locale: 'en',
      created_at: '2026-09-10T12:00:00.000Z',
    }];
    const res = await POST(makeRequest({ authorization: `Bearer ${CRON_SECRET}`, dry: true }));
    const body = await res.json();
    expect(body.dry).toBe(true);
    expect(body.count).toBe(1);
    expect(h.sendEmailSpy).not.toHaveBeenCalled();
  });

  it('mail failure does not 500 the cron (row is already in the table)', async () => {
    h.sendEmailSpy.mockResolvedValueOnce({ ok: false, error: 'resend down' });
    const res = await POST(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(false);
  });
});
