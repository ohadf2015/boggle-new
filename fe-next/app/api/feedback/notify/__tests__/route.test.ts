import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * POST /api/feedback/notify — tells the reporter their bug is fixed.
 *
 * The two things worth pinning: it is fail-closed on auth (it can send mail to
 * real players, so an unset CRON_SECRET must not open it), and it finds the
 * address on the auth record when the report itself has none — which is the
 * normal case, since the email field in the report modal is optional.
 */

vi.mock('next/server', () => ({
  NextRequest: vi.fn(),
  NextResponse: {
    json: vi.fn((data: Record<string, unknown>, init?: { status?: number }) => ({
      json: async () => data,
      status: init?.status || 200,
    })),
  },
}));

const mockGetUserById = vi.fn();
const mockMaybeSingle = vi.fn();
const mockUpdateEq = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: mockMaybeSingle }) }),
      update: () => ({ eq: mockUpdateEq }),
    }),
    auth: { admin: { getUserById: mockGetUserById } },
  }),
}));

const mockSend = vi.fn();
vi.mock('resend', () => ({
  Resend: class { emails = { send: (...a: unknown[]) => mockSend(...a) }; },
}));
vi.mock('@/utils/logger', () => ({ default: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));
vi.mock('@/lib/email', () => ({
  withTimeout: (p: Promise<unknown>) => p,
  EMAIL_COLORS: {},
}));

function req(body: unknown, secret?: string) {
  return {
    headers: { get: (n: string) => (n === 'x-cron-secret' ? secret ?? null : null) },
    json: async () => body,
  } as never;
}

const SECRET = 'test-cron-secret';

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = SECRET;
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
  process.env.RESEND_API_KEY = 'resend-key';
  process.env.RESEND_FROM_EMAIL = 'noreply@lexiclash.live';
  mockSend.mockResolvedValue({ error: null });
  mockUpdateEq.mockResolvedValue({ error: null });
});

describe('POST /api/feedback/notify — auth', () => {
  it('rejects a request with no secret', async () => {
    const { POST } = await import('../route');
    const res = await POST(req({ reportId: 'r1', summary: 's' }));
    expect(res.status).toBe(401);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('fails closed when CRON_SECRET is unset', async () => {
    delete process.env.CRON_SECRET;
    const { POST } = await import('../route');
    const res = await POST(req({ reportId: 'r1', summary: 's' }, 'anything'));
    expect(res.status).toBe(401);
  });
});

describe('POST /api/feedback/notify — recipient resolution', () => {
  it('emails the address on the report when it has one', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: 'r1', message: 'ice is rejected', email: 'given@example.com', user_id: 'u1', username: 'P', status: 'new' },
      error: null,
    });
    const { POST } = await import('../route');
    const res = await POST(req({ reportId: 'r1', summary: 'Fixed the dictionary loader.' }, SECRET));

    expect(await res.json()).toMatchObject({ ok: true, emailed: true, recipient: 'given@example.com' });
    expect(mockGetUserById).not.toHaveBeenCalled();
  });

  it('falls back to the signed-in account address when the report has none', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: 'r1', message: 'ice is rejected', email: null, user_id: 'u1', username: 'P', status: 'new' },
      error: null,
    });
    mockGetUserById.mockResolvedValue({
      data: { user: { email: 'player@example.com', is_anonymous: false } },
      error: null,
    });
    const { POST } = await import('../route');
    const res = await POST(req({ reportId: 'r1', summary: 'Fixed.' }, SECRET));

    expect(await res.json()).toMatchObject({ ok: true, emailed: true, recipient: 'player@example.com' });
  });

  it('never mails an anonymous account, and records that there was no contact', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: 'r1', message: 'x', email: null, user_id: 'u1', username: null, status: 'new' },
      error: null,
    });
    mockGetUserById.mockResolvedValue({
      data: { user: { email: 'anon@example.com', is_anonymous: true } },
      error: null,
    });
    const { POST } = await import('../route');
    const res = await POST(req({ reportId: 'r1', summary: 'Fixed.' }, SECRET));

    expect(await res.json()).toMatchObject({ ok: true, emailed: false, reason: 'no_contact' });
    expect(mockSend).not.toHaveBeenCalled();
  });
});

describe('POST /api/feedback/notify — idempotency', () => {
  it('does not mail the same reporter twice', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: 'r1', message: 'x', email: 'a@b.c', user_id: null, username: null, status: 'resolved_notified' },
      error: null,
    });
    const { POST } = await import('../route');
    const res = await POST(req({ reportId: 'r1', summary: 'Fixed.' }, SECRET));

    expect(await res.json()).toMatchObject({ ok: true, emailed: false, reason: 'already_notified' });
    expect(mockSend).not.toHaveBeenCalled();
  });
});
