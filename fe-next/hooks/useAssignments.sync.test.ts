/**
 * useAssignments — two instances for one classroom stay in sync.
 * TeacherDashboard mounts the AssignmentCreator and the AssignmentTrackingPanel
 * with separate hook instances; a created assignment used to stay invisible in
 * the panel ("All (0)") until a page reload.
 */
import { vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAssignments } from './useAssignments';
import * as assignmentsAPI from '@/lib/supabase/education/assignments';

vi.mock('@/lib/supabase/education/assignments');

const mockGet = assignmentsAPI.getClassroomAssignments as any;
const mockCreate = assignmentsAPI.createAssignment as any;

describe('useAssignments — cross-instance sync', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Given a creator and a panel instance, When the creator creates, Then the panel refetches', async () => {
    mockGet.mockResolvedValue({ data: [], error: null });
    mockCreate.mockResolvedValue({ data: { id: 'a1', classroom_id: 'c1', lesson_id: 'l1' }, error: null });

    const panel = renderHook(() => useAssignments('c1'));
    const creator = renderHook(() => useAssignments('c1'));
    await waitFor(() => expect(panel.result.current.isLoading).toBe(false));
    const before = mockGet.mock.calls.length;

    mockGet.mockResolvedValue({ data: [{ id: 'a1', classroom_id: 'c1', lesson_id: 'l1' }], error: null });
    await act(async () => {
      await creator.result.current.createAssignment({ classroom_id: 'c1', lesson_id: 'l1', teacher_id: 't1' });
    });

    await waitFor(() => expect(panel.result.current.assignments).toHaveLength(1));
    expect(mockGet.mock.calls.length).toBeGreaterThan(before);
  });

  it('Given another classroom, When an assignment is created, Then this instance does not refetch', async () => {
    mockGet.mockResolvedValue({ data: [], error: null });
    mockCreate.mockResolvedValue({ data: { id: 'a1' }, error: null });
    const other = renderHook(() => useAssignments('c2'));
    const creator = renderHook(() => useAssignments('c1'));
    await waitFor(() => expect(other.result.current.isLoading).toBe(false));
    const calls = () => mockGet.mock.calls.filter(([id]: [string]) => id === 'c2').length;
    const before = calls();
    await act(async () => {
      await creator.result.current.createAssignment({ classroom_id: 'c1', lesson_id: 'l1', teacher_id: 't1' });
    });
    expect(calls()).toBe(before);
  });
});
