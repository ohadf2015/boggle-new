import { vi, type Mock, } from 'vitest';
/**
 * Tests for progress module — spaced repetition extension
 * TDD: RED phase - tests BEFORE implementation
 */

import { supabase as _supabase } from '@/lib/supabase';

const supabase = _supabase!;

import { updateWordSpacedRepetition, getStudentProgressForLesson } from '../progress';

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

describe('progress module — spaced repetition', () => {
  const mockStudentId = 'student-1';
  const mockLessonId = 'lesson-1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // updateWordSpacedRepetition
  // ============================================
  describe('updateWordSpacedRepetition', () => {
    it('merges SR fields into existing word data and saves', async () => {
      // GIVEN: existing progress record with word attempt data
      const existingProgress = {
        id: 'progress-1',
        student_id: mockStudentId,
        lesson_id: mockLessonId,
        words_attempted: {
          cat: { attempts: 5, correct: 3, lastAttemptAt: '2026-02-01T00:00:00Z' },
        },
        words_mastered: ['cat'],
      };

      const srData = {
        intervalDays: 4,
        easinessFactor: 2.5,
        repetitions: 3,
        nextReviewDate: '2026-03-01T00:00:00Z',
      };

      // Mock: fetch existing progress
      const mockSingle = vi.fn().mockResolvedValue({ data: existingProgress, error: null });
      const mockEq2 = vi.fn().mockReturnValue({ maybeSingle: mockSingle });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelectFetch = vi.fn().mockReturnValue({ eq: mockEq1 });

      // Mock: update progress
      const mockUpdateSingle = vi.fn().mockResolvedValue({
        data: { ...existingProgress, words_attempted: { cat: { ...existingProgress.words_attempted.cat, ...srData } } },
        error: null,
      });
      const mockUpdateSelect = vi.fn().mockReturnValue({ single: mockUpdateSingle });
      const mockUpdateEq = vi.fn().mockReturnValue({ select: mockUpdateSelect });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });

      (supabase.from as Mock)
        .mockReturnValueOnce({ select: mockSelectFetch })
        .mockReturnValueOnce({ update: mockUpdate });

      // WHEN
      const result = await updateWordSpacedRepetition(mockStudentId, mockLessonId, 'cat', srData);

      // THEN
      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      // Verify update was called with merged SR data
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          words_attempted: expect.objectContaining({
            cat: expect.objectContaining({
              attempts: 5,
              correct: 3,
              intervalDays: 4,
              easinessFactor: 2.5,
              repetitions: 3,
              nextReviewDate: '2026-03-01T00:00:00Z',
            }),
          }),
        })
      );
    });

    it('returns error when student progress not found', async () => {
      // GIVEN: no existing progress
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockEq2 = vi.fn().mockReturnValue({ maybeSingle: mockSingle });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });

      (supabase.from as Mock).mockReturnValue({ select: mockSelect });

      // WHEN
      const result = await updateWordSpacedRepetition(mockStudentId, mockLessonId, 'cat', {
        intervalDays: 1,
        easinessFactor: 2.5,
        repetitions: 1,
        nextReviewDate: '2026-02-26T00:00:00Z',
      });

      // THEN
      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('not found');
    });

    it('returns error when supabase update fails', async () => {
      // GIVEN: existing progress, but update fails
      const existingProgress = {
        id: 'progress-1',
        student_id: mockStudentId,
        lesson_id: mockLessonId,
        words_attempted: {
          cat: { attempts: 5, correct: 3, lastAttemptAt: '2026-02-01T00:00:00Z' },
        },
        words_mastered: [],
      };

      const mockSingle = vi.fn().mockResolvedValue({ data: existingProgress, error: null });
      const mockEq2 = vi.fn().mockReturnValue({ maybeSingle: mockSingle });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelectFetch = vi.fn().mockReturnValue({ eq: mockEq1 });

      const mockUpdateSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'Update failed' } });
      const mockUpdateSelect = vi.fn().mockReturnValue({ single: mockUpdateSingle });
      const mockUpdateEq = vi.fn().mockReturnValue({ select: mockUpdateSelect });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });

      (supabase.from as Mock)
        .mockReturnValueOnce({ select: mockSelectFetch })
        .mockReturnValueOnce({ update: mockUpdate });

      // WHEN
      const result = await updateWordSpacedRepetition(mockStudentId, mockLessonId, 'cat', {
        intervalDays: 1,
        easinessFactor: 2.5,
        repetitions: 1,
        nextReviewDate: '2026-02-26T00:00:00Z',
      });

      // THEN
      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Update failed');
    });
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
