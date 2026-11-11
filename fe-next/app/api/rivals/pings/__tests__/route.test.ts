import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
      status: init?.status ?? 200,
      headers: init?.headers ?? {},
      json: async () => body,
    }),
  },
}));
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: vi.fn() }));
vi.mock('@/lib/email', () => ({ getSupabaseAdmin: vi.fn(() => ({ from: vi.fn() })) }));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));
vi.mock('@/lib/rivals/pingServer', () => ({ loadIncomingPings: vi.fn() }));

import { GET } from '../route';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { loadIncomingPings } from '@/lib/rivals/pingServer';

const req = { method: 'GET', headers: new Headers() } as never;
const read = async (r: unknown) => {
  const res = r as { status: number; headers: Record<string, string>; json: () => Promise<Record<string, unknown>> };
  return { status: res.status, headers: res.headers, body: await res.json() };
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuthedUser).mockResolvedValue({ id: 'me' });
});

describe('GET /api/rivals/pings', () => {
  it('returns my recent unread pings, never cached', async () => {
    const pings = [{ id: 'n1', pingId: 'gg', createdAt: 'x', sender: { id: 'a', name: 'Maya', avatar: {} } }];
    vi.mocked(loadIncomingPings).mockResolvedValue(pings as never);
    const { status, body, headers } = await read(await GET(req));
    expect(status).toBe(200);
    expect(body).toEqual({ pings });
    expect(headers['Cache-Control']).toBe('private, no-store');
    expect(loadIncomingPings).toHaveBeenCalledWith(expect.anything(), 'me');
  });

  it('gives guests an empty list rather than an error', async () => {
    vi.mocked(getAuthedUser).mockResolvedValue(null);
    const { status, body } = await read(await GET(req));
    expect(status).toBe(200);
    expect(body).toEqual({ pings: [] });
    expect(loadIncomingPings).not.toHaveBeenCalled();
  });

  it('503s on a lookup failure', async () => {
    vi.mocked(loadIncomingPings).mockRejectedValue(new Error('db down'));
    const { status, body } = await read(await GET(req));
    expect(status).toBe(503);
    expect(body.error).toBe('unavailable');
  });
});
