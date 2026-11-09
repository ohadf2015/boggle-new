import { vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useStudentClassroom } from '../useStudentClassroom';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'stu-1' }, isAuthenticated: true, loading: false }),
}));

const { getOne, getAll } = vi.hoisted(() => ({ getOne: vi.fn(), getAll: vi.fn() }));
vi.mock('@/lib/supabase/education', () => ({
  getStudentClassroom: (...a: unknown[]) => getOne(...a),
  getStudentClassrooms: (...a: unknown[]) => getAll(...a),
}));

const A = { id: 'a', name: 'Class A' };
const B = { id: 'b', name: 'Class B' };

describe('useStudentClassroom class switching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    getAll.mockResolvedValue({ data: [A, B], error: null });
    getOne.mockImplementation(async (_id: string, pref?: string | null) => ({
      data: pref === 'b' ? B : A, level: 'core', error: null,
    }));
  });

  it('exposes every class and defaults to the newest', async () => {
    const { result } = renderHook(() => useStudentClassroom());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.classrooms).toEqual([A, B]);
    expect(result.current.classroomId).toBe('a');
  });

  it('selectClassroom switches class and remembers the choice', async () => {
    const { result } = renderHook(() => useStudentClassroom());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => { await result.current.selectClassroom('b'); });
    expect(result.current.classroomId).toBe('b');
    expect(localStorage.getItem('lc.student.classroom.stu-1')).toBe('b');
  });

  it('starts on the remembered class', async () => {
    localStorage.setItem('lc.student.classroom.stu-1', 'b');
    const { result } = renderHook(() => useStudentClassroom());
    await waitFor(() => expect(result.current.classroomId).toBe('b'));
  });

  it('a failed class list leaves the single-class flow working', async () => {
    getAll.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useStudentClassroom());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.classroomId).toBe('a');
    expect(result.current.classrooms).toEqual([]);
  });
});
