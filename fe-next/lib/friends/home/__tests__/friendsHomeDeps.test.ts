import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

vi.mock('../serverPresence', () => ({ readServerPresence: () => [] }));

import { friendsHomeDeps } from '../friendsHomeDeps';

function fakeDb() {
  const calls: Array<{ table: string; ops: Array<[string, ...unknown[]]> }> = [];
  const db = {
    from(table: string) {
      const entry = { table, ops: [] as Array<[string, ...unknown[]]> };
      calls.push(entry);
      const q: Record<string, unknown> = {};
      for (const op of ['select', 'eq', 'or', 'in', 'order', 'limit']) {
        q[op] = (...args: unknown[]) => (entry.ops.push([op, ...args]), q);
      }
      q.then = (resolve: (v: unknown) => unknown) => resolve({ data: [], error: null });
      return q;
    },
  };
  return { db: db as unknown as SupabaseClient, calls };
}

describe('friendsHomeDeps', () => {
  it('Given the friends read, Then it is ordered newest first and bounded', async () => {
    const { db, calls } = fakeDb();
    await friendsHomeDeps(db).friendRows('me');
    expect(calls[0].ops).toEqual(expect.arrayContaining([['order', 'created_at', { ascending: false }], ['limit', 200]]));
  });

  it('Given incoming requests, Then a small own query: pending, addressed to me, newest first', async () => {
    const { db, calls } = fakeDb();
    await friendsHomeDeps(db).incomingRequests('me');
    expect(calls[0].table).toBe('friends');
    expect(calls[0].ops).toEqual(
      expect.arrayContaining([['eq', 'friend_id', 'me'], ['eq', 'status', 'pending'], ['order', 'created_at', { ascending: false }], ['limit', 20]]),
    );
  });

  it('Given a profile read, Then it carries the age fields the suggestion filter needs', async () => {
    const { db, calls } = fakeDb();
    await friendsHomeDeps(db).profiles(['a']);
    const select = calls[0].ops.find(([op]) => op === 'select')?.[1] as string;
    for (const col of ['birth_year', 'social_features_override', 'created_at', 'is_test_account', 'avatar_image']) expect(select).toContain(col);
  });
});
