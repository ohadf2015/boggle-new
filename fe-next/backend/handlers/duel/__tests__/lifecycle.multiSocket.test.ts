/**
 * One student, several duel sockets — every one of them must be served.
 *
 * `useDuelSocket` opens a socket per hook instance, and the duels lobby mounts
 * it three times (DuelNotification, DuelLobby and, once opened, the challenge
 * modal). So a single student is several entries in `namespace.sockets`.
 *
 * The handlers used to pick ONE of them with `.find()`. Measured live on
 * 2026-09-12 (capture server, S1 vs S2): the challenge banner appeared for the
 * challenged student — DuelNotification's socket won the coin toss — while
 * DuelLobby's socket never heard `duel:challenge-received`, so the pending list
 * kept saying "No pending challenges" until a manual reload. Worse, on accept
 * only ONE challenger socket was joined to `duel:<id>`; when that was not the
 * socket the lobby was listening on, `duel:started` went nowhere and the
 * CHALLENGER sat in the lobby while their own real-time duel ran out its
 * 180-second clock. Two symptoms, one cause (recurring-pitfalls Class 3:
 * two paths to the same state that do not behave identically).
 *
 * The contract these tests pin: notify / join EVERY socket the user owns.
 */

import { vi, type Mock } from 'vitest';
import type { Namespace } from 'socket.io';
import type { DuelSocket } from '../types';
import { registerLifecycleHandlers } from '../lifecycle';

vi.mock('@/backend/utils/logger', () => ({
  default: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/backend/utils/gameUtils', () => ({
  generateRandomTable: vi.fn(() => [
    ['A', 'B', 'C', 'D'],
    ['E', 'F', 'G', 'H'],
    ['I', 'J', 'K', 'L'],
    ['M', 'N', 'O', 'P'],
  ]),
}));

const mockSupabaseFrom = vi.fn();
vi.mock('@/backend/modules/supabase/client', () => ({
  getSupabase: vi.fn(() => ({ from: mockSupabaseFrom })),
}));

const CHALLENGER = '550e8400-e29b-41d4-a716-446655440010';
const OPPONENT = '550e8400-e29b-41d4-a716-446655440011';
const LESSON = '550e8400-e29b-41d4-a716-446655440012';
const CLASSROOM = '550e8400-e29b-41d4-a716-446655440013';
const DUEL_ID = '550e8400-e29b-41d4-a716-446655440014';

function makeSocket(id: string, userId: string): DuelSocket {
  return {
    id,
    data: { userId, displayName: `User ${userId.slice(-2)}`, classroomIds: [CLASSROOM] },
    on: vi.fn(),
    emit: vi.fn(),
    join: vi.fn(),
  } as unknown as DuelSocket;
}

describe('duel lifecycle — a student with more than one socket', () => {
  let namespace: Namespace;
  let handlers: Record<string, (data: unknown) => Promise<void>>;

  function register(actor: DuelSocket, sockets: DuelSocket[]) {
    handlers = {};
    (actor.on as Mock).mockImplementation((event: string, handler: never) => {
      handlers[event] = handler as unknown as (data: unknown) => Promise<void>;
    });
    namespace = {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
      sockets: new Map(sockets.map((s) => [s.id, s])),
    } as unknown as Namespace;
    registerLifecycleHandlers(namespace, actor);
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('duel:create', () => {
    beforeEach(() => {
      // lesson language lookup, then the insert that returns the new duel
      mockSupabaseFrom.mockImplementation(() => ({
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { language: 'en' }, error: null }) }) }),
        insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: DUEL_ID }, error: null }) }) }),
      }));
    });

    it('notifies EVERY socket the challenged student has open', async () => {
      const challenger = makeSocket('challenger-a', CHALLENGER);
      const opponentLobby = makeSocket('opponent-lobby', OPPONENT);
      const opponentNotification = makeSocket('opponent-notification', OPPONENT);
      register(challenger, [challenger, opponentLobby, opponentNotification]);

      await handlers['duel:create']({
        opponentId: OPPONENT,
        lessonId: LESSON,
        classroomId: CLASSROOM,
        duelType: 'realtime',
      });

      for (const sock of [opponentLobby, opponentNotification]) {
        expect(sock.emit).toHaveBeenCalledWith(
          'duel:challenge-received',
          expect.objectContaining({ duelId: DUEL_ID })
        );
      }
    });

    it('does not leak the challenge to an unrelated classmate', async () => {
      const challenger = makeSocket('challenger-a', CHALLENGER);
      const opponentLobby = makeSocket('opponent-lobby', OPPONENT);
      const bystander = makeSocket('bystander', '550e8400-e29b-41d4-a716-446655440099');
      register(challenger, [challenger, opponentLobby, bystander]);

      await handlers['duel:create']({
        opponentId: OPPONENT,
        lessonId: LESSON,
        classroomId: CLASSROOM,
        duelType: 'realtime',
      });

      expect(bystander.emit).not.toHaveBeenCalledWith('duel:challenge-received', expect.anything());
    });
  });

  describe('duel:accept', () => {
    beforeEach(() => {
      mockSupabaseFrom.mockImplementation(() => ({
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({
                data: {
                  id: DUEL_ID,
                  status: 'pending',
                  challenger_id: CHALLENGER,
                  opponent_id: OPPONENT,
                  duel_type: 'async',
                  board_state: { board: [] },
                },
                error: null,
              }),
          }),
        }),
        update: () => ({
          eq: () => ({
            eq: () => ({
              select: () => ({
                single: () =>
                  Promise.resolve({
                    data: { id: DUEL_ID, status: 'active', duel_type: 'async' },
                    error: null,
                  }),
              }),
            }),
          }),
        }),
      }));
    });

    it('joins EVERY challenger socket to the duel room', async () => {
      const acceptor = makeSocket('opponent-lobby', OPPONENT);
      const challengerLobby = makeSocket('challenger-lobby', CHALLENGER);
      const challengerNotification = makeSocket('challenger-notification', CHALLENGER);
      register(acceptor, [acceptor, challengerLobby, challengerNotification]);

      await handlers['duel:accept']({ duelId: DUEL_ID });

      // The socket the challenger's LOBBY listens on is the one that carries
      // them into the duel; joining only the other one strands them.
      expect(challengerLobby.join).toHaveBeenCalledWith(`duel:${DUEL_ID}`);
      expect(challengerNotification.join).toHaveBeenCalledWith(`duel:${DUEL_ID}`);
      expect(acceptor.join).toHaveBeenCalledWith(`duel:${DUEL_ID}`);
    });
  });
});
