/**
 * A real-time duel could never actually be played.
 *
 * `duel:started` is emitted once, to the `duel:<id>` room, at the moment the
 * challenge is ACCEPTED — while both students are still on the lobby page. Both
 * then navigate to the duel screen, which mounts a NEW socket that is in no
 * room and has missed the only announcement there is. Both sides sat on
 * "Waiting for opponent…" until the server's 180s timer completed the duel
 * 0-0: a silent dead end with no error anywhere (recurring-pitfalls Class 4,
 * and Class 3 — the join path and the accept path had to agree and didn't).
 *
 * `duel:join-game` is the missing half: the duel screen announces itself, joins
 * the room, and gets the running state replayed to it.
 */
import { vi, type Mock } from 'vitest';
import type { Namespace } from 'socket.io';
import type { DuelSocket } from '../types';
import { registerRealtimeHandlers, realtimeGames } from '../realtime';
import { getSupabase } from '@/backend/modules/supabase/client';
import logger from '@/backend/utils/logger';

vi.mock('@/backend/modules/supabase/client');
vi.mock('@/backend/modules/wordValidatorPool');
vi.mock('@/backend/dictionary');
vi.mock('@/backend/modules/scoringEngine.types');
vi.mock('@/backend/utils/logger');
vi.mock('@/backend/modules/educationXpManager');

const DUEL_ID = '550e8400-e29b-41d4-a716-446655440123';
const START = '2026-09-11T12:00:00.000Z';

describe('duel:join-game — the duel screen joins the running duel', () => {
  let mockSocket: Partial<DuelSocket>;
  let mockNamespace: Partial<Namespace>;
  let emitted: Array<{ event: string; data: unknown }>;
  let joinedRooms: string[];

  function seedGame() {
    realtimeGames.set(DUEL_ID, {
      challengerId: 'user-1',
      opponentId: 'user-2',
      lessonId: 'lesson-1',
      boardState: [['C', 'A', 'T', 'S']],
      language: 'en',
      timeLimit: 180,
      startTime: START,
      challengerWords: [],
      opponentWords: [],
      challengerScore: 7,
      opponentScore: 3,
    } as never);
  }

  function getHandler() {
    registerRealtimeHandlers(mockNamespace as Namespace, mockSocket as DuelSocket);
    return (mockSocket.on as Mock).mock.calls.find((c) => c[0] === 'duel:join-game')?.[1];
  }

  beforeEach(() => {
    vi.clearAllMocks();
    emitted = [];
    joinedRooms = [];
    realtimeGames.clear();

    mockSocket = {
      data: { userId: 'user-1', displayName: 'P1', classroomIds: ['c-1'] },
      emit: vi.fn((event: string, data: unknown) => emitted.push({ event, data })),
      join: vi.fn((room: string) => joinedRooms.push(room)),
      to: vi.fn().mockReturnValue({ emit: vi.fn() }),
      on: vi.fn(),
    } as never;

    mockNamespace = { to: vi.fn().mockReturnValue({ emit: vi.fn() }) } as never;
    vi.mocked(getSupabase).mockReturnValue({} as never);
    vi.mocked(logger.warn ?? (() => {}));
  });

  afterEach(() => realtimeGames.clear());

  it('is registered at all', () => {
    expect(getHandler()).toBeTypeOf('function');
  });

  it('puts the reconnecting socket in the duel room', async () => {
    seedGame();
    await getHandler()({ duelId: DUEL_ID });

    expect(joinedRooms).toContain(`duel:${DUEL_ID}`);
  });

  it('replays duel:started to that socket with the ORIGINAL start time', async () => {
    seedGame();
    await getHandler()({ duelId: DUEL_ID });

    const started = emitted.find((e) => e.event === 'duel:started');
    expect(started).toBeDefined();
    // The clock must not restart: the countdown is shared, and a fresh
    // startTime would hand the late joiner a longer duel than the opponent.
    expect((started!.data as { startTime: string }).startTime).toBe(START);
    expect((started!.data as { timeLimit: number }).timeLimit).toBe(180);
    expect((started!.data as { boardState: string[][] }).boardState).toEqual([
      ['C', 'A', 'T', 'S'],
    ]);
  });

  it('hands back the scores already on the board', async () => {
    seedGame();
    await getHandler()({ duelId: DUEL_ID });

    const mine = emitted.find((e) => e.event === 'duel:word-accepted');
    const theirs = emitted.find((e) => e.event === 'duel:opponent-progress');
    expect((mine?.data as { totalScore: number })?.totalScore).toBe(7);
    expect((theirs?.data as { totalScore: number })?.totalScore).toBe(3);
  });

  it('says so instead of going quiet when the duel is not running', async () => {
    await getHandler()({ duelId: DUEL_ID });

    expect(emitted.find((e) => e.event === 'duel:started')).toBeUndefined();
    expect(emitted.find((e) => e.event === 'duel:error')).toBeDefined();
  });

  it('refuses a duel this socket is not playing in', async () => {
    seedGame();
    (mockSocket.data as { userId: string }).userId = 'stranger';

    await getHandler()({ duelId: DUEL_ID });

    expect(joinedRooms).toHaveLength(0);
    expect(emitted.find((e) => e.event === 'duel:started')).toBeUndefined();
  });
});
