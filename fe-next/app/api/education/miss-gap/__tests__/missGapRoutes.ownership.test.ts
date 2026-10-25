/**
 * The class key is guessable text (`lesson::teacher`), so it cannot be what
 * stands between a stranger and a class's names or streak.
 */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

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

const KEY = 'week 3 vocab::ms. g';
const PROGRESS = 'http://x/api/education/miss-gap/progress?classKey=week%203%20vocab%3A%3Ams.%20g&dueDate=2026-09-12';

const complete = (body: unknown) =>
  POST(new NextRequest('http://x/api/education/miss-gap/complete', { method: 'POST', body }) as never);
const progress = () => GET(new NextRequest(PROGRESS) as never);
const asTeacher = (id: string) => {
  mockGetAuthedUser.mockResolvedValue({ id });
  state.callerProfile = { user_role: 'teacher', is_admin: false };
};

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

describe('progress: names only for the teacher who owns the class key', () => {
  it('the first teacher to open the card claims the key without overwriting an owner', async () => {
    asTeacher('teacher-1');
    const data = await (await progress()).json();
    expect(data.runs.map((r: { name: string }) => r.name)).toEqual(['Maya', 'Noah']);
    expect(state.ownerUpserts).toEqual([
      { row: { class_key: KEY, owner_id: 'teacher-1' }, opts: { onConflict: 'class_key', ignoreDuplicates: true } },
    ]);
    expect(state.owners.get(KEY)).toBe('teacher-1');
  });

  it('another teacher who guesses the same key gets counts, never names', async () => {
    state.owners.set(KEY, 'teacher-1');
    asTeacher('teacher-2');
    const data = await (await progress()).json();
    expect(data.players).toBe(2);
    expect(data.runs).toEqual([]);
    expect(JSON.stringify(data)).not.toContain('Maya');
    expect(state.owners.get(KEY)).toBe('teacher-1');
  });

  it('the owning teacher keeps seeing names on later visits', async () => {
    state.owners.set(KEY, 'teacher-1');
    asTeacher('teacher-1');
    const data = await (await progress()).json();
    expect(data.runs).toHaveLength(2);
  });

  it('when ownership cannot be read, names are withheld', async () => {
    state.ownerError = { message: 'db down' };
    asTeacher('teacher-1');
    const res = await progress();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.runs).toEqual([]);
  });

  it('a student or anonymous caller never claims a key', async () => {
    await progress();
    mockGetAuthedUser.mockResolvedValue({ id: 'student-1' });
    state.callerProfile = { user_role: 'student', is_admin: false };
    await progress();
    expect(state.ownerUpserts).toEqual([]);
  });
});

describe('complete: input and abuse limits', () => {
  it.each([
    ['a non-string class key', { ...BODY, classKey: 42 }],
    ['an oversized student name', { ...BODY, studentName: 'x'.repeat(500) }],
    ['a non-numeric score', { ...BODY, accuracy: 'lots' }],
    ['an oversized student key', { ...BODY, studentKey: 'k'.repeat(500) }],
  ])('rejects %s', async (_label, body) => {
    const res = await complete(body);
    expect(res.status).toBe(400);
    expect(state.upsertedRun).toBeNull();
  });

  it('a completion day far from today is ignored, so old streak days cannot be forged', async () => {
    await complete({ ...BODY, dueDate: '', completedOn: '2026-08-01' });
    expect(state.upsertedRun).toMatchObject({ completed_on: '2026-09-11' });
    expect(state.upsertedStreak).toMatchObject({ completion_days: ['2026-09-11'] });
  });

  it('a new student past the per-assignment cap is refused before anything is written', async () => {
    state.filedStudents = 60;
    const res = await complete(BODY);
    expect(res.status).toBe(409);
    expect(state.upsertedRun).toBeNull();
    expect(state.upsertedStreak).toBeNull();
  });

  it('a replay is still saved when the assignment is full', async () => {
    state.filedStudents = 60;
    state.previousRun = { words_correct: 2, accuracy: 25, stars: 1, best_streak: 1, duration_ms: 1, on_time: true };
    const res = await complete(BODY);
    expect(res.status).toBe(200);
    expect(state.upsertedRun).not.toBeNull();
  });

  it('a replay never inflates the class completion count', async () => {
    state.streakRow = {
      class_key: KEY,
      current_streak: 1,
      longest_streak: 1,
      last_completion_date: '2026-09-11',
      completion_days: ['2026-09-11'],
      total_completions: 5,
    };
    state.previousRun = { words_correct: 8, accuracy: 100, stars: 3, best_streak: 8, duration_ms: 1, on_time: true };
    await complete(BODY);
    expect(state.upsertedStreak).toMatchObject({ total_completions: 5 });
  });

  it('budgets each device separately on top of the class-wide IP budget', async () => {
    await complete(BODY);
    const endpoints = mockCheckApiRateLimit.mock.calls.map((call) => call[1]);
    expect(endpoints).toContain('education-miss-gap-complete');
    expect(endpoints).toContain('education-miss-gap-complete:g:maya-device-1');
  });

  it('answers with the streak only, never another student key or id', async () => {
    const data = await (await complete(BODY)).json();
    expect(data.streak).toBeDefined();
    expect(JSON.stringify(data)).not.toContain('maya-device-1');
    expect(data.run).toBeUndefined();
  });
});

describe('miss_gap_class_owners migration', () => {
  let sql = '';
  beforeEach(() => {
    sql = readFileSync(
      path.join(__dirname, '../../../../../supabase/migrations/20261026170200_miss_gap_class_owners.sql'),
      'utf8',
    );
  });

  it('creates the owner table idempotently, keyed by class key', () => {
    expect(sql).toMatch(/create table if not exists public\.miss_gap_class_owners/);
    expect(sql).toMatch(/class_key text primary key/);
    expect(sql).toMatch(/owner_id uuid not null references auth\.users\(id\) on delete cascade/);
  });

  it('is service-role only: RLS on, no policy, no client grants', () => {
    expect(sql).toMatch(/alter table public\.miss_gap_class_owners enable row level security;/);
    expect(sql).toMatch(/revoke all on table public\.miss_gap_class_owners from public, anon, authenticated;/);
    expect(sql).not.toMatch(/create policy/i);
  });

  it('touches no existing table or row', () => {
    expect(sql).not.toMatch(/\b(drop|truncate|delete from|update public|alter table public\.miss_gap_homework_runs)\b/i);
  });
});
