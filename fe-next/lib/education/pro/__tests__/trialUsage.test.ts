import { describe, it, expect } from 'vitest';
import { clampTrialSince, readTrialUsage, trialStartFromExpiry, type TrialUsageDb } from '../trialUsage';

type Result = { data?: unknown; count?: number | null; error?: unknown };

function fakeDb(tables: Record<string, Result>) {
  const calls: Array<{ table: string; ops: Array<[string, unknown[]]> }> = [];
  const db = {
    from(table: string) {
      const entry = { table, ops: [] as Array<[string, unknown[]]> };
      calls.push(entry);
      const builder: Record<string, unknown> = {};
      for (const op of ['select', 'eq', 'in', 'gte', 'lt', 'limit', 'is']) {
        builder[op] = (...args: unknown[]) => {
          entry.ops.push([op, args]);
          return builder;
        };
      }
      builder.then = (resolve: (r: Result) => unknown) => resolve(tables[table] ?? { data: [], count: 0, error: null });
      return builder;
    },
  };
  return { db: db as unknown as TrialUsageDb, calls };
}

const SINCE = '2026-11-22T00:00:00.000Z';

describe('readTrialUsage', () => {
  it('Given a teacher with two classes, When read, Then it counts games and practice since the trial start and distinct roster students', async () => {
    const { db, calls } = fakeDb({
      classrooms: { data: [{ id: 'c1' }, { id: 'c2' }], error: null },
      classroom_rounds: { count: 7, error: null },
      classroom_memberships: { data: [{ student_id: 's1' }, { student_id: 's2' }, { student_id: 's1' }, { student_id: null }], error: null },
      practice_sessions: { count: 90, error: null },
    });
    await expect(readTrialUsage(db, 't1', SINCE)).resolves.toEqual({ games: 7, students: 2, practice: 90 });
    const rounds = calls.find((c) => c.table === 'classroom_rounds')!;
    expect(rounds.ops).toContainEqual(['eq', ['teacher_id', 't1']]);
    expect(rounds.ops).toContainEqual(['gte', ['completed_at', SINCE]]);
    const practice = calls.find((c) => c.table === 'practice_sessions')!;
    expect(practice.ops).toContainEqual(['in', ['classroom_id', ['c1', 'c2']]]);
    expect(practice.ops).toContainEqual(['gte', ['completed_at', SINCE]]);
    expect(practice.ops).toContainEqual(['is', ['results->>gameCode', null]]);
    const trialEnd = new Date(Date.parse(SINCE) + 14 * 24 * 60 * 60 * 1000).toISOString();
    expect(rounds.ops).toContainEqual(['lt', ['completed_at', trialEnd]]);
    expect(practice.ops).toContainEqual(['lt', ['completed_at', trialEnd]]);
    expect(calls.find((c) => c.table === 'classrooms')!.ops).toContainEqual(['eq', ['teacher_id', 't1']]);
  });

  it('Given no classes, When read, Then roster and practice are zero without querying them', async () => {
    const { db, calls } = fakeDb({ classrooms: { data: [], error: null }, classroom_rounds: { count: 0, error: null } });
    await expect(readTrialUsage(db, 't1', SINCE)).resolves.toEqual({ games: 0, students: 0, practice: 0 });
    expect(calls.map((c) => c.table)).not.toContain('practice_sessions');
  });

  it('Given a read error, When read, Then it throws instead of reporting zero', async () => {
    const { db } = fakeDb({
      classrooms: { data: [{ id: 'c1' }], error: null },
      practice_sessions: { count: null, error: { message: 'boom' } },
    });
    await expect(readTrialUsage(db, 't1', SINCE)).rejects.toBeTruthy();
  });
});

describe('trial window', () => {
  const now = Date.parse('2026-11-30T00:00:00Z');
  it('Given a trial ending 12-06, When the start is derived, Then it is 14 days earlier', () => {
    expect(trialStartFromExpiry('2026-12-06T00:00:00Z')).toBe('2026-11-22T00:00:00.000Z');
    expect(trialStartFromExpiry('nope')).toBeNull();
  });
  it('Given a since far in the past or future or invalid, When clamped, Then it stays within the last 31 days', () => {
    expect(clampTrialSince('2026-11-22T00:00:00Z', now)).toBe('2026-11-22T00:00:00.000Z');
    expect(clampTrialSince('2020-01-01T00:00:00Z', now)).toBe('2026-10-30T00:00:00.000Z');
    expect(clampTrialSince('2027-01-01T00:00:00Z', now)).toBeNull();
    expect(clampTrialSince(null, now)).toBeNull();
  });
});
