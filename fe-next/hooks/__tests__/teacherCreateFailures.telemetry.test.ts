/**
 * A teacher create that fails used to leave only a console line in the
 * teacher's own browser — indistinguishable, in every funnel, from a teacher
 * who never tried. Each create hook must report its failure.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import * as education from '@/lib/supabase/education';
import * as assignmentsAPI from '@/lib/supabase/education/assignments';
import { useClassrooms } from '../useClassroom';
import { useLessons } from '../useVocabularyLesson';
import { useAssignments } from '../useAssignments';

vi.mock('@/lib/supabase/education');
vi.mock('@/lib/supabase/education/assignments');

const mockAuthState = { isAuthenticated: true, user: { id: 'user-123' } };
vi.mock('@/contexts/AuthContext', () => ({ useAuth: vi.fn(() => mockAuthState) }));
const mockMountedRef = { current: true };
vi.mock('@/hooks/useMounted', () => ({ useMounted: vi.fn(() => mockMountedRef) }));
vi.mock('@/utils/logger', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const failed = vi.fn();
vi.mock('@/lib/education/telemetry', async (orig) => ({
  ...(await orig<typeof import('@/lib/education/telemetry')>()),
  trackEduTeacherActionFailed: (...a: unknown[]) => failed(...a),
}));

const asMock = (f: unknown) => f as ReturnType<typeof vi.fn>;

describe('teacher create failures are reported', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asMock(education.getClassrooms).mockResolvedValue({ data: [], error: null });
    asMock(education.getLessons).mockResolvedValue({ data: [], error: null });
    asMock(assignmentsAPI.getClassroomAssignments).mockResolvedValue({ data: [], error: null });
  });

  it('Given the free-tier cap, When a classroom create is refused, Then the limit code is the reason', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: 'CLASSROOM_LIMIT_REACHED', message: 'limit' }),
    }) as unknown as typeof fetch;
    const { result } = renderHook(() => useClassrooms());
    await act(async () => { await result.current.createClassroom('A', 'en'); });
    expect(failed).toHaveBeenCalledWith({ action: 'create_classroom', reason: 'CLASSROOM_LIMIT_REACHED' });
  });

  it('Given a network throw, When a classroom create fails, Then it is reported', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch')) as unknown as typeof fetch;
    const { result } = renderHook(() => useClassrooms());
    await act(async () => { await result.current.createClassroom('A', 'en'); });
    expect(failed).toHaveBeenCalledWith({ action: 'create_classroom', reason: 'Failed to fetch' });
  });

  it('Given a DB error, When a lesson create fails, Then it is reported', async () => {
    asMock(education.createLesson).mockResolvedValue({ data: null, error: { message: 'row-level security' } });
    const { result } = renderHook(() => useLessons());
    await act(async () => {
      await result.current.createLesson({ name: 'L', language: 'en', words: [] });
    });
    expect(failed).toHaveBeenCalledWith({ action: 'create_lesson', reason: 'row-level security' });
  });

  it('Given a DB error, When an assignment create fails, Then it is reported', async () => {
    asMock(assignmentsAPI.createAssignment).mockResolvedValue({ data: null, error: { message: 'fk violation' } });
    const { result } = renderHook(() => useAssignments('c1'));
    await act(async () => {
      await result.current.createAssignment({ classroom_id: 'c1', lesson_id: 'l1', teacher_id: 'user-123' });
    });
    expect(failed).toHaveBeenCalledWith({ action: 'create_assignment', reason: 'fk violation' });
  });

  it('Given a successful lesson create, When it resolves, Then nothing is reported', async () => {
    asMock(education.createLesson).mockResolvedValue({ data: { id: 'l1' }, error: null });
    const { result } = renderHook(() => useLessons());
    await act(async () => {
      await result.current.createLesson({ name: 'L', language: 'en', words: [] });
    });
    expect(failed).not.toHaveBeenCalled();
  });
});
