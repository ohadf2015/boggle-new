import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

type Result = { data?: unknown; count?: number | null; error: { message: string; code?: string } | null };
let results: Result[] = [];
const calls: Array<[string, unknown[]]> = [];

function chain() {
  const next = results.shift() ?? { data: [], count: 0, error: null };
  const c: Record<string, unknown> = {};
  for (const m of ['select', 'order', 'limit', 'is', 'in', 'update']) {
    c[m] = (...args: unknown[]) => {
      calls.push([m, args]);
      return c;
    };
  }
  c.then = (res: (v: Result) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(next).then(res, rej);
  return c;
}

vi.mock('@/lib/admin/server', () => ({ getSupabaseAdmin: () => ({ from: () => chain() }) }));
const verifyAdminAuth = vi.fn();
vi.mock('@/lib/auth/adminAuth', () => ({ verifyAdminAuth: (...a: unknown[]) => verifyAdminAuth(...a) }));

import { GET, POST } from '../route';

const ID = '11111111-1111-4111-8111-111111111111';
const get = () => new NextRequest('http://localhost/api/admin/notifications');
const post = (body: unknown) =>
  new NextRequest('http://localhost/api/admin/notifications', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  results = [];
  calls.length = 0;
  verifyAdminAuth.mockResolvedValue({ success: true, user: { id: 'a' } });
});

describe('GET /api/admin/notifications', () => {
  it('rejects non-admins with the auth response', async () => {
    verifyAdminAuth.mockResolvedValue({ success: false, response: NextResponse.json({ error: 'no' }, { status: 403 }) });
    expect((await GET(get())).status).toBe(403);
  });

  it('returns the newest items and the unread count', async () => {
    results = [
      { data: [{ id: ID, title: 'T', read_at: null }], error: null },
      { count: 3, error: null },
    ];
    const body = await (await GET(get())).json();
    expect(body).toEqual({ items: [{ id: ID, title: 'T', read_at: null }], unread: 3, available: true });
    expect(calls).toContainEqual(['order', ['created_at', { ascending: false }]]);
    expect(calls).toContainEqual(['limit', [30]]);
  });

  it('answers an empty, unavailable feed while the migration is pending instead of failing the bell', async () => {
    results = [
      { data: null, error: { message: 'x', code: '42P01' } },
      { count: null, error: { message: 'x', code: '42P01' } },
    ];
    const res = await GET(get());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [], unread: 0, available: false });
  });

  it('a real database error is a 500', async () => {
    results = [{ data: null, error: { message: 'boom' } }, { count: 0, error: null }];
    expect((await GET(get())).status).toBe(500);
  });
});

describe('POST /api/admin/notifications', () => {
  it('marks everything unread as read', async () => {
    const res = await POST(post({ all: true }));
    expect(res.status).toBe(200);
    expect(calls.find(([m]) => m === 'update')?.[1][0]).toEqual({ read_at: expect.any(String) });
    expect(calls).toContainEqual(['is', ['read_at', null]]);
  });

  it('marks only the given ids', async () => {
    await POST(post({ ids: [ID] }));
    expect(calls).toContainEqual(['in', ['id', [ID]]]);
  });

  it('rejects bad input', async () => {
    expect((await POST(post({}))).status).toBe(400);
    expect((await POST(post({ ids: ['not-a-uuid'] }))).status).toBe(400);
    expect((await POST(post({ ids: [] }))).status).toBe(400);
  });
});
