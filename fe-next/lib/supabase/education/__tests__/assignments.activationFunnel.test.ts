/**
 * Teacher activation funnel — the first_assignment step (step_index 3) and the
 * completed event, gated inside createAssignment:
 *
 *   - counted BEFORE the insert, in the DB (never localStorage — a storage
 *     flag cannot survive a second device, and a double-fired "first" breaks
 *     the funnel's math);
 *   - fires only when the pre-insert count was 0 AND the insert succeeded —
 *     a duplicate re-assign (UNIQUE_VIOLATION) returns earlier and never
 *     reaches the emission path (covered by assignments.duplicate.test.ts);
 *   - completed fires only when the teacher also owns >= 1 classroom;
 *   - the insert payload, the reassign behavior and the return shape are
 *     exactly what they were before the funnel existed.
 */
import { vi } from 'vitest';
import { supabase as _supabase } from '@/lib/supabase';
import { createAssignment } from '../assignments';

const supabase = _supabase!;

const captureMock = vi.fn();
vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: { capture: (...args: unknown[]) => captureMock(...args) },
}));
const growthMock = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => growthMock(...args),
}));
vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/lib/education/lessonPlayStat', () => ({ recordLessonPlays: vi.fn() }));

type CountResult = { count: number | null; error: { message: string } | null };

function mockFunnelTables(args: { assignmentCount: number | 'error'; classroomCount: number | 'error' }) {
  const countOf = (n: number | 'error'): CountResult =>
    n === 'error' ? { count: null, error: { message: 'rls' } } : { count: n, error: null };

  const countSelect = (result: CountResult) =>
    vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue(result) });

  const assignmentCountSelect = countSelect(countOf(args.assignmentCount));
  const classroomCountSelect = countSelect(countOf(args.classroomCount));

  const insert = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: { id: 'a-new' }, error: null }),
    }),
  });

  (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) =>
    table === 'classrooms'
      ? { select: classroomCountSelect }
      : { insert, select: assignmentCountSelect }
  );

  return { insert, assignmentCountSelect, classroomCountSelect };
}

const STEP_PROPS = { step: 'first_assignment', step_index: 3, locale: 'he', plan: 'trial' } as const;

describe('createAssignment — activation funnel gates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('count 0 + insert success: fires the step AND completed (bare + growth twin) and inserts the same row as before', async () => {
    const { insert } = mockFunnelTables({ assignmentCount: 0, classroomCount: 1 });

    const res = await createAssignment({
      classroom_id: 'c1',
      lesson_id: 'l1',
      teacher_id: 't1',
      locale: 'he',
      plan: 'trial',
    });

    // Return shape unchanged.
    expect(res).toEqual({ data: { id: 'a-new' }, error: null });
    // Insert payload unchanged — the funnel fields never reach the row.
    expect(insert).toHaveBeenCalledWith({ classroom_id: 'c1', lesson_id: 'l1', due_date: null });

    expect(captureMock).toHaveBeenNthCalledWith(1, 'teacher_activation_funnel_step', STEP_PROPS);
    expect(growthMock).toHaveBeenNthCalledWith(1, 'teacher_activation_funnel_step', STEP_PROPS);
    expect(captureMock).toHaveBeenNthCalledWith(2, 'teacher_activation_funnel_completed', { locale: 'he', plan: 'trial' });
    expect(growthMock).toHaveBeenNthCalledWith(2, 'teacher_activation_funnel_completed', { locale: 'he', plan: 'trial' });
    expect(captureMock).toHaveBeenCalledTimes(2);
    expect(growthMock).toHaveBeenCalledTimes(2);
  });

  it('count 0 but classroom count 0: fires the step only, NOT completed', async () => {
    mockFunnelTables({ assignmentCount: 0, classroomCount: 0 });

    await createAssignment({ classroom_id: 'c1', lesson_id: 'l1', teacher_id: 't1', locale: 'he', plan: 'trial' });

    expect(captureMock).toHaveBeenCalledTimes(1);
    expect(captureMock).toHaveBeenCalledWith('teacher_activation_funnel_step', STEP_PROPS);
    expect(captureMock.mock.calls.some((c) => c[0] === 'teacher_activation_funnel_completed')).toBe(false);
    expect(growthMock.mock.calls.some((c) => c[0] === 'teacher_activation_funnel_completed')).toBe(false);
  });

  it('count 0 but the classroom count cannot be read: fires the step, not completed', async () => {
    mockFunnelTables({ assignmentCount: 0, classroomCount: 'error' });

    await createAssignment({ classroom_id: 'c1', lesson_id: 'l1', teacher_id: 't1' });

    expect(captureMock).toHaveBeenCalledTimes(1);
    expect(captureMock).toHaveBeenCalledWith('teacher_activation_funnel_step', {
      step: 'first_assignment',
      step_index: 3,
    });
  });

  it('second assignment (count already > 0): fires NEITHER event, insert still succeeds', async () => {
    const { insert } = mockFunnelTables({ assignmentCount: 3, classroomCount: 1 });

    const res = await createAssignment({ classroom_id: 'c1', lesson_id: 'l1', teacher_id: 't1', locale: 'he', plan: 'trial' });

    expect(res).toEqual({ data: { id: 'a-new' }, error: null });
    expect(insert).toHaveBeenCalledWith({ classroom_id: 'c1', lesson_id: 'l1', due_date: null });
    expect(captureMock).not.toHaveBeenCalled();
    expect(growthMock).not.toHaveBeenCalled();
  });

  it('the assignment count cannot be read: fires nothing and the insert still succeeds', async () => {
    const { insert } = mockFunnelTables({ assignmentCount: 'error', classroomCount: 1 });

    const res = await createAssignment({ classroom_id: 'c1', lesson_id: 'l1', teacher_id: 't1' });

    expect(res).toEqual({ data: { id: 'a-new' }, error: null });
    expect(insert).toHaveBeenCalledTimes(1);
    expect(captureMock).not.toHaveBeenCalled();
    expect(growthMock).not.toHaveBeenCalled();
  });

  it('counts BEFORE the insert', async () => {
    const { insert, assignmentCountSelect } = mockFunnelTables({ assignmentCount: 5, classroomCount: 0 });

    await createAssignment({ classroom_id: 'c1', lesson_id: 'l1', teacher_id: 't1' });

    expect(assignmentCountSelect.mock.invocationCallOrder[0]).toBeLessThan(
      insert.mock.invocationCallOrder[0]
    );
  });
});
