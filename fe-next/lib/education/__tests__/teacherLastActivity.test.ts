import { describe, expect, it } from 'vitest';
import {
  fetchLastSignIns,
  fetchLatestRoundStarts,
  greatestTimestamp,
  latestRoundStartByTeacher,
} from '../teacherLastActivity';

describe('greatestTimestamp', () => {
  it('returns null when every clock is missing or unparseable', () => {
    expect(greatestTimestamp(null, undefined, '', 'not-a-date')).toBeNull();
  });

  it('picks the latest of last_seen, round start and last sign-in, ignoring nulls', () => {
    expect(
      greatestTimestamp('2026-10-01T00:00:00Z', null, '2026-10-30T15:04:00Z', '2026-10-02T08:00:00Z'),
    ).toBe('2026-10-30T15:04:00Z');
  });

  it('reports the CR teacher last active at the latest round, not the stuck signup last_seen', () => {
    // 13 rounds on 10-30, last_seen_at stuck at signup, sign-in the day after signup.
    const signup = '2026-09-12T11:00:00.000Z';
    const signIn = '2026-09-13T09:00:00.000Z';
    const latestRound = '2026-10-30T16:40:00.000Z';
    expect(greatestTimestamp(signup, latestRound, signIn)).toBe(latestRound);
  });

  it('keeps the original string of the winner so callers can compare it exactly', () => {
    const seen = '2026-10-30T16:40:00Z';
    expect(greatestTimestamp(seen, '2026-10-01T00:00:00.000Z')).toBe(seen);
  });
});

describe('latestRoundStartByTeacher', () => {
  it('keeps the max started_at per teacher and skips null starts', () => {
    const byTeacher = latestRoundStartByTeacher([
      { teacher_id: 'cr', started_at: '2026-10-30T08:00:00Z' },
      { teacher_id: 'cr', started_at: null },
      { teacher_id: 'cr', started_at: '2026-10-30T16:40:00Z' },
      { teacher_id: 'other', started_at: '2026-10-01T00:00:00Z' },
    ]);
    expect(byTeacher.get('cr')).toBe('2026-10-30T16:40:00Z');
    expect(byTeacher.get('other')).toBe('2026-10-01T00:00:00Z');
  });
});

function roundsClient(
  rows: Array<{ id: string; teacher_id: string; started_at: string | null }>,
  error: { code?: string; message: string } | null = null,
) {
  const calls: string[] = [];
  const result = { data: error ? null : rows, error };
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'in', 'order', 'range']) {
    builder[method] = () => builder;
  }
  builder.then = (resolve: (value: unknown) => unknown, reject?: (err: unknown) => unknown) => {
    try {
      return Promise.resolve(resolve(result));
    } catch (err) {
      return Promise.resolve(reject?.(err));
    }
  };
  return {
    calls,
    from: (table: string) => {
      calls.push(table);
      return builder;
    },
    auth: {
      admin: {
        getUserById: async (id: string) => {
          calls.push(`auth:${id}`);
          return { data: { user: { id, last_sign_in_at: id === 'cr' ? '2026-09-13T09:00:00Z' : null } }, error: null };
        },
      },
    },
  };
}

describe('teacher activity signal reads', () => {
  it('joins auth.users by profile id and keeps the latest round start', async () => {
    const client = roundsClient([
      { id: 'r1', teacher_id: 'cr', started_at: '2026-10-30T08:00:00Z' },
      { id: 'r2', teacher_id: 'cr', started_at: '2026-10-30T16:40:00Z' },
    ]);
    const [signIns, rounds] = await Promise.all([
      fetchLastSignIns(client as never, ['cr']),
      fetchLatestRoundStarts(client as never, ['cr']),
    ]);
    expect(client.calls).toContain('auth:cr');
    expect(client.calls).toContain('classroom_rounds');
    expect(signIns.get('cr')).toBe('2026-09-13T09:00:00Z');
    expect(rounds.error).toBeNull();
    expect(rounds.byTeacher.get('cr')).toBe('2026-10-30T16:40:00Z');
  });

  it('treats a missing classroom_rounds table as no round clock, not a hard error', async () => {
    const client = roundsClient([], {
      code: 'PGRST205',
      message: 'Could not find the table public.classroom_rounds in the schema cache',
    });
    const rounds = await fetchLatestRoundStarts(client as never, ['cr']);
    expect(rounds).toEqual({ byTeacher: new Map(), unavailable: true, error: null });
  });

  it('does not throw when the test double has no auth admin client', async () => {
    const signIns = await fetchLastSignIns({ from: () => ({}) } as never, ['cr']);
    expect(signIns.size).toBe(0);
  });

  it('keeps the auth admin binding so a this-sensitive getUserById still returns last_sign_in_at', async () => {
    // supabase-js GoTrueAdminApi.getUserById reads this.fetch. Detaching it throws
    // TypeError('reading fetch'); the catch then drops the sign-in clock entirely
    // (sign-in-only returner, last_seen stuck at signup).
    const admin = {
      fetch: true as const,
      getUserById(id: string) {
        if (!this?.fetch) {
          throw new TypeError("Cannot read properties of undefined (reading 'fetch')");
        }
        return {
          data: { user: { id, last_sign_in_at: '2026-10-27T11:45:33.732099Z' } },
          error: null,
        };
      },
    };
    const signIns = await fetchLastSignIns({ auth: { admin } } as never, ['1f8f47b9']);
    expect(signIns.get('1f8f47b9')).toBe('2026-10-27T11:45:33.732099Z');
  });
});
