import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', () => ({
  NextResponse: { json: vi.fn((data: unknown, init?: { status?: number }) => ({ json: async () => data, status: init?.status ?? 200 })) },
}));
const mockUser = vi.fn();
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: (...a: unknown[]) => mockUser(...a) }));
const mockLimit = vi.fn().mockReturnValue({ success: true });
vi.mock('@/lib/apiRateLimit', () => ({ checkApiRateLimit: (...a: unknown[]) => mockLimit(...a) }));
vi.mock('@/utils/logger', () => ({ default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

const filters: Array<[string, ...unknown[]]> = [];
let result: { data: unknown; error: { message: string } | null } = { data: [], error: null };
const builder: Record<string, unknown> = {};
for (const m of ['select', 'eq', 'order', 'limit']) builder[m] = (...a: unknown[]) => (filters.push([m, ...a]), builder);
builder.then = (ok: (r: unknown) => unknown) => Promise.resolve(result).then(ok);
const mockFrom = vi.fn(() => builder);
vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn(async () => ({ from: mockFrom })) }));

import { GET } from '../route';

const LESSON = '550e8400-e29b-41d4-a716-446655440003';
const get = (qs = '') => GET(new Request(`http://localhost/api/education/word-memory${qs}`) as never);

describe('GET /api/education/word-memory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    filters.length = 0;
    result = { data: [], error: null };
    mockUser.mockResolvedValue({ id: 'stu-1' });
  });

  it('GIVEN no signed-in user (or guest session) THEN 401 and no read', async () => {
    mockUser.mockResolvedValue(null);
    expect((await get()).status).toBe(401);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('GIVEN a student THEN only their own rows are read, under their session (RLS)', async () => {
    await get();
    expect(mockFrom).toHaveBeenCalledWith('word_review_state');
    expect(filters).toContainEqual(['eq', 'student_id', 'stu-1']);
    expect(filters.some(([m, c]) => m === 'eq' && c === 'lesson_id')).toBe(false);
  });

  it('GIVEN a lesson filter THEN rows are scoped to it; a malformed id is a 400', async () => {
    await get(`?lessonId=${LESSON}`);
    expect(filters).toContainEqual(['eq', 'lesson_id', LESSON]);
    expect((await get('?lessonId=nope')).status).toBe(400);
  });

  it('GIVEN rows THEN the shaped memory comes back with today and the due count', async () => {
    result = {
      data: [{ word: 'cat', lesson_id: LESSON, ease_factor: 2.5, interval: 1, repetitions: 1, next_review_date: '2000-01-01', last_review_date: '2000-01-01', correct_days: 1, last_correct_date: '2000-01-01', best_gap_days: 0, strength: 'plant' }],
      error: null,
    };
    const body = await (await get()).json();
    expect(body.dueCount).toBe(1);
    expect(body.words[0]).toMatchObject({ word: 'cat', lessonId: LESSON, strength: 'sprout', due: true });
    expect(body.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('GIVEN a read error THEN 500, never an empty memory that looks like "nothing due"', async () => {
    result = { data: null, error: { message: 'boom' } };
    expect((await get()).status).toBe(500);
  });

  it('GIVEN too many requests THEN 429', async () => {
    mockLimit.mockReturnValueOnce({ success: false, retryAfter: 5 });
    expect((await get()).status).toBe(429);
  });
});
