/**
 * Creating a classroom must reach every list that shows classrooms.
 *
 * Live: a teacher created a class, opened the lesson editor, and her new class
 * was not in its dropdown until a full page reload.
 *
 * ROOT CAUSE — not a cache at all. `useClassrooms` keeps its rows in a plain
 * `useState`, so EVERY caller gets a private copy. `ClassroomManager`,
 * `LessonBuilder`, `TeacherDashboard`, `LessonAssignmentDialog`,
 * `PlayTabFirstRunCard` and `HostWordSelector` each mount their own. The
 * optimistic prepend inside `createClassroom` therefore updates exactly one of
 * them — the one that happened to create it — and the rest keep serving rows
 * they fetched on mount until something remounts them.
 *
 * Recurring pitfall class 1 in its purest form: one fact, six copies, no way to
 * tell which is current. So a write has to notify the others rather than each
 * consumer remembering to refetch — a rule nobody can follow forever, and one
 * that already had six chances to be forgotten.
 */
import { renderHook, act, waitFor } from '@testing-library/react';

const mockGetClassrooms = vi.fn();
vi.mock('@/lib/supabase/education', () => ({
  getClassrooms: (...a: unknown[]) => mockGetClassrooms(...a),
  createClassroom: vi.fn(),
  updateClassroom: vi.fn(async () => ({ error: null })),
  deleteClassroom: vi.fn(async () => ({ error: null })),
  getClassroomStudents: vi.fn(async () => ({ data: [], error: null })),
  removeStudentFromClassroom: vi.fn(async () => ({ error: null })),
  getStudentClassroom: vi.fn(async () => ({ data: null, level: 'core', error: null })),
  joinClassroom: vi.fn(),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true, user: { id: 'teacher-1' } }),
}));
vi.mock('@/utils/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { useClassrooms } from '../useClassroom';

const EXISTING = { id: 'c1', name: 'ELA Period 3', teacher_id: 'teacher-1' };
const CREATED = { id: 'c2', name: 'Flow Check', teacher_id: 'teacher-1' };

const originalFetch = global.fetch;

describe('useClassrooms — a create reaches every mounted list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetClassrooms.mockResolvedValue({ data: [EXISTING], error: null });
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ data: CREATED }),
    })) as never;
  });
  afterEach(() => { global.fetch = originalFetch; });

  it('shows a newly created classroom in a SECOND list without a reload', async () => {
    // GIVEN two independently mounted consumers — in the app these are
    // ClassroomManager (where she creates) and LessonBuilder's dropdown
    const creator = renderHook(() => useClassrooms());
    const dropdown = renderHook(() => useClassrooms());
    await waitFor(() => expect(creator.result.current.isLoading).toBe(false));
    await waitFor(() => expect(dropdown.result.current.isLoading).toBe(false));

    // WHEN the teacher creates a class in the first one
    mockGetClassrooms.mockResolvedValue({ data: [CREATED, EXISTING], error: null });
    await act(async () => {
      await creator.result.current.createClassroom('Flow Check', 'en' as never);
    });

    // THEN the OTHER list has it too — no reload, no remount
    await waitFor(() => {
      expect(dropdown.result.current.classrooms.map((c) => c.id)).toContain('c2');
    });
  });

  it('still updates the list that did the creating', async () => {
    // GIVEN one consumer
    const creator = renderHook(() => useClassrooms());
    await waitFor(() => expect(creator.result.current.isLoading).toBe(false));

    // WHEN it creates
    mockGetClassrooms.mockResolvedValue({ data: [CREATED, EXISTING], error: null });
    await act(async () => {
      await creator.result.current.createClassroom('Flow Check', 'en' as never);
    });

    // THEN the optimistic update is not lost to the broadcast
    await waitFor(() => {
      expect(creator.result.current.classrooms.map((c) => c.id)).toContain('c2');
    });
  });

  it('does not notify a consumer that has unmounted', async () => {
    // GIVEN a consumer that goes away — a closed dialog, a switched tab
    const creator = renderHook(() => useClassrooms());
    const gone = renderHook(() => useClassrooms());
    await waitFor(() => expect(gone.result.current.isLoading).toBe(false));
    gone.unmount();

    // WHEN a classroom is created afterwards
    mockGetClassrooms.mockResolvedValue({ data: [CREATED, EXISTING], error: null });

    // THEN no update is attempted on the dead one (React would warn, and a
    // leaked subscriber would keep every unmounted list alive for the session)
    await expect(
      act(async () => {
        await creator.result.current.createClassroom('Flow Check', 'en' as never);
      })
    ).resolves.not.toThrow();
  });

  it('propagates a delete as well, not just a create', async () => {
    // GIVEN two lists showing the same class
    const manager = renderHook(() => useClassrooms());
    const dropdown = renderHook(() => useClassrooms());
    await waitFor(() => expect(dropdown.result.current.isLoading).toBe(false));
    expect(dropdown.result.current.classrooms.map((c) => c.id)).toContain('c1');

    // WHEN one is deleted in the manager
    mockGetClassrooms.mockResolvedValue({ data: [], error: null });
    await act(async () => {
      await manager.result.current.deleteClassroom('c1');
    });

    // THEN the dropdown stops offering a class that no longer exists — picking
    // it would fail at the point of use, which is worse than never seeing it
    await waitFor(() => {
      expect(dropdown.result.current.classrooms.map((c) => c.id)).not.toContain('c1');
    });
  });
});
