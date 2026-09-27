import { vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useStudentProgressMetrics } from '../useStudentProgressMetrics';
import { getStudentsProgressSummary, type StudentProgressSummary } from '@/lib/supabase/analytics';

// Mock the analytics module
vi.mock('@/lib/supabase/analytics', () => ({
  getStudentsProgressSummary: vi.fn(),
}));

const mockGetStudentsProgressSummary = getStudentsProgressSummary as any;

describe('useStudentProgressMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return loading state initially', () => {
    // GIVEN: Hook is rendered
    mockGetStudentsProgressSummary.mockResolvedValue({
      data: [],
      error: null,
    });

    // WHEN
    const { result } = renderHook(() =>
      useStudentProgressMetrics({ classroomId: 'classroom-1' })
    );

    // THEN
    expect(result.current.isLoading).toBe(true);
    expect(result.current.students).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should return students array after fetch', async () => {
    // GIVEN: Mock data
    const mockStudents: StudentProgressSummary[] = [
      {
        studentId: 'student-1',
        displayName: 'Alice',
        avatarUrl: null,
        totalXp: 100,
        currentLevel: 2,
        vocabularyMastery: 60,
        overallAccuracy: 80,
        wordsAttempted: 20,
        wordsMastered: 12,
        lastPracticeDate: '2026-01-29',
        isStruggling: false,
        currentStreak: 3,
      },
    ];

    mockGetStudentsProgressSummary.mockResolvedValue({
      data: mockStudents,
      error: null,
    });

    // WHEN
    const { result } = renderHook(() =>
      useStudentProgressMetrics({ classroomId: 'classroom-1' })
    );

    // THEN
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.students).toEqual(mockStudents);
    expect(result.current.error).toBeNull();
  });

  it('should return error on fetch failure', async () => {
    // GIVEN: Mock error
    mockGetStudentsProgressSummary.mockResolvedValue({
      data: [],
      error: { message: 'Database error' },
    });

    // WHEN
    const { result } = renderHook(() =>
      useStudentProgressMetrics({ classroomId: 'classroom-1' })
    );

    // THEN
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toEqual(new Error('Database error'));
    expect(result.current.students).toEqual([]);
  });

  it('should refresh when refresh() called', async () => {
    // GIVEN: Initial data
    const initialStudents: StudentProgressSummary[] = [
      {
        studentId: 'student-1',
        displayName: 'Alice',
        avatarUrl: null,
        totalXp: 100,
        currentLevel: 2,
        vocabularyMastery: 60,
        overallAccuracy: 80,
        wordsAttempted: 20,
        wordsMastered: 12,
        lastPracticeDate: '2026-01-29',
        isStruggling: false,
        currentStreak: 3,
      },
    ];

    const updatedStudents: StudentProgressSummary[] = [
      {
        ...initialStudents[0],
        totalXp: 150,
        currentLevel: 3,
      },
    ];

    mockGetStudentsProgressSummary
      .mockResolvedValueOnce({ data: initialStudents, error: null })
      .mockResolvedValueOnce({ data: updatedStudents, error: null });

    // WHEN
    const { result } = renderHook(() =>
      useStudentProgressMetrics({ classroomId: 'classroom-1' })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.students[0].totalXp).toBe(100);

    // Call refresh
    await result.current.refresh();

    // THEN
    await waitFor(() => {
      expect(result.current.students[0].totalXp).toBe(150);
      expect(result.current.students[0].currentLevel).toBe(3);
    });
  });

  it('should return empty array when classroomId empty', async () => {
    // GIVEN: Empty classroomId
    mockGetStudentsProgressSummary.mockResolvedValue({
      data: [],
      error: null,
    });

    // WHEN
    const { result } = renderHook(() =>
      useStudentProgressMetrics({ classroomId: '' })
    );

    // THEN
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.students).toEqual([]);
    expect(mockGetStudentsProgressSummary).not.toHaveBeenCalled();
  });
});
