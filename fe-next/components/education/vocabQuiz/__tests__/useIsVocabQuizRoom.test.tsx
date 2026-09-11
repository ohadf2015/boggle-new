/**
 * The quiz latch must let go when a BOARD round starts in the same room.
 *
 * `useIsVocabQuizRoom` latches true and never resets, which is right while the
 * quiz owns the room — the standings after the last question still belong to
 * the quiz, so dropping the flag at the whistle would blank the podium.
 *
 * But two surfaces now read it: the projector gate in `host/HostView.tsx`, and
 * the classroom chrome in the multiplayer page, which hides the join code and
 * the settings card while it is true. If a teacher runs a board round in the
 * SAME room after a quiz, a latch that never lets go hides the join code for
 * that board round — verbatim the 2026-08-30 incident that
 * `lib/education/classroomLobbyChrome.ts` exists to document (five rooms in 37
 * minutes, zero students, because the code left the screen).
 *
 * The board's own `startGame` is the signal that the room is not a quiz room
 * any more. A later quiz question latches it straight back.
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { VOCAB_QUIZ_EVENTS } from '@/shared/types/vocabQuiz';
import { useIsVocabQuizRoom } from '../useIsVocabQuizRoom';

function fakeSocket() {
  const handlers = new Map<string, Set<(payload?: unknown) => void>>();
  return {
    emit: vi.fn(),
    on(event: string, fn: (payload?: unknown) => void) {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(fn);
    },
    off(event: string, fn: (payload?: unknown) => void) {
      handlers.get(event)?.delete(fn);
    },
    fire(event: string, payload?: unknown) {
      for (const fn of handlers.get(event) ?? []) fn(payload);
    },
  };
}

describe('useIsVocabQuizRoom', () => {
  it('claims the room on the first quiz question', () => {
    const socket = fakeSocket();
    const { result } = renderHook(() => useIsVocabQuizRoom(socket as never));
    expect(result.current).toBe(false);
    act(() => socket.fire(VOCAB_QUIZ_EVENTS.question, {}));
    expect(result.current).toBe(true);
  });

  it('holds the claim through the end of the quiz, so the podium stays up', () => {
    const socket = fakeSocket();
    const { result } = renderHook(() => useIsVocabQuizRoom(socket as never));
    act(() => socket.fire(VOCAB_QUIZ_EVENTS.question, {}));
    act(() => socket.fire(VOCAB_QUIZ_EVENTS.ended, {}));
    expect(result.current).toBe(true);
  });

  it('releases the claim when a board round starts in the same room', () => {
    const socket = fakeSocket();
    const { result } = renderHook(() => useIsVocabQuizRoom(socket as never));
    act(() => socket.fire(VOCAB_QUIZ_EVENTS.question, {}));
    act(() => socket.fire('startGame', {}));
    expect(result.current).toBe(false);
  });

  it('re-claims if the same room runs another quiz afterwards', () => {
    const socket = fakeSocket();
    const { result } = renderHook(() => useIsVocabQuizRoom(socket as never));
    act(() => socket.fire(VOCAB_QUIZ_EVENTS.question, {}));
    act(() => socket.fire('startGame', {}));
    act(() => socket.fire(VOCAB_QUIZ_EVENTS.question, {}));
    expect(result.current).toBe(true);
  });

  it('asks for a snapshot on mount, so a mid-round reload lands on the question', () => {
    const socket = fakeSocket();
    renderHook(() => useIsVocabQuizRoom(socket as never));
    expect(socket.emit).toHaveBeenCalledWith(VOCAB_QUIZ_EVENTS.requestState);
  });
});
