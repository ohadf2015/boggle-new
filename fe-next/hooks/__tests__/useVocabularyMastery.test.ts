import { vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useVocabularyMastery } from '../useVocabularyMastery';
import * as analyticsModule from '@/lib/supabase/analytics';

// Mock analytics module
vi.mock('@/lib/supabase/analytics');

describe('useVocabularyMastery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return loading state initially', () => {
    // GIVEN: Mock data loading
    vi.spyOn(analyticsModule, 'getVocabularyHeatmapData').mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    // WHEN
    const { result } = renderHook(() =>
      useVocabularyMastery({ classroomId: 'classroom-1' })
    );

    // THEN
    expect(result.current.isLoading).toBe(true);
    expect(result.current.heatmapData).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should return heatmap data after fetch', async () => {
    // GIVEN: Mock successful fetch
    const mockData = {
      students: [{ id: 'student-1', name: 'Alice' }],
      words: ['word1', 'word2'],
      cells: [
        {
          studentId: 'student-1',
          studentName: 'Alice',
          word: 'word1',
          masteryLevel: 'mastered' as const,
          accuracy: 90,
          attempts: 5,
        },
        {
          studentId: 'student-1',
          studentName: 'Alice',
          word: 'word2',
          masteryLevel: 'practicing' as const,
          accuracy: 65,
          attempts: 3,
        },
      ],
    };

    vi.spyOn(analyticsModule, 'getVocabularyHeatmapData').mockResolvedValue({
      data: mockData,
      error: null,
    });

    // WHEN
    const { result } = renderHook(() =>
      useVocabularyMastery({ classroomId: 'classroom-1' })
    );

    // THEN
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.heatmapData).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it('should return error on failure', async () => {
    // GIVEN: Mock failed fetch
    const mockError = { message: 'Failed to fetch data' };
    vi.spyOn(analyticsModule, 'getVocabularyHeatmapData').mockResolvedValue({
      data: { students: [], words: [], cells: [] },
      error: mockError,
    });

    // WHEN
    const { result } = renderHook(() =>
      useVocabularyMastery({ classroomId: 'classroom-1' })
    );

    // THEN
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toEqual(new Error('Failed to fetch data'));
    expect(result.current.heatmapData).toBeNull();
  });

  it('should refetch when lessonId changes', async () => {
    // GIVEN: Mock data for different lessons
    const mockSpy = vi.spyOn(analyticsModule, 'getVocabularyHeatmapData').mockResolvedValue({
      data: { students: [], words: [], cells: [] },
      error: null,
    });

    // WHEN: Render with initial lessonId
    const { rerender } = renderHook(
      ({ lessonId }) => useVocabularyMastery({ classroomId: 'classroom-1', lessonId }),
      { initialProps: { lessonId: 'lesson-1' } }
    );

    await waitFor(() => {
      expect(mockSpy).toHaveBeenCalledTimes(1);
    });

    // WHEN: Change lessonId
    rerender({ lessonId: 'lesson-2' });

    // THEN
    await waitFor(() => {
      expect(mockSpy).toHaveBeenCalledTimes(2);
    });

    expect(mockSpy).toHaveBeenCalledWith('classroom-1', 'lesson-1');
    expect(mockSpy).toHaveBeenCalledWith('classroom-1', 'lesson-2');
  });

  it('should expose refresh function', async () => {
    // GIVEN: Mock data
    const mockSpy = vi.spyOn(analyticsModule, 'getVocabularyHeatmapData').mockResolvedValue({
      data: { students: [], words: [], cells: [] },
      error: null,
    });

    // WHEN
    const { result } = renderHook(() =>
      useVocabularyMastery({ classroomId: 'classroom-1' })
    );

    await waitFor(() => {
      expect(mockSpy).toHaveBeenCalledTimes(1);
    });

    // WHEN: Call refresh
    await result.current.refresh();

    // THEN
    await waitFor(() => {
      expect(mockSpy).toHaveBeenCalledTimes(2);
    });
  });
});
