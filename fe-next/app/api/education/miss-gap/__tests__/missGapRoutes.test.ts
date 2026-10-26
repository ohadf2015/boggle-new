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
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

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
import { BODY, makeClient, resetState, state } from './missGapHarness';

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckApiRateLimit.mockReturnValue({ success: true });
  mockGetAuthedUser.mockResolvedValue(null);
  resetState();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-11T10:00:00Z'));
  mockAdmin.mockReturnValue(makeClient());
});

afterEach(() => {
  vi.useRealTimers();
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
    expect(state.upsertedRun).toMatchObject({
      class_key: 'week 3 vocab::ms. g',
      due_key: '2026-09-12',
      is_guest: true,
      on_time: true,
      stars: 3,
      words_correct: 8,
    });
    expect(String(state.upsertedRun?.student_key)).toContain('maya-device-1');
    expect(data.streak.currentStreak).toBe(1);
    expect(data.contributed).toBe(true);
  });

  it('given yesterday already counted, extends the class streak to 2', async () => {
    state.streakRow = {
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
    expect(state.upsertedStreak).toMatchObject({ current_streak: 2, longest_streak: 2 });
  });

  it('given a LATE completion, records the run but never moves the streak', async () => {
    vi.setSystemTime(new Date('2026-09-20T10:00:00Z'));
    const res = await POST(
      new NextRequest('http://x/api/education/miss-gap/complete', {
        method: 'POST',
        body: { ...BODY, completedOn: '2026-09-20' },
      }) as never,
    );
    const data = await res.json();
    expect(state.upsertedRun).toMatchObject({ on_time: false });
    expect(state.upsertedStreak).toBeNull();
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
    expect(state.upsertedRun).toMatchObject({
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

  /**
   * "Play again" sits one tap under the stars. Replaying must never hand the
   * teacher a worse row than the student already earned — see missGapRunMerge.
   */
  it('given a worse replay, keeps the best score the student already recorded', async () => {
    state.previousRun = {
      words_correct: 8,
      accuracy: 100,
      stars: 3,
      best_streak: 8,
      duration_ms: 91000,
      on_time: true,
    };
    const request = new NextRequest('http://localhost/api/education/miss-gap/complete', {
      method: 'POST',
      body: { ...BODY, wordsCorrect: 1, accuracy: 13, stars: 1, bestStreak: 1, durationMs: 40000 },
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(state.upsertedRun).toMatchObject({
      words_correct: 8,
      accuracy: 100,
      stars: 3,
      best_streak: 8,
      // The personal best is the FASTEST time, so the quicker replay wins here.
      duration_ms: 40000,
    });
  });

  it('given a better replay, records the improvement', async () => {
    state.previousRun = {
      words_correct: 2,
      accuracy: 25,
      stars: 1,
      best_streak: 1,
      duration_ms: 150000,
      on_time: true,
    };
    const request = new NextRequest('http://localhost/api/education/miss-gap/complete', {
      method: 'POST',
      body: BODY,
    });
    await POST(request);
    expect(state.upsertedRun).toMatchObject({ words_correct: 8, accuracy: 100, stars: 3 });
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
    state.callerProfile = { user_role: 'teacher', is_admin: false };
    const res = await GET(new NextRequest(url) as never);
    const data = await res.json();
    expect(data.runs).toHaveLength(2);
    expect(data.runs[0]).toMatchObject({ name: 'Maya', stars: 3, accuracy: 100 });
    expect(data.players).toBe(2);
    expect(data.averageAccuracy).toBe(88);
  });

  it('given a signed-in student, returns counts but no names', async () => {
    mockGetAuthedUser.mockResolvedValue({ id: 'guest-student-1' });
    state.callerProfile = { user_role: 'student', is_admin: false };
    const res = await GET(new NextRequest(url) as never);
    const data = await res.json();
    expect(data.players).toBe(2);
    expect(data.runs).toEqual([]);
    expect(JSON.stringify(data)).not.toContain('Maya');
  });

  it('returns the stored class streak', async () => {
    state.streakRow = {
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
    state.callerProfile = { user_role: 'teacher', is_admin: false };
    const res = await GET(
      new NextRequest(
        'http://x/api/education/miss-gap/progress?classKey=week%203%20vocab%3A%3Ams.%20g',
      ) as never,
    );
    const data = await res.json();
    expect(state.runFilters.some(([column]) => column === 'due_key')).toBe(false);
    expect(data.players).toBe(3);
    expect(data.runs.map((r: { name: string }) => r.name)).toContain('Ada');
  });

  it('given an explicit dueDate, still narrows to that one assignment', async () => {
    const res = await GET(new NextRequest(url) as never);
    const data = await res.json();
    expect(state.runFilters).toContainEqual(['due_key', '2026-09-12']);
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
    const writtenKey = state.upsertedRun?.class_key;

    await GET(
      new NextRequest(
        `http://x/api/education/miss-gap/progress?classKey=${encodeURIComponent('Week  3 Vocab::Ms.  G ')}`,
      ) as never,
    );
    expect(state.runFilters).toContainEqual(['class_key', writtenKey]);
    expect(writtenKey).toBe('week 3 vocab::ms. g');
  });
});
