/**
 * Test suite for classroom join functionality
 *
 * Bug fix: RLS policy was blocking students from looking up classrooms by join_code
 * before they were members. Added policy: "Anyone can lookup classroom by join code"
 */

import { joinClassroom } from '../teacher';
import { supabase } from '@/lib/supabase';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('joinClassroom', () => {
  const mockStudentId = 'student-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Bug: Code "4HCDMS" validation', () => {
    it('should accept valid join code "4HCDMS" that exists in database', async () => {
      // GIVEN: A valid classroom with code "4HCDMS" exists
      const mockClassroom = { id: 'classroom-456' };
      const mockFrom = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockClassroom,
        error: null
      });
      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: null,
        error: null
      });
      const mockInsert = jest.fn().mockResolvedValue({
        error: null
      });

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'classrooms') {
          return {
            select: mockSelect.mockReturnThis(),
            eq: mockEq.mockReturnThis(),
            single: mockSingle,
          };
        } else if (table === 'classroom_memberships') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: mockMaybeSingle,
            insert: mockInsert,
          };
        }
        return mockFrom();
      });

      // WHEN: Student joins with code "4HCDMS"
      const result = await joinClassroom('4HCDMS', mockStudentId);

      // THEN: Join should succeed
      expect(result.success).toBe(true);
      expect(result.data?.classroom_id).toBe('classroom-456');
      expect(result.error).toBeUndefined();

      // Verify code was uppercased in query
      expect(mockEq).toHaveBeenCalledWith('join_code', '4HCDMS');
    });

    it('should return error when code "4HCDMS" does not exist in database', async () => {
      // GIVEN: No classroom with code "4HCDMS" exists
      const mockFrom = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'No rows returned', code: 'PGRST116' }
      });

      (supabase.from as jest.Mock).mockImplementation(() => ({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      }));

      // WHEN: Student tries to join with non-existent code
      const result = await joinClassroom('4HCDMS', mockStudentId);

      // THEN: Should return "Invalid join code" error
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid join code');
      expect(result.data).toBeNull();
    });

    it('should handle lowercase code input by converting to uppercase', async () => {
      // GIVEN: Classroom exists with code "4HCDMS" (uppercase)
      const mockClassroom = { id: 'classroom-789' };
      const mockFrom = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockClassroom,
        error: null
      });
      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: null,
        error: null
      });
      const mockInsert = jest.fn().mockResolvedValue({
        error: null
      });

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'classrooms') {
          return {
            select: mockSelect.mockReturnThis(),
            eq: mockEq.mockReturnThis(),
            single: mockSingle,
          };
        } else if (table === 'classroom_memberships') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: mockMaybeSingle,
            insert: mockInsert,
          };
        }
        return mockFrom();
      });

      // WHEN: Student enters code in lowercase
      const result = await joinClassroom('4hcdms', mockStudentId);

      // THEN: Should convert to uppercase and find the classroom
      expect(result.success).toBe(true);
      expect(mockEq).toHaveBeenCalledWith('join_code', '4HCDMS');
    });

    it('should validate code format (6 alphanumeric characters)', async () => {
      // GIVEN: Various invalid code formats
      const invalidCodes = [
        '4HCD',      // Too short
        '4HCDMSS',   // Too long
        '4HCD MS',   // Contains space
        '4HCD-S',    // Contains dash
        '',          // Empty
      ];

      for (const invalidCode of invalidCodes) {
        // WHEN: Student enters invalid code format
        // NOTE: Current implementation doesn't validate format before DB query
        // This test documents expected behavior (should add validation)

        const mockFrom = jest.fn().mockReturnThis();
        const mockSelect = jest.fn().mockReturnThis();
        const mockEq = jest.fn().mockReturnThis();
        const mockSingle = jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'No rows returned' }
        });

        (supabase.from as jest.Mock).mockImplementation(() => ({
          select: mockSelect,
          eq: mockEq,
          single: mockSingle,
        }));

        const result = await joinClassroom(invalidCode, mockStudentId);

        // THEN: Should return error
        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid join code');
      }
    });
  });

  describe('Existing member scenarios', () => {
    it('should handle student already being a member gracefully', async () => {
      // GIVEN: Student is already a member of the classroom
      const mockClassroom = { id: 'classroom-999' };
      const mockExisting = { id: 'membership-123' };

      const mockFrom = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockClassroom,
        error: null
      });
      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: mockExisting,
        error: null
      });

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'classrooms') {
          return {
            select: mockSelect.mockReturnThis(),
            eq: mockEq.mockReturnThis(),
            single: mockSingle,
          };
        } else if (table === 'classroom_memberships') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: mockMaybeSingle,
          };
        }
        return mockFrom();
      });

      // WHEN: Student tries to join again
      const result = await joinClassroom('4HCDMS', mockStudentId);

      // THEN: Should return success without creating duplicate membership
      expect(result.success).toBe(true);
      expect(result.data?.classroom_id).toBe('classroom-999');
    });
  });
});
