import { vi, type MockedFunction, type MockedClass, type Mock } from 'vitest';
/**
 * Test suite for classroom join functionality
 *
 * Security fix: Uses RPC function lookup_classroom_by_join_code instead of
 * direct SELECT to prevent classroom enumeration attacks.
 */

import { joinClassroom } from '../education';
import { supabase } from '@/lib/supabase';

// Mock Supabase
// Note: jest.mock is hoisted, so we use a factory function
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

// Access the mocked functions after the mock is set up
const mockFrom = (supabase?.from || vi.fn()) as MockedFunction<any>;
const mockRpc = ((supabase as any)?.rpc || vi.fn()) as MockedFunction<any>;

describe('joinClassroom', () => {
  const mockStudentId = 'student-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Bug: Code "4HCDMS" validation', () => {
    it('should accept valid join code "4HCDMS" that exists in database', async () => {
      // GIVEN: A valid classroom with code "4HCDMS" exists
      // The RPC function returns an array of matching classrooms
      const mockClassroom = { id: 'classroom-456', name: 'Test Class', language: 'en' };

      mockRpc.mockResolvedValue({
        data: [mockClassroom],
        error: null,
      });

      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });
      const mockInsert = vi.fn().mockResolvedValue({
        error: null,
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'classroom_memberships') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: mockMaybeSingle,
            insert: mockInsert,
          } as any;
        }
        return {} as any;
      });

      // WHEN: Student joins with code "4HCDMS"
      const result = await joinClassroom('4HCDMS', mockStudentId);

      // THEN: Join should succeed
      expect(result.error).toBeNull();
      expect(result.data?.classroom_id).toBe('classroom-456');

      // Verify RPC was called with correct parameters
      expect(mockRpc).toHaveBeenCalledWith('lookup_classroom_by_join_code', {
        p_join_code: '4HCDMS',
      });
    });

    it('should return error when code "4HCDMS" does not exist in database', async () => {
      // GIVEN: No classroom with code "4HCDMS" exists
      mockRpc.mockResolvedValue({
        data: [], // Empty array means no classroom found
        error: null,
      });

      // WHEN: Student tries to join with non-existent code
      const result = await joinClassroom('4HCDMS', mockStudentId);

      // THEN: Should return user-friendly error
      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain('Classroom not found');
      expect(result.data).toBeNull();
    });

    it('should handle lowercase code input by converting to uppercase', async () => {
      // GIVEN: Classroom exists with code "4HCDMS" (uppercase)
      const mockClassroom = { id: 'classroom-789', name: 'Test Class', language: 'en' };

      mockRpc.mockResolvedValue({
        data: [mockClassroom],
        error: null,
      });

      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });
      const mockInsert = vi.fn().mockResolvedValue({
        error: null,
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'classroom_memberships') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: mockMaybeSingle,
            insert: mockInsert,
          } as any;
        }
        return {} as any;
      });

      // WHEN: Student enters code in lowercase
      const result = await joinClassroom('4hcdms', mockStudentId);

      // THEN: Should convert to uppercase and find the classroom
      expect(result.error).toBeNull();
      expect(mockRpc).toHaveBeenCalledWith('lookup_classroom_by_join_code', {
        p_join_code: '4HCDMS',
      });
    });

    it('should validate code format (6 alphanumeric characters)', async () => {
      // GIVEN: Various invalid code formats
      const invalidCodes = [
        { code: '4HCD', expectedError: '6 characters' }, // Too short
        { code: '4HCDMSS', expectedError: '6 characters' }, // Too long
        { code: '4HCD MS', expectedError: '6 characters' }, // Contains space (after trim)
        { code: '4HCD-S', expectedError: 'letters and numbers only' }, // Contains dash
        { code: '', expectedError: '6 characters' }, // Empty
      ];

      for (const { code, expectedError } of invalidCodes) {
        // WHEN: Student enters invalid code format
        const result = await joinClassroom(code, mockStudentId);

        // THEN: Should return validation error without hitting the database
        expect(result.error).not.toBeNull();
        expect(result.error?.message.toLowerCase()).toContain(expectedError.toLowerCase());

        // RPC should not be called for invalid formats
        expect(mockRpc).not.toHaveBeenCalled();

        vi.clearAllMocks();
      }
    });
  });

  describe('Existing member scenarios', () => {
    it('should handle student already being a member gracefully', async () => {
      // GIVEN: Student is already a member of the classroom
      const mockClassroom = { id: 'classroom-999', name: 'Test Class', language: 'en' };
      const mockExisting = { id: 'membership-123' };

      mockRpc.mockResolvedValue({
        data: [mockClassroom],
        error: null,
      });

      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: mockExisting,
        error: null,
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'classroom_memberships') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: mockMaybeSingle,
          } as any;
        }
        return {} as any;
      });

      // WHEN: Student tries to join again
      const result = await joinClassroom('4HCDMS', mockStudentId);

      // THEN: Should return success without creating duplicate membership
      expect(result.error).toBeNull();
      expect(result.data?.classroom_id).toBe('classroom-999');
    });
  });

  describe('Error handling', () => {
    it('should handle RPC errors gracefully', async () => {
      // GIVEN: RPC call fails
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      });

      // WHEN: Student tries to join
      const result = await joinClassroom('4HCDMS', mockStudentId);

      // THEN: Should return error
      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe('Database connection failed');
    });
  });
});
