/**
 * /api/education/miss-gap/* — server-recorded homework + class streak. RED first.
 *
 * The two behaviours worth pinning:
 *   1. A completion is recorded server-side for guests AND members, and an
 *      on-time completion moves the CLASS streak — the streak that used to live
 *      in one browser's localStorage.
 *   2. The roster (who played, how they did) is only returned to a signed-in
 *      caller. An anonymous holder of the share link gets counts, never names.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('next/server', () => {
  class MockNextRequest {
    url: string;
    method: string;
    headers = new Map<string, string>();
    private body: unknown;
    constructor(url: string, init?: { method?: string; body?: unknown }) {
      this.url = url;
      this.method = init?.method || 'GET';
      this.body = init?.body;
    }
    async json() {
      return this.body;
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
import { POST } from '../complete/route';
import { GET } from '../progress/route';

interface StreakRow {
  class_key: string;
  current_streak: number;
  longest_streak: number;
  last_completion_date: string | null;
  completion_days: string[];
  total_completions: number;
}

/**
 * Two students finished the 2026-09-12 assignment; a third finished a LATER
 * assignment for the same class. The third row exists so "the teacher asked for
 * the whole class, not one due date" is a distinguishable outcome.
 */
const RUNS = [
  {
    class_key: 'week 3 vocab::ms. g',
    due_key: '2026-09-12',
    student_name: 'Maya',
    student_key: 'g:maya',
    stars: 3,
    accuracy: 100,
    words_correct: 8,
    words_total: 8,
    best_streak: 8,
    duration_ms: 91000,
    on_time: true,
    is_guest: true,
    completed_at: '2026-09-11T09:00:00.000Z',
  },
  {
    class_key: 'week 3 vocab::ms. g',
    due_key: '2026-09-12',
    student_name: 'Noah',
    student_key: 'g:noah',
    stars: 2,
    accuracy: 75,
    words_correct: 6,
    words_total: 8,
    best_streak: 4,
    duration_ms: 120000,
    on_time: true,
    is_guest: true,
    completed_at: '2026-09-11T09:20:00.000Z',
  },
  {
    class_key: 'week 3 vocab::ms. g',
    due_key: '2026-09-19',
    student_name: 'Ada',
    student_key: 'g:ada',
    stars: 3,
    accuracy: 100,
    words_correct: 8,
    words_total: 8,
    best_streak: 8,
    duration_ms: 80000,
    on_time: true,
    is_guest: true,
    completed_at: '2026-09-18T09:00:00.000Z',
  },
];

let streakRow: StreakRow | null;
let upsertedRun: Record<string, unknown> | null;
let upsertedStreak: Record<string, unknown> | null;
/** Every `.eq(column, value)` the progress route applied to the runs query. */
let runFilters: Array<[string, unknown]>;

function makeClient() {
  return {
    from(table: string) {
      if (table === 'miss_gap_homework_runs') {
        return {
          upsert: (row: Record<string, unknown>) => {
            upsertedRun = row;
            return {
              select: () => ({
                single: async () => ({ data: { id: 'run-1', ...row }, error: null }),
              }),
            };
          },
          // Chain-shaped like PostgREST: eq/order are chainable, limit resolves.
          // It records the filters and actually applies them, so "the route
          // forgot to narrow" and "the route narrowed too hard" are both visible.
          select: () => {
            const builder = {
              eq(column: string, value: unknown) {
                runFilters.push([column, value]);
                return builder;
              },
              order() {
                return builder;
              },
              async limit() {
                const data = RUNS.filter((row) =>
                  runFilters.every(
                    ([column, value]) => (row as Record<string, unknown>)[column] === value,
                  ),
                );
                return { data, error: null };
              },
            };
            return builder;
          },
        };
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: streakRow, error: null }),
          }),
        }),
        upsert: (row: Record<string, unknown>) => {
          upsertedStreak = row;
          return { select: () => ({ single: async () => ({ data: row, error: null }) }) };
        },
      };
    },
  };
}

const BODY = {
  classKey: 'week 3 vocab::ms. g',
  dueDate: '2026-09-12',
  lesson: 'Week 3 Vocab',
  teacher: 'Ms. G',
  studentName: 'Maya',
  studentKey: 'maya-device-1',
  completedOn: '2026-09-11',
  wordsTotal: 8,
  wordsCorrect: 8,
  accuracy: 100,
  stars: 3,
  bestStreak: 8,
  durationMs: 91000,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckApiRateLimit.mockReturnValue({ success: true });
  mockGetAuthedUser.mockResolvedValue(null);
  streakRow = null;
  upsertedRun = null;
  upsertedStreak = null;
  runFilters = [];
  mockAdmin.mockReturnValue(makeClient());
});

