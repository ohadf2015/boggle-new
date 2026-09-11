import { describe, it, expect, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { VOCAB_QUIZ_EVENTS } from '@/shared/types/vocabQuiz';
import { useTeacherStripState } from '../useTeacherStripState';

function fakeSocket() {
  const handlers: Record<string, Array<(payload: unknown) => void>> = {};
  return {
    emit: vi.fn(),
    on: vi.fn((event: string, cb: (payload: unknown) => void) => {
      (handlers[event] ||= []).push(cb);
    }),
    off: vi.fn((event: string, cb: (payload: unknown) => void) => {
      handlers[event] = (handlers[event] || []).filter((h) => h !== cb);
    }),
    fire: (event: string, payload?: unknown) => (handlers[event] || []).forEach((h) => h(payload)),
    listenerCount: (event: string) => (handlers[event] || []).length,
  };
}

const HOST_IN_CLASSROOM = {
  isActive: true,
  isHost: true,
  isClassroomMode: true,
  showResults: false,
  storeGameActive: false,
} as const;

describe('useTeacherStripState', () => {
  it('stays hidden in the lobby', () => {
    const socket = fakeSocket();
    const { result } = renderHook(() => useTeacherStripState({ socket: socket as never, ...HOST_IN_CLASSROOM }));
    expect(result.current.visible).toBe(false);
  });

  it('shows the strip for the teacher once the server starts the round', () => {
    const socket = fakeSocket();
    const { result } = renderHook(() => useTeacherStripState({ socket: socket as never, ...HOST_IN_CLASSROOM }));

    act(() => socket.fire('startGame', { gameCode: 'ABC123' }));

    expect(result.current.visible).toBe(true);
    expect(result.current.quizRound).toBe(false);
  });

  it('shows the strip for a live Vocab Quiz — the mode a critic found bare', () => {
    const socket = fakeSocket();
    const { result } = renderHook(() => useTeacherStripState({ socket: socket as never, ...HOST_IN_CLASSROOM }));

    act(() => socket.fire(VOCAB_QUIZ_EVENTS.question, { index: 0, total: 10 }));

    expect(result.current.visible).toBe(true);
    expect(result.current.quizRound).toBe(true);
  });

  it('surfaces a quiz pause, which never reaches the board pause store', () => {
    const socket = fakeSocket();
    const { result } = renderHook(() => useTeacherStripState({ socket: socket as never, ...HOST_IN_CLASSROOM }));

    act(() => socket.fire(VOCAB_QUIZ_EVENTS.question, { index: 0, total: 10 }));
    act(() => socket.fire(VOCAB_QUIZ_EVENTS.paused, { paused: true }));

    expect(result.current.quizPaused).toBe(true);
  });

  it('asks the server for a quiz snapshot so a mid-round reload recovers the strip', () => {
    const socket = fakeSocket();
    renderHook(() => useTeacherStripState({ socket: socket as never, ...HOST_IN_CLASSROOM }));
    expect(socket.emit).toHaveBeenCalledWith(VOCAB_QUIZ_EVENTS.requestState);
  });

  it('hides again when the round ends', () => {
    const socket = fakeSocket();
    const { result } = renderHook(() => useTeacherStripState({ socket: socket as never, ...HOST_IN_CLASSROOM }));

    act(() => socket.fire('startGame', {}));
    act(() => socket.fire('endGame', {}));

    expect(result.current.visible).toBe(false);
  });

  it('never shows to a student in the same room', () => {
    const socket = fakeSocket();
    const { result } = renderHook(() =>
      useTeacherStripState({ socket: socket as never, ...HOST_IN_CLASSROOM, isHost: false }),
    );
    act(() => socket.fire('startGame', {}));
    expect(result.current.visible).toBe(false);
  });

  /**
   * The host's own game listeners live on this same shared socket
   * (`useHostGameEvents` binds startGame/timeUpdate/endGame/resetGame). A
   * blanket `socket.off('startGame')` on unmount would take them with it and
   * break the round — cleanup has to be by handler reference.
   */
  it('detaches only its own listeners', () => {
    const socket = fakeSocket();
    const theirs = vi.fn();
    socket.on('startGame', theirs);

    const { unmount } = renderHook(() => useTeacherStripState({ socket: socket as never, ...HOST_IN_CLASSROOM }));
    expect(socket.listenerCount('startGame')).toBe(2);

    unmount();

    expect(socket.listenerCount('startGame')).toBe(1);
    socket.fire('startGame', {});
    expect(theirs).toHaveBeenCalled();
  });

  it('still honours the store flag, so nothing that already worked regresses', () => {
    const socket = fakeSocket();
    const { result } = renderHook(() =>
      useTeacherStripState({ socket: socket as never, ...HOST_IN_CLASSROOM, storeGameActive: true }),
    );
    expect(result.current.visible).toBe(true);
  });

  it('survives a null socket', () => {
    const { result } = renderHook(() => useTeacherStripState({ socket: null, ...HOST_IN_CLASSROOM }));
    expect(result.current.visible).toBe(false);
  });
});
