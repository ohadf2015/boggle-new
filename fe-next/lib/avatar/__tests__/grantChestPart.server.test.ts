import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

const awardCoins = vi.fn();
vi.mock('@/backend/services/economy/awardCoins', () => ({ awardCoinsServer: (...a: unknown[]) => awardCoins(...a) }));
vi.mock('@/utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { grantChestPart } from '../grantChestPart.server';
import { CHEST_POOL } from '../chestDrops';

type Row = Record<string, unknown>;

/** Tiny in-memory stand-in for the two tables the grant touches. */
function fakeDb(profile: { premium_avatar_parts: string[]; current_level: number }, opts: { ledgerMissing?: boolean; lockLosses?: number } = {}) {
  const ledger: Row[] = [];
  let lockLosses = opts.lockLosses ?? 0;
  const tableError = { message: 'relation "avatar_part_drops" does not exist', code: '42P01' };

  function query(table: string) {
    const filters: [string, unknown][] = [];
    let op: 'select' | 'insert' | 'update' | 'delete' = 'select';
    let payload: Row = {};
    let snapshot: string | null = null;
    const matches = (r: Row) => filters.every(([k, v]) => r[k] === v);
    const run = () => {
      if (table === 'avatar_part_drops') {
        if (opts.ledgerMissing) return { data: null, error: tableError };
        if (op === 'insert') {
          if (ledger.some(r => r.player_id === payload.player_id && r.source === payload.source && r.source_key === payload.source_key)) {
            return { data: null, error: { message: 'dup', code: '23505' } };
          }
          ledger.push(payload);
          return { data: null, error: null };
        }
        if (op === 'delete') {
          for (let i = ledger.length - 1; i >= 0; i--) if (matches(ledger[i])) ledger.splice(i, 1);
          return { data: null, error: null };
        }
        return { data: ledger.filter(matches), error: null };
      }
      // profiles
      if (op === 'update') {
        if (snapshot !== JSON.stringify(profile.premium_avatar_parts) || lockLosses > 0) {
          if (lockLosses > 0) lockLosses -= 1;
          return { data: [], error: null };
        }
        profile.premium_avatar_parts = payload.premium_avatar_parts as string[];
        return { data: [{ id: 'p1' }], error: null };
      }
      return { data: { ...profile, premium_avatar_parts: [...profile.premium_avatar_parts] }, error: null };
    };
    const q = {
      select: () => q,
      insert: (p: Row) => { op = 'insert'; payload = p; return q; },
      update: (p: Row) => { op = 'update'; payload = p; return q; },
      delete: () => { op = 'delete'; return q; },
      eq: (k: string, v: unknown) => { filters.push([k, v]); return q; },
      filter: (_c: string, _o: string, v: string) => { snapshot = v; return q; },
      limit: () => q,
      single: () => q,
      then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(run()).then(res, rej),
    };
    return q;
  }
  return { client: { from: query } as unknown as SupabaseClient, ledger, profile };
}

beforeEach(() => {
  awardCoins.mockReset();
  awardCoins.mockResolvedValue({ success: true });
});

describe('grantChestPart', () => {
  it('grants a new part once and records it', async () => {
    const db = fakeDb({ premium_avatar_parts: [], current_level: 1 });
    const args = { supabase: db.client, playerId: 'p1', source: 'day_clear' as const, sourceKey: '2026-11-09' };
    const first = await grantChestPart(args);
    expect(first?.fresh).toBe(true);
    expect(first?.drop.duplicate).toBe(false);
    expect(db.profile.premium_avatar_parts).toEqual([first?.drop.key]);
    expect(db.ledger).toHaveLength(1);

    const again = await grantChestPart(args);
    expect(again?.fresh).toBe(false);
    expect(again?.drop.key).toBe(first?.drop.key);
    expect(db.profile.premium_avatar_parts).toHaveLength(1);
  });

  it('retries the parts write when another write landed first', async () => {
    const db = fakeDb({ premium_avatar_parts: ['eyes:laser'], current_level: 1 }, { lockLosses: 1 });
    const got = await grantChestPart({ supabase: db.client, playerId: 'p1', source: 'weekly_gold', sourceKey: '2026-11-02' });
    expect(got?.fresh).toBe(true);
    expect(db.profile.premium_avatar_parts).toContain('eyes:laser');
    expect(db.profile.premium_avatar_parts).toContain(got?.drop.key);
  });

  it('pays duplicate coins when the rolled rarity is complete', async () => {
    const all = [...CHEST_POOL.rare, ...CHEST_POOL.epic, ...CHEST_POOL.legendary];
    const db = fakeDb({ premium_avatar_parts: all, current_level: 1 });
    const got = await grantChestPart({ supabase: db.client, playerId: 'p1', source: 'day_perfect', sourceKey: '2026-11-09' });
    expect(got?.drop.duplicate).toBe(true);
    expect(awardCoins).toHaveBeenCalledWith('p1', got?.drop.refundCoins, 'avatar_part_duplicate', expect.any(Object));
  });

  it('removes the ledger row when the duplicate coins fail, so a retry can pay', async () => {
    awardCoins.mockResolvedValue({ success: false });
    const all = [...CHEST_POOL.rare, ...CHEST_POOL.epic, ...CHEST_POOL.legendary];
    const db = fakeDb({ premium_avatar_parts: all, current_level: 1 });
    const got = await grantChestPart({ supabase: db.client, playerId: 'p1', source: 'day_perfect', sourceKey: '2026-11-09' });
    expect(got).toBeNull();
    expect(db.ledger).toHaveLength(0);
  });

  it('never throws when the ledger table is missing (chest still pays coins)', async () => {
    const db = fakeDb({ premium_avatar_parts: [], current_level: 1 }, { ledgerMissing: true });
    await expect(grantChestPart({ supabase: db.client, playerId: 'p1', source: 'day_clear', sourceKey: 'x' })).resolves.toBeNull();
    expect(db.profile.premium_avatar_parts).toEqual([]);
  });
});
