import { describe, it, expect, vi, beforeEach } from 'vitest';

import { processConnectionsCompletion, type ProcessConnectionsContext } from '../processCompletion';

interface MockBuilderState {
  head: boolean;
  or: string | null;
  insert: unknown;
  update: unknown;
}

function makeBuilder() {
  const state: MockBuilderState = { head: false, or: null, insert: null, update: null };
  const maybeSingleQueue: Array<{ data: unknown }> = [];
  const b: Record<string, unknown> = {
    select: (_cols: unknown, opts?: { head?: boolean }) => {
      if (opts?.head) state.head = true;
      return b;
    },
    eq: () => b,
    or: (f: string) => {
      state.or = f;
      return b;
    },
    insert: (row: Record<string, unknown>) => {
      state.insert = row;
      return b;
    },
    update: (row: Record<string, unknown>) => {
      state.update = row;
      return b;
    },
    maybeSingle: () => Promise.resolve(maybeSingleQueue.shift() ?? { data: null }),
    then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => {
      let result: unknown;
      if (state.insert || state.update) result = { error: null };
      else if (state.or) result = { count: 0 };
      else if (state.head) result = { count: 1 };
      else result = { data: null };
      return Promise.resolve(result).then(resolve, reject);
    },
  };
  // Expose queue for test setup
  (b as Record<string, unknown>).__queue = maybeSingleQueue;
  return b;
}

describe('processConnectionsCompletion', () => {
  let builder: Record<string, unknown>;
  let maybeSingleQueue: Array<{ data: unknown }>;

  beforeEach(() => {
    builder = makeBuilder();
    maybeSingleQueue = builder.__queue as Array<{ data: unknown }>;
  });

  it('inserts a new submission and returns streak + score + ranking', async () => {
    // Queue: D-1 row (null), then today's existing row (null)
    maybeSingleQueue.push({ data: null }, { data: null });

    const ctx: ProcessConnectionsContext = {
      supabase: { from: () => builder },
    };

    const result = await processConnectionsCompletion(
      {
        puzzleDate: '2026-01-15',
        language: 'en',
        displayName: 'Alice',
        score: 500,
        timeTakenSeconds: 42,
        puzzlesSolved: 3,
      },
      {
        sub: {
          puzzleDate: '2026-01-15',
          language: 'en',
          displayName: 'Alice',
          score: 500,
          timeTakenSeconds: 42,
          puzzlesSolved: 3,
        },
        idCol: 'player_id',
        idVal: 'player-1',
        userIdForRow: 'player-1',
        guestIdForRow: null,
        profile: { avatar_emoji: '🎮', avatar_color: '#FF00FF', avatar_image: null },
        avatarOverrides: {},
        admin: ctx.supabase,
      },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.body.action).toBe('insert');
      expect(result.body.streak).toBe(1);
      expect(result.body.score).toBe(500);
      expect(result.body.currentRank).toBe(1);
      expect(result.body.totalPlayers).toBe(1);
    }
  });

  it('keeps an existing submission (higher score + faster time → no update)', async () => {
    // D-1 row: null (no streak); today's existing: score 600, time 40
    maybeSingleQueue.push({ data: null }, { data: { id: 'row-1', score: 600, time_taken_seconds: 40 } });

    const ctx: ProcessConnectionsContext = {
      supabase: { from: () => builder },
    };

    const result = await processConnectionsCompletion(
      {
        puzzleDate: '2026-01-15',
        language: 'en',
        displayName: 'Bob',
        score: 500,
        timeTakenSeconds: 42,
        puzzlesSolved: 2,
      },
      {
        sub: {
          puzzleDate: '2026-01-15',
          language: 'en',
          displayName: 'Bob',
          score: 500,
          timeTakenSeconds: 42,
          puzzlesSolved: 2,
        },
        idCol: 'guest_fingerprint',
        idVal: 'guest-1',
        userIdForRow: null,
        guestIdForRow: 'guest-1',
        profile: null,
        avatarOverrides: { avatarEmoji: '🎯' },
        admin: ctx.supabase,
      },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.body.action).toBe('keep');
      expect(result.body.score).toBe(600); // existing score, not incoming
    }
  });

  it('returns status 500 on DB insert error (non-23505)', async () => {
    maybeSingleQueue.push({ data: null }, { data: null });

    // Mock supabase that returns a DB error on insert
    const mockFrom = vi.fn(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve(maybeSingleQueue.shift() ?? { data: null }),
        }),
      }),
      insert: () => ({
        then: (resolve: (v: unknown) => unknown) => {
          // Return a DB error (not 23505)
          return Promise.resolve(resolve({ error: { code: 'INTERNAL', message: 'DB error' } }));
        },
      }),
    }));

    const ctx: ProcessConnectionsContext = {
      supabase: { from: mockFrom },
    };

    const result = await processConnectionsCompletion(
      {
        puzzleDate: '2026-01-15',
        language: 'en',
        displayName: 'Charlie',
        score: 300,
        timeTakenSeconds: 60,
        puzzlesSolved: 1,
      },
      {
        sub: {
          puzzleDate: '2026-01-15',
          language: 'en',
          displayName: 'Charlie',
          score: 300,
          timeTakenSeconds: 60,
          puzzlesSolved: 1,
        },
        idCol: 'player_id',
        idVal: 'player-2',
        userIdForRow: 'player-2',
        guestIdForRow: null,
        profile: null,
        avatarOverrides: {},
        admin: ctx.supabase,
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(500);
      expect(result.error).toMatch(/Failed to/);
    }
  });
});
