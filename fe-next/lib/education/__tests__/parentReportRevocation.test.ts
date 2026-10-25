import { describe, it, expect } from 'vitest';
import { isParentReportRevoked, revokeParentReportLinks } from '../parentReportRevocation';

type Row = { classroom_id: string; student_id: string; revoked_before: string };

/** Answers the one query the checker makes, like PostgREST would: rows for this class and student. */
function fakeAdmin(rows: Row[], opts: { error?: boolean } = {}) {
  const upserts: unknown[] = [];
  return {
    upserts,
    from: () => ({
      select: () => {
        const filters: Record<string, string> = {};
        const q = {
          eq: (col: string, val: string) => {
            filters[col] = val;
            return q;
          },
          then: (resolve: (v: unknown) => void) =>
            resolve(
              opts.error
                ? { data: null, error: { message: 'boom' } }
                : {
                    data: rows.filter((r) => r.classroom_id === filters.classroom_id && r.student_id === filters.student_id),
                    error: null,
                  },
            ),
        };
        return q;
      },
      upsert: async (row: unknown) => {
        upserts.push(row);
        return { error: null };
      },
    }),
  };
}

const T0 = Date.parse('2026-10-01T00:00:00Z');
const payload = (iat?: number) => ({ studentId: 's1', classroomId: 'c1', exp: T0 + 1e9, ...(iat ? { iat } : {}) });

describe('parent report link revocation', () => {
  it('a link with no revocation stays valid', async () => {
    expect(await isParentReportRevoked(fakeAdmin([]) as never, payload(T0))).toBe(false);
  });

  it('a link minted before the teacher revoked is dead', async () => {
    const admin = fakeAdmin([{ classroom_id: 'c1', student_id: 's1', revoked_before: new Date(T0 + 1000).toISOString() }]);
    expect(await isParentReportRevoked(admin as never, payload(T0))).toBe(true);
  });

  it('a link minted after the revocation works', async () => {
    const admin = fakeAdmin([{ classroom_id: 'c1', student_id: 's1', revoked_before: new Date(T0 - 1000).toISOString() }]);
    expect(await isParentReportRevoked(admin as never, payload(T0))).toBe(false);
  });

  it('an old link without an issue time dies on any revocation', async () => {
    const admin = fakeAdmin([{ classroom_id: 'c1', student_id: 's1', revoked_before: new Date(T0 - 1e6).toISOString() }]);
    expect(await isParentReportRevoked(admin as never, payload())).toBe(true);
  });

  it('another student\'s revocation does not touch this link', async () => {
    const admin = fakeAdmin([{ classroom_id: 'c1', student_id: 's2', revoked_before: new Date(T0 + 1000).toISOString() }]);
    expect(await isParentReportRevoked(admin as never, payload(T0))).toBe(false);
  });

  it('keeps reports working before the revocations table is migrated', async () => {
    const admin = {
      from: () => ({
        select: () => {
          const q = { eq: () => q, then: (r: (v: unknown) => void) => r({ data: null, error: { code: 'PGRST205', message: 'Could not find the table' } }) };
          return q;
        },
      }),
    };
    expect(await isParentReportRevoked(admin as never, payload(T0))).toBe(false);
  });

  it('fails closed when the revocation list cannot be read', async () => {
    expect(await isParentReportRevoked(fakeAdmin([], { error: true }) as never, payload(T0))).toBe(true);
  });

  it('revoking stamps now for that student in that class', async () => {
    const admin = fakeAdmin([]);
    await revokeParentReportLinks(admin as never, 'c1', 's1', T0);
    expect(admin.upserts).toEqual([{ classroom_id: 'c1', student_id: 's1', revoked_before: new Date(T0).toISOString() }]);
  });
});
