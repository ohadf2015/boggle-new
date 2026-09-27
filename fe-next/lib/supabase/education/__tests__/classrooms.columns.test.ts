import { vi, describe, it, expect, beforeEach } from 'vitest';
/**
 * The teacher dashboard's first paint reads classrooms through
 * `getClassrooms`. It must name its columns rather than `select('*')`, so a
 * future wide column on `classrooms` cannot silently land in that first paint.
 */

const mockSupabase = { from: vi.fn() };

vi.mock('@/lib/supabase', () => ({
  get supabase() {
    return mockSupabase;
  },
}));
vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { log: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { getClassrooms } from '../classrooms';

/** Every column the `Classroom` type in lib/supabase/education/types.ts declares. */
const CLASSROOM_COLUMNS = [
  'id',
  'teacher_id',
  'name',
  'join_code',
  'language',
  'created_at',
  'updated_at',
];

describe('getClassrooms — explicit column list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('names the columns the Classroom type declares, and no star', async () => {
    const selectArgs: (string | undefined)[] = [];
    mockSupabase.from.mockImplementation((table: string) => {
      const builder: Record<string, unknown> = {
        select: (cols?: string) => {
          if (table === 'classrooms') selectArgs.push(cols);
          return builder;
        },
        eq: () => builder,
        in: () => builder,
        order: () => builder,
        then: (onOk: (v: unknown) => unknown) =>
          Promise.resolve({
            data: table === 'classrooms' ? [{ id: 'c1', name: 'ELA' }] : [{ classroom_id: 'c1' }],
            error: null,
          }).then(onOk),
      };
      return builder;
    });

    const result = await getClassrooms('teacher-1');

    expect(result.error).toBeNull();
    expect(selectArgs).toHaveLength(1);
    expect(selectArgs[0]).not.toBe('*');
    for (const column of CLASSROOM_COLUMNS) {
      expect(selectArgs[0]).toContain(column);
    }
  });

  it('still returns classrooms with their member counts', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: () => builder,
        in: () => builder,
        order: () => builder,
        then: (onOk: (v: unknown) => unknown) =>
          Promise.resolve({
            data:
              table === 'classrooms'
                ? [{ id: 'c1', name: 'ELA' }]
                : [{ classroom_id: 'c1' }, { classroom_id: 'c1' }],
            error: null,
          }).then(onOk),
      };
      return builder;
    });

    const result = await getClassrooms('teacher-1');

    expect(result.data).toHaveLength(1);
    expect(result.data[0].member_count).toBe(2);
  });
});
