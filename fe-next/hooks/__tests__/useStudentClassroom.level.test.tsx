/**
 * useStudentClassroom must surface the student's own differentiation `level`
 * (from their classroom_memberships row) so solo practice can filter by tier.
 * Absent → 'core' — a missing level must never hide the lesson.
 */
import { vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useStudentClassroom } from '../useStudentClassroom';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'student-1' }, isAuthenticated: true, loading: false }),
}));
const { mockGetStudentClassroom } = vi.hoisted(() => ({ mockGetStudentClassroom: vi.fn() }));
vi.mock('@/lib/supabase/education', () => ({
  getStudentClassroom: (...a: unknown[]) => mockGetStudentClassroom(...a),
}));

describe('useStudentClassroom — level', () => {
  beforeEach(() => vi.clearAllMocks());

  it('exposes the membership level returned by getStudentClassroom', async () => {
    mockGetStudentClassroom.mockResolvedValue({ data: { id: 'c1' }, level: 'support', error: null });
    const { result } = renderHook(() => useStudentClassroom());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.level).toBe('support');
  });

  it("is 'core' while loading, when the read omits level, and when there is no classroom", async () => {
    mockGetStudentClassroom.mockResolvedValue({ data: { id: 'c1' }, error: null });
    const { result } = renderHook(() => useStudentClassroom());
    expect(result.current.level).toBe('core');
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.level).toBe('core');

    mockGetStudentClassroom.mockResolvedValue({ data: null, level: 'core', error: null });
    const none = renderHook(() => useStudentClassroom());
    await waitFor(() => expect(none.result.current.isLoading).toBe(false));
    expect(none.result.current.level).toBe('core');
  });
});
