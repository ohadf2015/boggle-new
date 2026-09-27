/**
 * useWordMasteryTrend — mirrors useRecentClassroomGames: loading -> data |
 * error, plus `refresh`.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useWordMasteryTrend } from '../useWordMasteryTrend';
import { getClassMastery } from '@/lib/supabase/wordMastery';
import type { ClassMastery } from '@/lib/education/wordMasteryTrend';

vi.mock('@/lib/supabase/wordMastery');
vi.mock('@/utils/logger', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const emptyMastery: ClassMastery = {
  students: [],
  classStuckWords: [],
  sessionsAnalyzed: 0,
  rowsSkipped: 0,
};

describe('useWordMasteryTrend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts loading then resolves with the fetched mastery', async () => {
    vi.mocked(getClassMastery).mockResolvedValue({ data: emptyMastery, error: null });

    const { result } = renderHook(() => useWordMasteryTrend({ classroomId: 'class-1' }));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.mastery).toEqual(emptyMastery);
    expect(result.current.error).toBeNull();
    expect(getClassMastery).toHaveBeenCalledWith('class-1');
  });

  it('surfaces a query error', async () => {
    vi.mocked(getClassMastery).mockResolvedValue({ data: null, error: { message: 'boom' } });

    const { result } = renderHook(() => useWordMasteryTrend({ classroomId: 'class-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.mastery).toBeNull();
    expect(result.current.error?.message).toBe('boom');
  });

  it('skips the fetch and clears loading when there is no classroomId', async () => {
    const { result } = renderHook(() => useWordMasteryTrend({ classroomId: '' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(getClassMastery).not.toHaveBeenCalled();
    expect(result.current.mastery).toBeNull();
  });
});
