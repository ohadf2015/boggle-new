/**
 * Nov 13, /en/student: a student who had just joined painted "no classroom"
 * (student_no_classroom_prompt_viewed + academy has_class=false) and 600ms
 * later the same page reported the class. The hook had settled to "no class"
 * before the signed-in membership read answered.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const auth = vi.hoisted(() => ({
  current: {
    user: null as { id: string } | null,
    isAuthenticated: false,
    loading: true,
  },
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth.current }));
vi.mock('@/utils/logger', () => ({ default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

const { getStudentClassroom } = vi.hoisted(() => ({ getStudentClassroom: vi.fn() }));
vi.mock('@/lib/supabase/education', () => ({
  getStudentClassroom: (...args: unknown[]) => getStudentClassroom(...args),
}));

import { useStudentClassroom } from '../useStudentClassroom';

describe('useStudentClassroom — do not settle empty before the signed-in read', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.current = { user: null, isAuthenticated: false, loading: true };
  });

  it('stays loading from auth-unresolved through the membership read, then shows the class', async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    getStudentClassroom.mockImplementation(
      () => new Promise((resolve) => { resolveFetch = resolve; }),
    );

    const { result, rerender } = renderHook(() => useStudentClassroom());

    // Auth has not answered. "No classroom" here is a lie — the session may still arrive.
    expect(result.current.isLoading).toBe(true);
    expect(result.current.classroomId).toBeNull();

    auth.current = { user: { id: 'student-1' }, isAuthenticated: true, loading: false };
    rerender();

    await waitFor(() => expect(getStudentClassroom).toHaveBeenCalledWith('student-1'));
    // The read is in flight. Settled-empty is what painted the Nov 13 prompt.
    expect(result.current.isLoading).toBe(true);
    expect(result.current.classroomId).toBeNull();

    await act(async () => {
      resolveFetch({
        data: { id: 'class-68508c6f', name: 'Hebrew' },
        level: 'core',
        error: null,
      });
    });

    await waitFor(() => expect(result.current.classroomId).toBe('class-68508c6f'));
    expect(result.current.isLoading).toBe(false);
  });
});
