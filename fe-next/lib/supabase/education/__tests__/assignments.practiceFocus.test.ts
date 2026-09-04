import { vi } from 'vitest';
/**
 * Assignment helpers carry the teacher's `practice_focus`.
 * The column is only written when a focus is chosen so classrooms on a
 * database that has not run 20260905140000 keep working for plain assignments.
 */
import { supabase as _supabase } from '@/lib/supabase';
import { createAssignment, updateAssignment } from '../assignments';

const supabase = _supabase!;

vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn() } }));
vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

function insertChain() {
  const single = vi.fn().mockResolvedValue({ data: { id: 'a1' }, error: null });
  const select = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select });
  (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert });
  return insert;
}

function updateChain() {
  const single = vi.fn().mockResolvedValue({ data: { id: 'a1' }, error: null });
  const select = vi.fn().mockReturnValue({ single });
  const eq = vi.fn().mockReturnValue({ select });
  const update = vi.fn().mockReturnValue({ eq });
  (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update });
  return update;
}

describe('createAssignment practice_focus', () => {
  beforeEach(() => vi.clearAllMocks());

  it('persists a chosen focus', async () => {
    const insert = insertChain();
    await createAssignment({
      classroom_id: 'c1',
      lesson_id: 'l1',
      teacher_id: 't1',
      assignment_type: 'practice',
      due_date: '2026-09-10',
      practice_focus: 'synonym',
    });
    expect(supabase.from).toHaveBeenCalledWith('lesson_assignments');
    expect(insert).toHaveBeenCalledWith({
      classroom_id: 'c1',
      lesson_id: 'l1',
      due_date: '2026-09-10',
      practice_focus: 'synonym',
    });
  });

  it('omits the column entirely for "any" / unset (legacy insert shape)', async () => {
    const insert = insertChain();
    await createAssignment({ classroom_id: 'c1', lesson_id: 'l1', teacher_id: 't1', practice_focus: 'any' });
    expect(insert).toHaveBeenCalledWith({ classroom_id: 'c1', lesson_id: 'l1', due_date: null });

    await createAssignment({ classroom_id: 'c1', lesson_id: 'l1', teacher_id: 't1' });
    expect(insert).toHaveBeenLastCalledWith({ classroom_id: 'c1', lesson_id: 'l1', due_date: null });
  });

  it('never writes an unknown focus', async () => {
    const insert = insertChain();
    await createAssignment({ classroom_id: 'c1', lesson_id: 'l1', teacher_id: 't1', practice_focus: 'vibes' as never });
    expect(insert).toHaveBeenCalledWith({ classroom_id: 'c1', lesson_id: 'l1', due_date: null });
  });
});

describe('updateAssignment practice_focus', () => {
  beforeEach(() => vi.clearAllMocks());

  it('can set and clear the focus', async () => {
    const update = updateChain();
    await updateAssignment('a1', { practice_focus: 'context' });
    expect(update).toHaveBeenCalledWith({ practice_focus: 'context' });

    await updateAssignment('a1', { practice_focus: null });
    expect(update).toHaveBeenLastCalledWith({ practice_focus: null });
  });
});
