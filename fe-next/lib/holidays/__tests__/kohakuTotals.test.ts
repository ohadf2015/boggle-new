import { describe, it, expect, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { kohakuTotals, __resetKohakuCache } from '../holidayGame.server';

const CAP = 1000;

function cappedClient(rows: { team: 'red' | 'white'; words: number }[]) {
  const query = {
    select: () => query,
    eq: () => query,
    not: () => query,
    order: () => query,
    limit: () => query,
    range: (from: number, to: number) =>
      Promise.resolve({ data: rows.slice(from, Math.min(to + 1, from + CAP)), error: null }),
    then: (resolve: (v: unknown) => void) => resolve({ data: rows.slice(0, CAP), error: null }),
  };
  return { from: () => query } as unknown as SupabaseClient;
}

describe('kohakuTotals', () => {
  beforeEach(() => __resetKohakuCache());

  it('given more rows than one PostgREST page, when totals are read, then every row is counted', async () => {
    const rows = [
      ...Array.from({ length: 1500 }, () => ({ team: 'red' as const, words: 2 })),
      ...Array.from({ length: 700 }, () => ({ team: 'white' as const, words: 3 })),
    ];
    await expect(kohakuTotals(cappedClient(rows), '2026-12-31')).resolves.toEqual({ red: 3000, white: 2100 });
  });

  it('given no players yet, when totals are read, then both teams are zero', async () => {
    await expect(kohakuTotals(cappedClient([]), '2026-12-31')).resolves.toEqual({ red: 0, white: 0 });
  });
});
