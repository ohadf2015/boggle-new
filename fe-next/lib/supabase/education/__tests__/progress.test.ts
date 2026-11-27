import { vi, type Mock, } from 'vitest';
/**
 * Tests for progress module — spaced repetition extension
 * TDD: RED phase - tests BEFORE implementation
 */

import { supabase as _supabase } from '@/lib/supabase';

const supabase = _supabase!;

import { getStudentProgressForLesson } from '../progress';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

describe('progress module', () => {
  const mockStudentId = 'student-1';
  const mockLessonId = 'lesson-1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // getStudentProgressForLesson
  // ============================================
  describe('getStudentProgressForLesson', () => {
    it('returns all progress records for a lesson', async () => {
      // GIVEN: multiple students with progress for lesson-1
      const mockData = [
        { id: 'p1', student_id: 's1', lesson_id: mockLessonId, words_attempted: {}, words_mastered: [] },
        { id: 'p2', student_id: 's2', lesson_id: mockLessonId, words_attempted: {}, words_mastered: [] },
      ];

      const mockOrder = vi.fn().mockResolvedValue({ data: mockData, error: null });
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      (supabase.from as Mock).mockReturnValue({ select: mockSelect });

      // WHEN
      const result = await getStudentProgressForLesson(mockLessonId);

      // THEN
      expect(result.data).toHaveLength(2);
      expect(result.error).toBeNull();
      expect(supabase.from).toHaveBeenCalledWith('student_lesson_progress');
    });

    it('returns empty array on supabase error', async () => {
      // GIVEN
      const mockOrder = vi.fn().mockResolvedValue({ data: null, error: { message: 'Query failed' } });
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      (supabase.from as Mock).mockReturnValue({ select: mockSelect });

      // WHEN
      const result = await getStudentProgressForLesson(mockLessonId);

      // THEN
      expect(result.data).toEqual([]);
      expect(result.error?.message).toBe('Query failed');
    });
  });
});
