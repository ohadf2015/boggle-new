import { vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useLessonEffectiveness } from '../useLessonEffectiveness';
import * as analyticsModule from '@/lib/supabase/analytics';

// Mock analytics module
vi.mock('@/lib/supabase/analytics');

const mockGetLessonEffectiveness = analyticsModule.getLessonEffectiveness as any;

describe('useLessonEffectiveness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return loading state initially', () => {
    // GIVEN: Mock pending promise
    mockGetLessonEffectiveness.mockReturnValue(new Promise(() => {}));

    // WHEN
    const { result } = renderHook(() =>
      useLessonEffectiveness({ classroomId: 'classroom-1' })
    );

    // THEN
    expect(result.current.isLoading).toBe(true);
    expect(result.current.effectiveness).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should return effectiveness data after fetch', async () => {
    // GIVEN: Mock successful response
    const mockData = [
      {
        lessonId: 'lesson-1',
        lessonName: 'Basic Vocabulary',
        totalStudents: 10,
        averageXpGain: 150,
        completionRate: 80,
        averageAccuracy: 75,
        avgTimeToMastery: 5,
      },
    ];

    mockGetLessonEffectiveness.mockResolvedValue({
      data: mockData,
      error: null,
    });

    // WHEN
    const { result } = renderHook(() =>
      useLessonEffectiveness({ classroomId: 'classroom-1' })
    );

    // THEN
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.effectiveness).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it('should return error on failure', async () => {
    // GIVEN: Mock error response
    mockGetLessonEffectiveness.mockResolvedValue({
      data: [],
      error: { message: 'Database connection failed' },
    });

    // WHEN
    const { result } = renderHook(() =>
      useLessonEffectiveness({ classroomId: 'classroom-1' })
    );

    // THEN
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.effectiveness).toEqual([]);
    expect(result.current.error).toEqual(new Error('Database connection failed'));
  });

  it('should return empty array when classroomId empty', () => {
    // GIVEN: Empty classroomId
    const { result } = renderHook(() =>
      useLessonEffectiveness({ classroomId: '' })
    );

    // THEN
    expect(result.current.effectiveness).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockGetLessonEffectiveness).not.toHaveBeenCalled();
  });

  it('should refresh when refresh() called', async () => {
    // GIVEN: Mock successful response
    const mockData = [
      {
        lessonId: 'lesson-1',
        lessonName: 'Basic Vocabulary',
        totalStudents: 10,
        averageXpGain: 150,
        completionRate: 80,
        averageAccuracy: 75,
        avgTimeToMastery: 5,
      },
    ];

    mockGetLessonEffectiveness.mockResolvedValue({
      data: mockData,
      error: null,
    });

    // WHEN
    const { result } = renderHook(() =>
      useLessonEffectiveness({ classroomId: 'classroom-1' })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Call refresh
    await result.current.refresh();

    // THEN
    expect(mockGetLessonEffectiveness).toHaveBeenCalledTimes(2);
  });
});
