/**
 * Tests for daily challenge profile stats updater.
 *
 * Bug: wordHunt/wordWheel submit routes never incremented
 * `unique_days_played` — so DEDICATION (7-day) and LOYAL_PLAYER (30-day)
 * achievements never fired for daily-challenge-only players.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isNewUtcDay,
  updateDailyProfileStats,
} from '../dailyChallenge/profileStats';

vi.mock('../../utils/logger', () => ({
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

type Patch = Record<string, unknown>;

function makeSupabase(opts: {
  profile?: {
    total_score: number | null;
    total_games: number | null;
    unique_days_played: number | null;
    last_game_at: string | null;
  } | null;
  fetchError?: unknown;
  rpcError?: { code?: string; message?: string } | null;
  updateError?: { message?: string } | null;
}) {
  const calls = {
    rpc: [] as Array<{ name: string; args: Record<string, unknown> }>,
    updates: [] as Patch[],
  };
  const supabase = {
    rpc: vi.fn(async (name: string, args: Record<string, unknown>) => {
      calls.rpc.push({ name, args });
      return { error: opts.rpcError ?? null };
    }),
    from: vi.fn((_table: string) => ({
      select: (_cols: string) => ({
        eq: (_col: string, _val: unknown) => ({
          single: async () => ({
            data: opts.profile ?? null,
            error: opts.fetchError ?? null,
          }),
        }),
      }),
      update: (patch: Patch) => ({
        eq: async (_col: string, _val: unknown) => {
          calls.updates.push(patch);
          return { error: opts.updateError ?? null };
        },
      }),
    })),
  };
  return { supabase, calls };
}

describe('isNewUtcDay', () => {
  it('returns true when last_game_at is null', () => {
    expect(isNewUtcDay(null, new Date('2026-04-21T10:00:00Z'))).toBe(true);
  });

  it('returns false for same UTC date', () => {
    expect(
      isNewUtcDay('2026-04-21T01:00:00Z', new Date('2026-04-21T23:59:00Z'))
    ).toBe(false);
  });

  it('returns true across UTC midnight', () => {
    expect(
      isNewUtcDay('2026-04-20T23:59:00Z', new Date('2026-04-21T00:01:00Z'))
    ).toBe(true);
  });
});

describe('updateDailyProfileStats', () => {
  beforeEach(() => vi.clearAllMocks());

  it('increments unique_days_played on a new UTC day when RPC succeeds', async () => {
    const { supabase, calls } = makeSupabase({
      profile: {
        total_score: 100,
        total_games: 5,
        unique_days_played: 3,
        last_game_at: '2026-04-20T12:00:00Z',
      },
    });

    await updateDailyProfileStats({
      supabase,
      playerId: 'p1',
      scoreToAdd: 42,
      now: new Date('2026-04-21T08:00:00Z'),
    });

    expect(calls.rpc).toEqual([
      { name: 'increment_profile_stats', args: { p_user_id: 'p1', p_score: 42, p_games: 1 } },
    ]);
    expect(calls.updates).toHaveLength(1);
    expect(calls.updates[0].unique_days_played).toBe(4);
    expect(calls.updates[0].last_game_at).toBe('2026-04-21T08:00:00.000Z');
    expect(calls.updates[0].total_score).toBeUndefined();
    expect(calls.updates[0].total_games).toBeUndefined();
  });

  it('skips update entirely when RPC succeeds and it is the same UTC day', async () => {
    const { supabase, calls } = makeSupabase({
      profile: {
        total_score: 100,
        total_games: 5,
        unique_days_played: 3,
        last_game_at: '2026-04-21T01:00:00Z',
      },
    });

    await updateDailyProfileStats({
      supabase,
      playerId: 'p1',
      scoreToAdd: 10,
      now: new Date('2026-04-21T23:00:00Z'),
    });

    expect(calls.rpc).toHaveLength(1);
    expect(calls.updates).toHaveLength(0);
  });

  it('falls back to manual increments when RPC is missing (42883)', async () => {
    const { supabase, calls } = makeSupabase({
      profile: {
        total_score: 100,
        total_games: 5,
        unique_days_played: 3,
        last_game_at: '2026-04-20T12:00:00Z',
      },
      rpcError: { code: '42883', message: 'function increment_profile_stats does not exist' },
    });

    await updateDailyProfileStats({
      supabase,
      playerId: 'p1',
      scoreToAdd: 42,
      now: new Date('2026-04-21T08:00:00Z'),
    });

    expect(calls.updates).toHaveLength(1);
    expect(calls.updates[0].total_score).toBe(142);
    expect(calls.updates[0].total_games).toBe(6);
    expect(calls.updates[0].unique_days_played).toBe(4);
  });

  it('aborts silently on fetch error', async () => {
    const { supabase, calls } = makeSupabase({
      profile: null,
      fetchError: { message: 'boom' },
    });

    await updateDailyProfileStats({
      supabase,
      playerId: 'p1',
      scoreToAdd: 10,
      now: new Date('2026-04-21T08:00:00Z'),
    });

    expect(calls.rpc).toHaveLength(0);
    expect(calls.updates).toHaveLength(0);
  });

  it('aborts on non-missing RPC error without writing update', async () => {
    const { supabase, calls } = makeSupabase({
      profile: {
        total_score: 100,
        total_games: 5,
        unique_days_played: 3,
        last_game_at: '2026-04-20T12:00:00Z',
      },
      rpcError: { code: '40000', message: 'permission denied' },
    });

    await updateDailyProfileStats({
      supabase,
      playerId: 'p1',
      scoreToAdd: 42,
      now: new Date('2026-04-21T08:00:00Z'),
    });

    expect(calls.updates).toHaveLength(0);
  });
});
