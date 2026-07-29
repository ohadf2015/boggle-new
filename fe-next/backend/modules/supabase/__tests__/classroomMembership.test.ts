/**
 * Tests for classroom membership authorization helpers.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the supabase client module BEFORE importing the subject under test
const mockMaybeSingle = vi.fn();
const mockEq = vi.fn(() => ({ eq: mockEq, maybeSingle: mockMaybeSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock('../client', () => ({
  getSupabase: vi.fn(() => ({ from: mockFrom })),
}));

import {
  isClassroomTeacher,
  isClassroomStudent,
  getClassroomRole,
} from '../classroomMembership';
import { getSupabase } from '../client';

describe('classroomMembership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-install default chain after clearAllMocks wipes implementations
    mockEq.mockImplementation(() => ({ eq: mockEq, maybeSingle: mockMaybeSingle }));
    mockSelect.mockImplementation(() => ({ eq: mockEq }));
    mockFrom.mockImplementation(() => ({ select: mockSelect }));
    (getSupabase as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });
  });

  describe('isClassroomTeacher', () => {
    it('returns true when classrooms row exists for (id, teacher_id)', async () => {
      mockMaybeSingle.mockResolvedValueOnce({ data: { id: 'class-1' }, error: null });

      const result = await isClassroomTeacher('teacher-1', 'class-1');

      expect(result).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith('classrooms');
    });

    it('returns false when no matching classroom', async () => {
      mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
      expect(await isClassroomTeacher('teacher-1', 'class-1')).toBe(false);
    });

    it('returns false on supabase error', async () => {
      mockMaybeSingle.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
      expect(await isClassroomTeacher('teacher-1', 'class-1')).toBe(false);
    });

    it('returns false when supabase client unavailable', async () => {
      (getSupabase as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(null);
      expect(await isClassroomTeacher('teacher-1', 'class-1')).toBe(false);
    });
  });

  describe('isClassroomStudent', () => {
    it('returns true when classroom_memberships row exists', async () => {
      mockMaybeSingle.mockResolvedValueOnce({ data: { id: 'm-1' }, error: null });
      expect(await isClassroomStudent('stu-1', 'class-1')).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith('classroom_memberships');
    });

    it('returns false when not enrolled', async () => {
      mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
      expect(await isClassroomStudent('stu-1', 'class-1')).toBe(false);
    });
  });

  describe('getClassroomRole', () => {
    it('returns "teacher" when user is the teacher', async () => {
      mockMaybeSingle
        .mockResolvedValueOnce({ data: { id: 'class-1' }, error: null }); // teacher hit
      expect(await getClassroomRole('user-1', 'class-1')).toBe('teacher');
    });

    it('returns "student" when user is enrolled but not teacher', async () => {
      mockMaybeSingle
        .mockResolvedValueOnce({ data: null, error: null }) // teacher miss
        .mockResolvedValueOnce({ data: { id: 'm-1' }, error: null }); // student hit
      expect(await getClassroomRole('user-1', 'class-1')).toBe('student');
    });

    it('returns null when user has no relationship', async () => {
      mockMaybeSingle
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null });
      expect(await getClassroomRole('user-1', 'class-1')).toBe(null);
    });
  });
});
