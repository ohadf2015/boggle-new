import { vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useClassroomAnalytics } from '../useClassroomAnalytics';
import * as analytics from '@/lib/supabase/analytics';

// Mock analytics module
vi.mock('@/lib/supabase/analytics', () => ({
  getClassroomMetrics: vi.fn(),
  getCommonMistakes: vi.fn(),
}));

describe('useClassroomAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return loading state initially', () => {
    // GIVEN: Mock functions return pending promises
    (analytics.getClassroomMetrics as any).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );
    (analytics.getCommonMistakes as any).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    // WHEN
    const { result } = renderHook(() =>
      useClassroomAnalytics({ classroomId: 'classroom-1' })
    );

    // THEN
    expect(result.current.isLoading).toBe(true);
    expect(result.current.metrics).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should return metrics after fetch', async () => {
    // GIVEN: Mock successful fetch
    const mockMetrics = {
      studentsNeedingHelp: 5,
      classAverageXp: 250,
      activeStudentsToday: 12,
      weeklyEngagement: 80,
      totalStudents: 20,
    };
    const mockMistakes = [
      { word: 'difficult', errorRate: 0.8, studentCount: 5 },
      { word: 'challenging', errorRate: 0.7, studentCount: 4 },
    ];

    (analytics.getClassroomMetrics as any).mockResolvedValue({
      data: mockMetrics,
      error: null,
    });
    (analytics.getCommonMistakes as any).mockResolvedValue({
      data: mockMistakes,
      error: null,
    });

    // WHEN
    const { result } = renderHook(() =>
      useClassroomAnalytics({ classroomId: 'classroom-1' })
    );

    // THEN
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.metrics).toEqual({
      ...mockMetrics,
      commonMistakes: mockMistakes,
    });
    expect(result.current.error).toBeNull();
  });

  it('should return error on fetch failure', async () => {
    // GIVEN: Mock fetch error
    (analytics.getClassroomMetrics as any).mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    });

    // WHEN
    const { result } = renderHook(() =>
      useClassroomAnalytics({ classroomId: 'classroom-1' })
    );

    // THEN
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.metrics).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Database error');
  });

  it('should call getClassroomMetrics and getCommonMistakes', async () => {
    // GIVEN: Mock successful fetch
    (analytics.getClassroomMetrics as any).mockResolvedValue({
      data: {
        studentsNeedingHelp: 0,
        classAverageXp: 100,
        activeStudentsToday: 0,
        weeklyEngagement: 0,
        totalStudents: 0,
      },
      error: null,
    });
    (analytics.getCommonMistakes as any).mockResolvedValue({
      data: [],
      error: null,
    });

    // WHEN
    renderHook(() => useClassroomAnalytics({ classroomId: 'classroom-1' }));

    // THEN
    await waitFor(() => {
      expect(analytics.getClassroomMetrics).toHaveBeenCalledWith('classroom-1');
      expect(analytics.getCommonMistakes).toHaveBeenCalledWith('classroom-1', 5);
    });
  });

  it('should refresh metrics when refresh() called', async () => {
    // GIVEN: Mock successful fetch
    (analytics.getClassroomMetrics as any).mockResolvedValue({
      data: {
        studentsNeedingHelp: 0,
        classAverageXp: 100,
        activeStudentsToday: 0,
        weeklyEngagement: 0,
        totalStudents: 0,
      },
      error: null,
    });
    (analytics.getCommonMistakes as any).mockResolvedValue({
      data: [],
      error: null,
    });

    const { result } = renderHook(() =>
      useClassroomAnalytics({ classroomId: 'classroom-1' })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Clear the mock call counts
    vi.clearAllMocks();

    // WHEN
    await result.current.refresh();

    // THEN
    expect(analytics.getClassroomMetrics).toHaveBeenCalledTimes(1);
    expect(analytics.getCommonMistakes).toHaveBeenCalledTimes(1);
  });

  it('should return null metrics when classroomId empty', () => {
    // GIVEN: Empty classroomId
    // WHEN
    const { result } = renderHook(() =>
      useClassroomAnalytics({ classroomId: '' })
    );

    // THEN
    expect(result.current.isLoading).toBe(false);
    expect(result.current.metrics).toBeNull();
    expect(result.current.error).toBeNull();
    expect(analytics.getClassroomMetrics).not.toHaveBeenCalled();
    expect(analytics.getCommonMistakes).not.toHaveBeenCalled();
  });
});
