/**
 * Tests for useLessonEffectivenessMetrics hook
 * TDD: RED phase - tests written BEFORE implementation
 *
 * Covers per-lesson teacher metrics: completion rate, accuracy, hardest/easiest words,
 * sessions to mastery, engagement score, failing students
 */

import { vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useLessonEffectivenessMetrics } from '../useLessonEffectivenessMetrics';
import * as progressModule from '@/lib/supabase/education/progress';
import * as practiceModule from '@/lib/supabase/education/practice';

vi.mock('@/hooks/useMounted', () => ({
  useMounted: () => ({ current: true }),
}));
vi.mock('@/lib/supabase/education/progress');
vi.mock('@/lib/supabase/education/practice');
vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const mockGetStudentProgress = progressModule.getStudentProgressForLesson as any;
const mockGetPracticeSessions = practiceModule.getPracticeSessionsForLesson as any;

function buildProgress(
  overrides: Partial<{
    id: string;
    student_id: string;
    words_attempted: Record<string, { attempts: number; correct: number; lastAttemptAt: string }>;
    words_mastered: string[];
    completed_at: string | null;
    total_practice_sessions: number;
  }> = {}
) {
  return {
    id: 'p1',
    student_id: 'student-1',
    lesson_id: 'lesson-1',
    assignment_id: null,
    words_attempted: {},
    words_mastered: [],
    started_at: '2026-01-01T00:00:00Z',
    completed_at: null,
    total_xp: 100,
    current_level: 1,
    current_streak: 1,
    longest_streak: 3,
    last_practice_date: '2026-02-01',
    total_practice_sessions: 3,
    ...overrides,
  };
}

