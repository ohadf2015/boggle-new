/**
 * Tests for useStudentClassroom hook
 *
 * Bug fix: Students don't see their classroom after joining because
 * dashboard relies on lesson assignments to get classroomId.
 *
 * Solution: Use classroom membership directly via useStudentClassroom hook.
 */

import { vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useStudentClassroom } from '../useStudentClassroom';

// Mock the auth context
const mockUser = { id: 'student-123' };
const mockUseAuth = vi.fn<
  {
    user: { id: string } | null;
    isAuthenticated: boolean;
    loading: boolean;
  },
  []
>(() => ({
  user: mockUser,
  isAuthenticated: true,
  loading: false,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock the Supabase API
const { mockGetStudentClassroom } = vi.hoisted(() => {
  const mockGetStudentClassroom = vi.fn();
  return { mockGetStudentClassroom };
});
vi.mock('@/lib/supabase/education', () => ({
  getStudentClassroom: (...args: any[]) => mockGetStudentClassroom(...args),
}));

describe('useStudentClassroom', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      loading: false,
    });
  });

  describe('when student is a member of a classroom', () => {
    it('should return classroom data when fetch succeeds', async () => {
      // GIVEN: Student is a member of "Lexi clash" classroom
      const mockClassroom = {
        id: 'classroom-456',
        name: 'Lexi clash',
        join_code: 'ABC123',
        language: 'en',
        teacher_id: 'teacher-789',
      };

      mockGetStudentClassroom.mockResolvedValue({
        data: mockClassroom,
        error: null,
      });

      // WHEN: Hook is rendered
      const { result } = renderHook(() => useStudentClassroom());

      // THEN: Initially loading
      expect(result.current.isLoading).toBe(true);

      // Wait for fetch to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // THEN: Should have classroom data
      expect(result.current.classroom).toEqual(mockClassroom);
      expect(result.current.classroomId).toBe('classroom-456');
      expect(result.current.error).toBeNull();

      // Verify API was called with correct student ID
      expect(mockGetStudentClassroom).toHaveBeenCalledWith('student-123');
    });
  });

  describe('when student is not a member of any classroom', () => {
    it('should return null classroom when student has no membership', async () => {
      // GIVEN: Student has no classroom membership
      mockGetStudentClassroom.mockResolvedValue({
        data: null,
        error: null,
      });

      // WHEN: Hook is rendered
      const { result } = renderHook(() => useStudentClassroom());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // THEN: Should have null classroom
      expect(result.current.classroom).toBeNull();
      expect(result.current.classroomId).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('when user is not authenticated', () => {
    it('should not fetch and return null classroom', async () => {
      // GIVEN: User is not authenticated
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        loading: false,
      });

      // WHEN: Hook is rendered
      const { result } = renderHook(() => useStudentClassroom());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // THEN: Should not have fetched
      expect(mockGetStudentClassroom).not.toHaveBeenCalled();
      expect(result.current.classroom).toBeNull();
      expect(result.current.classroomId).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should return error when fetch fails', async () => {
      // GIVEN: API returns error
      mockGetStudentClassroom.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      });

      // WHEN: Hook is rendered
      const { result } = renderHook(() => useStudentClassroom());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // THEN: Should have error
      expect(result.current.error).toBe('Database connection failed');
      expect(result.current.classroom).toBeNull();
    });
  });

  describe('refresh functionality', () => {
    it('should refetch data when refresh is called', async () => {
      // GIVEN: Initial fetch returns no classroom
      mockGetStudentClassroom.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const { result } = renderHook(() => useStudentClassroom());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.classroom).toBeNull();

      // GIVEN: Second fetch returns classroom (student joined)
      const mockClassroom = {
        id: 'classroom-789',
        name: 'New Class',
        join_code: 'XYZ789',
        language: 'en',
        teacher_id: 'teacher-456',
      };

      mockGetStudentClassroom.mockResolvedValueOnce({
        data: mockClassroom,
        error: null,
      });

      // WHEN: Refresh is called
      await act(async () => {
        await result.current.refresh();
      });

      // THEN: Should have new classroom data
      expect(result.current.classroom).toEqual(mockClassroom);
      expect(mockGetStudentClassroom).toHaveBeenCalledTimes(2);
    });
  });
});
