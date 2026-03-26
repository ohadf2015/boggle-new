/**
 * useAssignments Tests
 *
 * Tests for the useAssignments hook which manages teacher assignments
 */

import { vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAssignments } from './useAssignments';
import * as assignmentsAPI from '@/lib/supabase/education/assignments';

// Mock the assignments API
vi.mock('@/lib/supabase/education/assignments');

const mockGetClassroomAssignments = assignmentsAPI.getClassroomAssignments as any;
const mockCreateAssignment = assignmentsAPI.createAssignment as any;
const mockDeleteAssignment = assignmentsAPI.deleteAssignment as any;

describe('useAssignments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should return loading state on mount', () => {
      mockGetClassroomAssignments.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useAssignments('classroom-1'));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.assignments).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should not fetch when classroomId is null', () => {
      const { result } = renderHook(() => useAssignments(null));

      expect(mockGetClassroomAssignments).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.assignments).toEqual([]);
    });
  });

  describe('fetching assignments', () => {
    it('should fetch assignments on mount', async () => {
      const mockAssignments = [
        {
          id: 'a1',
          classroom_id: 'classroom-1',
          lesson_id: 'lesson-1',
          teacher_id: 'teacher-1',
          assignment_type: 'practice' as const,
          due_date: '2026-03-01T00:00:00Z',
          title: 'Practice Assignment',
          instructions: null,
          created_at: '2026-02-15T00:00:00Z',
          updated_at: '2026-02-15T00:00:00Z',
          completion_count: 5,
          student_count: 10,
        },
      ];

      mockGetClassroomAssignments.mockResolvedValue({ data: mockAssignments, error: null });

      const { result } = renderHook(() => useAssignments('classroom-1'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.assignments).toEqual(mockAssignments);
      expect(mockGetClassroomAssignments).toHaveBeenCalledWith('classroom-1');
    });

    it('should handle fetch errors', async () => {
      mockGetClassroomAssignments.mockResolvedValue({
        data: [],
        error: { message: 'Failed to fetch assignments' },
      });

      const { result } = renderHook(() => useAssignments('classroom-1'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch assignments');
      expect(result.current.assignments).toEqual([]);
    });
  });

  describe('createAssignment', () => {
    it('should add assignment optimistically', async () => {
      const mockExistingAssignments = [
        {
          id: 'a1',
          classroom_id: 'classroom-1',
          lesson_id: 'lesson-1',
          teacher_id: 'teacher-1',
          assignment_type: 'practice' as const,
          due_date: '2026-03-01T00:00:00Z',
          title: 'Existing Assignment',
          instructions: null,
          created_at: '2026-02-14T00:00:00Z',
          updated_at: '2026-02-14T00:00:00Z',
          completion_count: 3,
          student_count: 10,
        },
      ];

      mockGetClassroomAssignments.mockResolvedValue({ data: mockExistingAssignments, error: null });

      const { result } = renderHook(() => useAssignments('classroom-1'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newAssignment = {
        id: 'a2',
        classroom_id: 'classroom-1',
        lesson_id: 'lesson-2',
        teacher_id: 'teacher-1',
        assignment_type: 'duel' as const,
        due_date: '2026-03-05T00:00:00Z',
        title: 'Duel Challenge',
        instructions: 'Beat your classmates!',
        created_at: '2026-02-15T00:00:00Z',
        updated_at: '2026-02-15T00:00:00Z',
      };

      mockCreateAssignment.mockResolvedValue({ data: newAssignment, error: null });

      let createResult: any;
      await act(async () => {
        createResult = await result.current.createAssignment({
          classroom_id: 'classroom-1',
          lesson_id: 'lesson-2',
          teacher_id: 'teacher-1',
          assignment_type: 'duel',
          due_date: '2026-03-05T00:00:00Z',
          title: 'Duel Challenge',
          instructions: 'Beat your classmates!',
        });
      });

      expect(createResult.success).toBe(true);
      expect(result.current.assignments).toHaveLength(2);
      expect(result.current.assignments[0].id).toBe('a2'); // New one should be first
      expect(mockCreateAssignment).toHaveBeenCalled();
    });

    it('should rollback on create error', async () => {
      mockGetClassroomAssignments.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useAssignments('classroom-1'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockCreateAssignment.mockResolvedValue({
        data: null,
        error: { message: 'Create failed' },
      });

      let createResult: any;
      await act(async () => {
        createResult = await result.current.createAssignment({
          classroom_id: 'classroom-1',
          lesson_id: 'lesson-1',
          teacher_id: 'teacher-1',
          assignment_type: 'practice',
        });
      });

      expect(createResult.success).toBe(false);
      expect(createResult.error).toBe('Create failed');
      expect(result.current.assignments).toEqual([]); // Should rollback
    });
  });

  describe('deleteAssignment', () => {
    it('should remove assignment from list', async () => {
      const mockAssignments = [
        {
          id: 'a1',
          classroom_id: 'classroom-1',
          lesson_id: 'lesson-1',
          teacher_id: 'teacher-1',
          assignment_type: 'practice' as const,
          due_date: '2026-03-01T00:00:00Z',
          title: 'Assignment 1',
          instructions: null,
          created_at: '2026-02-15T00:00:00Z',
          updated_at: '2026-02-15T00:00:00Z',
          completion_count: 5,
          student_count: 10,
        },
        {
          id: 'a2',
          classroom_id: 'classroom-1',
          lesson_id: 'lesson-2',
          teacher_id: 'teacher-1',
          assignment_type: 'duel' as const,
          due_date: null,
          title: 'Assignment 2',
          instructions: null,
          created_at: '2026-02-15T00:00:00Z',
          updated_at: '2026-02-15T00:00:00Z',
          completion_count: 0,
          student_count: 10,
        },
      ];

      mockGetClassroomAssignments.mockResolvedValue({ data: mockAssignments, error: null });

      const { result } = renderHook(() => useAssignments('classroom-1'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockDeleteAssignment.mockResolvedValue({ data: null, error: null });

      await act(async () => {
        await result.current.deleteAssignment('a1');
      });

      expect(result.current.assignments).toHaveLength(1);
      expect(result.current.assignments[0].id).toBe('a2');
      expect(mockDeleteAssignment).toHaveBeenCalledWith('a1');
    });
  });

  describe('assignment status computation', () => {
    it('should compute active status for future due dates', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days from now

      const mockAssignments = [
        {
          id: 'a1',
          classroom_id: 'classroom-1',
          lesson_id: 'lesson-1',
          teacher_id: 'teacher-1',
          assignment_type: 'practice' as const,
          due_date: futureDate,
          title: 'Active Assignment',
          instructions: null,
          created_at: '2026-02-15T00:00:00Z',
          updated_at: '2026-02-15T00:00:00Z',
          completion_count: 3,
          student_count: 10,
        },
      ];

      mockGetClassroomAssignments.mockResolvedValue({ data: mockAssignments, error: null });

      const { result } = renderHook(() => useAssignments('classroom-1'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const status = result.current.getAssignmentStatus(result.current.assignments[0]);
      expect(status).toBe('active');
    });

    it('should compute overdue status for past due dates', async () => {
      const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days ago

      const mockAssignments = [
        {
          id: 'a1',
          classroom_id: 'classroom-1',
          lesson_id: 'lesson-1',
          teacher_id: 'teacher-1',
          assignment_type: 'practice' as const,
          due_date: pastDate,
          title: 'Overdue Assignment',
          instructions: null,
          created_at: '2026-02-08T00:00:00Z',
          updated_at: '2026-02-08T00:00:00Z',
          completion_count: 2,
          student_count: 10,
        },
      ];

      mockGetClassroomAssignments.mockResolvedValue({ data: mockAssignments, error: null });

      const { result } = renderHook(() => useAssignments('classroom-1'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const status = result.current.getAssignmentStatus(result.current.assignments[0]);
      expect(status).toBe('overdue');
    });

    it('should compute completed status when all students completed', async () => {
      const mockAssignments = [
        {
          id: 'a1',
          classroom_id: 'classroom-1',
          lesson_id: 'lesson-1',
          teacher_id: 'teacher-1',
          assignment_type: 'practice' as const,
          due_date: '2026-03-01T00:00:00Z',
          title: 'Completed Assignment',
          instructions: null,
          created_at: '2026-02-15T00:00:00Z',
          updated_at: '2026-02-15T00:00:00Z',
          completion_count: 10,
          student_count: 10,
        },
      ];

      mockGetClassroomAssignments.mockResolvedValue({ data: mockAssignments, error: null });

      const { result } = renderHook(() => useAssignments('classroom-1'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const status = result.current.getAssignmentStatus(result.current.assignments[0]);
      expect(status).toBe('completed');
    });
  });

  describe('refresh', () => {
    it('should refetch assignments', async () => {
      const initialAssignments = [
        {
          id: 'a1',
          classroom_id: 'classroom-1',
          lesson_id: 'lesson-1',
          teacher_id: 'teacher-1',
          assignment_type: 'practice' as const,
          due_date: '2026-03-01T00:00:00Z',
          title: 'Initial',
          instructions: null,
          created_at: '2026-02-15T00:00:00Z',
          updated_at: '2026-02-15T00:00:00Z',
          completion_count: 5,
          student_count: 10,
        },
      ];

      const updatedAssignments = [
        {
          ...initialAssignments[0],
          completion_count: 7, // Updated
        },
      ];

      mockGetClassroomAssignments
        .mockResolvedValueOnce({ data: initialAssignments, error: null })
        .mockResolvedValueOnce({ data: updatedAssignments, error: null });

      const { result } = renderHook(() => useAssignments('classroom-1'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.assignments[0].completion_count).toBe(5);

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.assignments[0].completion_count).toBe(7);
      expect(mockGetClassroomAssignments).toHaveBeenCalledTimes(2);
    });
  });
});
