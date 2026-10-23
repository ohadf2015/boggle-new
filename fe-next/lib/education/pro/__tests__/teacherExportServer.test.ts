import { describe, it, expect, vi } from 'vitest';

vi.mock('@/utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { readTeacherExportRows } from '../teacherExportServer';

type Rows = Record<string, Record<string, unknown>[]>;

function client(tables: Rows, failOn?: string) {
  const teacherFilter: string[] = [];
  const sb = {
    from: (table: string) => ({
      select: () => ({
        eq: async (_col: string, id: string) => {
          teacherFilter.push(id);
          return { data: tables[table] ?? [], error: null };
        },
        in: () => ({
          order: () => ({
            range: async (from: number) =>
              failOn === table
                ? { data: null, error: { message: `${table} denied` } }
                : { data: from === 0 ? tables[table] ?? [] : [], error: null },
          }),
        }),
      }),
    }),
  };
  return { sb, teacherFilter };
}

const full: Rows = {
  classrooms: [{ id: 'c1', name: '7A' }],
  classroom_memberships: [{ classroom_id: 'c1', student_id: 's1' }],
  lesson_assignments: [{ classroom_id: 'c1', lesson_id: 'l1' }],
  public_profiles: [{ id: 's1', display_name: 'Ada', username: null }],
  student_lesson_progress: [
    { student_id: 's1', lesson_id: 'l1', total_xp: 40, words_mastered: ['cat', 'dog'], last_practice_date: '2026-10-20', completed_at: '2026-10-20T10:00:00Z' },
  ],
  practice_sessions: [{ student_id: 's1', lesson_id: 'l1', completed_at: '2026-10-21T09:00:00Z' }],
};

describe('readTeacherExportRows', () => {
  it('given a teacher with one class and one student, then it returns that student row from the request client', async () => {
    const { sb, teacherFilter } = client(full);
    const { data, error } = await readTeacherExportRows(sb as never, 't1');
    expect(error).toBeNull();
    expect(teacherFilter).toEqual(['t1']);
    expect(data).toEqual([
      expect.objectContaining({ classroomName: '7A', studentName: 'Ada', totalXp: 40, wordsMastered: 2, lessonsCompleted: 1 }),
    ]);
  });

  it('given a teacher with no classes, then it returns no rows and no error', async () => {
    const { sb } = client({ classrooms: [] });
    await expect(readTeacherExportRows(sb as never, 't1')).resolves.toEqual({ data: [], error: null });
  });

  it('given a read that fails, then it reports the error instead of a short file', async () => {
    const { sb } = client(full, 'student_lesson_progress');
    const { data, error } = await readTeacherExportRows(sb as never, 't1');
    expect(data).toEqual([]);
    expect(error?.message).toBe('student_lesson_progress denied');
  });
});
