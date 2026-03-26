/**
 * Tests for useStudentInsights hook
 * TDD: RED phase - tests written BEFORE implementation
 *
 * Covers education analytics: weak/strong words, practice trends, XP, mode performance
 */

import { vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useStudentInsights } from '../useStudentInsights';
import * as practiceModule from '@/lib/supabase/education/practice';
import * as educationModule from '@/lib/supabase/education';

let mockAuthReturn: { isAuthenticated: boolean; user: { id: string } | null } = {
  isAuthenticated: true,
  user: { id: 'student-1' },
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuthReturn,
}));
vi.mock('@/hooks/useMounted', () => ({
  useMounted: () => ({ current: true }),
}));
vi.mock('@/lib/supabase/education/practice');
vi.mock('@/lib/supabase/education');
vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));
const mockGetPracticeSessions = practiceModule.getPracticeSessions as any;
const mockGetStudentProgress = educationModule.getStudentProgress as any;

// Helper: build mock practice sessions
function buildSession(overrides: Partial<practiceModule.PracticeSessionRow> = {}): practiceModule.PracticeSessionRow {
  return {
    id: 'session-1',
    student_id: 'student-1',
    lesson_id: 'lesson-1',
    classroom_id: null,
    mode: 'matching',
    score: 100,
    accuracy: 80,
    words_attempted: 10,
    words_correct: 8,
    duration_seconds: 120,
    results: null,
    xp_awarded: 50,
    created_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('useStudentInsights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthReturn = { isAuthenticated: true, user: { id: 'student-1' } };
  });

  // ============================================
  // Authentication
  // ============================================
  describe('authentication', () => {
    it('returns null insights when not authenticated', async () => {
      // GIVEN: not authenticated
      mockAuthReturn = { isAuthenticated: false, user: null };

      // WHEN
      const { result } = renderHook(() => useStudentInsights());

      // THEN
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.insights).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  // ============================================
  // Weak and strong words
  // ============================================
  describe('weak and strong words', () => {
    it('calculates weak words (accuracy < 40%)', async () => {
      // GIVEN: progress with some low-accuracy words
      mockGetPracticeSessions.mockResolvedValue({ data: [], error: null });
      mockGetStudentProgress.mockResolvedValue({
        data: [
          {
            id: 'p1',
            student_id: 'student-1',
            lesson_id: 'lesson-1',
            assignment_id: null,
            words_attempted: {
              cat: { attempts: 10, correct: 3, lastAttemptAt: '2026-02-01T00:00:00Z' },   // 30% - weak
              dog: { attempts: 10, correct: 9, lastAttemptAt: '2026-02-01T00:00:00Z' },   // 90% - strong
              fish: { attempts: 5, correct: 1, lastAttemptAt: '2026-02-01T00:00:00Z' },  // 20% - weak
            },
            words_mastered: ['dog'],
            started_at: '2026-01-01T00:00:00Z',
            completed_at: null,
            total_xp: 100,
            current_level: 1,
            current_streak: 3,
            longest_streak: 5,
            last_practice_date: '2026-02-01',
            total_practice_sessions: 5,
          },
        ],
        error: null,
      });

      // WHEN
      const { result } = renderHook(() => useStudentInsights());

      // THEN
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.insights?.weakWords).toEqual(expect.arrayContaining(['cat', 'fish']));
      expect(result.current.insights?.weakWords).not.toContain('dog');
    });

    it('calculates strong words (mastered with > 80% accuracy)', async () => {
      // GIVEN
      mockGetPracticeSessions.mockResolvedValue({ data: [], error: null });
      mockGetStudentProgress.mockResolvedValue({
        data: [
          {
            id: 'p1',
            student_id: 'student-1',
            lesson_id: 'lesson-1',
            assignment_id: null,
            words_attempted: {
              cat: { attempts: 10, correct: 9, lastAttemptAt: '2026-02-01T00:00:00Z' },  // 90%
              dog: { attempts: 10, correct: 9, lastAttemptAt: '2026-02-01T00:00:00Z' },  // 90%
            },
            words_mastered: ['cat', 'dog'],
            started_at: '2026-01-01T00:00:00Z',
            completed_at: null,
            total_xp: 200,
            current_level: 2,
            current_streak: 5,
            longest_streak: 5,
            last_practice_date: '2026-02-01',
            total_practice_sessions: 8,
          },
        ],
        error: null,
      });

      // WHEN
      const { result } = renderHook(() => useStudentInsights());

      // THEN
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.insights?.strongWords).toEqual(expect.arrayContaining(['cat', 'dog']));
    });
  });

  // ============================================
  // Best practice mode
  // ============================================
  describe('best practice mode', () => {
    it('identifies the mode with highest average accuracy', async () => {
      // GIVEN: sessions with different modes and accuracies
      const sessions = [
        buildSession({ mode: 'matching', accuracy: 70 }),
        buildSession({ mode: 'matching', accuracy: 80 }),
        buildSession({ mode: 'spelling', accuracy: 50 }),
        buildSession({ mode: 'spelling', accuracy: 55 }),
        buildSession({ mode: 'blitz', accuracy: 90 }),
        buildSession({ mode: 'blitz', accuracy: 95 }),
      ];
      mockGetPracticeSessions.mockResolvedValue({ data: sessions, error: null });
      mockGetStudentProgress.mockResolvedValue({ data: [], error: null });

      // WHEN
      const { result } = renderHook(() => useStudentInsights());

      // THEN
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      // blitz has avg accuracy 92.5 - highest
      expect(result.current.insights?.bestPracticeMode).toBe('blitz');
    });

    it('returns empty string when no sessions exist', async () => {
      // GIVEN: no sessions
      mockGetPracticeSessions.mockResolvedValue({ data: [], error: null });
      mockGetStudentProgress.mockResolvedValue({ data: [], error: null });

      // WHEN
      const { result } = renderHook(() => useStudentInsights());

      // THEN
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.insights?.bestPracticeMode).toBe('');
    });
  });

  // ============================================
  // Improvement trend
  // ============================================
  describe('improvement trend', () => {
    it('detects improving trend when recent sessions better than early ones', async () => {
      // GIVEN: early sessions with low accuracy, recent with high accuracy
      const now = Date.now();
      const sessions = [
        buildSession({ accuracy: 30, created_at: new Date(now - 10 * 86400000).toISOString() }),
        buildSession({ accuracy: 35, created_at: new Date(now - 9 * 86400000).toISOString() }),
        buildSession({ accuracy: 40, created_at: new Date(now - 8 * 86400000).toISOString() }),
        buildSession({ accuracy: 85, created_at: new Date(now - 3 * 86400000).toISOString() }),
        buildSession({ accuracy: 88, created_at: new Date(now - 2 * 86400000).toISOString() }),
        buildSession({ accuracy: 90, created_at: new Date(now - 1 * 86400000).toISOString() }),
      ];
      mockGetPracticeSessions.mockResolvedValue({ data: sessions, error: null });
      mockGetStudentProgress.mockResolvedValue({ data: [], error: null });

      // WHEN
      const { result } = renderHook(() => useStudentInsights());

      // THEN
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.insights?.improvementTrend).toBe('improving');
    });

    it('detects declining trend when recent sessions worse than early ones', async () => {
      // GIVEN: early sessions with high accuracy, recent with low accuracy
      const now = Date.now();
      const sessions = [
        buildSession({ accuracy: 90, created_at: new Date(now - 10 * 86400000).toISOString() }),
        buildSession({ accuracy: 88, created_at: new Date(now - 9 * 86400000).toISOString() }),
        buildSession({ accuracy: 85, created_at: new Date(now - 8 * 86400000).toISOString() }),
        buildSession({ accuracy: 30, created_at: new Date(now - 3 * 86400000).toISOString() }),
        buildSession({ accuracy: 35, created_at: new Date(now - 2 * 86400000).toISOString() }),
        buildSession({ accuracy: 40, created_at: new Date(now - 1 * 86400000).toISOString() }),
      ];
      mockGetPracticeSessions.mockResolvedValue({ data: sessions, error: null });
      mockGetStudentProgress.mockResolvedValue({ data: [], error: null });

      // WHEN
      const { result } = renderHook(() => useStudentInsights());

      // THEN
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.insights?.improvementTrend).toBe('declining');
    });

    it('returns steady when fewer than 4 sessions', async () => {
      // GIVEN: only 2 sessions
      mockGetPracticeSessions.mockResolvedValue({
        data: [buildSession({ accuracy: 70 }), buildSession({ accuracy: 72 })],
        error: null,
      });
      mockGetStudentProgress.mockResolvedValue({ data: [], error: null });

      // WHEN
      const { result } = renderHook(() => useStudentInsights());

      // THEN
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.insights?.improvementTrend).toBe('steady');
    });
  });

  // ============================================
  // XP this week
  // ============================================
  describe('xpThisWeek', () => {
    it('sums xp_awarded for sessions in last 7 days', async () => {
      // GIVEN: sessions - some in last 7 days, some older
      const now = Date.now();
      const sessions = [
        buildSession({ xp_awarded: 50, created_at: new Date(now - 1 * 86400000).toISOString() }),
        buildSession({ xp_awarded: 75, created_at: new Date(now - 3 * 86400000).toISOString() }),
        buildSession({ xp_awarded: 100, created_at: new Date(now - 10 * 86400000).toISOString() }), // older
      ];
      mockGetPracticeSessions.mockResolvedValue({ data: sessions, error: null });
      mockGetStudentProgress.mockResolvedValue({ data: [], error: null });

      // WHEN
      const { result } = renderHook(() => useStudentInsights());

      // THEN
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.insights?.xpThisWeek).toBe(125); // 50 + 75
    });
  });

  // ============================================
  // Empty/error handling
  // ============================================
  describe('empty data handling', () => {
    it('returns empty insights when no data exists', async () => {
      // GIVEN: empty responses
      mockGetPracticeSessions.mockResolvedValue({ data: [], error: null });
      mockGetStudentProgress.mockResolvedValue({ data: [], error: null });

      // WHEN
      const { result } = renderHook(() => useStudentInsights());

      // THEN
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.insights).not.toBeNull();
      expect(result.current.insights?.weakWords).toEqual([]);
      expect(result.current.insights?.strongWords).toEqual([]);
      expect(result.current.insights?.totalPracticeSessions).toBe(0);
      expect(result.current.insights?.xpThisWeek).toBe(0);
    });

    it('handles Supabase errors gracefully', async () => {
      // GIVEN: sessions fetch fails
      mockGetPracticeSessions.mockResolvedValue({
        data: [],
        error: { message: 'DB connection error' },
      });
      mockGetStudentProgress.mockResolvedValue({ data: [], error: null });

      // WHEN
      const { result } = renderHook(() => useStudentInsights());

      // THEN
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.error).toBe('DB connection error');
      expect(result.current.insights).toBeNull();
    });
  });

  // ============================================
  // Refresh
  // ============================================
  describe('refresh', () => {
    it('re-fetches data when refresh is called', async () => {
      // GIVEN: initial data
      mockGetPracticeSessions.mockResolvedValue({ data: [], error: null });
      mockGetStudentProgress.mockResolvedValue({ data: [], error: null });

      // WHEN
      const { result } = renderHook(() => useStudentInsights());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await result.current.refresh();

      // THEN
      expect(mockGetPracticeSessions).toHaveBeenCalledTimes(2);
    });
  });
});
