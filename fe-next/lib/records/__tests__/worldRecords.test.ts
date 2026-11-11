import { describe, it, expect, vi } from 'vitest';
import { getWorldRecords } from '../worldRecords';
import { isRecordHolder, gapToRecord, recordsHeldBy } from '../worldRecordTypes';

vi.mock('@/backend/utils/profanityFilter', () => ({ isProfane: (s: string) => s.toLowerCase().includes('badword') }));

type Rows = Record<string, unknown[]>;

function fakeDb(rows: Rows, calls: Array<{ table: string; op: string; args: unknown[] }> = []) {
  return {
    calls,
    from(table: string) {
      const chain: Record<string, unknown> = {};
      const record = (op: string) => (...args: unknown[]) => {
        calls.push({ table, op, args });
        return chain;
      };
      for (const op of ['select', 'eq', 'in', 'order']) chain[op] = record(op);
      chain.limit = (...args: unknown[]) => {
        calls.push({ table, op: 'limit', args });
        return Promise.resolve({ data: rows[table] ?? [], error: null });
      };
      return chain;
    },
  };
}

const rec = (over: Record<string, unknown>) => ({
  record_key: 'qp_classic',
  mode: 'quickPlay',
  holder_id: 'u1',
  holder_name: 'Maya',
  score: 918,
  set_at: '2026-11-09T10:00:00Z',
  previous_holder_id: null,
  previous_score: null,
  ...over,
});

describe('getWorldRecords', () => {
  it('returns records in hall-of-fame order with the holder look and title', async () => {
    const db = fakeDb({
      game_records: [rec({ record_key: 'blast', mode: 'blast', holder_id: 'u2', holder_name: 'Ari', score: 1705 }), rec({})],
      profiles: [
        { id: 'u1', avatar_config: { a: 1 }, chosen_title: 'wordsmith', current_level: 30 },
        { id: 'u2', avatar_config: null, chosen_title: null, current_level: 12 },
      ],
    });
    const out = await getWorldRecords(db as never);
    expect(out.map((r) => r.recordKey)).toEqual(['qp_classic', 'blast']);
    expect(out[0]).toMatchObject({ holderId: 'u1', holderName: 'Maya', score: 918, unit: 'points', labelKey: 'worldRecords.modes.qp_classic', title: 'wordsmith', avatarConfig: { a: 1 } });
    expect(out[1].title).toBeTruthy();
  });

  it('drops a record whose stored name is no longer public', async () => {
    const db = fakeDb({ game_records: [rec({ holder_name: 'badword99' })], profiles: [] });
    expect(await getWorldRecords(db as never)).toEqual([]);
  });

  it('drops rows for record keys the app no longer knows', async () => {
    const db = fakeDb({ game_records: [rec({ record_key: 'retired_mode' })], profiles: [] });
    expect(await getWorldRecords(db as never)).toEqual([]);
  });

  it('reads one record when asked for a key, bounded by a limit', async () => {
    const calls: Array<{ table: string; op: string; args: unknown[] }> = [];
    const db = fakeDb({ game_records: [rec({})], profiles: [] }, calls);
    await getWorldRecords(db as never, 'qp_classic');
    expect(calls).toContainEqual({ table: 'game_records', op: 'eq', args: ['record_key', 'qp_classic'] });
    expect(calls.some((c) => c.table === 'game_records' && c.op === 'limit')).toBe(true);
  });

  it('throws when the read fails, so the route can answer with an error state', async () => {
    const db = {
      from: () => ({ select: () => ({ order: () => ({ limit: async () => ({ data: null, error: { message: 'boom' } }) }) }) }),
    };
    await expect(getWorldRecords(db as never)).rejects.toThrow('boom');
  });
});

describe('record holder helpers', () => {
  const records = [
    { recordKey: 'blast', holderId: 'u2', score: 1705 },
    { recordKey: 'tower', holderId: 'u2', score: 3093 },
    { recordKey: 'single', holderId: 'u3', score: 1608 },
  ];

  it('knows who holds any record', () => {
    expect(isRecordHolder(records, 'u2')).toBe(true);
    expect(isRecordHolder(records, 'u9')).toBe(false);
    expect(isRecordHolder(records, null)).toBe(false);
  });

  it('lists the records a player holds', () => {
    expect(recordsHeldBy(records, 'u2')).toEqual(['blast', 'tower']);
  });

  it('measures the points needed to beat the record (a tie does not), or none when the score beats it', () => {
    expect(gapToRecord(1705, 1500)).toBe(206);
    expect(gapToRecord(1705, 1705)).toBe(1);
    expect(gapToRecord(1705, 1800)).toBe(0);
    expect(gapToRecord(3093.46, 3000)).toBe(94);
  });
});
