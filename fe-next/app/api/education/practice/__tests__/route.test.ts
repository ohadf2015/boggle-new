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

import { NextRequest } from 'next/server';
import { PATCH, POST } from '../route';
import { createClient } from '@/utils/supabase/server';
import * as logger from '@/utils/logger';

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

  describe('XP Award on Completion', () => {
    it('should award XP via RPC when practice session is completed', async () => {
      // GIVEN: Session exists and is not yet completed
      const ownershipCheckMock = vi.fn().mockResolvedValue({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440001',
          student_id: '550e8400-e29b-41d4-a716-446655440002',
          completed_at: null,
        },
        error: null,
      });

      const sessionUpdateMock = vi.fn().mockResolvedValue({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440001',
          student_id: '550e8400-e29b-41d4-a716-446655440002',
          lesson_id: '550e8400-e29b-41d4-a716-446655440003',
          practice_type: 'flashcard',
          cards_reviewed: 10,
          cards_correct: 8,
          xp_awarded: 0,
          completed_at: '2026-02-14T12:00:00Z',
        },
        error: null,
      });

      // Additional from() call for XP update after server calculation
      const xpUpdateMock = vi.fn().mockResolvedValue({ data: null, error: null });

      mockFrom.mockImplementation(() => {
        const callCount = mockFrom.mock.calls.length;
        const builder: Record<string, Mock> = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          update: vi.fn(() => {
            if (callCount >= 3) return { eq: vi.fn().mockResolvedValue(xpUpdateMock()) };
            return builder;
          }),
          single: callCount === 1 ? ownershipCheckMock : sessionUpdateMock,
        };
        return builder;
      });

      const request = new NextRequest('http://localhost/api/education/practice', {
        method: 'PATCH',
        body: JSON.stringify({
          sessionId: '550e8400-e29b-41d4-a716-446655440001',
          cardsReviewed: 10,
          cardsCorrect: 8,
          completed: true,
        }),
      });

      // WHEN: PATCH request is made
      const response = await PATCH(request);
      const data = await response.json();

      // THEN: Response is successful
      expect(response.status).toBe(200);
      expect(data.session).toBeDefined();

      // THEN: RPC was called with SERVER-CALCULATED XP (not client-supplied)
      expect(mockRpc).toHaveBeenCalledWith('award_education_xp', {
        p_student_id: '550e8400-e29b-41d4-a716-446655440002',
        p_xp_amount: 120, // From mocked calculatePracticeXp
        p_lesson_id: '550e8400-e29b-41d4-a716-446655440003',
      });
    });

    it('should NOT award XP when session is not completed', async () => {
      // GIVEN: Session update without completion
      const ownershipCheckMock = vi.fn().mockResolvedValue({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440001',
          student_id: '550e8400-e29b-41d4-a716-446655440002',
          completed_at: null,
        },
        error: null,
      });

      const sessionUpdateMock = vi.fn().mockResolvedValue({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440001',
          student_id: '550e8400-e29b-41d4-a716-446655440002',
          lesson_id: '550e8400-e29b-41d4-a716-446655440003',
          xp_awarded: 0,
          words_attempted: 5,
          completed_at: null,
        },
        error: null,
      });

      mockFrom.mockImplementation(() => {
        const callCount = mockFrom.mock.calls.length;
        const builder = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          single: callCount === 1 ? ownershipCheckMock : sessionUpdateMock,
        };
        return builder;
      });

      const request = new NextRequest('http://localhost/api/education/practice', {
        method: 'PATCH',
        body: JSON.stringify({
          sessionId: '550e8400-e29b-41d4-a716-446655440001',
          wordsAttempted: 5,
        }),
      });

      // WHEN: PATCH request is made without completion
      const response = await PATCH(request);
      const data = await response.json();

      // THEN: Response is successful
      expect(response.status).toBe(200);
      expect(data.session).toBeDefined();

      // THEN: RPC was NOT called
      expect(mockRpc).not.toHaveBeenCalled();
    });
  });

  describe('Idempotency Guard', () => {
    it('should return existing session when already completed (prevent double-awarding)', async () => {
      // GIVEN: Session already completed
      const ownershipCheckMock = vi.fn().mockResolvedValue({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440001',
          student_id: '550e8400-e29b-41d4-a716-446655440002',
          completed_at: '2026-02-14T10:00:00Z',
        },
        error: null,
      });

      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: ownershipCheckMock,
      }));

      const request = new NextRequest('http://localhost/api/education/practice', {
        method: 'PATCH',
        body: JSON.stringify({
          sessionId: '550e8400-e29b-41d4-a716-446655440001',
          xpAwarded: 120,
          completed: true,
        }),
      });

      // WHEN: PATCH request is made on already-completed session
      const response = await PATCH(request);
      const data = await response.json();

      // THEN: Response returns existing session
      expect(response.status).toBe(200);
      expect(data.session.completed_at).toBe('2026-02-14T10:00:00Z');

      // THEN: Session update was NOT called (only ownership check)
      expect(mockFrom).toHaveBeenCalledTimes(1);

      // THEN: RPC was NOT called (no double-awarding)
      expect(mockRpc).not.toHaveBeenCalled();
    });
  });

  describe('Graceful RPC Failure', () => {
    it('should succeed even when RPC fails (graceful degradation)', async () => {
      // GIVEN: RPC call will fail
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'RPC function not found' },
      });

      const ownershipCheckMock = vi.fn().mockResolvedValue({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440001',
          student_id: '550e8400-e29b-41d4-a716-446655440002',
          completed_at: null,
        },
        error: null,
      });

      const sessionUpdateMock = vi.fn().mockResolvedValue({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440001',
          student_id: '550e8400-e29b-41d4-a716-446655440002',
          lesson_id: '550e8400-e29b-41d4-a716-446655440003',
          practice_type: 'flashcard',
          cards_reviewed: 10,
          cards_correct: 8,
          xp_awarded: 0,
          completed_at: '2026-02-14T12:00:00Z',
        },
        error: null,
      });

      const xpUpdateMock = vi.fn().mockResolvedValue({ data: null, error: null });

      mockFrom.mockImplementation(() => {
        const callCount = mockFrom.mock.calls.length;
        const builder: Record<string, Mock> = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          update: vi.fn(() => {
            if (callCount >= 3) return { eq: vi.fn().mockResolvedValue(xpUpdateMock()) };
            return builder;
          }),
          single: callCount === 1 ? ownershipCheckMock : sessionUpdateMock,
        };
        return builder;
      });

      const request = new NextRequest('http://localhost/api/education/practice', {
        method: 'PATCH',
        body: JSON.stringify({
          sessionId: '550e8400-e29b-41d4-a716-446655440001',
          cardsReviewed: 10,
          cardsCorrect: 8,
          completed: true,
        }),
      });

      // WHEN: PATCH request is made and RPC fails
      const response = await PATCH(request);
      const data = await response.json();

      // THEN: Response is still successful (session saved despite XP failure)
      expect(response.status).toBe(200);
      expect(data.session).toBeDefined();

      // THEN: RPC was called with server-calculated XP but failed
      expect(mockRpc).toHaveBeenCalledWith('award_education_xp', {
        p_student_id: '550e8400-e29b-41d4-a716-446655440002',
        p_xp_amount: 120, // Server-calculated, not client-supplied
        p_lesson_id: '550e8400-e29b-41d4-a716-446655440003',
      });

      // THEN: Error was logged

      expect(logger.default.error).toHaveBeenCalledWith(
        'Failed to award education XP:',
        expect.objectContaining({ message: 'RPC function not found' })
      );
    });
  });

  describe('rate limiting (E3)', () => {
    beforeEach(() => {
      mockCheckApiRateLimit.mockClear();
      mockCheckApiRateLimit.mockReturnValue({ success: true });
    });

    it('PATCH consults checkApiRateLimit before doing work', async () => {
      const request = new NextRequest('http://localhost/api/education/practice', {
        method: 'PATCH',
        body: JSON.stringify({
          sessionId: '550e8400-e29b-41d4-a716-446655440099',
          completed: true,
        }),
      });

      await PATCH(request);

      expect(mockCheckApiRateLimit).toHaveBeenCalled();
      const [, bucket] = mockCheckApiRateLimit.mock.calls[0];
      expect(bucket).toBe('education-practice');
    });

    it('PATCH returns 429 when limiter rejects', async () => {
      mockCheckApiRateLimit.mockReturnValueOnce({ success: false, retryAfter: 30 });

      const request = new NextRequest('http://localhost/api/education/practice', {
        method: 'PATCH',
        body: JSON.stringify({
          sessionId: '550e8400-e29b-41d4-a716-446655440099',
          completed: true,
        }),
      });

      const response = await PATCH(request);
      expect(response.status).toBe(429);
    });

    it('POST returns 429 when limiter rejects', async () => {
      mockCheckApiRateLimit.mockReturnValueOnce({ success: false, retryAfter: 30 });

      const request = new NextRequest('http://localhost/api/education/practice', {
        method: 'POST',
        body: JSON.stringify({
          lessonId: '550e8400-e29b-41d4-a716-446655440003',
          practiceType: 'flashcard',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(429);
    });
  });
});
