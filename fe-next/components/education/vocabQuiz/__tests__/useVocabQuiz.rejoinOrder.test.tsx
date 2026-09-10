/**
 * Vocab Quiz's reconnect must be SEQUENCED behind the base rejoin, not raced
 * against it.
 *
 * The shape of the bug (recurring pitfall class 3 + class 4 together):
 *
 *   1. A student's phone drops and reconnects mid-quiz. The socket arrives with
 *      a brand-new id the server has never seen.
 *   2. `utils/SocketContext.tsx` re-emits the remembered `join` from its own
 *      `connect` handler — that is the ONLY thing that rebuilds the server's
 *      in-memory socket.id → game / username maps, which a restart or a fresh
 *      socket id wipes.
 *   3. This hook registered a SECOND `connect` handler that fired
 *      `vocabQuiz:requestState` immediately.
 *   4. Server-side, `backend/handlers/vocabQuizHandler.ts` resolves that request
 *      through exactly those maps and does `if (!ctx) return;` — a silent no-op.
 *
 * `join` is emitted first on the wire, but the server HANDLES it asynchronously
 * (Supabase + Redis reads), so `requestState` routinely overtook it and vanished
 * with no reply, no log and no retry. The student sat on a blank quiz until the
 * next question happened to broadcast — and if the quiz was between questions,
 * or paused, or already on its last one, that never came.
 *
 * Client-side ordering is the fix the wire can actually guarantee: ask only once
 * the server has told US the join landed. `playerJoinHandler` says so with
 * `joined` (:303) — and with `joinedAsSpectator` (:252) for the other door.
 * Keying on only one of those two would rebuild the same asymmetry a layer down,
 * so both are wired.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { VOCAB_QUIZ_EVENTS } from '@/shared/types/vocabQuiz';
import { useVocabQuiz } from '../useVocabQuiz';

type Handler = (...args: unknown[]) => void;

function makeSocket() {
  const handlers = new Map<string, Set<Handler>>();
  const socket = {
    emit: vi.fn(),
    on: vi.fn((event: string, fn: Handler) => {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(fn);
      return socket;
    }),
    off: vi.fn((event: string, fn: Handler) => {
      handlers.get(event)?.delete(fn);
      return socket;
    }),
  };
  const fire = (event: string, payload?: unknown) =>
    act(() => {
      handlers.get(event)?.forEach((fn) => fn(payload));
    });
  const listens = (event: string) => (handlers.get(event)?.size ?? 0) > 0;
  return { socket, fire, listens };
}

const requestStateCalls = (socket: { emit: ReturnType<typeof vi.fn> }) =>
  socket.emit.mock.calls.filter((c) => c[0] === VOCAB_QUIZ_EVENTS.requestState).length;

describe('useVocabQuiz — reconnect is sequenced behind the base join', () => {
  let harness: ReturnType<typeof makeSocket>;

  beforeEach(() => {
    vi.clearAllMocks();
    harness = makeSocket();
  });

  it('asks for state once on mount (the socket is already in the room)', () => {
    renderHook(() => useVocabQuiz(harness.socket as never));
    expect(requestStateCalls(harness.socket)).toBe(1);
  });

  /**
   * THE RACE. A bare `connect` means the transport is up; it says nothing about
   * whether the server has finished re-binding this socket to the game. Asking
   * here is the request that silently dies.
   */
  it('does NOT ask for state on a bare connect', () => {
    renderHook(() => useVocabQuiz(harness.socket as never));
    harness.socket.emit.mockClear();

    harness.fire('connect');

    expect(requestStateCalls(harness.socket)).toBe(0);
  });

  it('asks for state once the server confirms the rejoin with `joined`', () => {
    renderHook(() => useVocabQuiz(harness.socket as never));
    harness.socket.emit.mockClear();

    harness.fire('connect');
    harness.fire('joined', { gameCode: 'ABC123' });

    expect(requestStateCalls(harness.socket)).toBe(1);
  });

  /**
   * The projector and a late phone can both arrive through the spectator door.
   * Wiring only `joined` would leave them on a blank quiz — the same class-3
   * asymmetry, one layer down.
   */
  it('asks for state on `joinedAsSpectator` too', () => {
    renderHook(() => useVocabQuiz(harness.socket as never));
    harness.socket.emit.mockClear();

    harness.fire('joinedAsSpectator', { gameCode: 'ABC123' });

    expect(requestStateCalls(harness.socket)).toBe(1);
  });

  it('restores the live question from the snapshot the rejoin unblocks', () => {
    const { result } = renderHook(() => useVocabQuiz(harness.socket as never));

    harness.fire('connect');
    harness.fire('joined', { gameCode: 'ABC123' });
    harness.fire(VOCAB_QUIZ_EVENTS.state, {
      phase: 'question',
      paused: false,
      active: true,
      index: 2,
      total: 8,
      myScore: 400,
      myStreak: 2,
      myAnswer: null,
      standings: [],
      question: {
        index: 2,
        prompt: 'ephemeral',
        options: ['a', 'b', 'c', 'd'],
        remainingMs: 12_000,
        limitMs: 20_000,
        serverNow: Date.now(),
        total: 8,
      },
      reveal: null,
    });

    expect(result.current.phase).toBe('question');
    expect(result.current.questionNumber).toBe(3);
    expect(result.current.myScore).toBe(400);
    expect(result.current.finished).toBe(false);
  });

  it('unregisters every listener it added on unmount', () => {
    const { unmount } = renderHook(() => useVocabQuiz(harness.socket as never));
    unmount();

    expect(harness.listens('joined')).toBe(false);
    expect(harness.listens('joinedAsSpectator')).toBe(false);
    expect(harness.listens(VOCAB_QUIZ_EVENTS.state)).toBe(false);
  });
});
