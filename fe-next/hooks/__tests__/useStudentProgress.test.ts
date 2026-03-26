/**
 * Tests for useStudentProgress hook
 *
 * Tests enhanced hook that combines assigned and started lessons
 */

import { vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useStudentProgress } from '../useStudentProgress';
import * as teacherLib from '@/lib/supabase/education';
import type { LessonAssignment, StudentLessonProgress } from '@/lib/supabase/education';

// Mock dependencies
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: 'student-1' }
  })
}));

vi.mock('@/hooks/useMounted', () => ({
  useMounted: () => ({ current: true })
}));

vi.mock('@/lib/supabase/education');
vi.mock('@/utils/logger', () => ({
  default: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}));

describe('useStudentProgress - Enhanced with Assignments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Combining assigned and started lessons', () => {
    it('should fetch both assigned and progress data', async () => {
      // GIVEN: Mock API responses
      const mockAssignments: LessonAssignment[] = [
        {
          id: 'assignment-1',
          lesson_id: 'lesson-1',
          classroom_id: 'classroom-1',
          due_date: null,
          created_at: '2025-01-20T10:00:00Z',
          vocabulary_lessons: {
            id: 'lesson-1',
            teacher_id: 'teacher-1',
            classroom_id: 'classroom-1',
            name: 'Spanish Verbs',
            description: null,
            language: 'en',
            words: [
              { word: 'hablar', definition: 'to speak', canIntegrate: true }
            ],
            is_public: false,
            source_game_code: null,
            created_at: '2025-01-15T10:00:00Z',
            updated_at: '2025-01-15T10:00:00Z'
          }
        }
      ];

      const mockProgress: StudentLessonProgress[] = [
        {
          id: 'progress-1',
          student_id: 'student-1',
          lesson_id: 'lesson-2',
          assignment_id: 'assignment-2',
          words_attempted: { word1: { attempts: 5, correct: 3, lastAttemptAt: '2025-01-23T10:00:00Z' } },
          words_mastered: ['word1'],
          started_at: '2025-01-22T10:00:00Z',
          completed_at: null,
          total_xp: 0,
          current_level: 1,
          current_streak: 0,
          longest_streak: 0,
          last_practice_date: null,
          total_practice_sessions: 0
        }
      ];

      vi.spyOn(teacherLib, 'getStudentAssignedLessons').mockResolvedValue({
        data: mockAssignments,
        error: null
      });

      vi.spyOn(teacherLib, 'getStudentProgress').mockResolvedValue({
        data: mockProgress,
        error: null
      });

      // WHEN: Hook is rendered
      const { result } = renderHook(() => useStudentProgress());

      // THEN: Should call both APIs
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(teacherLib.getStudentAssignedLessons).toHaveBeenCalledWith('student-1');
      expect(teacherLib.getStudentProgress).toHaveBeenCalledWith('student-1', undefined);
    });

    it('should mark assigned but not started lessons with status "assigned"', async () => {
      // GIVEN: Assigned lesson with no progress
      const mockAssignments: LessonAssignment[] = [
        {
          id: 'assignment-1',
          lesson_id: 'lesson-1',
          classroom_id: 'classroom-1',
          due_date: null,
          created_at: '2025-01-20T10:00:00Z',
          vocabulary_lessons: {
            id: 'lesson-1',
            teacher_id: 'teacher-1',
            classroom_id: 'classroom-1',
            name: 'Spanish Verbs',
            description: null,
            language: 'en',
            words: [{ word: 'hablar', canIntegrate: true }],
            is_public: false,
            source_game_code: null,
            created_at: '2025-01-15T10:00:00Z',
            updated_at: '2025-01-15T10:00:00Z'
          }
        }
      ];

      vi.spyOn(teacherLib, 'getStudentAssignedLessons').mockResolvedValue({
        data: mockAssignments,
        error: null
      });

      vi.spyOn(teacherLib, 'getStudentProgress').mockResolvedValue({
        data: [],
        error: null
      });

      // WHEN: Hook loads
      const { result } = renderHook(() => useStudentProgress());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // THEN: Lesson should have status "assigned"
      expect(result.current.lessons).toHaveLength(1);
      expect(result.current.lessons[0].status).toBe('assigned');
      expect(result.current.lessons[0].lesson?.name).toBe('Spanish Verbs');
    });

    it('should mark started lessons with status "started"', async () => {
      // GIVEN: Progress for a lesson
      const mockProgress: StudentLessonProgress[] = [
        {
          id: 'progress-1',
          student_id: 'student-1',
          lesson_id: 'lesson-1',
          assignment_id: 'assignment-1',
          words_attempted: { word1: { attempts: 2, correct: 1, lastAttemptAt: '2025-01-23T10:00:00Z' } },
          words_mastered: [],
          started_at: '2025-01-22T10:00:00Z',
          completed_at: null,
          total_xp: 0,
          current_level: 1,
          current_streak: 0,
          longest_streak: 0,
          last_practice_date: null,
          total_practice_sessions: 0
        }
      ];

      vi.spyOn(teacherLib, 'getStudentAssignedLessons').mockResolvedValue({
        data: [],
        error: null
      });

      vi.spyOn(teacherLib, 'getStudentProgress').mockResolvedValue({
        data: mockProgress,
        error: null
      });

      // WHEN: Hook loads
      const { result } = renderHook(() => useStudentProgress());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // THEN: Lesson should have status "started"
      expect(result.current.lessons).toHaveLength(1);
      expect(result.current.lessons[0].status).toBe('started');
    });

    it('should mark completed lessons with status "completed"', async () => {
      // GIVEN: Completed progress
      const mockProgress: StudentLessonProgress[] = [
        {
          id: 'progress-1',
          student_id: 'student-1',
          lesson_id: 'lesson-1',
          assignment_id: 'assignment-1',
          words_attempted: { word1: { attempts: 5, correct: 3, lastAttemptAt: '2025-01-23T10:00:00Z' } },
          words_mastered: ['word1'],
          started_at: '2025-01-22T10:00:00Z',
          completed_at: '2025-01-23T10:00:00Z',
          total_xp: 0,
          current_level: 1,
          current_streak: 0,
          longest_streak: 0,
          last_practice_date: null,
          total_practice_sessions: 0
        }
      ];

      vi.spyOn(teacherLib, 'getStudentAssignedLessons').mockResolvedValue({
        data: [],
        error: null
      });

      vi.spyOn(teacherLib, 'getStudentProgress').mockResolvedValue({
        data: mockProgress,
        error: null
      });

      // WHEN: Hook loads
      const { result } = renderHook(() => useStudentProgress());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // THEN: Lesson should have status "completed"
      expect(result.current.lessons).toHaveLength(1);
      expect(result.current.lessons[0].status).toBe('completed');
    });

    it('should sort lessons: assigned first, then started, then completed', async () => {
      // GIVEN: Mix of assigned, started, and completed
      const mockAssignments: LessonAssignment[] = [
        {
          id: 'assignment-1',
          lesson_id: 'lesson-assigned',
          classroom_id: 'classroom-1',
          due_date: null,
          created_at: '2025-01-20T10:00:00Z',
          vocabulary_lessons: {
            id: 'lesson-assigned',
            teacher_id: 'teacher-1',
            classroom_id: 'classroom-1',
            name: 'Assigned Lesson',
            description: null,
            language: 'en',
            words: [],
            is_public: false,
            source_game_code: null,
            created_at: '2025-01-15T10:00:00Z',
            updated_at: '2025-01-15T10:00:00Z'
          }
        }
      ];

      const mockProgress: StudentLessonProgress[] = [
        {
          id: 'progress-started',
          student_id: 'student-1',
          lesson_id: 'lesson-started',
          assignment_id: null,
          words_attempted: { word1: { attempts: 2, correct: 1, lastAttemptAt: '2025-01-23T10:00:00Z' } },
          words_mastered: [],
          started_at: '2025-01-22T10:00:00Z',
          completed_at: null,
          total_xp: 0,
          current_level: 1,
          current_streak: 0,
          longest_streak: 0,
          last_practice_date: null,
          total_practice_sessions: 0
        },
        {
          id: 'progress-completed',
          student_id: 'student-1',
          lesson_id: 'lesson-completed',
          assignment_id: null,
          words_attempted: { word1: { attempts: 5, correct: 3, lastAttemptAt: '2025-01-23T10:00:00Z' } },
          words_mastered: ['word1'],
          started_at: '2025-01-21T10:00:00Z',
          completed_at: '2025-01-23T10:00:00Z',
          total_xp: 0,
          current_level: 1,
          current_streak: 0,
          longest_streak: 0,
          last_practice_date: null,
          total_practice_sessions: 0
        }
      ];

      vi.spyOn(teacherLib, 'getStudentAssignedLessons').mockResolvedValue({
        data: mockAssignments,
        error: null
      });

      vi.spyOn(teacherLib, 'getStudentProgress').mockResolvedValue({
        data: mockProgress,
        error: null
      });

      // WHEN: Hook loads
      const { result } = renderHook(() => useStudentProgress());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // THEN: Order should be: assigned, started, completed
      expect(result.current.lessons).toHaveLength(3);
      expect(result.current.lessons[0].status).toBe('assigned');
      expect(result.current.lessons[1].status).toBe('started');
      expect(result.current.lessons[2].status).toBe('completed');
    });

    it('should not duplicate lessons that are both assigned and started', async () => {
      // GIVEN: Same lesson appears in both assignments and progress
      const mockAssignments: LessonAssignment[] = [
        {
          id: 'assignment-1',
          lesson_id: 'lesson-1',
          classroom_id: 'classroom-1',
          due_date: null,
          created_at: '2025-01-20T10:00:00Z',
          vocabulary_lessons: {
            id: 'lesson-1',
            teacher_id: 'teacher-1',
            classroom_id: 'classroom-1',
            name: 'Spanish Verbs',
            description: null,
            language: 'en',
            words: [],
            is_public: false,
            source_game_code: null,
            created_at: '2025-01-15T10:00:00Z',
            updated_at: '2025-01-15T10:00:00Z'
          }
        }
      ];

      const mockProgress: StudentLessonProgress[] = [
        {
          id: 'progress-1',
          student_id: 'student-1',
          lesson_id: 'lesson-1',
          assignment_id: 'assignment-1',
          words_attempted: { word1: { attempts: 2, correct: 1, lastAttemptAt: '2025-01-23T10:00:00Z' } },
          words_mastered: [],
          started_at: '2025-01-22T10:00:00Z',
          completed_at: null,
          total_xp: 0,
          current_level: 1,
          current_streak: 0,
          longest_streak: 0,
          last_practice_date: null,
          total_practice_sessions: 0
        }
      ];

      vi.spyOn(teacherLib, 'getStudentAssignedLessons').mockResolvedValue({
        data: mockAssignments,
        error: null
      });

      vi.spyOn(teacherLib, 'getStudentProgress').mockResolvedValue({
        data: mockProgress,
        error: null
      });

      // WHEN: Hook loads
      const { result } = renderHook(() => useStudentProgress());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // THEN: Should only have one entry with status "started"
      expect(result.current.lessons).toHaveLength(1);
      expect(result.current.lessons[0].status).toBe('started');
      expect(result.current.lessons[0].lesson?.name).toBe('Spanish Verbs');
    });
  });
});
