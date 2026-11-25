import { describe, it, expect } from 'vitest';
import { readAssignmentProgressMatrix } from '../assignmentProgressMatrixServer';

/** Chainable PostgREST double: every builder method returns the builder, awaiting it resolves the table's rows. */
function sbDouble(tables: Record<string, { data: unknown; error?: { message: string } | null }>) {
  return {
    from(table: string) {
      const t = tables[table] ?? { data: [], error: null };
      const builder: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'in', 'order', 'not', 'limit']) builder[m] = () => builder;
      builder.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve({ data: t.data, error: t.error ?? null }).then(resolve);
      return builder;
    },
  } as never;
}

describe('readAssignmentProgressMatrix', () => {
  it('reads started-but-unfinished progress rows as started cells, never as completions', async () => {
    const sb = sbDouble({
      lesson_assignments: {
        data: [
          {
            id: 'a1',
            title: 'HW 1',
            due_date: '2026-10-06',
            created_at: '2026-10-01T00:00:00Z',
            vocabulary_lessons: { name: 'Lesson 1' },
          },
        ],
      },
      classroom_memberships: {
        data: [
          { student_id: 's1', roster_name: 'Ada' },
          { student_id: 's2', roster_name: 'Ben' },
        ],
      },
      public_profiles: { data: [] },
      student_lesson_progress: {
        data: [
          { student_id: 's1', assignment_id: 'a1', completed_at: '2026-10-02T00:00:00Z', words_attempted: null },
          // Started, not finished — partial words must not become a score.
          { student_id: 's2', assignment_id: 'a1', completed_at: null, words_attempted: { cat: { attempts: 2, correct: 1 } } },
        ],
      },
    });

    const { data, error } = await readAssignmentProgressMatrix(sb, 'cls-1');
    expect(error).toBeNull();
    const ada = data!.rows.find((r) => r.studentId === 's1')!;
    const ben = data!.rows.find((r) => r.studentId === 's2')!;
    expect(ada.cells[0]).toEqual({ completed: true, started: true, correctness: 100 });
    expect(ben.cells[0]).toEqual({ completed: false, started: true, correctness: null });
  });

  it('a student with no progress row reads not-started', async () => {
    const sb = sbDouble({
      lesson_assignments: {
        data: [{ id: 'a1', title: 'HW 1', due_date: null, created_at: '2026-10-01T00:00:00Z', vocabulary_lessons: null }],
      },
      classroom_memberships: { data: [{ student_id: 's1', roster_name: 'Ada' }] },
      public_profiles: { data: [] },
      student_lesson_progress: { data: [] },
    });
    const { data } = await readAssignmentProgressMatrix(sb, 'cls-1');
    expect(data!.rows[0].cells[0]).toEqual({ completed: false, started: false, correctness: null });
  });
});
