import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { getClassroomWindowSource } from '@/lib/supabase/windowedClassroomProgressQuery';
import { useWeeklyProgressDigest } from '../useWeeklyProgressDigest';

vi.mock('@/lib/supabase/windowedClassroomProgressQuery', () => ({
  getClassroomWindowSource: vi.fn(),
}));

vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const NOW = Date.parse('2026-10-13T12:00:00.000Z');

describe('useWeeklyProgressDigest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('counts a seeded this-week lesson completion from the classroom window source', async () => {
    vi.mocked(getClassroomWindowSource).mockResolvedValue({
      data: {
        roster: [{ studentId: 's1', name: 'Sam' }],
        sessions: [],
        assignmentCompletions: [{ completedAt: '2026-10-12T12:00:00.000Z' }],
        assignmentExpected: 1,
        assignmentCount: 1,
      },
      error: null,
    });

    const { result } = renderHook(() => useWeeklyProgressDigest('class-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.metrics?.thisWeek.assignmentCompleted).toBeGreaterThan(0);
    expect(result.current.assignmentCount).toBe(1);
  });
});
