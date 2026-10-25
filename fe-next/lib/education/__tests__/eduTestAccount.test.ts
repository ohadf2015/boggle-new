import { describe, it, expect, vi } from 'vitest';

vi.mock('@/utils/logger', () => ({ default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

import { loadTestAccountIds } from '../eduTestAccount';

function fakeProfiles(rows: Array<{ id: string; is_test_account: boolean }>, error: { message: string } | null = null) {
  const calls: Array<{ ids: string[] }> = [];
  const sb = {
    from: (table: string) => {
      expect(table).toBe('profiles');
      return {
        select: () => ({
          in: (_col: string, ids: string[]) => {
            calls.push({ ids });
            return {
              eq: async () =>
                error ? { data: null, error } : { data: rows.filter((r) => ids.includes(r.id) && r.is_test_account), error: null },
            };
          },
        }),
      };
    },
  };
  return { sb, calls };
}

describe('loadTestAccountIds', () => {
  it('Given a flagged teacher and an unflagged student, When resolved, Then only the flagged id comes back', async () => {
    const { sb } = fakeProfiles([
      { id: 'teacher-qa', is_test_account: true },
      { id: 'student-real', is_test_account: false },
    ]);
    const ids = await loadTestAccountIds(sb as never, ['teacher-qa', 'student-real']);
    expect([...ids]).toEqual(['teacher-qa']);
  });

  it('Given null and duplicate ids, When resolved, Then they are dropped before the query and empty input skips it', async () => {
    const { sb, calls } = fakeProfiles([]);
    await loadTestAccountIds(sb as never, ['a', null, 'a', undefined, '']);
    expect(calls).toEqual([{ ids: ['a'] }]);
    await loadTestAccountIds(sb as never, [null]);
    expect(calls).toHaveLength(1);
  });

  it('Given the profiles read fails, When resolved, Then it reports nothing flagged and logs the error', async () => {
    const logger = (await import('@/utils/logger')).default;
    const { sb } = fakeProfiles([], { message: 'boom' });
    const ids = await loadTestAccountIds(sb as never, ['x']);
    expect(ids.size).toBe(0);
    expect(logger.error).toHaveBeenCalled();
  });

  it('Given no client, When resolved, Then nothing is flagged', async () => {
    expect((await loadTestAccountIds(null, ['x'])).size).toBe(0);
  });
});
