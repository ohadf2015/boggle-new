import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

type Result = { data?: unknown; count?: number | null; error: { message: string; code?: string } | null };
let results: Record<string, Result[]> = {};
const calls: Array<[string, string, unknown[]]> = [];

function chain(table: string) {
  const next = results[table]?.shift() ?? { data: null, count: 0, error: null };
  const c: Record<string, unknown> = {};
  for (const m of ['select', 'order', 'limit', 'is', 'gt', 'eq', 'upsert']) {
    c[m] = (...args: unknown[]) => {
      calls.push([table, m, args]);
      return c;
    };
  }
  c.maybeSingle = () => Promise.resolve(next);
  c.then = (res: (v: Result) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(next).then(res, rej);
  return c;
}

vi.mock('@/lib/admin/server', () => ({ getSupabaseAdmin: () => ({ from: (t: string) => chain(t) }) }));
const verifyAdminAuth = vi.fn();
vi.mock('@/lib/auth/adminAuth', () => ({ verifyAdminAuth: (...a: unknown[]) => verifyAdminAuth(...a) }));

import { GET, POST } from '../route';

const SEEN = '2026-11-14T10:00:00.000Z';
const OLD = '2026-11-14T09:00:00.000Z';
const NEW = '2026-11-14T11:00:00.000Z';
const get = () => new NextRequest('http://localhost/api/admin/notifications');
const post = (body: unknown) =>
  new NextRequest('http://localhost/api/admin/notifications', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  results = {};
  calls.length = 0;
  verifyAdminAuth.mockResolvedValue({ success: true, user: { id: 'admin-a' } });
});

describe('GET /api/admin/notifications', () => {
  it('rejects non-admins with the auth response', async () => {
    verifyAdminAuth.mockResolvedValue({ success: false, response: NextResponse.json({ error: 'no' }, { status: 403 }) });
    expect((await GET(get())).status).toBe(403);
  });

  it('counts unread from this admin’s own seen time and marks older items read', async () => {
    results = {
      admin_notification_seen: [{ data: { seen_at: SEEN }, error: null }],
      admin_notifications: [
        { data: [{ id: '2', created_at: NEW }, { id: '1', created_at: OLD }], error: null },
        { count: 1, error: null },
      ],
    };
    const body = await (await GET(get())).json();
    expect(body).toEqual({
      items: [{ id: '2', created_at: NEW, read_at: null }, { id: '1', created_at: OLD, read_at: SEEN }],
      unread: 1,
      available: true,
    });
    expect(calls).toContainEqual(['admin_notification_seen', 'eq', ['admin_id', 'admin-a']]);
    expect(calls).toContainEqual(['admin_notifications', 'gt', ['created_at', SEEN]]);
    expect(calls).toContainEqual(['admin_notifications', 'limit', [30]]);
  });

  it('an admin who never opened the bell sees everything unread', async () => {
    results = {
      admin_notifications: [{ data: [{ id: '1', created_at: OLD }], error: null }, { count: 6, error: null }],
    };
    const body = await (await GET(get())).json();
    expect(body.unread).toBe(6);
    expect(body.items[0].read_at).toBeNull();
    expect(calls.some(([t, m]) => t === 'admin_notifications' && m === 'gt')).toBe(false);
  });

  it('answers an empty, unavailable feed while the migration is pending instead of failing the bell', async () => {
    results = {
      admin_notifications: [
        { data: null, error: { message: 'x', code: '42P01' } },
        { count: null, error: { message: 'x', code: '42P01' } },
      ],
    };
    const res = await GET(get());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [], unread: 0, available: false });
  });

  it('a real database error is a 500', async () => {
    results = { admin_notifications: [{ data: null, error: { message: 'boom' } }, { count: 0, error: null }] };
    expect((await GET(get())).status).toBe(500);
  });
});

describe('POST /api/admin/notifications', () => {
  it('records the seen time for the calling admin only', async () => {
    const res = await POST(post({ seenAt: SEEN }));
    expect(res.status).toBe(200);
    expect(calls).toContainEqual(['admin_notification_seen', 'upsert', [{ admin_id: 'admin-a', seen_at: SEEN }, { onConflict: 'admin_id' }]]);
  });

  it('never stores a seen time in the future', async () => {
    await POST(post({ seenAt: '2999-01-01T00:00:00.000Z' }));
    const [, , [row]] = calls.find(([, m]) => m === 'upsert')! as [string, string, [{ seen_at: string }]];
    expect(Date.parse(row.seen_at)).toBeLessThanOrEqual(Date.now());
  });

  it('a failed write is a 500, so the bell keeps its badge', async () => {
    results = { admin_notification_seen: [{ error: { message: 'boom' } }] };
    expect((await POST(post({ seenAt: SEEN }))).status).toBe(500);
  });

  it('rejects bad input', async () => {
    expect((await POST(post({}))).status).toBe(400);
    expect((await POST(post({ seenAt: 'nope' }))).status).toBe(400);
    expect((await POST(post({ all: true }))).status).toBe(400);
  });
});
