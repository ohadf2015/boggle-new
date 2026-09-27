import { vi } from 'vitest';
/**
 * Practice API — PATCH completion round-trip budget.
 *
 * A student finishing a practice session is the most frequent write in the
 * education module and the moment they are staring at a spinner on a school
 * Chromebook. Every awaited Supabase hop is a serial network round trip on
 * district Wi-Fi, so the handler has a budget: at most 4 sequential waves.
 *
 * "Wave" = a group of operations issued before any earlier operation has
 * resolved. Operations inside one wave travel concurrently, so they cost one
 * round trip between them. The harness below counts waves by recording, for
 * every issued Supabase operation, how many operations had already resolved.
 */

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
      json: vi.fn((data: unknown, init?: { status?: number }) => ({
        json: async () => data,
        status: init?.status || 200,
      })),
    },
  };
});

vi.mock('@/utils/supabase/server');
vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { log: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock('@/backend/modules/educationXpManager', () => ({
  calculatePracticeXp: vi.fn(() => ({ totalXp: 120, breakdown: {}, masteryMessage: 'Great!' })),
}));
vi.mock('@/lib/supabase/education/challengeProgress', () => ({
  updateEducationChallengeProgress: vi.fn().mockResolvedValue({ updated: 0 }),
}));
vi.mock('@/lib/apiRateLimit', () => ({
  checkApiRateLimit: vi.fn().mockReturnValue({ success: true }),
}));

import { NextRequest } from 'next/server';
import { PATCH } from '../route';
import { createClient } from '@/utils/supabase/server';
import { calculatePracticeXp } from '@/backend/modules/educationXpManager';

const USER = '550e8400-e29b-41d4-a716-446655440002';
const LESSON = '550e8400-e29b-41d4-a716-446655440003';
const SESSION = '550e8400-e29b-41d4-a716-446655440001';

type Op = { label: string; wave: number };

function createHarness(overrides: { existing?: Record<string, unknown> } = {}) {
  const ops: Op[] = [];
  const updateCalls: { table: string; payload: Record<string, unknown> }[] = [];
  const rpcCalls: { name: string; params: Record<string, unknown> }[] = [];
  let resolvedCount = 0;

  /**
   * A lazily-started thenable. The operation registers when it is first
   * awaited (that is when supabase-js actually sends the request) and resolves
   * on a macrotask, so every operation issued in the same synchronous /
   * microtask burst registers before any of them resolves.
   */
  function track<T>(label: string, value: T) {
    let promise: Promise<T> | null = null;
    const start = (): Promise<T> => {
      if (!promise) {
        ops.push({ label, wave: resolvedCount });
        promise = new Promise<T>(resolve => {
          setTimeout(() => {
            resolvedCount += 1;
            resolve(value);
          }, 0);
        });
      }
      return promise;
    };
    return {
      then: (onOk?: never, onErr?: never) => start().then(onOk, onErr),
      catch: (onErr?: never) => start().catch(onErr),
      finally: (onDone?: never) => start().finally(onDone),
    };
  }

  const existingRow = {
    id: SESSION,
    student_id: USER,
    lesson_id: LESSON,
    completed_at: null,
    practice_type: 'flashcard',
    mode: null,
    cards_reviewed: 10,
    cards_correct: 8,
    vocabulary_words_found: [],
    words_found: [],
    words_correct: 0,
    words_attempted: 0,
    max_combo: 0,
    ...(overrides.existing ?? {}),
  };

  function makeBuilder<T>(label: string, value: T) {
    const self: Record<string, unknown> = {
      select: () => self,
      eq: () => self,
      is: () => self,
      in: () => self,
      order: () => self,
      limit: () => self,
      single: () => track(`${label}:single`, value),
    };
    const thenable = track(label, value);
    self.then = thenable.then;
    self.catch = thenable.catch;
    self.finally = thenable.finally;
    return self;
  }

  const from = (table: string) => ({
    select: () => {
      const data =
        table === 'student_lesson_progress'
          ? { current_streak: 3 }
          : existingRow;
      return makeBuilder(`${table}.select`, { data, error: null });
    },
    update: (payload: Record<string, unknown>) => {
      updateCalls.push({ table, payload });
      return makeBuilder(`${table}.update`, {
        data: { ...existingRow, ...payload },
        error: null,
      });
    },
    upsert: (payload: Record<string, unknown>) => {
      updateCalls.push({ table, payload });
      return makeBuilder(`${table}.upsert`, { data: null, error: null });
    },
  });

  const client = {
    auth: {
      getUser: () => {
        ops.push({ label: 'auth.getUser', wave: resolvedCount });
        return new Promise(resolve => {
          setTimeout(() => {
            resolvedCount += 1;
            resolve({ data: { user: { id: USER } }, error: null });
          }, 0);
        });
      },
    },
    from: vi.fn(from),
    rpc: (name: string, params: Record<string, unknown>) => {
      rpcCalls.push({ name, params });
      return track(`rpc.${name}`, { data: null, error: null });
    },
  };

  return {
    client,
    ops,
    updateCalls,
    rpcCalls,
    waves: () => new Set(ops.map(o => o.wave)).size,
  };
}

function completionRequest() {
  return new NextRequest('http://localhost/api/education/practice', {
    method: 'PATCH',
    body: JSON.stringify({ sessionId: SESSION, cardsReviewed: 10, cardsCorrect: 8, completed: true }),
  });
}

describe('PATCH /api/education/practice — round-trip budget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (calculatePracticeXp as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      totalXp: 120,
      breakdown: {},
      masteryMessage: 'Great!',
    });
  });

  it('completes a session in at most 4 sequential round trips', async () => {
    const harness = createHarness();
    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(harness.client);

    await PATCH(completionRequest());

    expect(harness.waves()).toBeLessThanOrEqual(4);
  });

  it('writes the practice session exactly once (xp_awarded merged into the completion write)', async () => {
    const harness = createHarness();
    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(harness.client);

    await PATCH(completionRequest());

    const sessionWrites = harness.updateCalls.filter(c => c.table === 'practice_sessions');
    expect(sessionWrites).toHaveLength(1);
    expect(sessionWrites[0].payload).toMatchObject({ xp_awarded: 120 });
    expect(sessionWrites[0].payload.completed_at).toEqual(expect.any(String));
  });

  it('issues the two XP RPCs concurrently, not back to back', async () => {
    const harness = createHarness();
    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(harness.client);

    await PATCH(completionRequest());

    const award = harness.ops.find(o => o.label === 'rpc.award_education_xp');
    const profile = harness.ops.find(o => o.label === 'rpc.increment_player_xp');
    expect(award).toBeDefined();
    expect(profile).toBeDefined();
    expect(award!.wave).toBe(profile!.wave);
  });

  it('still reads the streak before computing XP (same XP amounts)', async () => {
    const harness = createHarness();
    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(harness.client);

    await PATCH(completionRequest());

    expect(calculatePracticeXp).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'flashcard', streakDays: 3 })
    );
    expect(harness.rpcCalls).toEqual([
      { name: 'award_education_xp', params: { p_student_id: USER, p_xp_amount: 120, p_lesson_id: LESSON } },
      { name: 'increment_player_xp', params: { p_player_id: USER, p_xp_amount: 120 } },
    ]);
  });

  it('returns the updated session row', async () => {
    const harness = createHarness();
    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(harness.client);

    const response = await PATCH(completionRequest());
    const body = await response.json();

    expect(body.session).toMatchObject({ id: SESSION, xp_awarded: 120 });
  });

  it('a non-completing progress update costs at most 3 round trips and one write', async () => {
    const harness = createHarness();
    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(harness.client);

    const request = new NextRequest('http://localhost/api/education/practice', {
      method: 'PATCH',
      body: JSON.stringify({ sessionId: SESSION, cardsReviewed: 4 }),
    });
    await PATCH(request);

    expect(harness.waves()).toBeLessThanOrEqual(3);
    expect(harness.updateCalls.filter(c => c.table === 'practice_sessions')).toHaveLength(1);
    expect(harness.rpcCalls).toHaveLength(0);
  });

  it('the already-completed replay returns only the guard columns (no wider row)', async () => {
    const harness = createHarness({ existing: { completed_at: '2026-09-01T00:00:00.000Z' } });
    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(harness.client);

    const response = await PATCH(completionRequest());
    const body = await response.json();

    expect(Object.keys(body.session).sort()).toEqual(['completed_at', 'id', 'student_id']);
    expect(harness.updateCalls).toHaveLength(0);
    expect(harness.rpcCalls).toHaveLength(0);
  });
});
