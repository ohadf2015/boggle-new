import { vi, type Mock, } from 'vitest';
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
vi.mock('@/backend/modules/educationXpManager', () => ({
  calculatePracticeXp: vi.fn(() => ({ totalXp: 120, breakdown: { dailyPractice: 20, flashcardCorrect: 100 }, masteryMessage: 'Great!' })),
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

vi.mock('@/lib/education/practiceXpLimits', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/education/practiceXpLimits')>()),
  readPracticeXpLimits: vi.fn().mockResolvedValue({ deckSize: 100, xpLast24h: 0 }),
}));

import { NextRequest } from 'next/server';
import { PATCH, POST } from '../route';
import { createClient } from '@/utils/supabase/server';
import { calculatePracticeXp } from '@/backend/modules/educationXpManager';
import * as logger from '@/utils/logger';

/**
 * Minimal PostgREST double for the admin client, mirroring
 * app/api/education/practice/lessons/__tests__/route.test.ts. Each table
 * answers the one query shape the access check builds; an unexpected table
 * throws rather than silently returning an empty list.
 */
function adminDouble(rows: Record<string, unknown[]>) {
  return {
    from(table: string) {
      if (!(table in rows)) throw new Error(`unexpected table ${table}`);
      const data = rows[table];
      const builder: Record<string, unknown> = {};
      for (const method of ['select', 'eq', 'in', 'limit']) {
        builder[method] = () => builder;
      }
      builder.single = async () => ({
        data: (data as unknown[])[0] ?? null,
        error: (data as unknown[])[0] ? null : { code: 'PGRST116' },
      });
      builder.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve({ data, error: null }).then(resolve);
      return builder;
    },
  };
}

describe('PATCH /api/education/practice', () => {
  let mockSupabase: any;
  let mockAuth: any;
  let mockFrom: any;
  let mockRpc: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock RPC function
    mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });

    // Setup mock from() builder
    mockFrom = vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      single: vi.fn(),
    }));

    // Setup mock auth
    mockAuth = {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: '550e8400-e29b-41d4-a716-446655440002' } },
        error: null,
      }),
    };

    // Setup mock Supabase client
    mockSupabase = {
      auth: mockAuth,
      from: mockFrom,
      rpc: mockRpc,
    };

    // Mock createClient to return our mock

    createClient.mockResolvedValue(mockSupabase);
  });

  function mockSession(practiceType: string) {
    const writes: Array<Record<string, unknown>> = [];
    const existing = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      student_id: '550e8400-e29b-41d4-a716-446655440002',
      lesson_id: '550e8400-e29b-41d4-a716-446655440003',
      practice_type: practiceType,
      completed_at: null,
    };
    mockFrom.mockImplementation((table: string) => {
      if (table === 'student_lesson_progress') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { current_streak: 0 }, error: null }),
        };
      }
      let isWrite = false;
      const builder: Record<string, Mock> = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        update: vi.fn((row: Record<string, unknown>) => {
          isWrite = true;
          writes.push(row);
          return builder;
        }),
        single: vi.fn(() => Promise.resolve({ data: isWrite ? { ...existing, ...writes[0] } : existing, error: null })),
      };
      return builder;
    });
    return { existing, writes };
  }

  const patch = (body: Record<string, unknown>) => PATCH(new NextRequest('http://localhost/api/education/practice', {
    method: 'PATCH',
    body: JSON.stringify(body),
  }));

  describe.each(['blitz', 'matching', 'spelling', 'flashcard', 'vocab_focus'])('GIVEN a finished %s round', (practiceType) => {
    it('WHEN it completes THEN the row carries its word counts', async () => {
      const { existing, writes } = mockSession(practiceType);
      const response = await patch({ sessionId: existing.id, cardsReviewed: 10, cardsCorrect: 7, completed: true });
      expect(response.status).toBe(200);
      expect(writes[0]).toMatchObject({ words_attempted: 10, words_correct: 7, accuracy: 70 });
    });

    it('WHEN a client reports a huge count THEN no XP input is taken from it', async () => {
      const { existing } = mockSession(practiceType);
      await patch({ sessionId: existing.id, cardsReviewed: 9999, cardsCorrect: 9999, completed: true });
      const { sessionData } = (calculatePracticeXp as unknown as Mock).mock.calls[0][0];
      expect(sessionData.blitzWordsFound).toBe(0);
      expect(sessionData.pairsMatched).toBeUndefined();
      expect(sessionData.totalPairs).toBeUndefined();
      expect(sessionData.wordsSpelled).toBeUndefined();
    });

    it('WHEN only a progress update arrives THEN the word columns wait for completion', async () => {
      const { existing, writes } = mockSession(practiceType);
      await patch({ sessionId: existing.id, cardsReviewed: 10, cardsCorrect: 7 });
      expect(writes[0]).not.toHaveProperty('words_correct');
      expect(writes[0]).not.toHaveProperty('words_attempted');
    });
  });
});
