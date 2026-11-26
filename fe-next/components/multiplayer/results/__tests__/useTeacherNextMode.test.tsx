import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import { useTeacherNextMode, CLASSROOM_NEXT_OPTIONS } from '../useTeacherNextMode';

function fakeSocket() {
  const handlers: Record<string, (data: unknown) => void> = {};
  return {
    handlers,
    emit: vi.fn(),
    on: vi.fn((e: string, h: (data: unknown) => void) => { handlers[e] = h; }),
    off: vi.fn(),
  };
}

const t = (k: string) => k;

describe('useTeacherNextMode', () => {
  it('offers every classroom mode, quiz included', () => {
    expect(CLASSROOM_NEXT_OPTIONS.map((o) => o.id)).toEqual(expect.arrayContaining(['classic', 'blast', 'word-hunt', 'wheel-rush', 'vocab-quiz']));
  });

  it('given the teacher picks a board mode between rounds, then the class room switches and the next start carries it', () => {
    const socket = fakeSocket();
    const onBoardMode = vi.fn();
    const { result } = renderHook(() => useTeacherNextMode({ enabled: true, socket: socket as never, gameCode: 'CLS123', current: 'classic', t, onBoardMode }));
    act(() => result.current.pick('blast'));
    expect(socket.emit).toHaveBeenCalledWith('updateClassroomGameMode', expect.objectContaining({ gameCode: 'CLS123', gameMode: 'blast' }));
    act(() => socket.handlers.classroomGameModeChanged({ gameCode: 'CLS123', gameMode: 'blast' }));
    expect(onBoardMode).toHaveBeenCalledWith('blast');
    expect(result.current.mode).toBe('blast');
  });

  it('given the quiz, then the server decides the round and the board pick is left alone', () => {
    const socket = fakeSocket();
    const onBoardMode = vi.fn();
    const { result } = renderHook(() => useTeacherNextMode({ enabled: true, socket: socket as never, gameCode: 'CLS123', current: 'classic', t, onBoardMode }));
    act(() => result.current.pick('vocab-quiz'));
    act(() => socket.handlers.classroomGameModeChanged({ gameCode: 'CLS123', gameMode: 'vocab-quiz' }));
    expect(onBoardMode).not.toHaveBeenCalled();
    expect(result.current.mode).toBe('vocab-quiz');
  });

  it('given a non-teacher, then it never listens or sends', () => {
    const socket = fakeSocket();
    renderHook(() => useTeacherNextMode({ enabled: false, socket: socket as never, gameCode: 'CLS123', current: 'classic', t, onBoardMode: vi.fn() }));
    expect(socket.on).not.toHaveBeenCalled();
  });
});
