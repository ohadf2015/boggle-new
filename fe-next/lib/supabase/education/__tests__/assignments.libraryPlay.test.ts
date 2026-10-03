import { vi, describe, it, expect, beforeEach } from 'vitest';

let insertResult: { data: unknown; error: { message: string } | null } = { data: { id: 'a1' }, error: null };
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({ insert: () => ({ select: () => ({ single: async () => insertResult }) }) }),
  },
}));
vi.mock('@/utils/logger', () => ({ default: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));
const recordLessonPlays = vi.fn();
vi.mock('@/lib/education/lessonPlayStat', () => ({
  recordLessonPlays: (...a: unknown[]) => recordLessonPlays(...a),
}));

import { assignLesson, createAssignment } from '../assignments';

describe('assignments count as library plays', () => {
  beforeEach(() => {
    insertResult = { data: { id: 'a1' }, error: null };
    recordLessonPlays.mockClear();
  });

  it('given a created assignment, then its lesson is counted as a play', async () => {
    await createAssignment({ classroom_id: 'c1', lesson_id: 'copy-1', teacher_id: 't1' });
    expect(recordLessonPlays).toHaveBeenCalledWith(['copy-1']);
  });

  it('given a legacy assignLesson, then its lesson is counted as a play', async () => {
    await assignLesson('copy-2', 'c1');
    expect(recordLessonPlays).toHaveBeenCalledWith(['copy-2']);
  });

  it('given a failed insert, then no play is counted', async () => {
    insertResult = { data: null, error: { message: 'rls' } };
    await createAssignment({ classroom_id: 'c1', lesson_id: 'copy-1', teacher_id: 't1' });
    await assignLesson('copy-2', 'c1');
    expect(recordLessonPlays).not.toHaveBeenCalled();
  });
});
