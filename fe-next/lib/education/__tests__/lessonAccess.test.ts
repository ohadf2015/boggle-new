import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { canStudentPracticeLesson } from '../lessonAccess';

type Row = Record<string, unknown>;

/** Minimal service-role double: eq / in / single / thenable over in-memory tables. */
function fakeAdmin(tables: Record<string, Row[]>): SupabaseClient {
  const query = (rows: Row[]) => {
    const q = {
      select: () => q,
      eq: (col: string, val: unknown) => query(rows.filter(r => r[col] === val)),
      in: (col: string, vals: unknown[]) => query(rows.filter(r => vals.includes(r[col]))),
      limit: () => q,
      single: async () => ({ data: rows[0] ?? null, error: rows[0] ? null : { code: 'PGRST116' } }),
      maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
      then: (resolve: (v: { data: Row[]; error: null }) => unknown) => resolve({ data: rows, error: null }),
    };
    return q;
  };
  return { from: (t: string) => query(tables[t] ?? []) } as unknown as SupabaseClient;
}

const base = {
  vocabulary_lessons: [{ id: 'L1', teacher_id: 'T1', classroom_id: 'C-home' }],
  classroom_memberships: [{ student_id: 'S1', classroom_id: 'C-other' }],
};

describe('canStudentPracticeLesson', () => {
  it('allows a member of a classroom the lesson was ASSIGNED to, even if it is not the home classroom', async () => {
    // Given L1 lives in C-home but is assigned to C-other, where S1 is a member
    const admin = fakeAdmin({ ...base, lesson_assignments: [{ lesson_id: 'L1', classroom_id: 'C-other' }] });
    // Then S1 may practise it — the lesson list route already shows it to them
    expect(await canStudentPracticeLesson(admin, 'S1', 'L1')).toBe(true);
  });

  it('refuses a student outside both the home and every assigned classroom', async () => {
    const admin = fakeAdmin({ ...base, lesson_assignments: [{ lesson_id: 'L1', classroom_id: 'C-third' }] });
    expect(await canStudentPracticeLesson(admin, 'S1', 'L1')).toBe(false);
  });

  it('allows a member of the home classroom with no assignment rows', async () => {
    const admin = fakeAdmin({
      ...base,
      classroom_memberships: [{ student_id: 'S1', classroom_id: 'C-home' }],
      lesson_assignments: [],
    });
    expect(await canStudentPracticeLesson(admin, 'S1', 'L1')).toBe(true);
  });

  it('refuses a missing lesson', async () => {
    const admin = fakeAdmin({ ...base, lesson_assignments: [] });
    expect(await canStudentPracticeLesson(admin, 'S1', 'nope')).toBe(false);
  });
});
