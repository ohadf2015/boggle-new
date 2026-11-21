import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';

vi.mock('next/server', () => {
  class MockNextRequest {
    private _body: unknown;
    url: string;
    method: string;
    constructor(url: string, init?: { method?: string; body?: string }) {
      this.url = url;
      this.method = init?.method || 'GET';
      this._body = init?.body ? JSON.parse(init.body) : null;
    }
    async json() {
      return this._body;
    }
  }
  return {
    NextRequest: MockNextRequest,
    NextResponse: {
      json: vi.fn((data: unknown, init?: { status?: number }) => ({ json: async () => data, status: init?.status || 200 })),
    },
  };
});

vi.mock('@/utils/supabase/server');
vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { log: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock('@/lib/apiRateLimit', () => ({ checkApiRateLimit: vi.fn().mockReturnValue({ success: true }) }));
vi.mock('@/lib/education/practiceXpLimits', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/education/practiceXpLimits')>()),
  readPracticeXpLimits: vi.fn().mockResolvedValue({ deckSize: 100, xpLast24h: 0 }),
}));
const mockAdmin = vi.fn();
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: () => mockAdmin() }));

import { NextRequest } from 'next/server';
import { PATCH } from '../route';
import { createClient } from '@/utils/supabase/server';

const SESSION = '550e8400-e29b-41d4-a716-446655440001';
const STUDENT = '550e8400-e29b-41d4-a716-446655440002';
const LESSON = '550e8400-e29b-41d4-a716-446655440003';

type Answer = { data: unknown; error: unknown };

/** Only methods the real supabase-js client has. */
function awardsAdmin({ failAchievementWrite = false } = {}) {
  const upserts: Array<{ table: string; rows: unknown; options: unknown }> = [];
  const updates: Array<{ table: string; patch: Record<string, unknown> }> = [];
  const builder = (answer: Answer) => {
    const self: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'in', 'abortSignal']) self[m] = () => self;
    self.then = (ok: (v: Answer) => unknown, bad?: (e: unknown) => unknown) => Promise.resolve(answer).then(ok, bad);
    return self;
  };
  const reads: Record<string, unknown> = {
    student_lesson_progress: [],
    student_achievements: [],
    achievement_definitions: [{ id: 'def-first', key: 'first_lesson' }, { id: 'def-xp', key: 'xp_collector' }],
  };
  return {
    upserts,
    updates,
    client: {
      from: (table: string) => ({
        select: () => builder({ data: reads[table] ?? null, error: reads[table] ? null : { message: `no ${table}` } }),
        upsert: (rows: unknown, options: unknown) => {
          upserts.push({ table, rows, options });
          const failed = failAchievementWrite && table === 'student_achievements';
          return builder({ data: failed ? null : rows, error: failed ? { message: 'write failed' } : null });
        },
        update: (patch: Record<string, unknown>) => {
          updates.push({ table, patch });
          return builder({ data: [], error: null });
        },
      }),
    },
  };
}

function studentClient({ xpError = false, sessionError = false, progress = { current_streak: 0, longest_streak: 0, last_practice_date: null } as Record<string, unknown> | null } = {}) {
  const rpc = vi.fn(async (name: string) => ({ data: null, error: xpError && name === 'award_education_xp' ? { message: 'rpc failed' } : null }));
  const existing = { id: SESSION, student_id: STUDENT, lesson_id: LESSON, practice_type: 'flashcard', completed_at: null };
  const writes: Array<Record<string, unknown>> = [];
  (createClient as unknown as Mock).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: STUDENT } }, error: null }) },
    rpc,
    from(table: string) {
      if (table === 'student_lesson_progress') {
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: progress, error: null }) };
      }
      let isWrite = false;
      const b: Record<string, Mock> = {
        select: vi.fn(() => b),
        eq: vi.fn(() => b),
        is: vi.fn(() => b),
        order: vi.fn(() => b),
        limit: vi.fn(() => b),
        maybeSingle: vi.fn(async () => ({ data: null, error: null })),
        update: vi.fn((row: Record<string, unknown>) => { isWrite = true; writes.push(row); return b; }),
        single: vi.fn(async () => (isWrite && sessionError
          ? { data: null, error: { message: 'write failed' } }
          : { data: isWrite ? { ...existing, ...writes[0] } : existing, error: null })),
      };
      return b;
    },
  });
  return { rpc };
}

const complete = async () => {
  const response = await PATCH(new NextRequest('http://localhost/api/education/practice', {
    method: 'PATCH',
    body: JSON.stringify({ sessionId: SESSION, cardsReviewed: 10, cardsCorrect: 10, completed: true }),
  }));
  return { status: response.status, body: await response.json() };
};

describe('PATCH /api/education/practice awards', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GIVEN a first completed practice WHEN saved THEN first_lesson is granted by achievement_id and returned as a new award', async () => {
    studentClient();
    const admin = awardsAdmin();
    mockAdmin.mockReturnValue(admin.client);

    const { status, body } = await complete();

    expect(status).toBe(200);
    const write = admin.upserts.find((u) => u.table === 'student_achievements');
    expect(write?.options).toEqual({ onConflict: 'student_id,achievement_id', ignoreDuplicates: true });
    expect(write?.rows).toEqual([expect.objectContaining({ student_id: STUDENT, achievement_id: 'def-first', current_tier: 'bronze' })]);
    expect(body.newAwards).toEqual([{ achievementKey: 'first_lesson', tier: 'bronze', icon: '📚', isNew: true, isUpgrade: false }]);
  });

  it('GIVEN the award write fails WHEN saved THEN the session and XP still succeed and no award list is claimed', async () => {
    const { rpc } = studentClient();
    mockAdmin.mockReturnValue(awardsAdmin({ failAchievementWrite: true }).client);

    const { status, body } = await complete();

    expect(status).toBe(200);
    expect(body.session.xp_awarded).toBeGreaterThan(0);
    expect(rpc).toHaveBeenCalledWith('award_education_xp', expect.objectContaining({ p_student_id: STUDENT }));
    expect(body.newAwards).toBeNull();
  });

  it('GIVEN the XP RPC fails WHEN saved THEN no award row is written and no award is claimed', async () => {
    studentClient({ xpError: true });
    const admin = awardsAdmin();
    mockAdmin.mockReturnValue(admin.client);

    const { body } = await complete();

    expect(admin.upserts.filter((u) => u.table === 'student_achievements')).toEqual([]);
    expect(admin.updates).toEqual([]);
    expect(body.newAwards ?? null).toBeNull();
    expect(body.practiceStreak ?? null).toBeNull();
  });

  it('GIVEN the session write fails WHEN saved THEN it fails without writing award rows', async () => {
    studentClient({ sessionError: true });
    const admin = awardsAdmin();
    mockAdmin.mockReturnValue(admin.client);

    const { status } = await complete();

    expect(status).toBe(500);
    expect(admin.upserts.filter((u) => u.table === 'student_achievements')).toEqual([]);
    expect(admin.updates).toEqual([]);
  });

  it('GIVEN practice yesterday WHEN a completion today earns XP THEN the lesson streak grows by one, is saved and returned', async () => {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    studentClient({ progress: { current_streak: 6, longest_streak: 6, last_practice_date: yesterday } });
    const admin = awardsAdmin();
    mockAdmin.mockReturnValue(admin.client);

    const { body } = await complete();

    expect(admin.updates).toEqual([{ table: 'student_lesson_progress', patch: { current_streak: 7, longest_streak: 7 } }]);
    expect(body.practiceStreak).toEqual({ current: 7, longest: 7 });
  });
});
