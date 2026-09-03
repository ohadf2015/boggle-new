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

type TableState = Record<string, { data: unknown; error: unknown }>;

function buildSupabaseMock(tables: TableState) {
  function makeQuery(table: string) {
    const result = tables[table] ?? { data: null, error: null };
    const builder: Record<string, unknown> = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      in: vi.fn(() => builder),
      not: vi.fn(() => builder),
      order: vi.fn(() => builder),
      limit: vi.fn(() => builder),
      maybeSingle: vi.fn(async () => {
        const data = result.data;
        if (Array.isArray(data)) return { data: data[0] ?? null, error: result.error };
        return { data, error: result.error };
      }),
      then: (resolve: (v: unknown) => void) => resolve(result),
    };
    return builder;
  }

  return { from: vi.fn((table: string) => makeQuery(table)) };
}

const ctx = (userId = 'u1') => ({ params: Promise.resolve({ userId }) });
const req = () =>
  new NextRequest('http://localhost/api/admin/teacher-funnel/u1/details') as unknown as import('next/server').NextRequest;

describe('GET /api/admin/teacher-funnel/[userId]/details', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shouldReturn401WhenNotAuthenticated', async () => {
    // GIVEN a request with no admin session
    mockVerifyAdminAuth.mockResolvedValueOnce({
      success: false,
      response: { json: () => Promise.resolve({ error: 'Unauthorized' }), status: 401 },
    });

    // WHEN the details route is called
    const response = await GET(req(), ctx());

    // THEN it forwards the auth failure
    expect(response.status).toBe(401);
    expect(mockGetSupabaseAdmin).not.toHaveBeenCalled();
  });

  it('shouldReturn500WhenDatabaseIsNotConfigured', async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce({ success: true });
    mockGetSupabaseAdmin.mockReturnValueOnce(null);

    const response = await GET(req(), ctx());
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Database not configured' });
  });

  it('shouldReturn400WhenUserIdIsMissing', async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce({ success: true });
    mockGetSupabaseAdmin.mockReturnValueOnce(buildSupabaseMock({}));

    const response = await GET(req(), ctx(''));
    expect(response.status).toBe(400);
  });

  it('shouldReturn404WhenTeacherProfileDoesNotExist', async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce({ success: true });
    mockGetSupabaseAdmin.mockReturnValueOnce(
      buildSupabaseMock({
        profiles: { data: null, error: null },
        teacher_access_requests: { data: null, error: null },
        classrooms: { data: [], error: null },
        vocabulary_lessons: { data: [], error: null },
        teacher_assignments: { data: [], error: null },
        classroom_memberships: { data: [], error: null },
        student_lesson_progress: { data: [], error: null },
      }),
    );

    const response = await GET(req(), ctx('missing'));
    expect(response.status).toBe(404);
  });

  it('shouldReturnAssembledDetailsWhenTeacherExists', async () => {
    // GIVEN a granted teacher with one classroom, lesson, assignment and completion
    mockVerifyAdminAuth.mockResolvedValueOnce({ success: true });
    mockGetSupabaseAdmin.mockReturnValueOnce(
      buildSupabaseMock({
        profiles: {
          data: {
            id: 'u1',
            user_role: 'teacher',
            last_seen_at: '2026-08-10T00:00:00Z',
            display_name: 'Ada D',
            username: 'ada',
          },
          error: null,
        },
        teacher_access_requests: {
          data: {
            email: 'ada@school.edu',
            full_name: 'Ada Teacher',
            status: 'approved',
            trial_expires_at: '2026-09-01T00:00:00Z',
          },
          error: null,
        },
        classrooms: {
          data: [
            {
              id: 'c1',
              name: '3RD GRADE',
              join_code: 'ABC123',
              language: 'en',
              created_at: '2026-08-21T09:00:00Z',
            },
          ],
          error: null,
        },
        classroom_memberships: {
          data: [{ classroom_id: 'c1', student_id: 's1', joined_at: '2026-08-22T00:00:00Z' }],
          error: null,
        },
        vocabulary_lessons: {
          data: [
            {
              id: 'l1',
              name: 'Week 1',
              language: 'en',
              created_at: '2026-08-01T00:00:00Z',
              words: [{ word: 'cat' }],
              source_game_code: null,
            },
          ],
          error: null,
        },
        teacher_assignments: {
          data: [
            {
              id: 'a1',
              title: 'Practice',
              assignment_type: 'practice',
              classroom_id: 'c1',
              lesson_id: 'l1',
              due_date: null,
              created_at: '2026-08-10T00:00:00Z',
            },
          ],
          error: null,
        },
        student_lesson_progress: {
          data: [
            {
              student_id: 's1',
              lesson_id: 'l1',
              assignment_id: 'a1',
              completed_at: '2026-08-12T00:00:00Z',
              current_level: 2,
              total_xp: 15,
              words_mastered: ['cat'],
            },
          ],
          error: null,
        },
      }),
    );

    // WHEN an admin fetches details
    const response = await GET(req(), ctx('u1'));
    const body = await response.json();

    // THEN the camelCase payload matches the admin contract
    expect(response.status).toBe(200);
    expect(body.teacher.email).toBe('ada@school.edu');
    expect(body.teacher.roleGranted).toBe(true);
    expect(body.classrooms).toHaveLength(1);
    expect(body.classrooms[0].studentCount).toBe(1);
    expect(body.wordlists[0].wordCount).toBe(1);
    expect(body.assignments[0].completedCount).toBe(1);
    expect(body.completions).toHaveLength(1);
    expect(body.completions[0].wordsMasteredCount).toBe(1);
  });
});
