import { vi, type MockedFunction, type MockedClass, type Mock } from 'vitest';
/**
 * Test suite for getStudentClassroom functionality
 *
 * Bug fix: Students don't see their classroom after joining because the
 * dashboard relies on lesson assignments to get classroomId. When no lessons
 * are assigned, classroomId is null and student sees "join classroom" prompt.
 *
 * Solution: Add a function to directly fetch student's classroom from membership.
 */

import { getStudentClassroom } from '../education';
import { supabase } from '@/lib/supabase';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

const mockFrom = (supabase?.from || vi.fn()) as MockedFunction<any>;

describe('getStudentClassroom', () => {
  const mockStudentId = 'student-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when student is a member of a classroom', () => {
    it('should return classroom info for student with membership', async () => {
      // GIVEN: Student is a member of classroom "Lexi clash"
      const mockMembership = {
        id: 'membership-1',
        classroom_id: 'classroom-456',
        joined_at: '2025-01-28T10:00:00Z',
        classrooms: {
          id: 'classroom-456',
          name: 'Lexi clash',
          join_code: 'ABC123',
          language: 'en',
          teacher_id: 'teacher-789',
        },
      };

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockReturnThis();
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: mockMembership,
        error: null,
      });

      mockFrom.mockImplementation(() => ({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
        limit: mockLimit,
        maybeSingle: mockMaybeSingle,
      }));

      // WHEN: Fetching student's classroom
      const result = await getStudentClassroom(mockStudentId);

      // THEN: Should return classroom info
      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.id).toBe('classroom-456');
      expect(result.data?.name).toBe('Lexi clash');
      expect(result.data?.join_code).toBe('ABC123');

      // Verify correct query
      expect(mockFrom).toHaveBeenCalledWith('classroom_memberships');
      expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('classrooms'));
      expect(mockEq).toHaveBeenCalledWith('student_id', mockStudentId);
    });
  });

  describe('when student is not a member of any classroom', () => {
    it('should return null data when student has no membership', async () => {
      // GIVEN: Student has no classroom membership
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockReturnThis();
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      mockFrom.mockImplementation(() => ({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
        limit: mockLimit,
        maybeSingle: mockMaybeSingle,
      }));

      // WHEN: Fetching student's classroom
      const result = await getStudentClassroom(mockStudentId);

      // THEN: Should return null data without error
      expect(result.error).toBeNull();
      expect(result.data).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should return error when database query fails', async () => {
      // GIVEN: Database error occurs
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockReturnThis();
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      });

      mockFrom.mockImplementation(() => ({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
        limit: mockLimit,
        maybeSingle: mockMaybeSingle,
      }));

      // WHEN: Fetching student's classroom
      const result = await getStudentClassroom(mockStudentId);

      // THEN: Should return error
      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe('Database connection failed');
      expect(result.data).toBeNull();
    });

    it('should return error when supabase is not configured', async () => {
      // GIVEN: Supabase is not configured
      // We need to temporarily mock supabase as null
      vi.resetModules();
      vi.doMock('@/lib/supabase', () => ({
        supabase: null,
      }));

      // Re-import to get the mocked version
      const { getStudentClassroom: getStudentClassroomUnconfig } = await import('../education');

      // WHEN: Fetching student's classroom
      const result = await getStudentClassroomUnconfig(mockStudentId);

      // THEN: Should return error
      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain('not configured');
      expect(result.data).toBeNull();
    });
  });
});
