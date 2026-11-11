import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getWorldRecords, admin } = vi.hoisted(() => ({
  getWorldRecords: vi.fn(),
  admin: vi.fn(() => ({})),
}));
vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({ data, status: init?.status ?? 200, headers: init?.headers ?? {} }),
  },
}));
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: () => admin() }));
vi.mock('@/lib/records/worldRecords', () => ({ getWorldRecords: (...a: unknown[]) => getWorldRecords(...a) }));
vi.mock('@/lib/apiRateLimit', () => ({ checkApiRateLimit: () => ({ success: true }) }));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));

import { GET, _resetWorldRecordCache } from '@/lib/records/worldRecordsRoute';

const req = (qs = '') => ({ nextUrl: new URL(`https://x.test/api/records/world${qs}`) }) as never;
type Res = { status: number; data: { records?: unknown[]; error?: string }; headers: Record<string, string> };

describe('GET /api/records/world', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetWorldRecordCache();
    admin.mockReturnValue({});
    getWorldRecords.mockResolvedValue([{ recordKey: 'blast', score: 1705 }]);
  });

  it('serves every record with a short public cache', async () => {
    const res = await GET(req()) as unknown as Res;
    expect(res.status).toBe(200);
    expect(res.data.records).toEqual([{ recordKey: 'blast', score: 1705 }]);
    expect(res.headers['Cache-Control']).toMatch(/s-maxage=60/);
    expect(getWorldRecords).toHaveBeenCalledWith({}, undefined);
  });

  it('serves one game by results mode and sub-mode', async () => {
    await GET(req('?mode=quickPlay&subMode=wheel-rush'));
    expect(getWorldRecords).toHaveBeenCalledWith({}, 'qp_wheel_rush');
  });

  it('answers an empty list for classroom games without reading', async () => {
    const res = await GET(req('?mode=edu')) as unknown as Res;
    expect(res.data.records).toEqual([]);
    expect(getWorldRecords).not.toHaveBeenCalled();
  });

  it('rejects an unknown mode', async () => {
    const res = await GET(req('?mode=nope')) as unknown as Res;
    expect(res.status).toBe(400);
  });

  it('reuses the in-process copy for a minute', async () => {
    await GET(req());
    await GET(req());
    expect(getWorldRecords).toHaveBeenCalledTimes(1);
  });

  it('answers 500 when the read fails, never an empty success', async () => {
    getWorldRecords.mockRejectedValue(new Error('boom'));
    const res = await GET(req()) as unknown as Res;
    expect(res.status).toBe(500);
  });
});
