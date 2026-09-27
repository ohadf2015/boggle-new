/**
 * The "assigned" stage always read 0 in prod: the route counted
 * `teacher_assignments` (0 rows, no writer) instead of `lesson_assignments`
 * (what `createAssignment` actually writes — see
 * lib/supabase/education/assignments.ts). `lesson_assignments` has no
 * teacher_id column, so the route must map classroom_id -> the classroom's
 * teacher_id via the `classrooms` table it already fetches.
 */
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

vi.mock('@/lib/auth/adminAuth', () => ({
  verifyAdminAuth: vi.fn(),
}));

vi.mock('@/lib/admin/server', () => ({
  getSupabaseAdmin: vi.fn(),
}));

import { GET } from '../route';
import { NextRequest } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { getSupabaseAdmin } from '@/lib/admin/server';

const mockVerifyAdminAuth = verifyAdminAuth as Mock;
const mockGetSupabaseAdmin = getSupabaseAdmin as Mock;

type TableState = Record<string, { data?: unknown; error?: unknown; count?: number | null }>;

function buildSupabaseMock(tables: TableState) {
  function makeQuery(table: string) {
    const result = tables[table] ?? { data: null, error: null, count: null };
    const builder: Record<string, unknown> = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      in: vi.fn(() => builder),
      order: vi.fn(() => builder),
      then: (resolve: (v: unknown) => void) => resolve(result),
    };
    return builder;
  }
  return { from: vi.fn((table: string) => makeQuery(table)) };
}

const req = () =>
  new NextRequest(
    'http://localhost/api/admin/teacher-funnel',
  ) as unknown as import('next/server').NextRequest;

describe('GET /api/admin/teacher-funnel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('countsAnAssignmentFromLessonAssignmentsWhenTeacherAssignmentsIsEmpty', async () => {
    // GIVEN teacher u1 owns classroom c1, a lesson_assignments row targets c1
    // (the real write path), and the legacy teacher_assignments table — which
    // nothing writes to — has zero rows.
    mockVerifyAdminAuth.mockResolvedValueOnce({ success: true });
    mockGetSupabaseAdmin.mockReturnValueOnce(
      buildSupabaseMock({
        teacher_access_requests: {
          data: [
            {
              id: 'r1',
              user_id: 'u1',
              email: 'ada@school.edu',
              full_name: 'Ada Teacher',
              locale: 'en',
              country: 'US',
              role: 'teacher',
              school_or_org: null,
              admin_note: null,
              status: 'approved',
              created_at: '2026-08-01T00:00:00Z',
              reviewed_at: '2026-08-02T00:00:00Z',
              trial_expires_at: '2026-09-01T00:00:00Z',
              use_case: null,
            },
          ],
          error: null,
        },
        classrooms: {
          data: [
            {
              id: 'c1',
              teacher_id: 'u1',
              name: 'Class',
              join_code: 'ABC123',
              language: 'en',
              created_at: '2026-08-05T00:00:00Z',
            },
          ],
          error: null,
        },
        classroom_memberships: { data: [], error: null },
        lesson_assignments: { data: [{ classroom_id: 'c1' }], error: null },
        teacher_assignments: { data: [], error: null, count: 0 },
        profiles: {
          data: [
            {
              id: 'u1',
              user_role: 'teacher',
              is_test_account: false,
              last_seen_at: null,
              display_name: 'Ada',
              username: 'ada',
            },
          ],
          error: null,
        },
        vocabulary_lessons: { data: [], error: null, count: 0 },
        student_lesson_progress: { data: [], error: null, count: 0 },
        student_achievements: { data: [], error: null, count: 0 },
        student_duels: { data: [], error: null, count: 0 },
      }),
    );

    // WHEN the admin funnel is fetched
    const response = await GET(req());
    const body = await response.json();

    // THEN the teacher shows up as having assigned something
    expect(body.summary.assigned).toBe(1);
    expect(body.rows[0].assignments).toBe(1);
  });
});
