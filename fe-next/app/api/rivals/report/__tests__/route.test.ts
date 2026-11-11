import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({ status: init?.status ?? 200, json: async () => body }),
  },
}));
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: vi.fn() }));
vi.mock('@/lib/apiRateLimit', () => ({ checkApiRateLimit: vi.fn(() => ({ success: true })) }));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));
vi.mock('@/backend/modules/reportManager', () => ({ reportUser: vi.fn(async () => ({ success: true })) }));

import { POST } from '../route';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { reportUser } from '@/backend/modules/reportManager';

const THEM = '22222222-2222-4222-8222-222222222222';
const req = (body: unknown) => ({ method: 'POST', headers: new Headers(), json: async () => body }) as never;
const read = async (r: unknown) => {
  const res = r as { status: number; json: () => Promise<Record<string, unknown>> };
  return { status: res.status, body: await res.json() };
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuthedUser).mockResolvedValue({ id: 'me' });
});

describe('POST /api/rivals/report', () => {
  it('files a user report tagged as coming from a rival ping', async () => {
    const { status, body } = await read(await POST(req({ targetUserId: THEM })));
    expect(status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(reportUser).toHaveBeenCalledWith('me', THEM, 'harassment', 'rival_ping');
  });

  it('requires sign-in', async () => {
    vi.mocked(getAuthedUser).mockResolvedValue(null);
    const { status } = await read(await POST(req({ targetUserId: THEM })));
    expect(status).toBe(401);
    expect(reportUser).not.toHaveBeenCalled();
  });

  it('rejects a bad target', async () => {
    const { status } = await read(await POST(req({ targetUserId: 'x' })));
    expect(status).toBe(400);
  });

  it('surfaces a failed insert', async () => {
    vi.mocked(reportUser).mockResolvedValueOnce({ success: false, errorCode: 'SERVER_ERROR' } as never);
    const { status, body } = await read(await POST(req({ targetUserId: THEM })));
    expect(status).toBe(503);
    expect(body.error).toBe('unavailable');
  });
});
