import { describe, it, expect, vi } from 'vitest';
import { readClassAnalytics } from '../classAnalyticsServer';

const today = new Date().toISOString().split('T')[0];

function client(tables: Record<string, { data: unknown; error: unknown }>) {
  return {
    from: vi.fn((table: string) => {
      const result = tables[table];
      const q: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'neq', 'in', 'gte', 'order', 'range']) q[m] = vi.fn(() => q);
      q.then = (resolve: (v: unknown) => unknown) => resolve(result);
      return q;
    }),
  };
}

describe('readClassAnalytics', () => {
  it('returns zeroed metrics for a class with no students', async () => {
    const sb = client({ classroom_memberships: { data: [], error: null } });
    const { data } = await readClassAnalytics(sb as never, 'c1', 'teacher-1');
    expect(data).toEqual({
      studentsNeedingHelp: 0, classAverageXp: 0, activeStudentsToday: 0, weeklyEngagement: 0, totalStudents: 0, commonMistakes: [],
    });
  });

  it('counts struggling and active students and ranks the most-missed words', async () => {
    const sb = client({
      classroom_memberships: { data: [{ student_id: 'a' }, { student_id: 'b' }], error: null },
      vocabulary_lessons: { data: [{ id: 'l1' }], error: null },
      lesson_assignments: { data: [], error: null },
      student_lesson_progress: {
        data: [
          { id: 'p1', lesson_id: 'l1', student_id: 'a', total_xp: 30, last_practice_date: today, words_attempted: { desk: { attempts: 4, correct: 0 }, pen: { attempts: 2, correct: 2 } } },
          { id: 'p2', lesson_id: 'l1', student_id: 'b', total_xp: 50, last_practice_date: '2000-01-01', words_attempted: { desk: { attempts: 2, correct: 1 } } },
        ],
        error: null,
      },
    });
    const { data, error } = await readClassAnalytics(sb as never, 'c1', 'teacher-1');
    expect(error).toBeNull();
    expect(data?.totalStudents).toBe(2);
    expect(data?.studentsNeedingHelp).toBe(1);
    expect(data?.activeStudentsToday).toBe(1);
    expect(data?.commonMistakes).toEqual([{ word: 'desk', errorRate: 5 / 6, studentCount: 2 }]);
  });

  it('surfaces a read error instead of empty metrics', async () => {
    const sb = client({ classroom_memberships: { data: null, error: { message: 'rls' } } });
    const { data, error } = await readClassAnalytics(sb as never, 'c1', 'teacher-1');
    expect(data).toBeNull();
    expect(error).toEqual({ message: 'rls' });
  });
});

type Row = Record<string, unknown>;

/** PostgREST-like double: real filters, ordering, .range, and the 1000-row cap. */
function postgrest(tables: Record<string, Row[]>) {
  return {
    from(table: string) {
      const filters: Array<(r: Row) => boolean> = [];
      let orderCol: string | null = null;
      let window: [number, number] | null = null;
      const q: Record<string, unknown> = {
        select: () => q,
        eq: (c: string, v: unknown) => { filters.push((r) => r[c] === v); return q; },
        neq: (c: string, v: unknown) => { filters.push((r) => r[c] !== v); return q; },
        in: (c: string, vs: unknown[]) => { filters.push((r) => vs.includes(r[c])); return q; },
        order: (c: string) => { orderCol = c; return q; },
        range: (a: number, b: number) => { window = [a, b]; return q; },
        then: (resolve: (v: unknown) => unknown) => {
          let rows = (tables[table] ?? []).filter((r) => filters.every((f) => f(r)));
          if (orderCol) rows = [...rows].sort((x, y) => String(x[orderCol!]).localeCompare(String(y[orderCol!])));
          const [a, b] = window ?? [0, rows.length - 1];
          return resolve({ data: rows.slice(a, Math.min(b + 1, a + 1000)), error: null });
        },
      };
      return q;
    },
  };
}

describe('readClassAnalytics — big classes, class scope, teacher seat', () => {
  const students = Array.from({ length: 60 }, (_, i) => `s${String(i).padStart(2, '0')}`);
  const lessons = Array.from({ length: 30 }, (_, i) => `l${String(i).padStart(2, '0')}`);
  const progress: Row[] = [];
  for (const s of students) {
    for (const l of lessons) {
      progress.push({
        id: `${s}-${l}`, student_id: s, lesson_id: l, total_xp: 1, last_practice_date: '2000-01-01',
        words_attempted: l === 'l29' ? { trap: { attempts: 1, correct: 0 }, old: null } : { [`ok-${l}`]: { attempts: 1, correct: 1 } },
      });
    }
    progress.push({
      id: `${s}-other`, student_id: s, lesson_id: 'other-teacher-lesson', total_xp: 999, last_practice_date: '2000-01-01',
      words_attempted: { foreign: { attempts: 9, correct: 0 } },
    });
  }
  const sb = postgrest({
    classroom_memberships: [
      ...students.map((s, i) => ({ id: `m${i}`, classroom_id: 'c1', student_id: s })),
      { id: 'm-teacher', classroom_id: 'c1', student_id: 'teacher-1' },
    ],
    vocabulary_lessons: [
      ...lessons.map((l) => ({ id: l, teacher_id: 'teacher-1' })),
      { id: 'other-teacher-lesson', teacher_id: 'teacher-2' },
      { id: 'library-lesson', teacher_id: 'library-owner' },
    ],
    lesson_assignments: [{ id: 'a1', classroom_id: 'c1', lesson_id: 'library-lesson' }],
    student_lesson_progress: [
      ...progress,
      { id: 'zz-lib', student_id: 's00', lesson_id: 'library-lesson', total_xp: 0, last_practice_date: '2000-01-01', words_attempted: { shelf: { attempts: 3, correct: 0 } } },
    ],
  });

  it('Given 60 students x 30 lessons (1800 rows), Then every student is counted in the class mistake, not the first 1000 rows', async () => {
    const { data, error } = await readClassAnalytics(sb as never, 'c1', 'teacher-1');
    expect(error).toBeNull();
    expect(data?.commonMistakes.find((m) => m.word === 'trap')).toEqual({ word: 'trap', errorRate: 1, studentCount: 60 });
  });

  it('Given the teacher preview seat in the roster, Then totalStudents counts only the 60 students', async () => {
    const { data } = await readClassAnalytics(sb as never, 'c1', 'teacher-1');
    expect(data?.totalStudents).toBe(60);
  });

  it('Given students also in another teacher class, Then that lesson never feeds this class', async () => {
    const { data } = await readClassAnalytics(sb as never, 'c1', 'teacher-1');
    expect(data?.commonMistakes.map((m) => m.word)).not.toContain('foreign');
  });

  it('Given a library lesson owned by someone else but assigned to this class, Then it still counts', async () => {
    const { data } = await readClassAnalytics(sb as never, 'c1', 'teacher-1');
    expect(data?.commonMistakes.map((m) => m.word)).toContain('shelf');
  });
});
