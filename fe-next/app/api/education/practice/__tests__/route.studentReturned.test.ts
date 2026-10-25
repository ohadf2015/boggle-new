import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({ returned: vi.fn(async () => undefined), access: true }));

vi.mock('@/lib/education/studentReturnTelemetry', () => ({ captureStudentReturned: h.returned }));
vi.mock('@/lib/apiRateLimit', () => ({ checkApiRateLimit: () => ({ success: true }) }));
vi.mock('@/lib/education/lessonAccess', () => ({ canStudentPracticeLesson: async () => h.access }));
vi.mock('@/utils/logger', () => ({ default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(), log: vi.fn() } }));
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: () => ({ from: vi.fn() }) }));
vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'stu-1' } }, error: null }) },
    from: () => ({ insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'sess-1' }, error: null }) }) }) }),
  }),
}));

import { POST } from '../route';

const LESSON = '550e8400-e29b-41d4-a716-446655440003';
const req = (body: unknown) =>
  new Request('http://localhost/api/education/practice', { method: 'POST', body: JSON.stringify(body) }) as never;

describe('POST /api/education/practice — edu_student_returned', () => {
  beforeEach(() => { h.returned.mockClear(); h.access = true; });

  it('Given a classroom student starts a session, Then a practice-surface return is recorded', async () => {
    const res = await POST(req({ lessonId: LESSON, practiceType: 'flashcard' }));
    expect(res.status).toBe(201);
    expect(h.returned).toHaveBeenCalledWith(expect.anything(), {
      studentId: 'stu-1', gameMode: 'flashcard', surface: 'practice', lessonId: LESSON,
    });
  });

  it('Given the student may not practice the lesson, Then no return is recorded', async () => {
    h.access = false;
    const res = await POST(req({ lessonId: LESSON, practiceType: 'flashcard' }));
    expect(res.status).toBe(403);
    expect(h.returned).not.toHaveBeenCalled();
  });
});
