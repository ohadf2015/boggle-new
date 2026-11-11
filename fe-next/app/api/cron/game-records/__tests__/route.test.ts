import { describe, it, expect, vi, beforeEach } from 'vitest';

const { refresh, captureApiError, authorized, admin } = vi.hoisted(() => ({
  refresh: vi.fn(),
  captureApiError: vi.fn(),
  authorized: vi.fn(() => true),
  admin: vi.fn(() => ({})),
}));
vi.mock('next/server', () => ({
  NextResponse: { json: (data: unknown, init?: { status?: number }) => ({ data, status: init?.status ?? 200 }) },
}));
vi.mock('@/lib/cronAuth', () => ({ isAuthorizedCronRequest: () => authorized() }));
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: () => admin() }));
vi.mock('@/lib/records/worldRecordRefresh', () => ({ refreshWorldRecords: (...a: unknown[]) => refresh(...a) }));
vi.mock('@/lib/records/worldRecordCron', () => ({ worldRecordDeps: () => ({}) }));
vi.mock('@/backend/redis/locking', () => ({
  withCronLock: async (_n: string, _t: number, fn: () => Promise<unknown>) => ({ status: 'ran', result: await fn() }),
}));
vi.mock('@/utils/sentry', () => ({ captureApiError: (...a: unknown[]) => captureApiError(...a) }));
vi.mock('@/utils/logger', () => ({ default: { log: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import { GET, POST } from '../route';

const req = {} as never;

describe('/api/cron/game-records', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authorized.mockReturnValue(true);
    admin.mockReturnValue({});
  });

  it('refuses a request without the cron secret', async () => {
    authorized.mockReturnValue(false);
    const res = await POST(req) as unknown as { status: number };
    expect(res.status).toBe(401);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('runs the refresh and reports the counts', async () => {
    refresh.mockResolvedValue({ records: 14, written: 2, broken: 1 });
    const res = await GET(req) as unknown as { status: number; data: unknown };
    expect(res.status).toBe(200);
    expect(res.data).toEqual({ success: true, records: 14, written: 2, broken: 1 });
  });

  it('answers 500 and reports to Sentry when the refresh fails', async () => {
    refresh.mockRejectedValue(new Error('no record candidates'));
    const res = await POST(req) as unknown as { status: number };
    expect(res.status).toBe(500);
    expect(captureApiError).toHaveBeenCalled();
  });

  it('answers 503 when the service client is missing', async () => {
    admin.mockReturnValue(null as never);
    const res = await POST(req) as unknown as { status: number };
    expect(res.status).toBe(503);
    expect(captureApiError).toHaveBeenCalled();
  });
});
