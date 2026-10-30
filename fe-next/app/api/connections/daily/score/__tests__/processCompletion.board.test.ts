import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/daily/questSeams', async (orig) => ({
  ...(await orig<typeof import('@/lib/daily/questSeams')>()),
  creditDailyQuests: vi.fn(),
}));

import { processConnectionsCompletion } from '../processCompletion';

const PYRAMID_DAY = '2026-09-07';
const REGULAR_DAY = '2026-09-08';

/** Records every filter call per query so the board scoping is observable. */
function recordingDb(rows: Array<{ data: unknown }>) {
  const queries: Array<{ calls: string[]; head: boolean; update: unknown; insert: unknown }> = [];
  const from = () => {
    const q = { calls: [] as string[], head: false, update: null as unknown, insert: null as unknown };
    queries.push(q);
    const b: Record<string, unknown> = {
      select: (_c: unknown, o?: { head?: boolean }) => ((q.head = !!o?.head), b),
      eq: (c: string, v: unknown) => (q.calls.push(`eq:${c}=${v}`), b),
      in: (c: string, v: unknown[]) => (q.calls.push(`in:${c}=${v.join(',')}`), b),
      not: (c: string, op: string, v: string) => (q.calls.push(`not:${c}:${op}:${v}`), b),
      or: (f: string) => (q.calls.push(`or:${f}`), b),
      insert: (r: unknown) => ((q.insert = r), b),
      update: (r: unknown) => ((q.update = r), b),
      maybeSingle: () => Promise.resolve(rows.shift() ?? { data: null }),
      then: (res: (v: unknown) => unknown) => Promise.resolve(q.insert || q.update ? { error: null } : { count: 0 }).then(res),
    };
    return b;
  };
  return { db: { from }, queries };
}

function sub(over: Partial<{ puzzleDate: string; language: string; score: number }> = {}) {
  return { puzzleDate: REGULAR_DAY, language: 'en', displayName: 'Ann', score: 300, timeTakenSeconds: 60, puzzlesSolved: 2, ...over };
}

async function run(s: ReturnType<typeof sub>, rows: Array<{ data: unknown }>) {
  const { db, queries } = recordingDb(rows);
  const result = await processConnectionsCompletion(s, {
    sub: s,
    idCol: 'player_id',
    idVal: 'p1',
    userIdForRow: 'p1',
    guestIdForRow: null,
    profile: null,
    avatarOverrides: {},
    admin: db,
  });
  return { result, queries };
}

describe('processConnectionsCompletion — one language per day', () => {
  it('a better run in a second language does not overwrite the first', async () => {
    const { result, queries } = await run(sub({ language: 'he', score: 900 }), [
      { data: null },
      { data: { id: 'r1', score: 100, time_taken_seconds: 90, language: 'en' } },
    ]);
    expect(result.ok && result.body.action).toBe('keep');
    expect(result.ok && result.body.score).toBe(100);
    expect(queries.some((q) => q.update || q.insert)).toBe(false);
  });
});

describe('processConnectionsCompletion — pyramid rows stay off the chain board', () => {
  const countQueries = (qs: Awaited<ReturnType<typeof run>>['queries']) => qs.filter((q) => q.head);

  it('a chain run on a pyramid day ranks only against chain rows', async () => {
    const { queries } = await run(sub({ puzzleDate: PYRAMID_DAY, language: 'sv' }), [{ data: null }, { data: null }]);
    const counts = countQueries(queries);
    expect(counts).toHaveLength(2);
    for (const q of counts) expect(q.calls).toContain('not:language:in:(en,he)');
  });

  it('a pyramid run ranks only against pyramid rows', async () => {
    const { queries } = await run(sub({ puzzleDate: PYRAMID_DAY, language: 'en' }), [{ data: null }, { data: null }]);
    for (const q of countQueries(queries)) expect(q.calls).toContain('in:language=en,he');
  });

  it('a regular day is unscoped', async () => {
    const { queries } = await run(sub(), [{ data: null }, { data: null }]);
    for (const q of countQueries(queries)) expect(q.calls.some((c) => c.startsWith('not:') || c.startsWith('in:'))).toBe(false);
  });
});
