/**
 * Practice API Route Tests
 * Tests for PATCH handler XP wiring and idempotency
 */

// Mock next/server BEFORE any imports
jest.mock('next/server', () => {
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
      json: jest.fn((data: any, init?: { status?: number }) => ({
        json: async () => data,
        status: init?.status || 200,
      })),
    },
  };
});

jest.mock('@/utils/supabase/server');
jest.mock('@/utils/logger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    time: jest.fn(),
    timeEnd: jest.fn(),
  },
}));

import { NextRequest } from 'next/server';
import { PATCH } from '../route';

describe('PATCH /api/education/practice', () => {
  let mockSupabase: any;
  let mockAuth: any;
  let mockFrom: any;
  let mockRpc: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock RPC function
    mockRpc = jest.fn().mockResolvedValue({ data: null, error: null });

    // Setup mock from() builder
    mockFrom = jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      single: jest.fn(),
    }));

    // Setup mock auth
    mockAuth = {
      getUser: jest.fn().mockResolvedValue({
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
    const { createClient } = require('@/utils/supabase/server');
    createClient.mockResolvedValue(mockSupabase);
  });

  describe('XP Award on Completion', () => {
    it('should award XP via RPC when practice session is completed', async () => {
      // GIVEN: Session exists and is not yet completed
      const ownershipCheckMock = jest.fn().mockResolvedValue({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440001',
          student_id: '550e8400-e29b-41d4-a716-446655440002',
          completed_at: null,
        },
        error: null,
      });

      const sessionUpdateMock = jest.fn().mockResolvedValue({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440001',
          student_id: '550e8400-e29b-41d4-a716-446655440002',
          lesson_id: '550e8400-e29b-41d4-a716-446655440003',
          xp_awarded: 120,
          completed_at: '2026-02-14T12:00:00Z',
        },
        error: null,
      });

      mockFrom.mockImplementation(() => {
        const callCount = mockFrom.mock.calls.length;
        const builder = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          single: callCount === 1 ? ownershipCheckMock : sessionUpdateMock,
        };
        return builder;
      });

      const request = new NextRequest('http://localhost/api/education/practice', {
        method: 'PATCH',
        body: JSON.stringify({
          sessionId: '550e8400-e29b-41d4-a716-446655440001',
          xpAwarded: 120,
          completed: true,
        }),
      });

      // WHEN: PATCH request is made
      const response = await PATCH(request);
      const data = await response.json();

      // THEN: Response is successful
      expect(response.status).toBe(200);
      expect(data.session).toBeDefined();

      // THEN: RPC was called with correct parameters
      expect(mockRpc).toHaveBeenCalledWith('award_education_xp', {
        p_student_id: '550e8400-e29b-41d4-a716-446655440002',
        p_xp_amount: 120,
        p_lesson_id: '550e8400-e29b-41d4-a716-446655440003',
      });
    });

    it('should NOT award XP when session is not completed', async () => {
      // GIVEN: Session update without completion
      const ownershipCheckMock = jest.fn().mockResolvedValue({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440001',
          student_id: '550e8400-e29b-41d4-a716-446655440002',
          completed_at: null,
        },
        error: null,
      });

      const sessionUpdateMock = jest.fn().mockResolvedValue({
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
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
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
      const ownershipCheckMock = jest.fn().mockResolvedValue({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440001',
          student_id: '550e8400-e29b-41d4-a716-446655440002',
          completed_at: '2026-02-14T10:00:00Z',
        },
        error: null,
      });

      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
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

      const ownershipCheckMock = jest.fn().mockResolvedValue({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440001',
          student_id: '550e8400-e29b-41d4-a716-446655440002',
          completed_at: null,
        },
        error: null,
      });

      const sessionUpdateMock = jest.fn().mockResolvedValue({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440001',
          student_id: '550e8400-e29b-41d4-a716-446655440002',
          lesson_id: '550e8400-e29b-41d4-a716-446655440003',
          xp_awarded: 100,
          completed_at: '2026-02-14T12:00:00Z',
        },
        error: null,
      });

      mockFrom.mockImplementation(() => {
        const callCount = mockFrom.mock.calls.length;
        const builder = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          single: callCount === 1 ? ownershipCheckMock : sessionUpdateMock,
        };
        return builder;
      });

      const request = new NextRequest('http://localhost/api/education/practice', {
        method: 'PATCH',
        body: JSON.stringify({
          sessionId: '550e8400-e29b-41d4-a716-446655440001',
          xpAwarded: 100,
          completed: true,
        }),
      });

      // WHEN: PATCH request is made and RPC fails
      const response = await PATCH(request);
      const data = await response.json();

      // THEN: Response is still successful (session saved despite XP failure)
      expect(response.status).toBe(200);
      expect(data.session).toBeDefined();
      expect(data.session.completed_at).toBe('2026-02-14T12:00:00Z');

      // THEN: RPC was called but failed
      expect(mockRpc).toHaveBeenCalledWith('award_education_xp', {
        p_student_id: '550e8400-e29b-41d4-a716-446655440002',
        p_xp_amount: 100,
        p_lesson_id: '550e8400-e29b-41d4-a716-446655440003',
      });

      // THEN: Error was logged
      const logger = require('@/utils/logger');
      expect(logger.default.error).toHaveBeenCalledWith(
        'Failed to award education XP:',
        expect.objectContaining({ message: 'RPC function not found' })
      );
    });
  });
});
