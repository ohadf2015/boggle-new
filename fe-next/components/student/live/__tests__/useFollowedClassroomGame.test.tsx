import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Socket } from 'socket.io-client';
import { useFollowedClassroomGame } from '../useFollowedClassroomGame';
import type { LiveClassroomGameInfo } from '@/lib/education/liveClassroomGameInfo';
import { VOCAB_QUIZ_EVENTS } from '@/shared/types/vocabQuiz';

type Handler = (data?: unknown) => void;

function fakeSocket() {
  const handlers = new Map<string, Set<Handler>>();
  const socket = {
    on: (ev: string, fn: Handler) => {
      if (!handlers.has(ev)) handlers.set(ev, new Set());
      handlers.get(ev)!.add(fn);
      return socket;
    },
    off: (ev: string, fn: Handler) => {
      handlers.get(ev)?.delete(fn);
      return socket;
    },
    emit: () => socket,
  };
  const fire = (ev: string, data?: unknown) => act(() => handlers.get(ev)?.forEach((fn) => fn(data)));
  return { socket: socket as unknown as Socket, fire, count: (ev: string) => handlers.get(ev)?.size ?? 0 };
}

const RECORD: LiveClassroomGameInfo = {
  gameCode: 'ABC123',
  classroomId: 'cls-1',
  classroomName: 'Room 4',
  lessonNames: ['Clothes'],
  gameMode: 'classic',
  settings: {} as LiveClassroomGameInfo['settings'],
};

describe('useFollowedClassroomGame — the student mode follows the room, not the first fetch', () => {
  it('given the record says classic, when the host switches to vocab quiz between rounds, then the mode is vocab-quiz', () => {
    const { socket, fire } = fakeSocket();
    const { result } = renderHook(() => useFollowedClassroomGame(socket, 'ABC123', RECORD));
    expect(result.current?.gameMode).toBe('classic');

    fire('classroomGameModeChanged', { gameCode: 'ABC123', gameMode: 'vocab-quiz' });

    expect(result.current?.gameMode).toBe('vocab-quiz');
    expect(result.current?.classroomName).toBe('Room 4');
  });

  it('ignores a mode change announced for another room', () => {
    const { socket, fire } = fakeSocket();
    const { result } = renderHook(() => useFollowedClassroomGame(socket, 'ABC123', RECORD));

    fire('classroomGameModeChanged', { gameCode: 'ZZZ999', gameMode: 'vocab-quiz' });

    expect(result.current?.gameMode).toBe('classic');
  });

  it('re-derives on a quiz start that carries the classroom marker (a missed switch still lands)', () => {
    const { socket, fire } = fakeSocket();
    const { result } = renderHook(() => useFollowedClassroomGame(socket, 'ABC123', RECORD));

    fire('startGame', { gameMode: 'classic', classroomMode: 'vocab-quiz' });

    expect(result.current?.gameMode).toBe('vocab-quiz');
  });

  it('re-derives on a board start: vocab-quiz back to the board mode the round runs', () => {
    const { socket, fire } = fakeSocket();
    const { result } = renderHook(() =>
      useFollowedClassroomGame(socket, 'ABC123', { ...RECORD, gameMode: 'vocab-quiz' })
    );

    fire('startGame', { gameMode: 'word-hunt' });

    expect(result.current?.gameMode).toBe('word-hunt');
  });

  it('treats live quiz traffic as a vocab-quiz claim', () => {
    const { socket, fire } = fakeSocket();
    const { result } = renderHook(() => useFollowedClassroomGame(socket, 'ABC123', RECORD));

    fire(VOCAB_QUIZ_EVENTS.question, { index: 0 });

    expect(result.current?.gameMode).toBe('vocab-quiz');
  });

  it('drops a followed mode when the room code changes', () => {
    const { socket, fire } = fakeSocket();
    const { result, rerender } = renderHook(
      ({ code, record }) => useFollowedClassroomGame(socket, code, record),
      { initialProps: { code: 'ABC123', record: RECORD as LiveClassroomGameInfo | null } }
    );
    fire('classroomGameModeChanged', { gameCode: 'ABC123', gameMode: 'vocab-quiz' });

    rerender({ code: 'DEF456', record: { ...RECORD, gameCode: 'DEF456', gameMode: 'blast' } });

    expect(result.current?.gameMode).toBe('blast');
  });

  it('returns null while there is no record (arcade room), and does not invent one from socket traffic', () => {
    const { socket, fire } = fakeSocket();
    const { result } = renderHook(() => useFollowedClassroomGame(socket, 'ABC123', null));

    fire('startGame', { gameMode: 'blast' });

    expect(result.current).toBeNull();
  });

  it('unsubscribes on unmount', () => {
    const { socket, count } = fakeSocket();
    const { unmount } = renderHook(() => useFollowedClassroomGame(socket, 'ABC123', RECORD));
    expect(count('classroomGameModeChanged')).toBe(1);

    unmount();

    expect(count('classroomGameModeChanged')).toBe(0);
    expect(count('startGame')).toBe(0);
  });
});
