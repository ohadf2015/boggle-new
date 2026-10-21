import { vi } from 'vitest';
/**
 * Sentry: `Error creating assignment: duplicate key value violates unique
 * constraint "lesson_assignments_lesson_id_classroom_id_key"` (23505).
 *
 * Assigning a lesson the class already has is a re-assign: the existing row
 * (same id, so student progress stays attached) takes the new due date and
 * settings, and the caller is told it was already assigned. No error, no
 * second row.
 */
import { supabase as _supabase } from '@/lib/supabase';
import logger from '@/utils/logger';
import { createAssignment, reassignUpdates } from '../assignments';

const supabase = _supabase!;

vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn() } }));
vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/lib/education/lessonPlayStat', () => ({ recordLessonPlays: vi.fn() }));

const DUPLICATE = {
  code: '23505',
  details: null,
  hint: null,
  message: 'duplicate key value violates unique constraint "lesson_assignments_lesson_id_classroom_id_key"',
};

function mockTable(existing: unknown, updateError: unknown = null) {
  const insertSingle = vi.fn().mockResolvedValue({ data: null, error: DUPLICATE });
  const insert = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: insertSingle }) });

  const maybeSingle = vi.fn().mockResolvedValue({ data: existing, error: updateError });
  const eqs: Array<[string, unknown]> = [];
  const filter = {
    eq: vi.fn((col: string, val: unknown) => { eqs.push([col, val]); return filter; }),
    select: vi.fn(() => filter),
    maybeSingle,
  };
  const update = vi.fn().mockReturnValue(filter);
  (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert, update, select: vi.fn(() => filter) });
  return { insert, update, eqs };
}

describe('createAssignment — lesson already assigned to the classroom', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates the existing assignment instead of failing', async () => {
    const existing = { id: 'a-existing', lesson_id: 'l1', classroom_id: 'c1', due_date: '2026-10-30', practice_focus: 'wordcraft' };
    const { update, eqs } = mockTable(existing);

    const res = await createAssignment({
      classroom_id: 'c1',
      lesson_id: 'l1',
      teacher_id: 't1',
      due_date: '2026-10-30',
      practice_focus: 'wordcraft',
    });

    expect(res).toEqual({ data: existing, error: null, alreadyAssigned: true });
    expect(update).toHaveBeenCalledWith({ due_date: '2026-10-30', practice_focus: 'wordcraft' });
    expect(eqs).toEqual([['lesson_id', 'l1'], ['classroom_id', 'c1']]);
    // Not reported to Sentry as an error any more.
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('reports already-assigned (not a raw DB error) if the row cannot be updated', async () => {
    mockTable(null, { message: 'permission denied' });
    const res = await createAssignment({ classroom_id: 'c1', lesson_id: 'l1', teacher_id: 't1', due_date: '2026-10-30' });
    expect(res.alreadyAssigned).toBe(true);
    expect(res.data).toBeNull();
    expect(res.error?.message).toBe('already_assigned');
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('still surfaces other insert errors', async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: { code: '42501', message: 'rls' } });
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single }) }),
    });
    const res = await createAssignment({ classroom_id: 'c1', lesson_id: 'l1', teacher_id: 't1' });
    expect(res.alreadyAssigned).toBeUndefined();
    expect(res.error).toEqual({ message: 'rls', code: '42501' });
  });
});

describe('reassignUpdates', () => {
  it('only carries fields the caller passed', () => {
    expect(reassignUpdates({})).toEqual({});
    expect(reassignUpdates({ due_date: '' })).toEqual({ due_date: null });
    expect(reassignUpdates({ practice_focus: 'any' })).toEqual({ practice_focus: null });
    expect(reassignUpdates({ practice_focus: 'synonym', word_count_target: 12 })).toEqual({
      practice_focus: 'synonym',
      word_count_target: 12,
    });
  });
});
