import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

type Result = { data: unknown; error: { message: string; code?: string } | null };
const queue: Record<string, Result[]> = {};
const inserted: unknown[] = [];

function chain(table: string) {
  const next = queue[table]?.shift() ?? { data: null, error: null };
  const c: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'order', 'limit', 'maybeSingle', 'single']) c[m] = () => c;
  c.insert = (row: unknown) => {
    inserted.push(row);
    return c;
  };
  c.then = (res: (v: Result) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(next).then(res, rej);
  return c;
}

vi.mock('@/lib/admin/server', () => ({
  getSupabaseAdmin: () => ({ from: (table: string) => chain(table) }),
}));
vi.mock('@/lib/auth/adminAuth', () => ({
  verifyAdminAuth: vi.fn(async () => ({ success: true, user: { id: 'admin-1', email: 'a@x.test' } })),
}));

import { POST } from '../route';

const TEACHER = '11111111-1111-4111-8111-111111111111';
const req = (body: unknown) =>
  new NextRequest('http://localhost/api/admin/edu-dashboard/outreach', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  for (const k of Object.keys(queue)) delete queue[k];
  inserted.length = 0;
});

describe('POST /api/admin/edu-dashboard/outreach', () => {
  it('rejects an unknown channel', async () => {
    const res = await POST(req({ teacherId: TEACHER, channel: 'sms' }));
    expect(res.status).toBe(400);
  });

  it('rejects a test account without logging anything', async () => {
    queue.profiles = [{ data: { id: TEACHER, is_test_account: true }, error: null }];
    const res = await POST(req({ teacherId: TEACHER, channel: 'copy' }));
    expect(res.status).toBe(404);
    expect(inserted).toHaveLength(0);
  });

  it('refuses a second nudge inside the cooldown', async () => {
    queue.profiles = [{ data: { id: TEACHER, is_test_account: false }, error: null }];
    const recent = new Date(Date.now() - 2 * 86_400_000).toISOString();
    queue.admin_edu_outreach = [{ data: [{ created_at: recent }], error: null }];
    const res = await POST(req({ teacherId: TEACHER, channel: 'email' }));
    expect(res.status).toBe(409);
    expect(inserted).toHaveLength(0);
  });

  it('answers 503 when the outreach table is not migrated yet', async () => {
    queue.profiles = [{ data: { id: TEACHER, is_test_account: false }, error: null }];
    queue.admin_edu_outreach = [
      { data: null, error: { code: 'PGRST205', message: 'Could not find the table public.admin_edu_outreach' } },
    ];
    const res = await POST(req({ teacherId: TEACHER, channel: 'copy' }));
    expect(res.status).toBe(503);
  });

  it('logs the action with the admin as author when the cooldown has passed', async () => {
    queue.profiles = [{ data: { id: TEACHER, is_test_account: false }, error: null }];
    queue.admin_edu_outreach = [
      { data: [], error: null },
      { data: { created_at: '2026-10-08T12:00:00Z' }, error: null },
    ];
    const res = await POST(req({ teacherId: TEACHER, channel: 'marked' }));
    expect(res.status).toBe(200);
    expect(inserted[0]).toMatchObject({ teacher_id: TEACHER, channel: 'marked', created_by: 'admin-1' });
    await expect(res.json()).resolves.toMatchObject({ ok: true, createdAt: '2026-10-08T12:00:00Z' });
  });
});
