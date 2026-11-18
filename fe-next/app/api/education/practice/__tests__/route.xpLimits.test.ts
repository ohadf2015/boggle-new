import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
/**
 * Practice API Route Tests
 * Tests for PATCH handler XP wiring and idempotency
 */

// Mock next/server BEFORE any imports
vi.mock('next/server', () => {
  class MockNextRequest {
    private _body: any;
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
      json: vi.fn((data: any, init?: { status?: number }) => ({
        json: async () => data,
        status: init?.status || 200,
      })),
    },
  };
});

vi.mock('@/utils/supabase/server');
vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: {
    log: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    time: vi.fn(),
    timeEnd: vi.fn(),
  },
}));

// E3 audit fix: practice route must enforce a per-user rate limit so a
// hostile client can't spam session writes (DB bloat + XP grind risk).
const mockCheckApiRateLimit = vi.fn().mockReturnValue({ success: true });
vi.mock('@/lib/apiRateLimit', () => ({
  checkApiRateLimit: (...args: unknown[]) => mockCheckApiRateLimit(...args),
}));

// Lesson access (classroom membership, not lesson_assignments) is read with
// the service-role client — RLS hides a classroom lesson from the student's
// own session. See app/api/education/practice/lessons/route.ts.
const mockAdmin = vi.fn();
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => mockAdmin(),
}));

import { NextRequest } from 'next/server';
import { PATCH } from '../route';
import { createClient } from '@/utils/supabase/server';

const SESSION = '550e8400-e29b-41d4-a716-446655440001';
const STUDENT = '550e8400-e29b-41d4-a716-446655440002';
const LESSON = '550e8400-e29b-41d4-a716-446655440003';

const DOWN = { data: null, error: { message: 'down' } };

function limitsAdmin(deck: number | null, earned: number[], failing: 'all' | 'lesson' | null = null) {
  return {
    from(table: string) {
      const isLesson = table === 'vocabulary_lessons';
      const answer = failing === 'all' || (failing === 'lesson' && isLesson)
        ? DOWN
        : isLesson
          ? { data: { words: deck === null ? null : Array.from({ length: deck }, (_, i) => `w${i}`) }, error: null }
          : { data: earned.map((xp_awarded) => ({ xp_awarded })), error: null };
      const builder: Record<string, unknown> = {};
      for (const method of ['select', 'eq', 'gte', 'gt', 'limit', 'abortSignal']) builder[method] = () => builder;
      builder.maybeSingle = async () => answer;
      builder.then = (resolve: (v: unknown) => unknown) => Promise.resolve(answer).then(resolve);
      return builder;
    },
  };
}

function studentClient(practiceType = 'flashcard') {
  const writes: Array<Record<string, unknown>> = [];
  const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
  const existing = { id: SESSION, student_id: STUDENT, lesson_id: LESSON, practice_type: practiceType, completed_at: null };
  (createClient as unknown as Mock).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: STUDENT } }, error: null }) },
    rpc,
    from(table: string) {
      if (table === 'student_lesson_progress') {
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { current_streak: 0 }, error: null }) };
      }
      let isWrite = false;
      const builder: Record<string, Mock> = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        is: vi.fn(() => builder),
        order: vi.fn(() => builder),
        limit: vi.fn(() => builder),
        maybeSingle: vi.fn(async () => ({ data: null, error: null })),
        update: vi.fn((row: Record<string, unknown>) => { isWrite = true; writes.push(row); return builder; }),
        single: vi.fn(async () => ({ data: isWrite ? { ...existing, ...writes[0] } : existing, error: null })),
      };
      return builder;
    },
  });
  return { writes, rpc };
}

const finish = async (cardsReviewed: number, cardsCorrect: number) => {
  const response = await PATCH(new NextRequest('http://localhost/api/education/practice', {
    method: 'PATCH',
    body: JSON.stringify({ sessionId: SESSION, cardsReviewed, cardsCorrect, completed: true }),
  }));
  return { status: response.status, body: await response.json() };
};

const awarded = (rpc: Mock) => rpc.mock.calls.find((c) => c[0] === 'award_education_xp')?.[1]?.p_xp_amount;

describe('PATCH /api/education/practice XP limits', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GIVEN a 10 word deck WHEN a client claims 9999 correct THEN XP stops at twice the deck', async () => {
    const { rpc, writes } = studentClient();
    mockAdmin.mockReturnValue(limitsAdmin(10, []));
    const { status } = await finish(9999, 9999);
    expect(status).toBe(200);
    expect(awarded(rpc)).toBe(20 + 200 + 50 + 100);
    expect(writes[0].xp_awarded).toBe(370);
  });

  it('GIVEN a 5 word lesson WHEN a 10 card review is all correct THEN it earns full XP', async () => {
    const { rpc } = studentClient('vocab_focus');
    mockAdmin.mockReturnValue(limitsAdmin(5, []));
    await finish(10, 10);
    expect(awarded(rpc)).toBe(20 + 100 + 50 + 100);
  });

  it.each([
    ['has no word list', limitsAdmin(null, [])],
    ['has an empty word list', limitsAdmin(0, [])],
    ['cannot be read', limitsAdmin(10, [], 'lesson')],
  ])('GIVEN a lesson that %s WHEN a round completes THEN it still earns XP under the fixed ceiling', async (_name, admin) => {
    const { rpc } = studentClient();
    mockAdmin.mockReturnValue(admin);
    await finish(10, 8);
    expect(awarded(rpc)).toBe(20 + 80 + 30);
  });

  it('GIVEN no word list WHEN a client claims 9999 correct THEN the fixed ceiling limits XP', async () => {
    const { rpc } = studentClient();
    mockAdmin.mockReturnValue(limitsAdmin(null, []));
    await finish(9999, 9999);
    expect(awarded(rpc)).toBe(20 + 1600 + 50 + 100);
  });

  it.each(['solo_board', 'warmup'])('GIVEN a %s round with no word list WHEN it completes THEN it earns XP', async (type) => {
    const { rpc } = studentClient(type);
    mockAdmin.mockReturnValue(limitsAdmin(null, []));
    await finish(0, 0);
    expect(awarded(rpc)).toBe(20 + 50);
  });

  it('GIVEN an honest round WHEN it completes THEN its XP is unchanged', async () => {
    const { rpc } = studentClient();
    mockAdmin.mockReturnValue(limitsAdmin(10, [100, 60]));
    await finish(10, 8);
    expect(awarded(rpc)).toBe(20 + 80 + 30);
  });

  it('GIVEN a student at the daily cap WHEN a session completes THEN it saves with 0 XP and no failure', async () => {
    const { rpc, writes } = studentClient();
    mockAdmin.mockReturnValue(limitsAdmin(10, [10_000]));
    const { status, body } = await finish(10, 10);
    expect(status).toBe(200);
    expect(body.session.xp_awarded).toBe(0);
    expect(writes[0]).toMatchObject({ xp_awarded: 0, cards_correct: 10, completed_at: expect.any(String) });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('GIVEN the limit read fails WHEN a session completes THEN it saves and returns 0 XP', async () => {
    const { rpc, writes } = studentClient();
    mockAdmin.mockReturnValue(limitsAdmin(10, [], 'all'));
    const { status, body } = await finish(10, 10);
    expect(status).toBe(200);
    expect(body.session.xp_awarded).toBe(0);
    expect(writes[0]).toMatchObject({ xp_awarded: 0, completed_at: expect.any(String) });
    expect(rpc).not.toHaveBeenCalled();
  });
});
