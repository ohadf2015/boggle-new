/**
 * GET /api/education/practice/lessons — "plug and play" lesson access.
 *
 * The gate this route removes: `useStudentProgress` builds the student's lesson
 * list purely from `lesson_assignments`, and the `vocabulary_lessons` RLS SELECT
 * policy is `has_lesson_access(id, auth.uid())`, which is itself assignment-shaped
 * (056/057). So a lesson sitting in a student's own classroom is invisible twice
 * over until a teacher performs a separate "Create Assignment" step.
 *
 * This route answers the two questions that step was standing in front of:
 *   - list mode: every lesson this student may practise (classroom ∪ assigned)
 *   - single mode: the words behind one lesson link, for a visitor with no account
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('next/server', () => {
  class MockNextRequest {
    url: string;
    method: string;
    headers = new Map<string, string>();
    constructor(url: string, init?: { method?: string }) {
      this.url = url;
      this.method = init?.method || 'GET';
    }
  }
  return {
    NextRequest: MockNextRequest,
    NextResponse: {
      json: vi.fn((data: unknown, init?: { status?: number }) => ({
        json: async () => data,
        status: init?.status || 200,
      })),
    },
  };
});

vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { log: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const mockCheckApiRateLimit = vi.fn().mockReturnValue({ success: true });
vi.mock('@/lib/apiRateLimit', () => ({
  checkApiRateLimit: (...args: unknown[]) => mockCheckApiRateLimit(...args),
}));

const mockGetAuthedUser = vi.fn();
vi.mock('@/lib/auth/getAuthedUser', () => ({
  getAuthedUser: (...args: unknown[]) => mockGetAuthedUser(...args),
}));

const mockAdmin = vi.fn();
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => mockAdmin(),
}));

import { NextRequest } from 'next/server';
import { GET } from '../route';

const LESSON_A = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Week 3 Vocabulary',
  language: 'en',
  words: [{ word: 'banter' }],
  classroom_id: 'c1',
  teacher_id: 'teacher-secret',
};
const LESSON_B = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Assigned Only',
  language: 'en',
  words: [{ word: 'quorum' }],
  classroom_id: null,
  teacher_id: 'teacher-secret',
};

/**
 * Minimal PostgREST double. Each table answers the one query shape the route
 * builds, so an unexpected table is a thrown error rather than a silent empty
 * list (a fail-open mock is exactly how the PGRST200 embed bug hid).
 */
