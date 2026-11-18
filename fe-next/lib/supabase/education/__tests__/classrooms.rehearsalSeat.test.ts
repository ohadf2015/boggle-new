import { vi, describe, it, expect, beforeEach } from 'vitest';

const MEMBERSHIPS = [
  { id: 'm1', classroom_id: 'c1', student_id: 's1', is_rehearsal: false, joined_at: '2026-11-17T00:00:00Z' },
  { id: 'm2', classroom_id: 'c1', student_id: 'phone', is_rehearsal: true, joined_at: '2026-11-17T00:01:00Z' },
];
const TABLES: Record<string, Array<Record<string, unknown>>> = {
  classrooms: [{ id: 'c1', teacher_id: 't1', name: 'Class' }],
  classroom_memberships: MEMBERSHIPS,
};

function query(table: string) {
  let rows = TABLES[table] ?? [];
  let head = false;
  const builder: Record<string, unknown> = {
    select: (_cols?: string, opts?: { head?: boolean }) => {
      head = !!opts?.head;
      return builder;
    },
    eq: (col: string, value: unknown) => {
      rows = rows.filter((r) => r[col] === value);
      return builder;
    },
    in: (col: string, values: unknown[]) => {
      rows = rows.filter((r) => values.includes(r[col]));
      return builder;
    },
    order: () => builder,
    single: async () => ({ data: rows[0] ?? null, error: null }),
    maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
    then: (resolve: (v: unknown) => unknown) =>
      resolve(head ? { count: rows.length, error: null } : { data: rows, error: null }),
  };
  return builder;
}

const mockSupabase = { from: vi.fn(query) };

vi.mock('@/lib/supabase', () => ({
  get supabase() {
    return mockSupabase;
  },
}));
vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { log: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { getClassroom, getClassrooms, getClassroomStudents } from '../classrooms';

describe('teacher phone-test seat is not a student', () => {
  beforeEach(() => mockSupabase.from.mockClear());

  it('GIVEN one student and one phone test WHEN listing classes THEN the class has one student', async () => {
    const { data } = await getClassrooms('t1');
    expect(data?.[0].member_count).toBe(1);
  });

  it('GIVEN one student and one phone test WHEN reading the class THEN it has one student', async () => {
    const { data } = await getClassroom('c1');
    expect(data?.member_count).toBe(1);
  });

  it('GIVEN one student and one phone test WHEN reading the roster THEN the phone is not on it', async () => {
    const { data } = await getClassroomStudents('c1');
    expect(data?.map((s) => s.student_id)).toEqual(['s1']);
  });
});
