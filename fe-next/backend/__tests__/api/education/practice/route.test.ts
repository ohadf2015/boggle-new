/**
 * Practice API Route Tests
 * Tests for PATCH handler XP wiring and idempotency
 */

// Configure test environment
/**
 * @jest-environment node
 * @jest-environment-options {"customExportConditions": ["node"]}
 */

// Mock dependencies BEFORE importing route
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
import { PATCH } from '@/app/api/education/practice/route';

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

    // Mock logger to suppress output
    const logger = require('@/utils/logger');
    logger.default = {
      error: jest.fn(),
      info: jest.fn(),
    };
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

      mockFrom.mockImplementation((table: string) => {
        const builder = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          single: jest.fn(),
        };

        if (table === 'practice_sessions') {
          // First call: ownership check
          // Second call: session update
          const callCount = mockFrom.mock.calls.filter((c: any) => c[0] === 'practice_sessions').length;
          if (callCount === 1) {
            builder.single = ownershipCheckMock;
          } else {
            builder.single = sessionUpdateMock;
          }
        }

        return builder;
      });

      const request = new NextRequest('http://localhost/api/education/practice', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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
          id: 'session-456',
          student_id: '550e8400-e29b-41d4-a716-446655440002',
          completed_at: null,
        },
        error: null,
      });

      const sessionUpdateMock = jest.fn().mockResolvedValue({
        data: {
          id: 'session-456',
          student_id: '550e8400-e29b-41d4-a716-446655440002',
          lesson_id: '550e8400-e29b-41d4-a716-446655440003',
          xp_awarded: 0,
          words_attempted: 5,
          completed_at: null,
        },
        error: null,
      });

      mockFrom.mockImplementation((table: string) => {
        const builder = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          single: jest.fn(),
        };

        if (table === 'practice_sessions') {
          const callCount = mockFrom.mock.calls.filter((c: any) => c[0] === 'practice_sessions').length;
          if (callCount === 1) {
            builder.single = ownershipCheckMock;
          } else {
            builder.single = sessionUpdateMock;
          }
        }

        return builder;
      });

      const request = new NextRequest('http://localhost/api/education/practice', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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
          id: 'session-456',
          student_id: '550e8400-e29b-41d4-a716-446655440002',
          completed_at: '2026-02-14T10:00:00Z', // Already completed
        },
        error: null,
      });

      mockFrom.mockImplementation((table: string) => {
        const builder = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: ownershipCheckMock,
        };

        return builder;
      });

      const request = new NextRequest('http://localhost/api/education/practice', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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

      // THEN: Session update was NOT called
      const fromCalls = mockFrom.mock.calls;
      expect(fromCalls.length).toBe(1); // Only ownership check, no update

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
          id: 'session-456',
          student_id: '550e8400-e29b-41d4-a716-446655440002',
          completed_at: null,
        },
        error: null,
      });

      const sessionUpdateMock = jest.fn().mockResolvedValue({
        data: {
          id: 'session-456',
          student_id: '550e8400-e29b-41d4-a716-446655440002',
          lesson_id: '550e8400-e29b-41d4-a716-446655440003',
          xp_awarded: 100,
          completed_at: '2026-02-14T12:00:00Z',
        },
        error: null,
      });

      mockFrom.mockImplementation((table: string) => {
        const builder = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          single: jest.fn(),
        };

        if (table === 'practice_sessions') {
          const callCount = mockFrom.mock.calls.filter((c: any) => c[0] === 'practice_sessions').length;
          if (callCount === 1) {
            builder.single = ownershipCheckMock;
          } else {
            builder.single = sessionUpdateMock;
          }
        }

        return builder;
      });

      const request = new NextRequest('http://localhost/api/education/practice', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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