describe('POST /api/education/miss-gap/complete', () => {
  it('given a guest finishing on time, records the run and starts the class streak', async () => {
    const res = await POST(
      new NextRequest('http://x/api/education/miss-gap/complete', {
        method: 'POST',
        body: BODY,
      }) as never,
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(upsertedRun).toMatchObject({
      class_key: 'week 3 vocab::ms. g',
      due_key: '2026-09-12',
      is_guest: true,
      on_time: true,
      stars: 3,
      words_correct: 8,
    });
    expect(String(upsertedRun?.student_key)).toContain('maya-device-1');
    expect(data.streak.currentStreak).toBe(1);
    expect(data.contributed).toBe(true);
  });

  it('given yesterday already counted, extends the class streak to 2', async () => {
    streakRow = {
      class_key: BODY.classKey,
      current_streak: 1,
      longest_streak: 1,
      last_completion_date: '2026-09-10',
      completion_days: ['2026-09-10'],
      total_completions: 1,
    };
    const res = await POST(
      new NextRequest('http://x/api/education/miss-gap/complete', {
        method: 'POST',
        body: BODY,
      }) as never,
    );
    const data = await res.json();
    expect(data.streak.currentStreak).toBe(2);
    expect(upsertedStreak).toMatchObject({ current_streak: 2, longest_streak: 2 });
  });

  it('given a LATE completion, records the run but never moves the streak', async () => {
    const res = await POST(
      new NextRequest('http://x/api/education/miss-gap/complete', {
        method: 'POST',
        body: { ...BODY, completedOn: '2026-09-20' },
      }) as never,
    );
    const data = await res.json();
    expect(upsertedRun).toMatchObject({ on_time: false });
    expect(upsertedStreak).toBeNull();
    expect(data.contributed).toBe(false);
  });

  it('given a signed-in student, stores the member id and marks them not a guest', async () => {
    mockGetAuthedUser.mockResolvedValue({ id: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa' });
    await POST(
      new NextRequest('http://x/api/education/miss-gap/complete', {
        method: 'POST',
        body: BODY,
      }) as never,
    );
    expect(upsertedRun).toMatchObject({
      is_guest: false,
      player_id: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
    });
  });

  it('rejects a body with no class key', async () => {
    const res = await POST(
      new NextRequest('http://x/api/education/miss-gap/complete', {
        method: 'POST',
        body: { ...BODY, classKey: '   ' },
      }) as never,
    );
    expect(res.status).toBe(400);
  });

  it('given no database, fails loudly instead of pretending it saved', async () => {
    mockAdmin.mockReturnValue(null);
    const res = await POST(
      new NextRequest('http://x/api/education/miss-gap/complete', {
        method: 'POST',
        body: BODY,
      }) as never,
    );
    expect(res.status).toBe(503);
  });
});

describe('GET /api/education/miss-gap/progress', () => {
  const url =
    'http://x/api/education/miss-gap/progress?classKey=week%203%20vocab%3A%3Ams.%20g&dueDate=2026-09-12';

  it('given an anonymous caller, returns counts but no student names', async () => {
    const res = await GET(new NextRequest(url) as never);
    const data = await res.json();
    expect(data.players).toBe(2);
    expect(data.runs).toEqual([]);
    expect(JSON.stringify(data)).not.toContain('Maya');
  });

  it('given a signed-in teacher, returns who played and how they did', async () => {
    mockGetAuthedUser.mockResolvedValue({ id: 'teacher-1' });
    const res = await GET(new NextRequest(url) as never);
    const data = await res.json();
    expect(data.runs).toHaveLength(2);
    expect(data.runs[0]).toMatchObject({ name: 'Maya', stars: 3, accuracy: 100 });
    expect(data.players).toBe(2);
    expect(data.averageAccuracy).toBe(88);
  });

  it('returns the stored class streak', async () => {
    streakRow = {
      class_key: 'week 3 vocab::ms. g',
      current_streak: 4,
      longest_streak: 9,
      last_completion_date: '2026-09-11',
      completion_days: ['2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11'],
      total_completions: 12,
    };
    const res = await GET(new NextRequest(url) as never);
    const data = await res.json();
    expect(data.streak).toMatchObject({ currentStreak: 4, longestStreak: 9 });
  });

  it('rejects a request with no class key', async () => {
    const res = await GET(
      new NextRequest('http://x/api/education/miss-gap/progress') as never,
    );
    expect(res.status).toBe(400);
  });

  /**
   * The teacher composes the assignment on a URL with no `due=`, so the card
   * asks for progress with no dueDate. Filtering on `due_key = ''` there would
   * match nothing and the card would say "nobody has played yet" while the
   * class was busy finishing it — a silent wrong answer (pitfalls Class 3+4).
   * No dueDate means "every assignment for this class", not "the empty one".
   */
  it('given no dueDate at all, counts every assignment for the class', async () => {
    mockGetAuthedUser.mockResolvedValue({ id: 'teacher-1' });
    const res = await GET(
      new NextRequest(
        'http://x/api/education/miss-gap/progress?classKey=week%203%20vocab%3A%3Ams.%20g',
      ) as never,
    );
    const data = await res.json();
    expect(runFilters.some(([column]) => column === 'due_key')).toBe(false);
    expect(data.players).toBe(3);
    expect(data.runs.map((r: { name: string }) => r.name)).toContain('Ada');
  });

  it('given an explicit dueDate, still narrows to that one assignment', async () => {
    const res = await GET(new NextRequest(url) as never);
    const data = await res.json();
    expect(runFilters).toContainEqual(['due_key', '2026-09-12']);
    expect(data.players).toBe(2);
  });

  /**
   * `complete` collapses internal whitespace in the class key; `progress` used
   * to only trim. A lesson called "Week  3" therefore wrote one key and read
   * back another, and the teacher saw an empty list forever.
   */
  it('normalizes the class key exactly the way complete does', async () => {
    await POST(
      new NextRequest('http://x/api/education/miss-gap/complete', {
        method: 'POST',
        body: { ...BODY, classKey: 'Week  3 Vocab::Ms.  G ' },
      }) as never,
    );
    const writtenKey = upsertedRun?.class_key;

    await GET(
      new NextRequest(
        `http://x/api/education/miss-gap/progress?classKey=${encodeURIComponent('Week  3 Vocab::Ms.  G ')}`,
      ) as never,
    );
    expect(runFilters).toContainEqual(['class_key', writtenKey]);
    expect(writtenKey).toBe('week 3 vocab::ms. g');
  });
});
