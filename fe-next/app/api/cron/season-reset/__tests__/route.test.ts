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

vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));

const { mockProcessExpired } = vi.hoisted(() => ({ mockProcessExpired: vi.fn() }));
vi.mock('@/backend/modules/seasonManager', () => ({
  processExpiredSeasons: (...args: unknown[]) => mockProcessExpired(...args),
}));

import { GET } from '../route';

const CRON_SECRET = 'test-secret-123';

function makeRequest(headers: Record<string, string> = {}) {
  return {
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    method: 'GET',
  } as any;
}

describe('/api/cron/season-reset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = CRON_SECRET;
  });

  it('rejects request without Authorization header', async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    expect(mockProcessExpired).not.toHaveBeenCalled();
  });

  it('rejects request with wrong bearer', async () => {
    const res = await GET(makeRequest({ authorization: 'Bearer wrong' }));
    expect(res.status).toBe(401);
    expect(mockProcessExpired).not.toHaveBeenCalled();
  });

  it('processes expired seasons on valid bearer', async () => {
    mockProcessExpired.mockResolvedValueOnce({
      processed: 1,
      results: [{ success: true, snapshotted: 33, resetCount: 33 }],
    });

    const res = await GET(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockProcessExpired).toHaveBeenCalledTimes(1);
    expect(body.success).toBe(true);
    expect(body.processed).toBe(1);
  });

  it('returns 500 when processing throws', async () => {
    mockProcessExpired.mockRejectedValueOnce(new Error('rpc down'));

    const res = await GET(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }));
    expect(res.status).toBe(500);
  });
});
