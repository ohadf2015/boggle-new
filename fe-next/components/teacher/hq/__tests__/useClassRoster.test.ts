import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const getClassroomStudents = vi.fn();
vi.mock('@/lib/supabase/education', () => ({ getClassroomStudents: (...a: unknown[]) => getClassroomStudents(...a) }));

import { useClassRoster } from '../useClassRoster';

const row = (id: string) => ({ student_id: id, profiles: { username: id } });

beforeEach(() => {
  getClassroomStudents.mockImplementation(async (id: string) => ({ data: id === 'a' ? [row('s1'), row('s2')] : [], error: null }));
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('useClassRoster', () => {
  it('Given no class yet, When a class arrives, Then its first render is loading, never a settled 0', async () => {
    const seen: { loading: boolean; n: number }[] = [];
    const { rerender } = renderHook(({ id }) => {
      const r = useClassRoster(id, 'x');
      seen.push({ loading: r.loading, n: r.students.length });
      return r;
    }, { initialProps: { id: null as string | null } });
    seen.length = 0;
    rerender({ id: 'a' });
    expect(seen[0]).toEqual({ loading: true, n: 0 });
    await waitFor(() => expect(seen.at(-1)).toEqual({ loading: false, n: 2 }));
    expect(seen.some((s) => !s.loading && s.n === 0)).toBe(false);
  });

  it('Given a custom interval, Then the roster is re-read at that interval', async () => {
    vi.useFakeTimers();
    renderHook(() => useClassRoster('b', 'x', 5000));
    await vi.advanceTimersByTimeAsync(0);
    expect(getClassroomStudents).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(5000);
    expect(getClassroomStudents).toHaveBeenCalledTimes(2);
  });
});
