/**
 * The rematch, against the REAL realtime module.
 *
 * rematch.test.ts stubs `startRealtimeDuel`, which proves the ordering of the
 * calls but not the thing that actually stranded students: by the time the
 * clients are told to navigate, `realtimeGames` must already hold the duel, or
 * their `duel:join-game` is answered "Duel is not running" and both of them sit
 * on a spinner. `startRealtimeDuel` awaits a lesson lookup before it fills that
 * map, so the window is real.
 *
 * Here the handler runs with the genuine realtime module underneath it, and the
 * assertion is on the map itself.
 */

import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import type { Namespace } from 'socket.io';
import type { DuelSocket } from '../types';
import { registerRematchHandlers } from '../rematch';
import { realtimeGames } from '../realtime';
import { clearRematchPacts } from '@/backend/modules/duelRematchPacts';

vi.mock('@/backend/utils/logger', () => ({
  default: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/backend/utils/gameUtils', () => ({
  generateRandomTable: vi.fn(() => [['A', 'B'], ['C', 'D']]),
}));
vi.mock('@/backend/utils/boardSelection', () => ({
  generateRichBoard: vi.fn(() => [['A', 'B'], ['C', 'D']]),
}));
vi.mock('@/backend/utils/timerManager', () => ({
  default: { setTimeout: vi.fn(), clearTimer: vi.fn() },
}));

const NEW_DUEL_ID = '550e8400-e29b-41d4-a716-4466554400ab';
const A = '550e8400-e29b-41d4-a716-446655440010';
const B = '550e8400-e29b-41d4-a716-446655440011';
const LESSON = '550e8400-e29b-41d4-a716-446655440012';
const CLASSROOM = '550e8400-e29b-41d4-a716-446655440013';
const OLD_DUEL = '550e8400-e29b-41d4-a716-446655440014';

vi.mock('@/backend/modules/supabase/client', () => ({
  getSupabase: vi.fn(() => ({
    from: (table: string) => {
      const chain: Record<string, unknown> = {};
      const self = () => chain as never;
      Object.assign(chain, {
        select: self,
        eq: self,
        or: self,
        order: self,
        limit: self,
        single: () =>
          table === 'vocabulary_lessons'
            ? Promise.resolve({ data: { language: 'en' }, error: null })
            : Promise.resolve({ data: { classroom_id: CLASSROOM }, error: null }),
        maybeSingle: () => Promise.resolve({ data: { classroom_id: CLASSROOM }, error: null }),
        insert: (row: Record<string, unknown>) => ({
          select: () => ({
            single: () => Promise.resolve({ data: { id: NEW_DUEL_ID, ...row }, error: null }),
          }),
        }),
      });
      return chain;
    },
  })),
}));

function makeSocket(id: string, userId: string): DuelSocket {
  return {
    id,
    data: { userId, displayName: `Student ${userId.slice(-2)}`, classroomIds: [CLASSROOM] },
    on: vi.fn(),
    emit: vi.fn(),
    join: vi.fn(),
  } as unknown as DuelSocket;
}

describe('rematch → a duel that is actually running', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearRematchPacts();
    realtimeGames.clear();
  });

  it('has the game state in place before either client is told to navigate', async () => {
    const a = makeSocket('a-podium', A);
    const b = makeSocket('b-podium', B);
    const handlers = new Map<string, Record<string, (d: unknown) => Promise<void>>>();

    const namespace = {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
      sockets: new Map([
        [a.id, a],
        [b.id, b],
      ]),
    } as unknown as Namespace;

    for (const socket of [a, b]) {
      const own: Record<string, (d: unknown) => Promise<void>> = {};
      (socket.on as Mock).mockImplementation((event: string, handler: never) => {
        own[event] = handler as unknown as (d: unknown) => Promise<void>;
      });
      handlers.set(socket.id, own);
      registerRematchHandlers(namespace, socket);
    }

    // Both students tap REMATCH — the flow that used to make two duels.
    await handlers.get(a.id)!['duel:rematch']({
      opponentId: B,
      lessonId: LESSON,
      duelId: OLD_DUEL,
    });
    await handlers.get(b.id)!['duel:rematch']({
      opponentId: A,
      lessonId: LESSON,
      duelId: OLD_DUEL,
    });

    const game = realtimeGames.get(NEW_DUEL_ID);
    expect(game).toBeDefined();
    expect([game!.challengerId, game!.opponentId].sort()).toEqual([A, B].sort());

    // …and both were pointed at that same running duel.
    for (const socket of [a, b]) {
      const created = (socket.emit as unknown as Mock).mock.calls.filter(
        (c) => c[0] === 'duel:created'
      );
      expect(created).toHaveLength(1);
      expect(created[0][1]).toMatchObject({ duelId: NEW_DUEL_ID });
    }
  });
});
