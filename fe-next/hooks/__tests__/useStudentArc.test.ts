/**
 * useStudentArc — loading -> arc | error for one student's cross-session
 * learning arc. Mirrors useWordMasteryTrend.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useStudentArc } from '../useStudentArc';
import { getStudentMasterySeries, type StudentArcData } from '@/lib/supabase/wordMastery';

vi.mock('@/lib/supabase/wordMastery');
vi.mock('@/utils/logger', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const arc: StudentArcData = {
  points: [{ gameCode: 'g1', at: '2026-09-01T10:00:00.000Z', asked: 2, found: 1, accuracy: 50 }],
  mastery: {
    studentId: 'stu-1',
    words: [],
    stuckWords: [],
    masteredCount: 0,
  },
};

describe('useStudentArc', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts loading then resolves with the fetched arc', async () => {
    vi.mocked(getStudentMasterySeries).mockResolvedValue({ data: arc, error: null });

    const { result } = renderHook(() => useStudentArc({ classroomId: 'class-1', studentId: 'stu-1' }));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.arc).toEqual(arc);
    expect(result.current.error).toBeNull();
    expect(getStudentMasterySeries).toHaveBeenCalledWith('class-1', 'stu-1');
  });

  it('surfaces a query error', async () => {
    vi.mocked(getStudentMasterySeries).mockResolvedValue({ data: null, error: { message: 'boom' } });

    const { result } = renderHook(() => useStudentArc({ classroomId: 'class-1', studentId: 'stu-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.arc).toBeNull();
    expect(result.current.error?.message).toBe('boom');
  });

  it('skips the fetch when an id is missing', async () => {
    const { result } = renderHook(() => useStudentArc({ classroomId: '', studentId: 'stu-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(getStudentMasterySeries).not.toHaveBeenCalled();
    expect(result.current.arc).toBeNull();
  });
});
