import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/logger', () => ({ default: { error: vi.fn(), warn: vi.fn(), log: vi.fn(), info: vi.fn() } }));

import { claimSend, releaseSend, loadLedger, lastSendAt, writeHeartbeat, readHeartbeat } from '../lifecycleLedger';

type Row = Record<string, unknown>;

function fakeDb(seed: Record<string, Row[]> = {}, failOn?: string) {
  const tables: Record<string, Row[]> = { teacher_lifecycle_sends: [], cron_heartbeats: [], ...seed };
  const keyOf = (t: string, r: Row) => (t === 'cron_heartbeats' ? String(r.job) : `${r.user_id}|${r.kind}|${r.period_key}`);
  const db = {
    tables,
    from(table: string) {
      const filters: Array<(r: Row) => boolean> = [];
      const q: Record<string, unknown> = {};
      const run = () => (tables[table] ?? []).filter((r) => filters.every((f) => f(r)));
      Object.assign(q, {
        select: () => q,
        eq: (c: string, v: unknown) => { filters.push((r) => r[c] === v); return q; },
        in: (c: string, vs: unknown[]) => { filters.push((r) => vs.includes(r[c])); return q; },
        order: () => q,
        range: () => q,
        limit: () => q,
        maybeSingle: async () => ({ data: run()[0] ?? null, error: null }),
        then: (ok: (v: unknown) => unknown) => Promise.resolve(failOn === `${table}:select` ? { data: null, error: { message: 'down' } } : { data: run(), error: null }).then(ok),
        upsert: (row: Row, opts: { ignoreDuplicates?: boolean }) => {
          if (failOn === `${table}:upsert`) return { select: async () => ({ data: null, error: { message: 'down' } }), then: (ok: (v: unknown) => unknown) => Promise.resolve({ error: { message: 'down' } }).then(ok) };
          const k = keyOf(table, row);
          const existing = tables[table].findIndex((r) => keyOf(table, r) === k);
          let inserted: Row[] = [];
          if (existing >= 0) {
            if (!opts?.ignoreDuplicates) tables[table][existing] = { ...tables[table][existing], ...row };
          } else {
            tables[table].push({ sent_at: new Date().toISOString(), ...row });
            inserted = [row];
          }
          return { select: async () => ({ data: inserted, error: null }), then: (ok: (v: unknown) => unknown) => Promise.resolve({ error: null }).then(ok) };
        },
        delete: () => {
          const del: Record<string, unknown> = {};
          const dfilters: Array<(r: Row) => boolean> = [];
          Object.assign(del, {
            eq: (c: string, v: unknown) => { dfilters.push((r) => r[c] === v); return del; },
            then: (ok: (v: unknown) => unknown) => {
              tables[table] = tables[table].filter((r) => !dfilters.every((f) => f(r)));
              return Promise.resolve({ error: null }).then(ok);
            },
          });
          return del;
        },
      });
      return q;
    },
  };
  return db;
}

describe('lifecycle ledger', () => {
  let db: ReturnType<typeof fakeDb>;
  beforeEach(() => { db = fakeDb(); });

  it('Given two runs claim the same teacher-week, Then only the first wins', async () => {
    const key = { userId: 't1', kind: 'weekly_digest', periodKey: '2026-W43' };
    expect(await claimSend(db as never, key)).toBe(true);
    expect(await claimSend(db as never, key)).toBe(false);
  });

  it('Given a failed send releases its claim, Then the next run can send', async () => {
    const key = { userId: 't1', kind: 'weekly_digest', periodKey: '2026-W43' };
    await claimSend(db as never, key);
    await releaseSend(db as never, key);
    expect(await claimSend(db as never, key)).toBe(true);
  });

  it('Given the ledger write fails, Then claiming throws instead of sending unrecorded', async () => {
    const broken = fakeDb({}, 'teacher_lifecycle_sends:upsert');
    await expect(claimSend(broken as never, { userId: 't1', kind: 'k', periodKey: 'p' })).rejects.toThrow();
  });

  it('Given prior sends, Then loadLedger and lastSendAt see them per teacher', async () => {
    db = fakeDb({ teacher_lifecycle_sends: [
      { user_id: 't1', kind: 'nudge:share_code', period_key: 'once', sent_at: '2026-10-20T08:00:00Z' },
      { user_id: 't1', kind: 'weekly_digest', period_key: '2026-W43', sent_at: '2026-10-19T08:00:00Z' },
      { user_id: 't2', kind: 'nudge:start_live', period_key: 'once', sent_at: '2026-10-01T08:00:00Z' },
    ] });
    const rows = await loadLedger(db as never, ['t1']);
    expect(rows.map((r) => r.kind).sort()).toEqual(['nudge:share_code', 'weekly_digest']);
    expect(lastSendAt(rows, 't1', (k) => k.startsWith('nudge:'))).toBe('2026-10-20T08:00:00Z');
    expect(lastSendAt(rows, 't2', () => true)).toBeNull();
  });

  it('Given a ledger read failure, Then it throws (an unknown ledger must not re-send)', async () => {
    const broken = fakeDb({}, 'teacher_lifecycle_sends:select');
    await expect(loadLedger(broken as never, ['t1'])).rejects.toThrow();
  });

  it('Given a heartbeat write, Then readHeartbeat returns its time', async () => {
    await writeHeartbeat(db as never, 'teacher-weekly-digest', { sent: 3 }, new Date('2026-10-26T08:00:00Z'));
    expect(await readHeartbeat(db as never, 'teacher-weekly-digest')).toBe('2026-10-26T08:00:00.000Z');
  });
});