describe('useLessonEffectivenessMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Basic state
  // ============================================
  describe('when lessonId is undefined', () => {
    it('returns null metrics and does not fetch', () => {
      // GIVEN: no lessonId
      // WHEN
      const { result } = renderHook(() => useLessonEffectivenessMetrics(undefined));

      // THEN
      expect(result.current.metrics).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockGetStudentProgress).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // Completion rate
  // ============================================
  describe('completion rate', () => {
    it('calculates completion rate correctly (2 of 4 completed = 50%)', async () => {
      // GIVEN: 4 students, 2 completed
      mockGetStudentProgress.mockResolvedValue({
        data: [
          buildProgress({ id: 'p1', student_id: 's1', completed_at: '2026-02-01T00:00:00Z' }),
          buildProgress({ id: 'p2', student_id: 's2', completed_at: '2026-02-02T00:00:00Z' }),
          buildProgress({ id: 'p3', student_id: 's3', completed_at: null }),
          buildProgress({ id: 'p4', student_id: 's4', completed_at: null }),
        ],
        error: null,
      });
      mockGetPracticeSessions.mockResolvedValue({ data: [], error: null });

      // WHEN
      const { result } = renderHook(() => useLessonEffectivenessMetrics('lesson-1'));

      // THEN
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.metrics?.completionRate).toBe(50);
    });
  });

  // ============================================
  // Hardest / easiest words
  // ============================================
  describe('word difficulty', () => {
    it('identifies hardest words (lowest accuracy)', async () => {
      // GIVEN: words with varying accuracy
      mockGetStudentProgress.mockResolvedValue({
        data: [
          buildProgress({
            words_attempted: {
              cat:  { attempts: 10, correct: 9, lastAttemptAt: '2026-02-01T00:00:00Z' }, // 90%
              dog:  { attempts: 10, correct: 2, lastAttemptAt: '2026-02-01T00:00:00Z' }, // 20%
              fish: { attempts: 10, correct: 1, lastAttemptAt: '2026-02-01T00:00:00Z' }, // 10%
              bird: { attempts: 10, correct: 8, lastAttemptAt: '2026-02-01T00:00:00Z' }, // 80%
            },
          }),
        ],
        error: null,
      });
      mockGetPracticeSessions.mockResolvedValue({ data: [], error: null });

      // WHEN
      const { result } = renderHook(() => useLessonEffectivenessMetrics('lesson-1'));

      // THEN
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      // fish (10%) and dog (20%) are the hardest
      expect(result.current.metrics?.hardestWords[0]).toBe('fish');
      expect(result.current.metrics?.hardestWords[1]).toBe('dog');
    });

    it('identifies easiest words (highest accuracy)', async () => {
      // GIVEN
      mockGetStudentProgress.mockResolvedValue({
        data: [
          buildProgress({
            words_attempted: {
              cat:  { attempts: 10, correct: 9, lastAttemptAt: '2026-02-01T00:00:00Z' }, // 90%
              dog:  { attempts: 10, correct: 2, lastAttemptAt: '2026-02-01T00:00:00Z' }, // 20%
              fish: { attempts: 10, correct: 1, lastAttemptAt: '2026-02-01T00:00:00Z' }, // 10%
              bird: { attempts: 10, correct: 8, lastAttemptAt: '2026-02-01T00:00:00Z' }, // 80%
            },
          }),
        ],
        error: null,
      });
      mockGetPracticeSessions.mockResolvedValue({ data: [], error: null });

      // WHEN
      const { result } = renderHook(() => useLessonEffectivenessMetrics('lesson-1'));

      // THEN
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.metrics?.easiestWords[0]).toBe('cat');
      expect(result.current.metrics?.easiestWords[1]).toBe('bird');
    });
  });

  // ============================================
  // Engagement score
  // ============================================
  describe('engagement score', () => {
    it('calculates engagement as composite 0-1 value', async () => {
      // GIVEN: all 4 students completed, high accuracy sessions
      mockGetStudentProgress.mockResolvedValue({
        data: [
          buildProgress({ id: 'p1', student_id: 's1', completed_at: '2026-02-01T00:00:00Z', total_practice_sessions: 5 }),
          buildProgress({ id: 'p2', student_id: 's2', completed_at: '2026-02-02T00:00:00Z', total_practice_sessions: 4 }),
        ],
        error: null,
      });
      mockGetPracticeSessions.mockResolvedValue({
        data: [
          { id: 'sess-1', student_id: 's1', lesson_id: 'lesson-1', classroom_id: null,
            mode: 'matching' as const, score: 100, accuracy: 90, words_attempted: 10,
            words_correct: 9, duration_seconds: 120, results: null, xp_awarded: 50,
            created_at: '2026-02-01T00:00:00Z', completed_at: '2026-02-01T00:00:00Z' },
        ],
        error: null,
      });

      // WHEN
      const { result } = renderHook(() => useLessonEffectivenessMetrics('lesson-1'));

      // THEN
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.metrics?.engagementScore).toBeGreaterThan(0);
      expect(result.current.metrics?.engagementScore).toBeLessThanOrEqual(1);
    });
  });

  // ============================================
  // Students failing
  // ============================================
  describe('studentsFailing', () => {
    it('counts students with < 50% overall word accuracy', async () => {
      // GIVEN: 3 students — 1 failing (<50%), 2 passing
      mockGetStudentProgress.mockResolvedValue({
        data: [
          buildProgress({
            id: 'p1', student_id: 's1',
            words_attempted: {
              cat: { attempts: 10, correct: 2, lastAttemptAt: '2026-02-01T00:00:00Z' }, // 20%
              dog: { attempts: 10, correct: 3, lastAttemptAt: '2026-02-01T00:00:00Z' }, // 30%
            },
          }),
          buildProgress({
            id: 'p2', student_id: 's2',
            words_attempted: {
              cat: { attempts: 10, correct: 8, lastAttemptAt: '2026-02-01T00:00:00Z' }, // 80%
            },
          }),
          buildProgress({
            id: 'p3', student_id: 's3',
            words_attempted: {
              cat: { attempts: 10, correct: 7, lastAttemptAt: '2026-02-01T00:00:00Z' }, // 70%
            },
          }),
        ],
        error: null,
      });
      mockGetPracticeSessions.mockResolvedValue({ data: [], error: null });

      // WHEN
      const { result } = renderHook(() => useLessonEffectivenessMetrics('lesson-1'));

      // THEN
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.metrics?.studentsFailing).toBe(1);
    });
  });

  // ============================================
  // Error handling
  // ============================================
  describe('error handling', () => {
    it('returns error when progress fetch fails', async () => {
      // GIVEN
      mockGetStudentProgress.mockResolvedValue({
        data: [],
        error: { message: 'DB error' },
      });
      mockGetPracticeSessions.mockResolvedValue({ data: [], error: null });

      // WHEN
      const { result } = renderHook(() => useLessonEffectivenessMetrics('lesson-1'));

      // THEN
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.error).toBe('DB error');
      expect(result.current.metrics).toBeNull();
    });
  });
});
