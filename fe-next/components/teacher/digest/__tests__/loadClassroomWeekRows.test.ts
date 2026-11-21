import { describe, expect, it } from 'vitest';
import { loadClassroomWeekRows } from '../loadClassroomWeekRows';

const NOW = Date.parse('2026-11-21T12:00:00.000Z');

function table(rows: Record<string, unknown>[], fail?: string) {
  const filters: Array<(row: Record<string, unknown>) => boolean> = [];
  const api = {
    select() { return api; },
    in(col: string, vals: unknown[]) {
      const set = new Set(vals);
      filters.push((row) => set.has(row[col]));
      return api;
    },
    gte(col: string, val: unknown) {
      filters.push((row) => String(row[col]) >= String(val));
      return api;
    },
    not() { return api; },
    order() { return api; },
    limit() { return api; },
    then(resolve: (value: unknown) => unknown) {
      const value = fail
        ? { data: null, error: { message: fail } }
        : { data: rows.filter((row) => filters.every((fn) => fn(row))), error: null };
      return Promise.resolve(value).then(resolve);
    },
  };
  return api;
}

describe('loadClassroomWeekRows', () => {
  it('GIVEN roster, progress totals and a recent classroom game WHEN loaded THEN the focused class digest and the quiet flag come from those rows', async () => {
    const db = {
      from(name: string) {
        if (name === 'classroom_memberships') {
          return table([
            { classroom_id: 'class-a', student_id: 'stu-1' },
            { classroom_id: 'class-a', student_id: 'stu-2' },
          ]);
        }
        if (name === 'student_lesson_progress') {
          return table([
            { student_id: 'stu-1', lesson_id: 'lesson-1', total_xp: 600, total_practice_sessions: 4, last_practice_date: '2026-11-21' },
            { student_id: 'other', lesson_id: 'lesson-9', total_xp: 9000, total_practice_sessions: 40, last_practice_date: '2026-11-21' },
          ]);
        }
        return table([{ classroom_id: 'class-a', completed_at: '2026-11-20T08:00:00.000Z' }]);
      },
    };

    const loaded = await loadClassroomWeekRows(db, ['class-a'], NOW);

    expect(loaded.error).toBeNull();
    expect(loaded.summary.byClass['class-a']).toMatchObject({ studentsPracticed: 1, practiceSessions: 4, awardsEarned: 2 });
    expect(loaded.summary.quietFor7Days).toBe(false);
  });

  it('GIVEN the progress read fails WHEN loaded THEN the error is returned and the teacher is not marked quiet', async () => {
    const db = {
      from(name: string) {
        if (name === 'classroom_memberships') return table([{ classroom_id: 'class-a', student_id: 'stu-1' }]);
        if (name === 'student_lesson_progress') return table([], 'permission denied');
        return table([]);
      },
    };

    const loaded = await loadClassroomWeekRows(db, ['class-a'], NOW);

    expect(loaded.error).toBe('permission denied');
    expect(loaded.summary.quietFor7Days).toBe(false);
  });

  it('GIVEN no classrooms WHEN loaded THEN it does not query and does not call the teacher quiet', async () => {
    let queried = false;
    const db = { from() { queried = true; return table([]); } };

    const loaded = await loadClassroomWeekRows(db, [], NOW);

    expect(queried).toBe(false);
    expect(loaded.error).toBeNull();
    expect(loaded.summary.byClass).toEqual({});
    expect(loaded.summary.quietFor7Days).toBe(false);
  });

  it('GIVEN the practice read fills the page WHEN loaded THEN that is a failed read, not a quiet week', async () => {
    const db = {
      from(name: string) {
        if (name === 'classroom_memberships') return table([{ classroom_id: 'class-a', student_id: 'stu-1' }]);
        if (name === 'student_lesson_progress') {
          return table([
            { student_id: 'stu-1', lesson_id: 'lesson-1', total_xp: 10, total_practice_sessions: 1, last_practice_date: '2026-11-21' },
            { student_id: 'stu-1', lesson_id: 'lesson-2', total_xp: 10, total_practice_sessions: 1, last_practice_date: '2026-11-21' },
          ]);
        }
        return table([]);
      },
    };

    const loaded = await loadClassroomWeekRows(db, ['class-a'], NOW, 2);

    expect(loaded.error).toMatch(/truncated/);
    expect(loaded.summary.quietFor7Days).toBe(false);
  });
});
