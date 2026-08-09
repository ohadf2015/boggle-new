import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * POST /api/indexnow used to be completely unauthenticated: any caller could
 * push arbitrary URLs of ours to IndexNow (Bing + Yandex) and burn the daily
 * submission quota, or spam the queue with junk paths until the search engines
 * throttle the whole domain.
 *
 * It has two legitimate callers — the admin panel (browser, Supabase session)
 * and cron/manual scripts (CRON_SECRET) — so it must accept either and refuse
 * everything else. Both paths fail CLOSED.
 */
const h = vi.hoisted(() => ({
  user: null as { id: string } | null,
  isAdmin: false,
  fetchCalls: [] as string[],
}));

vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: h.user } }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: h.user ? { is_admin: h.isAdmin } : null }),
        }),
      }),
    }),
  }),
}));

vi.mock('@/utils/discoverRoutes', () => ({
  discoverPublicRoutes: async () => ['/'],
}));

import { POST } from '../route';

const mkReq = (headers: Record<string, string> = {}, body?: unknown) =>
  new Request('http://test/api/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

const SECRET = 'test-cron-secret-value';

describe('POST /api/indexnow authorization', () => {
  beforeEach(() => {
    h.user = null;
    h.isAdmin = false;
    h.fetchCalls = [];
    process.env.CRON_SECRET = SECRET;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        h.fetchCalls.push(String(url));
        return { status: 200 } as Response;
      })
    );
  });

  it('rejects an anonymous caller', async () => {
    const res = await POST(mkReq({}, { urls: ['https://www.lexiclash.live/ru'] }));
    expect(res.status).toBe(401);
    expect(h.fetchCalls, 'must not reach IndexNow').toEqual([]);
  });

  it('rejects a wrong cron secret', async () => {
    const res = await POST(
      mkReq({ 'x-cron-secret': 'not-the-secret' }, { urls: ['https://www.lexiclash.live/ru'] })
    );
    expect(res.status).toBe(401);
    expect(h.fetchCalls).toEqual([]);
  });

  it('rejects an authenticated NON-admin', async () => {
    h.user = { id: 'u1' };
    h.isAdmin = false;
    const res = await POST(mkReq({}, { urls: ['https://www.lexiclash.live/ru'] }));
    expect(res.status).toBe(403);
    expect(h.fetchCalls).toEqual([]);
  });

  it('fails closed when CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET;
    const res = await POST(
      mkReq({ 'x-cron-secret': '' }, { urls: ['https://www.lexiclash.live/ru'] })
    );
    expect(res.status).toBe(401);
    expect(h.fetchCalls).toEqual([]);
  });

  it('accepts a valid cron secret', async () => {
    const res = await POST(
      mkReq({ 'x-cron-secret': SECRET }, { urls: ['https://www.lexiclash.live/ru'] })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ submitted: 1 });
    expect(h.fetchCalls[0]).toContain('api.indexnow.org');
  });

  it('accepts the same secret via Authorization: Bearer', async () => {
    const res = await POST(
      mkReq({ authorization: `Bearer ${SECRET}` }, { urls: ['https://www.lexiclash.live/ru'] })
    );
    expect(res.status).toBe(200);
  });

  it('accepts an authenticated admin (the admin panel path)', async () => {
    h.user = { id: 'u1' };
    h.isAdmin = true;
    const res = await POST(mkReq({}, { urls: ['https://www.lexiclash.live/ru'] }));
    expect(res.status).toBe(200);
    expect(h.fetchCalls[0]).toContain('api.indexnow.org');
  });

  it('still supports the no-body route-discovery path for an authorized caller', async () => {
    const res = await POST(mkReq({ 'x-cron-secret': SECRET }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.submitted).toBeGreaterThan(0);
  });
});
