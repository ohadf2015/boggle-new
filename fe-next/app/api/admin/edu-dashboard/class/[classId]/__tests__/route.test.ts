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
vi.mock('@/lib/supabase/analyticsLastGame', () => ({ getRecentClassroomGames: vi.fn() }));

import { GET } from '../route';
import { NextRequest } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { getSupabaseAdmin } from '@/lib/admin/server';
import { getRecentClassroomGames } from '@/lib/supabase/analyticsLastGame';

type TableState = Record<string, { data?: unknown; error?: unknown }>;

function buildSupabaseMock(tables: TableState) {
  const from = vi.fn((table: string) => {
    const result = tables[table] ?? { data: [], error: null };
    const builder: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'in', 'gte', 'order', 'limit']) builder[m] = vi.fn(() => builder);
    builder.maybeSingle = vi.fn(() => Promise.resolve(result));
    builder.then = (resolve: (v: unknown) => void) => resolve(result);
    return builder;
  });
  return { from };
}

const req = () => new NextRequest('http://localhost/api/admin/edu-dashboard/class/c1') as unknown as import('next/server').NextRequest;
const ctx = (classId = 'c1') => ({ params: Promise.resolve({ classId }) });

describe('GET /api/admin/edu-dashboard/class/[classId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getRecentClassroomGames as Mock).mockResolvedValue({ data: [], error: null });
  });

  it('rejects a non-admin before touching the database', async () => {
    (verifyAdminAuth as Mock).mockResolvedValueOnce({ success: false, response: { status: 403 } });
    const res = await GET(req(), ctx());
    expect(res.status).toBe(403);
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown class', async () => {
    (verifyAdminAuth as Mock).mockResolvedValueOnce({ success: true });
    (getSupabaseAdmin as Mock).mockReturnValueOnce(buildSupabaseMock({ classrooms: { data: null, error: null } }));
    const res = await GET(req(), ctx());
    expect(res.status).toBe(404);
  });

  it('returns the roster without test students and degrades a missing rounds table to unmeasured', async () => {
    (verifyAdminAuth as Mock).mockResolvedValueOnce({ success: true });
    (getSupabaseAdmin as Mock).mockReturnValueOnce(
      buildSupabaseMock({
        classrooms: { data: { id: 'c1', name: 'P3', join_code: 'ABC', language: 'en', created_at: null, teacher_id: 't1' }, error: null },
        classroom_memberships: { data: [{ student_id: 's1', joined_at: null }, { student_id: 'qa', joined_at: null }], error: null },
        profiles: {
          data: [
            { id: 't1', display_name: 'Ada', username: null, last_seen_at: null, is_test_account: false },
            { id: 's1', display_name: 'Sam', username: null, last_seen_at: null, is_test_account: false },
            { id: 'qa', display_name: 'QA', username: null, last_seen_at: null, is_test_account: true },
          ],
          error: null,
        },
        lesson_assignments: { data: [], error: null },
        classroom_rounds: { data: null, error: { code: 'PGRST205', message: 'Could not find the table public.classroom_rounds in the schema cache' } },
      }),
    );
    const res = await GET(req(), ctx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.students.map((s: { id: string }) => s.id)).toEqual(['s1']);
    expect(body.excludedTestStudents).toBe(1);
    expect(body.rounds.available).toBe(false);
    expect(body.teacher.name).toBe('Ada');
  });
});