function supabaseDouble(rows: Record<string, unknown[]>) {
  return {
    from(table: string) {
      if (!(table in rows)) throw new Error(`unexpected table ${table}`);
      const result = { data: rows[table], error: null };
      const builder: Record<string, unknown> = {};
      for (const method of ['select', 'eq', 'in', 'order', 'limit', 'not']) {
        builder[method] = () => builder;
      }
      builder.single = async () => ({
        data: (rows[table] as unknown[])[0] ?? null,
        error: (rows[table] as unknown[])[0] ? null : { code: 'PGRST116' },
      });
      builder.maybeSingle = async () => ({ data: (rows[table] as unknown[])[0] ?? null, error: null });
      builder.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
      return builder;
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckApiRateLimit.mockReturnValue({ success: true });
});

describe('list mode — a lesson needs no assignment to be practisable', () => {
  it('returns a classroom lesson that has NO assignment row', async () => {
    mockGetAuthedUser.mockResolvedValue({ id: 'student-1' });
    mockAdmin.mockReturnValue(
      supabaseDouble({
        classroom_memberships: [{ classroom_id: 'c1' }],
        lesson_assignments: [],
        vocabulary_lessons: [LESSON_A],
      })
    );

    const res = await GET(new NextRequest('http://localhost/api/education/practice/lessons'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.lessons.map((l: { id: string }) => l.id)).toContain(LESSON_A.id);
  });

  it('still returns assigned lessons, and carries the assignment as metadata', async () => {
    mockGetAuthedUser.mockResolvedValue({ id: 'student-1' });
    mockAdmin.mockReturnValue(
      supabaseDouble({
        classroom_memberships: [{ classroom_id: 'c1' }],
        lesson_assignments: [
          { lesson_id: LESSON_B.id, classroom_id: 'c1', due_date: '2026-09-30', created_at: '2026-09-01' },
        ],
        vocabulary_lessons: [LESSON_A, LESSON_B],
      })
    );

    const res = await GET(new NextRequest('http://localhost/api/education/practice/lessons'));
    const body = await res.json();

    const assigned = body.lessons.find((l: { id: string }) => l.id === LESSON_B.id);
    expect(assigned).toBeDefined();
    expect(assigned.assignment.due_date).toBe('2026-09-30');
    // The un-assigned classroom lesson carries no invented deadline.
    const plain = body.lessons.find((l: { id: string }) => l.id === LESSON_A.id);
    expect(plain.assignment).toBeNull();
  });

  it('never leaks the teacher id', async () => {
    mockGetAuthedUser.mockResolvedValue({ id: 'student-1' });
    mockAdmin.mockReturnValue(
      supabaseDouble({
        classroom_memberships: [{ classroom_id: 'c1' }],
        lesson_assignments: [],
        vocabulary_lessons: [LESSON_A],
      })
    );

    const res = await GET(new NextRequest('http://localhost/api/education/practice/lessons'));
    const body = await res.json();

    expect(JSON.stringify(body)).not.toContain('teacher-secret');
  });

  it('401s a visitor with no session (a list is personal; a single lesson is not)', async () => {
    mockGetAuthedUser.mockResolvedValue(null);
    mockAdmin.mockReturnValue(supabaseDouble({}));

    const res = await GET(new NextRequest('http://localhost/api/education/practice/lessons'));
    expect(res.status).toBe(401);
  });
});

describe('single mode — a lesson link works with no account', () => {
  it('serves one lesson to a visitor with no session', async () => {
    mockGetAuthedUser.mockResolvedValue(null);
    mockAdmin.mockReturnValue(supabaseDouble({ vocabulary_lessons: [LESSON_A] }));

    const res = await GET(
      new NextRequest(`http://localhost/api/education/practice/lessons?lessonId=${LESSON_A.id}`)
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.lesson.name).toBe('Week 3 Vocabulary');
    expect(body.lesson.words).toHaveLength(1);
    expect(body.lesson.teacher_id).toBeUndefined();
  });

  it('400s a lessonId that is not a uuid rather than querying with it', async () => {
    mockGetAuthedUser.mockResolvedValue(null);
    const admin = supabaseDouble({ vocabulary_lessons: [LESSON_A] });
    const spy = vi.spyOn(admin, 'from');
    mockAdmin.mockReturnValue(admin);

    const res = await GET(new NextRequest('http://localhost/api/education/practice/lessons?lessonId=../etc'));

    expect(res.status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });

  it('404s a lesson that does not exist', async () => {
    mockGetAuthedUser.mockResolvedValue(null);
    mockAdmin.mockReturnValue(supabaseDouble({ vocabulary_lessons: [] }));

    const res = await GET(
      new NextRequest(`http://localhost/api/education/practice/lessons?lessonId=${LESSON_A.id}`)
    );
    expect(res.status).toBe(404);
  });
});

describe('failure is never silent', () => {
  it('503s when the service-role client is unavailable instead of returning an empty list', async () => {
    mockGetAuthedUser.mockResolvedValue({ id: 'student-1' });
    mockAdmin.mockReturnValue(null);

    const res = await GET(new NextRequest('http://localhost/api/education/practice/lessons'));
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.lessons).toBeUndefined();
  });

  it('honours the rate limiter', async () => {
    mockGetAuthedUser.mockResolvedValue({ id: 'student-1' });
    mockCheckApiRateLimit.mockReturnValue({ success: false, retryAfter: 30 });
    mockAdmin.mockReturnValue(supabaseDouble({}));

    const res = await GET(new NextRequest('http://localhost/api/education/practice/lessons'));
    expect(res.status).toBe(429);
  });
});
