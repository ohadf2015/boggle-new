import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * A teacher's roster showed `Player_570b3674`, `Player_979884dc`, `Player_304d1b2d`.
 *
 * Those students were not nameless. `profiles.display_name` held "Victoria Delong",
 * "Ezra Vivier", "Suri Baker" — the roster read only `username`, and `username` defaults to
 * the DB placeholder `'Player_' || substr(id, 1, 8)` (migration 20260504160000) for anyone
 * who never picked a handle. The teacher could not tell one student from another.
 *
 * `lib/displayName.ts` already exists to resolve exactly this, but it needs the candidate:
 * the roster query must SELECT display_name for `resolveDisplayName([display_name, username])`
 * to have anything to prefer.
 */

const selects: string[] = [];

const ROW = {
  id: 'x-1', student_id: 's-1', classroom_id: 'c-1',
  joined_at: '2026-01-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z',
};
const RESULT = () => ({ data: Object.assign([{ ...ROW }], ROW), error: null, count: 1 });

const chainable = (): unknown =>
  new Proxy(function () {} as unknown as Record<string, unknown>, {
    get(_t, prop) {
      if (prop === 'then') return (resolve: (v: unknown) => unknown) => resolve(RESULT());
      if (prop === 'select') {
        return (cols: string) => { selects.push(cols); return chainable(); };
      }
      return () => chainable();
    },
    apply: () => chainable(),
  });

vi.mock('@/lib/supabase', () => ({ supabase: { from: () => chainable() } }));
vi.mock('@/utils/logger', () => ({ default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

import { getClassroomStudents } from '../classrooms';

describe('classroom roster carries a name a teacher can read', () => {
  beforeEach(() => { selects.length = 0; });

  it('selects display_name alongside username so the placeholder can be overridden', async () => {
    await getClassroomStudents('c-1');
    const profileSelect = selects.find((s) => s.includes('username'));
    expect(profileSelect).toBeDefined();
    expect(profileSelect).toContain('display_name');
  });
});
