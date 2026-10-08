import { vi, type Mock, describe, beforeEach, it, expect } from 'vitest';

vi.mock('next/server', () => ({
  NextRequest: class MockNextRequest {
    url: string;
    headers = { get: () => null };
    constructor(url: string) {
      this.url = url;
    }
  },
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({
      json: () => Promise.resolve(data),
      status: init?.status || 200,
    })),
  },
}));

vi.mock('@/lib/auth/adminAuth', () => ({ verifyAdminAuth: vi.fn() }));
vi.mock('@/lib/admin/server', () => ({ getSupabaseAdmin: vi.fn() }));

import { GET } from '../route';
import { NextRequest } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { getSupabaseAdmin } from '@/lib/admin/server';

type TableState = Record<string, { data?: unknown; error?: unknown }>;

function buildSupabaseMock(tables: TableState) {
  const from = vi.fn((table: string) => {
    const result = tables[table] ?? { data: [], error: null };
    const builder: Record<string, unknown> = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      in: vi.fn(() => builder),
      gte: vi.fn(() => builder),
      order: vi.fn(() => builder),
      then: (resolve: (v: unknown) => void) => resolve(result),
    };
    return builder;
  });
  return { from };
}

const req = (url = 'http://localhost/api/admin/edu-dashboard?window=7') =>
  new NextRequest(url) as unknown as import('next/server').NextRequest;

const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();

describe('GET /api/admin/edu-dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with rounds marked unavailable when classroom_rounds is not migrated yet', async () => {
    (verifyAdminAuth as Mock).mockResolvedValueOnce({ success: true });
    (getSupabaseAdmin as Mock).mockReturnValueOnce(
      buildSupabaseMock({
        profiles: {
          data: [{ id: 't1', user_role: 'teacher', last_seen_at: iso(1), display_name: 'Ada', username: 'ada', is_test_account: false }],
          error: null,
        },
        teacher_access_requests: { data: [], error: null },
        classrooms: { data: [{ id: 'c1', teacher_id: 't1', name: 'Math', created_at: iso(30) }], error: null },
        classroom_memberships: { data: [{ classroom_id: 'c1', student_id: 's1' }], error: null },
        classroom_rounds: { data: null, error: { code: 'PGRST205', message: 'Could not find the table public.classroom_rounds in the schema cache' } },
        subscriptions: { data: [], error: null },
      }),
    );

    const response = await GET(req());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.roundsAvailable).toBe(false);
    expect(body.kpis.liveRounds).toBeNull();
    expect(body.teachers[0].name).toBe('Ada');
  });

  it('leaves a test-account teacher and their classroom out of every table', async () => {
    (verifyAdminAuth as Mock).mockResolvedValueOnce({ success: true });
    (getSupabaseAdmin as Mock).mockReturnValueOnce(
      buildSupabaseMock({
        profiles: {
          data: [
            { id: 't1', user_role: 'teacher', last_seen_at: iso(1), display_name: 'Ada', username: 'ada', is_test_account: false },
            { id: 'qa', user_role: 'teacher', last_seen_at: iso(1), display_name: 'QA', username: 'qa', is_test_account: true },
          ],
          error: null,
        },
        teacher_access_requests: { data: [], error: null },
        classrooms: {
          data: [
            { id: 'c1', teacher_id: 't1', name: 'Math', created_at: iso(30) },
            { id: 'cq', teacher_id: 'qa', name: 'QA', created_at: iso(2) },
          ],
          error: null,
        },
        classroom_memberships: { data: [{ classroom_id: 'cq', student_id: 's9' }], error: null },
        classroom_rounds: { data: [], error: null },
        subscriptions: { data: [], error: null },
      }),
    );

    const body = await (await GET(req())).json();
    expect(body.teachers.map((t: { id: string }) => t.id)).toEqual(['t1']);
    expect(body.classes.map((c: { id: string }) => c.id)).toEqual(['c1']);
  });

  it('rejects a non-admin before touching the database', async () => {
    (verifyAdminAuth as Mock).mockResolvedValueOnce({
      success: false,
      response: { status: 403, json: () => Promise.resolve({ error: 'Admin access required' }) },
    });

    const response = await GET(req());
    expect(response.status).toBe(403);
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });
});
