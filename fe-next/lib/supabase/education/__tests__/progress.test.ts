/**
 * Tests for progress module — spaced repetition extension
 * TDD: RED phase - tests BEFORE implementation
 */

import { supabase as _supabase } from '@/lib/supabase';

const supabase = _supabase!;

import { updateWordSpacedRepetition, getStudentProgressForLesson } from '../progress';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// Mock logger
jest.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

describe('progress module — spaced repetition', () => {
  const mockStudentId = 'student-1';
  const mockLessonId = 'lesson-1';

  beforeEach(() => {
    jest.clearAllMocks();
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
      const mockSingle = jest.fn().mockResolvedValue({ data: existingProgress, error: null });
      const mockEq2 = jest.fn().mockReturnValue({ maybeSingle: mockSingle });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelectFetch = jest.fn().mockReturnValue({ eq: mockEq1 });

      // Mock: update progress
      const mockUpdateSingle = jest.fn().mockResolvedValue({
        data: { ...existingProgress, words_attempted: { cat: { ...existingProgress.words_attempted.cat, ...srData } } },
        error: null,
      });
      const mockUpdateSelect = jest.fn().mockReturnValue({ single: mockUpdateSingle });
      const mockUpdateEq = jest.fn().mockReturnValue({ select: mockUpdateSelect });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockUpdateEq });

      (supabase.from as jest.Mock)
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
      const mockSingle = jest.fn().mockResolvedValue({ data: null, error: null });
      const mockEq2 = jest.fn().mockReturnValue({ maybeSingle: mockSingle });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });

      (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

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

      const mockSingle = jest.fn().mockResolvedValue({ data: existingProgress, error: null });
      const mockEq2 = jest.fn().mockReturnValue({ maybeSingle: mockSingle });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelectFetch = jest.fn().mockReturnValue({ eq: mockEq1 });

      const mockUpdateSingle = jest.fn().mockResolvedValue({ data: null, error: { message: 'Update failed' } });
      const mockUpdateSelect = jest.fn().mockReturnValue({ single: mockUpdateSingle });
      const mockUpdateEq = jest.fn().mockReturnValue({ select: mockUpdateSelect });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockUpdateEq });

      (supabase.from as jest.Mock)
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

      const mockOrder = jest.fn().mockResolvedValue({ data: mockData, error: null });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });

      (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

      // WHEN
      const result = await getStudentProgressForLesson(mockLessonId);

      // THEN
      expect(result.data).toHaveLength(2);
      expect(result.error).toBeNull();
      expect(supabase.from).toHaveBeenCalledWith('student_lesson_progress');
    });

    it('returns empty array on supabase error', async () => {
      // GIVEN
      const mockOrder = jest.fn().mockResolvedValue({ data: null, error: { message: 'Query failed' } });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });

      (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

      // WHEN
      const result = await getStudentProgressForLesson(mockLessonId);

      // THEN
      expect(result.data).toEqual([]);
      expect(result.error?.message).toBe('Query failed');
    });
  });
});
