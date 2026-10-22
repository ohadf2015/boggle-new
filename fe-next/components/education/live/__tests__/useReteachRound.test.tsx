import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { RETEACH_ACK_TIMEOUT_MS, useReteachRound } from '@/components/education/live/useReteachRound';

function fakeSocket() {
  const handlers: Record<string, Array<(data: unknown) => void>> = {};
  return {
    emit: vi.fn(),
    on: vi.fn((event: string, fn: (data: unknown) => void) => {
      (handlers[event] ??= []).push(fn);
    }),
    off: vi.fn((event: string, fn: (data: unknown) => void) => {
      handlers[event] = (handlers[event] ?? []).filter((h) => h !== fn);
    }),
    fire: (event: string, data: unknown) => (handlers[event] ?? []).forEach((h) => h(data)),
  };
}

const summary = { lessonIds: ['l1'], lessonNames: ['Cells'] };

describe('useReteachRound', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.sessionStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  it('given a replay, when the server confirms, then the client copy narrows and the next round starts', () => {
    const socket = fakeSocket();
    const onApplied = vi.fn();
    window.sessionStorage.setItem('lessonGameData', JSON.stringify({ lessonId: 'l1', lessonName: 'Cells', vocabularyWords: ['a', 'b', 'c'], gameMode: 'classic' }));
    const { result } = renderHook(() => useReteachRound({ gameCode: 'ABC123', socket: socket as never, summary, onApplied }));

    act(() => result.current.replay(['b', 'c']));
    expect(socket.emit).toHaveBeenCalledWith('classroomReteachWords', { gameCode: 'ABC123', words: ['b', 'c'] });
    expect(result.current.status).toBe('pending');
    expect(onApplied).not.toHaveBeenCalled();

    act(() => socket.fire('classroomReteachApplied', { gameCode: 'ABC123', words: ['b'] }));
    expect(onApplied).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('idle');
    const staged = JSON.parse(window.sessionStorage.getItem('lessonGameData')!);
    expect(staged.vocabularyWords).toEqual(['b']);
    expect(staged.gameMode).toBe('classic');
  });

  it('given an ack for another room, when it arrives, then it is ignored', () => {
    const socket = fakeSocket();
    const onApplied = vi.fn();
    const { result } = renderHook(() => useReteachRound({ gameCode: 'ABC123', socket: socket as never, summary, onApplied }));
    act(() => result.current.replay(['b']));
    act(() => socket.fire('classroomReteachApplied', { gameCode: 'ZZZ999', words: ['b'] }));
    expect(onApplied).not.toHaveBeenCalled();
  });

  it('given the server refuses, when it says so, then the replay shows failed and no round starts', () => {
    const socket = fakeSocket();
    const onApplied = vi.fn();
    const { result } = renderHook(() => useReteachRound({ gameCode: 'ABC123', socket: socket as never, summary, onApplied }));
    act(() => result.current.replay(['b']));
    act(() => socket.fire('classroomReteachRefused', { gameCode: 'ABC123' }));
    expect(result.current.status).toBe('failed');
    expect(onApplied).not.toHaveBeenCalled();
  });

  it('given no answer at all, when the wait runs out, then it fails visibly instead of spinning', () => {
    const socket = fakeSocket();
    const { result } = renderHook(() => useReteachRound({ gameCode: 'ABC123', socket: socket as never, summary, onApplied: vi.fn() }));
    act(() => result.current.replay(['b']));
    act(() => {
      vi.advanceTimersByTime(RETEACH_ACK_TIMEOUT_MS + 1);
    });
    expect(result.current.status).toBe('failed');
  });

  it('given an ack that lands after the wait ran out, when it arrives, then the wall says the replay is set without starting a round on its own', () => {
    const socket = fakeSocket();
    const onApplied = vi.fn();
    const { result } = renderHook(() => useReteachRound({ gameCode: 'ABC123', socket: socket as never, summary, onApplied }));
    act(() => result.current.replay(['b']));
    act(() => {
      vi.advanceTimersByTime(RETEACH_ACK_TIMEOUT_MS + 1);
    });
    act(() => socket.fire('classroomReteachApplied', { gameCode: 'ABC123', words: ['b'] }));
    expect(result.current.status).toBe('ready');
    expect(onApplied).not.toHaveBeenCalled();
    expect(JSON.parse(window.sessionStorage.getItem('lessonGameData') ?? '{"vocabularyWords":[]}').vocabularyWords).toEqual(['b']);
  });

  it('given a lowercase room code in the URL, when the server answers with the uppercased code, then the ack still counts', () => {
    const socket = fakeSocket();
    const onApplied = vi.fn();
    window.sessionStorage.setItem('lessonGameData', JSON.stringify({ lessonId: 'l1', lessonName: 'Cells', vocabularyWords: ['a', 'b'] }));
    const { result } = renderHook(() => useReteachRound({ gameCode: 'abc123', socket: socket as never, summary, onApplied }));
    act(() => result.current.replay(['b']));
    act(() => socket.fire('classroomReteachApplied', { gameCode: 'ABC123', words: ['b'] }));
    expect(onApplied).toHaveBeenCalledTimes(1);
  });

  it('given no socket or no room code, when replay is tapped, then it fails visibly', () => {
    const { result } = renderHook(() => useReteachRound({ gameCode: null, socket: null, summary, onApplied: vi.fn() }));
    act(() => result.current.replay(['b']));
    expect(result.current.status).toBe('failed');
  });
});
